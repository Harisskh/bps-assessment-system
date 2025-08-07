// controllers/importController.js - SEQUELIZE VERSION
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { User } = require('../../models') ;
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// 🔥 NEW: Excel Headers sesuai permintaan
const EXCEL_HEADERS = {
  'NIP': 'nip',
  'Nama': 'nama', 
  'Jabatan': 'jabatan',
  'Gol.Akhir': 'golongan',
  'Status': 'status',
  'Jenis Kelamin': 'jenisKelamin',
  'Username': 'username'
};

// 🔥 NEW: Mapping data
const GENDER_MAPPING = {
  'Laki-laki': 'LK',
  'LK': 'LK',
  'L': 'LK',
  'Perempuan': 'PR', 
  'PR': 'PR',
  'P': 'PR'
};

const STATUS_MAPPING = {
  'PNS': 'PNS',
  'PPPK': 'PPPK',
  'HONORER': 'HONORER'
};

// 🔥 NEW: Download Template Function
const downloadTemplate = async (req, res) => {
  try {
    console.log('📥 Creating Excel template...');
    
    // Sample data sesuai format yang diminta
    const sampleData = [
      {
        'NIP': '197309131949031004',
        'Nama': 'Eko Purnomo, SST., MM',
        'Jabatan': 'Kepala BPS Kabupaten/Kota',
        'Gol.Akhir': 'IV/b',
        'Status': 'PNS',
        'Jenis Kelamin': 'Laki-laki',
        'Username': 'eko.purnomo'
      },
      {
        'NIP': '200006222023021004',
        'Nama': 'Ahmad Rifjayansyah',
        'Jabatan': 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
        'Gol.Akhir': 'III/a',
        'Status': 'PNS',
        'Jenis Kelamin': 'Laki-laki',
        'Username': 'ahmadrifjayansyah'
      }
    ];

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pegawai');
    
    // Create instructions sheet
    const instructions = [
      { 'PANDUAN': 'KOLOM WAJIB:' },
      { 'PANDUAN': 'NIP - 18 digit angka' },
      { 'PANDUAN': 'Nama - Nama lengkap pegawai' },
      { 'PANDUAN': 'Username - Untuk login (unik)' },
      { 'PANDUAN': '' },
      { 'PANDUAN': 'KOLOM OPSIONAL:' },
      { 'PANDUAN': 'Jabatan - Contoh: Statistisi' },
      { 'PANDUAN': 'Gol.Akhir - Contoh: IV/b' },
      { 'PANDUAN': 'Status - PNS/PPPK/HONORER' },
      { 'PANDUAN': 'Jenis Kelamin - Laki-laki/Perempuan' },
      { 'PANDUAN': '' },
      { 'PANDUAN': 'CATATAN:' },
      { 'PANDUAN': 'Password default: bps1810' },
      { 'PANDUAN': 'Role default: STAFF' }
    ];
    
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Panduan');
    
    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_pegawai.xlsx');
    res.setHeader('Content-Length', buffer.length);
    
    console.log('✅ Template Excel created successfully');
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat template Excel',
      error: error.message
    });
  }
};

