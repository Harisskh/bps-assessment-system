// routes/import.js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Konfigurasi multer untuk upload file
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Hanya terima file Excel
    if (file.mimetype === 'application/vnd.ms-excel' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('File harus berformat Excel (.xls atau .xlsx)'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Semua routes memerlukan autentikasi admin
router.use(authenticateToken);
router.use(requireAdmin);

// Endpoint untuk download template
router.get('/template', (req, res) => {
  try {
    // Data template sesuai format Excel yang sudah ada (SIMPLIFIED)
    const templateData = [
      {
        NIP: '197309131994031004',
        Nama: 'Eko Purnomo, SST., MM',
        Jabatan: 'Kepala BPS Kabupaten/Kota',
        'Gol.Akhir': 'IV/b',
        Status: 'PNS',
        'Jenis Kelamin': 'LK',
        Username: 'eko.purnomo'
      },
      {
        NIP: '197205201994031004',
        Nama: 'Erwansyah Yusup',
        Jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
        'Gol.Akhir': 'III/b',
        Status: 'PNS',
        'Jenis Kelamin': 'LK',
        Username: 'erwansyah'
      },
      {
        NIP: '199001011990031001',
        Nama: 'Siti Nurhaliza, S.Stat',
        Jabatan: 'Statistisi Ahli Pertama',
        'Gol.Akhir': 'III/a',
        Status: 'PPPK',
        'Jenis Kelamin': 'PR',
        Username: 'siti.nurhaliza'
      }
    ];

    // Buat workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Atur lebar kolom (SIMPLIFIED - hanya 7 kolom)
    const colWidths = [
      { wch: 20 }, // NIP
      { wch: 35 }, // Nama
      { wch: 45 }, // Jabatan
      { wch: 12 }, // Gol.Akhir
      { wch: 8 },  // Status
      { wch: 15 }, // Jenis Kelamin
      { wch: 20 }  // Username
    ];
    ws['!cols'] = colWidths;

    // Tambahkan header dengan style
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell_address = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cell_address]) continue;
      
      // Set style untuk header
      ws[cell_address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Pegawai');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers untuk download
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_pegawai_bps.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);

  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint untuk preview file Excel sebelum import
router.post('/preview', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'File Excel diperlukan' 
      });
    }

    console.log('📄 Received file:', req.file.originalname, req.file.size, 'bytes');

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert ke JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'File Excel kosong atau tidak memiliki data' 
      });
    }

    console.log('📊 Parsed data rows:', data.length);
    console.log('📋 Sample row:', data[0]);

    // Validasi kolom yang diperlukan
    const requiredColumns = ['NIP', 'Nama', 'Username'];
    const fileColumns = Object.keys(data[0]);
    const missingColumns = requiredColumns.filter(col => !fileColumns.includes(col));

    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Kolom yang diperlukan tidak ditemukan: ${missingColumns.join(', ')}`,
        availableColumns: fileColumns,
        requiredColumns: requiredColumns
      });
    }

    // Validasi dan proses data
    const validationResults = {
      validRows: [],
      errorRows: [],
      duplicateChecks: []
    };

    // Ambil data existing untuk check duplikasi
    const existingUsers = await prisma.user.findMany({
      select: { nip: true, username: true, email: true }
    });
    
    const existingNIPs = new Set(existingUsers.map(u => u.nip));
    const existingUsernames = new Set(existingUsers.map(u => u.username));
    const existingEmails = new Set(existingUsers.filter(u => u.email).map(u => u.email));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowErrors = [];
      
      // Normalisasi data (SIMPLIFIED - hapus email, mobilePhone, alamat)
      const processedRow = {
        rowIndex: i + 1,
        nip: String(row.NIP || '').trim(),
        nama: String(row.Nama || '').trim(),
        username: String(row.Username || '').trim().toLowerCase(),
        jabatan: row.Jabatan ? String(row.Jabatan).trim() : '',
        golongan: row['Gol.Akhir'] ? String(row['Gol.Akhir']).trim() : '',
      };

      // Validasi data wajib
      if (!processedRow.nip) rowErrors.push('NIP tidak boleh kosong');
      if (!processedRow.nama) rowErrors.push('Nama tidak boleh kosong');
      if (!processedRow.username) rowErrors.push('Username tidak boleh kosong');

      // Validasi format NIP (18 digit)
      if (processedRow.nip && !/^\d{18}$/.test(processedRow.nip)) {
        rowErrors.push('NIP harus 18 digit angka');
      }

      // Validasi email format jika ada - HAPUS BAGIAN INI
      // if (processedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedRow.email)) {
      //   rowErrors.push('Format email tidak valid');
      // }

      // Normalisasi dan validasi jenis kelamin
      let jenisKelamin = 'LK';
      if (row['Jenis Kelamin']) {
        const jk = String(row['Jenis Kelamin']).trim().toUpperCase();
        if (['PR', 'P', 'PEREMPUAN'].includes(jk)) {
          jenisKelamin = 'PR';
        } else if (!['LK', 'L', 'LAKI-LAKI'].includes(jk)) {
          rowErrors.push('Jenis Kelamin harus LK/L/Laki-laki atau PR/P/Perempuan');
        }
      }
      processedRow.jenisKelamin = jenisKelamin;

      // Normalisasi dan validasi status
      let status = 'PNS';
      if (row.Status) {
        const st = String(row.Status).trim().toUpperCase();
        if (['PPPK'].includes(st)) {
          status = 'PPPK';
        } else if (['HONORER'].includes(st)) {
          status = 'HONORER';
        } else if (!['PNS'].includes(st)) {
          rowErrors.push('Status harus PNS, PPPK, atau HONORER');
        }
      }
      processedRow.status = status;

      // Check duplikasi dengan database existing (SIMPLIFIED)
      if (processedRow.nip && existingNIPs.has(processedRow.nip)) {
        rowErrors.push('NIP sudah terdaftar di database');
      }
      if (processedRow.username && existingUsernames.has(processedRow.username)) {
        rowErrors.push('Username sudah digunakan');
      }

      // Check duplikasi dalam file yang sama (SIMPLIFIED)
      const duplicateInFile = validationResults.validRows.find(existing => 
        existing.nip === processedRow.nip || 
        existing.username === processedRow.username
      );
      
      if (duplicateInFile) {
        rowErrors.push(`Duplikasi dalam file dengan baris ${duplicateInFile.rowIndex}`);
      }

      if (rowErrors.length > 0) {
        validationResults.errorRows.push({
          ...processedRow,
          errors: rowErrors
        });
      } else {
        validationResults.validRows.push(processedRow);
      }
    }

    res.json({
      success: true,
      data: {
        totalRows: data.length,
        validRows: validationResults.validRows.length,
        errorRows: validationResults.errorRows.length,
        previewData: validationResults.validRows.slice(0, 10), // Preview 10 data pertama
        errors: validationResults.errorRows.slice(0, 10), // Show 10 errors max
        hasMoreErrors: validationResults.errorRows.length > 10,
        summary: {
          canImport: validationResults.validRows.length > 0,
          readyForImport: validationResults.validRows.length,
          needsAttention: validationResults.errorRows.length
        }
      }
    });

  } catch (error) {
    console.error('Error previewing Excel:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal memproses file Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint untuk import data (bulk create users)
router.post('/import', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'File Excel diperlukan' 
      });
    }

    console.log('🚀 Starting bulk import for:', req.file.originalname);

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'File Excel kosong' 
      });
    }

    const results = {
      totalRows: data.length,
      successfulImports: 0,
      errors: [],
      duplicates: [],
      newUsers: []
    };

    // Hash password default
    const defaultPassword = 'bps1810';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    // Process setiap baris dengan transaction untuk data integrity
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validasi dan normalisasi data (sama seperti preview)
        const nip = String(row.NIP || '').trim();
        const nama = String(row.Nama || '').trim();
        const username = String(row.Username || '').trim().toLowerCase();
        // HAPUS: const email = row.Email ? String(row.Email).trim().toLowerCase() : null;

        if (!nip || !nama || !username) {
          results.errors.push({
            row: i + 1,
            error: 'Data tidak lengkap (NIP, Nama, Username wajib diisi)',
            data: { nip, nama, username }
          });
          continue;
        }

        // Validasi format NIP
        if (!/^\d{18}$/.test(nip)) {
          results.errors.push({
            row: i + 1,
            error: 'NIP harus 18 digit angka',
            data: { nip }
          });
          continue;
        }

        // Check duplikasi dengan database (SIMPLIFIED)
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { nip: nip },
              { username: username }
            ]
          }
        });

        if (existingUser) {
          results.duplicates.push({
            row: i + 1,
            error: `User sudah ada (NIP: ${existingUser.nip}, Username: ${existingUser.username})`,
            data: { nip, username } // HAPUS: email
          });
          continue;
        }

        // Normalisasi jenis kelamin
        let jenisKelamin = 'LK';
        if (row['Jenis Kelamin']) {
          const jk = String(row['Jenis Kelamin']).trim().toUpperCase();
          if (['PR', 'P', 'PEREMPUAN'].includes(jk)) {
            jenisKelamin = 'PR';
          }
        }

        // Normalisasi status
        let status = 'PNS';
        if (row.Status) {
          const st = String(row.Status).trim().toUpperCase();
          if (st === 'PPPK') status = 'PPPK';
          else if (st === 'HONORER') status = 'HONORER';
        }

        // Create user menggunakan Prisma (SIMPLIFIED)
        const newUser = await prisma.user.create({
          data: {
            nip: nip,
            nama: nama,
            email: null, // Set null karena tidak wajib
            jenisKelamin: jenisKelamin,
            tanggalLahir: null,
            alamat: null, // Set null karena tidak wajib
            mobilePhone: null, // Set null karena tidak wajib
            pendidikanTerakhir: null,
            status: status,
            instansi: 'BPS Kabupaten Pringsewu',
            kantor: 'BPS Kabupaten Pringsewu',
            jabatan: row.Jabatan ? String(row.Jabatan).trim() : null,
            golongan: row['Gol.Akhir'] ? String(row['Gol.Akhir']).trim() : null,
            username: username,
            password: hashedPassword,
            role: 'STAFF',
            profilePicture: null,
            isActive: true
          },
          select: {
            id: true,
            nip: true,
            nama: true,
            email: true,
            username: true,
            role: true,
            status: true,
            jabatan: true,
            golongan: true,
            isActive: true,
            createdAt: true
          }
        });

        results.successfulImports++;
        results.newUsers.push(newUser);

        console.log(`✅ User created: ${newUser.nama} (${newUser.username})`);

      } catch (error) {
        console.error(`❌ Error creating user at row ${i + 1}:`, error);
        
        if (error.code === 'P2002') {
          const field = error.meta?.target?.[0] || 'data';
          results.duplicates.push({
            row: i + 1,
            error: `${field} sudah terdaftar dalam sistem`,
            data: row
          });
        } else {
          results.errors.push({
            row: i + 1,
            error: 'Error database: ' + (error.message || 'Unknown error'),
            data: row
          });
        }
      }
    }

    console.log('📊 Import completed:', {
      total: results.totalRows,
      success: results.successfulImports,
      errors: results.errors.length,
      duplicates: results.duplicates.length
    });

    res.status(200).json({
      success: true,
      message: `Import selesai. ${results.successfulImports} user berhasil ditambahkan dari ${results.totalRows} baris.`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error in bulk import:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat import data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Endpoint untuk import dengan mode update (update existing users)
router.post('/import-update', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'File Excel diperlukan' 
      });
    }

    console.log('🔄 Starting update import for:', req.file.originalname);

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      totalRows: data.length,
      updated: 0,
      created: 0,
      errors: []
    };

    const defaultPassword = 'bps1810';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const nip = String(row.NIP || '').trim();
        const nama = String(row.Nama || '').trim();
        const username = String(row.Username || '').trim().toLowerCase();

        if (!nip || !nama || !username) {
          results.errors.push({
            row: i + 1,
            error: 'Data tidak lengkap'
          });
          continue;
        }

        // Cek apakah user sudah ada
        const existingUser = await prisma.user.findFirst({
          where: { nip: nip }
        });

        const userData = {
          nip: nip,
          nama: nama,
          username: username,
          email: null, // Set null
          jenisKelamin: row['Jenis Kelamin']?.toUpperCase() === 'PR' ? 'PR' : 'LK',
          status: ['PPPK', 'HONORER'].includes(row.Status?.toUpperCase()) ? row.Status.toUpperCase() : 'PNS',
          alamat: null, // Set null
          mobilePhone: null, // Set null
          jabatan: row.Jabatan ? String(row.Jabatan).trim() : null,
          golongan: row['Gol.Akhir'] ? String(row['Gol.Akhir']).trim() : null,
        };

        if (existingUser) {
          // Update existing user
          await prisma.user.update({
            where: { id: existingUser.id },
            data: userData
          });
          results.updated++;
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              ...userData,
              password: hashedPassword,
              role: 'STAFF',
              instansi: 'BPS Kabupaten Pringsewu',
              kantor: 'BPS Kabupaten Pringsewu',
              isActive: true
            }
          });
          results.created++;
        }

      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Update import selesai. ${results.created} user baru, ${results.updated} user diperbarui.`,
      data: results
    });

  } catch (error) {
    console.error('Error in update import:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat update import',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;