// 🔥 NEW: Import Users Function
const importUsers = async (req, res) => {
  try {
    console.log('📤 Starting Excel import...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File Excel tidak ditemukan'
      });
    }

    console.log('📁 File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Read Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Data found: ${jsonData.length} rows`);
    
    if (jsonData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File Excel kosong atau tidak ada data'
      });
    }

    // Process and validate data
    const processedUsers = [];
    const errors = [];
    const warnings = [];
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 2; // Excel row (header = 1)
      
      try {
        // Extract data
        const nip = String(row['NIP'] || '').trim();
        const nama = String(row['Nama'] || '').trim();
        const jabatan = String(row['Jabatan'] || '').trim();
        const golongan = String(row['Gol.Akhir'] || '').trim();
        const status = String(row['Status'] || 'PNS').trim().toUpperCase();
        const jenisKelaminRaw = String(row['Jenis Kelamin'] || 'LK').trim();
        const username = String(row['Username'] || '').trim();
        
        // Validate required fields
        if (!nip) {
          errors.push(`Baris ${rowNumber}: NIP wajib diisi`);
          continue;
        }
        
        if (!nama) {
          errors.push(`Baris ${rowNumber}: Nama wajib diisi`);
          continue;
        }
        
        if (!username) {
          errors.push(`Baris ${rowNumber}: Username wajib diisi`);
          continue;
        }
        
        // Validate NIP format
        if (!/^\d{18}$/.test(nip)) {
          errors.push(`Baris ${rowNumber}: NIP harus 18 digit angka`);
          continue;
        }
        
        // Map gender
        const jenisKelamin = GENDER_MAPPING[jenisKelaminRaw] || 'LK';
        if (!GENDER_MAPPING[jenisKelaminRaw]) {
          warnings.push(`Baris ${rowNumber}: Jenis kelamin tidak dikenali, diubah ke LK`);
        }
        
        // Validate status
        if (!STATUS_MAPPING[status]) {
          errors.push(`Baris ${rowNumber}: Status tidak valid (${status})`);
          continue;
        }
        
        // Prepare user data
        const userData = {
          nip,
          nama,
          email: null, // Akan diisi manual nanti
          jenisKelamin,
          tanggalLahir: null,
          alamat: null,
          mobilePhone: null,
          pendidikanTerakhir: null,
          jabatan: jabatan || null,
          golongan: golongan || null,
          status,
          instansi: 'BPS Kabupaten Pringsewu',
          kantor: 'BPS Kabupaten Pringsewu',
          username,
          password: 'bps1810', // Will be hashed
          role: 'STAFF',
          profilePicture: null,
          isActive: true
        };
        
        processedUsers.push({ rowNumber, data: userData });
        
      } catch (rowError) {
        errors.push(`Baris ${rowNumber}: ${rowError.message}`);
      }
    }
    
    // Check for validation errors
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Terdapat kesalahan validasi data',
        errors,
        warnings,
        totalRows: jsonData.length,
        validRows: processedUsers.length
      });
    }
    
    // Check for duplicates in file
    const nips = processedUsers.map(u => u.data.nip);
    const usernames = processedUsers.map(u => u.data.username);
    
    const duplicateNips = nips.filter((nip, index) => nips.indexOf(nip) !== index);
    const duplicateUsernames = usernames.filter((username, index) => usernames.indexOf(username) !== index);
    
    if (duplicateNips.length > 0) {
      errors.push(`NIP duplikat dalam file: ${[...new Set(duplicateNips)].join(', ')}`);
    }
    
    if (duplicateUsernames.length > 0) {
      errors.push(`Username duplikat dalam file: ${[...new Set(duplicateUsernames)].join(', ')}`);
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Terdapat data duplikat dalam file',
        errors,
        warnings
      });
    }
    
    // Check for duplicates in database
    const existingNips = await User.findAll({
      where: { nip: { [Op.in]: nips } },
      attributes: ['nip', 'nama']
    });
    
    const existingUsernames = await User.findAll({
      where: { username: { [Op.in]: usernames } },
      attributes: ['username', 'nama']
    });
    
    if (existingNips.length > 0) {
      errors.push(`NIP sudah terdaftar: ${existingNips.map(u => u.nip).join(', ')}`);
    }
    
    if (existingUsernames.length > 0) {
      errors.push(`Username sudah terdaftar: ${existingUsernames.map(u => u.username).join(', ')}`);
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data sudah terdaftar dalam sistem',
        errors,
        warnings
      });
    }
    
    // Import to database
    let successCount = 0;
    let failCount = 0;
    const importErrors = [];
    
    // Hash password
    const hashedPassword = await bcrypt.hash('bps1810', 12);
    
    for (const userItem of processedUsers) {
      try {
        const userData = {
          ...userItem.data,
          password: hashedPassword
        };
        
        await User.create(userData);
        successCount++;
        console.log(`✅ User imported: ${userData.nama}`);
        
      } catch (importError) {
        failCount++;
        console.error(`❌ Import failed for row ${userItem.rowNumber}:`, importError);
        
        if (importError.name === 'SequelizeUniqueConstraintError') {
          importErrors.push(`Baris ${userItem.rowNumber}: Data sudah ada (${userItem.data.nama})`);
        } else {
          importErrors.push(`Baris ${userItem.rowNumber}: ${importError.message}`);
        }
      }
    }
    
    // Cleanup uploaded file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temporary file cleaned up');
      }
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup file:', cleanupError);
    }
    
    // Return result
    const isSuccess = successCount > 0;
    
    res.status(isSuccess ? 200 : 400).json({
      success: isSuccess,
      message: isSuccess 
        ? `Import berhasil! ${successCount} pegawai telah ditambahkan.`
        : 'Import gagal. Tidak ada data yang berhasil diimport.',
      data: {
        successfulImports: successCount,
        failedImports: failCount,
        totalProcessed: processedUsers.length,
        totalRows: jsonData.length,
        warnings,
        errors: importErrors
      }
    });
    
  } catch (error) {
    console.error('❌ Import error:', error);
    
    // Cleanup file
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup failed:', cleanupError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat import',
      error: error.message
    });
  }
};

module.exports = {
  downloadTemplate,
  importUsers
};