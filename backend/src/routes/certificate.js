// backend/routes/certificate.js - UPDATED WITH TEMPLATE SELECTION
const express = require('express');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');
const fontkit = require('fontkit')
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 🔥 NEW: Updated folder structure
const FOLDERS = {
  TEMPLATE_SOURCE: path.join(__dirname, '../../uploads/temp_cert'),      // Source templates
  GENERATED_TEMPLATES: path.join(__dirname, '../../uploads/cert'),        // Generated templates
  FINAL_CERTIFICATES: path.join(__dirname, '../../uploads/certificates')  // Final uploaded certificates
};

// Ensure all directories exist
Object.values(FOLDERS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// 🔥 NEW: Template configurations dengan koordinat yang berbeda
const TEMPLATE_CONFIGS = {
  TTD_BASAH: {
    fileName: 'template_ttd_basah.pdf',
    displayName: 'Template dengan TTD Basah',
    description: 'Template untuk tanda tangan basah (manual)',
    coordinates: {
      // 🔥 FIXED: Nomor sertifikat - koordinat Y yang lebih rendah
      nomorSertifikat: { 
        x: 300,  // Center X (akan di-adjust dengan textWidth)
        y: 445,  // 🔥 DIPERBAIKI: Posisi Y lebih tinggi di PDF (dari bawah ke atas)
        fontSize: 16
      },
      
      // Nama pegawai (center, font besar)
      employeeName: { 
        x: 300,      // Center X (akan di-adjust dengan textWidth)
        y: 335,      // Posisi Y untuk nama
        fontSize: 75 // Ukuran font nama
      },
      
      // Periode (sesuaikan posisi)
      periodText: { 
        x: 558,     // Posisi X untuk periode (kanan)
        y: 290,     // Posisi Y untuk periode
        fontSize: 14
      },
      
      // Footer TTD Basah (center-aligned)
      dateLocation: { 
        x: 300,     // Center X (akan di-adjust dengan textWidth)
        y: 205,     // Posisi Y tanggal
        fontSize: 18
      },
      
      kepalaBpsName: { 
        x: 300,     // Center X (akan di-adjust dengan textWidth)
        y: 80,     // Posisi Y nama kepala
        fontSize: 18
      },
      
      nipKepala: { 
        x: 300,     // Center X (akan di-adjust dengan textWidth)
        y: 60,      // Posisi Y NIP
        fontSize: 14
      }
    }
  },
  E_TTD: {
    fileName: 'template_e_ttd.pdf',
    displayName: 'Template dengan E-TTD',
    description: 'Template untuk tanda tangan elektronik',
    coordinates: {
      // 🔥 FIXED: Nomor sertifikat - sama seperti TTD Basah
      nomorSertifikat: { 
        x: 300,  // Center X (akan di-adjust dengan textWidth)
        y: 445,  // 🔥 DIPERBAIKI: Sama dengan TTD Basah
        fontSize: 16
      },
      
      // Nama pegawai (CENTER - sama dengan TTD Basah)
      employeeName: { 
        x: 300,      // Center X (akan di-adjust dengan textWidth)
        y: 335,      // Sama dengan TTD Basah
        fontSize: 75 // Sama dengan TTD Basah
      },
      
      // Periode (sama dengan TTD Basah)
      periodText: { 
        x: 558,     // Sama dengan TTD Basah
        y: 290,     // Sama dengan TTD Basah
        fontSize: 14
      },
      
      // 🔥 FOOTER E-TTD: RATA KIRI SEJAJAR
      dateLocationLeft: { 
        x: 400,      // Margin kiri
        y: 175,     // Posisi Y paling atas footer
        fontSize: 18
      },
      
      kepalaBpsPositionLeft: { 
        x: 400,      // Rata kiri - X sama
        y: 155,     // Di bawah tanggal
        fontSize: 18
      },
      
      kepalaBpsKabupatenLeft: { 
        x: 400,      // Rata kiri - X sama
        y: 135,     // Di bawah jabatan
        fontSize: 18
      },
      
      kepalaBpsNameLeft: { 
        x: 400,      // Rata kiri - X sama
        y: 100,     // Setelah space untuk TTD
        fontSize: 18
      },
      
      nipKepalaLeft: { 
        x: 400,      // Rata kiri - X sama
        y: 80,      // Di bawah nama
        fontSize: 16
      }
    }
  }
};

// 🔥 HELPER FUNCTION: Get PDF page dimensions to calculate proper center
const getPDFPageInfo = (pdfDoc) => {
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  console.log(`📐 PDF Dimensions: ${width} x ${height} points`);
  return { width, height, firstPage };
};

// 🔥 HELPER FUNCTION: Calculate center position for text
const calculateCenterPosition = (text, font, fontSize, pageWidth) => {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const centerX = (pageWidth / 2) - (textWidth / 2);
  
  console.log(`📏 Text: "${text}" | Width: ${textWidth} | Center X: ${centerX}`);
  return centerX;
};

// Configure multer for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(FOLDERS.FINAL_CERTIFICATES)) {
      fs.mkdirSync(FOLDERS.FINAL_CERTIFICATES, { recursive: true });
    }
    cb(null, FOLDERS.FINAL_CERTIFICATES);
  },
  filename: (req, file, cb) => {
    const uniqueName = `cert_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware auth untuk semua routes KECUALI download-template
router.use((req, res, next) => {
  // Skip auth middleware untuk download-template jika ada token di query
  if (req.path.includes('/download-template') && req.query.token) {
    return next();
  }
  
  // Apply normal auth middleware
  return authenticateToken(req, res, next);
});

// Helper function untuk clean employee name
const cleanEmployeeName = (fullName) => {
  if (!fullName) return 'Unknown';
  
  // Remove academic titles and clean the name
  let cleanName = fullName
    .replace(/,?\s*(S\.T\.?|S\.Kom\.?|S\.Tr\.Stat\.?|S\.Si\.?|S\.Pd\.?|S\.E\.?|S\.Sos\.?|M\.M\.?|M\.Si\.?|M\.Kom\.?|M\.T\.?|M\.Pd\.?|Dr\.?|Ir\.?)/gi, '')
    .replace(/,?\s*(ST|SKom|SSi|SPd|SE|SSos|MM|MSi|MKom|MT|MPd|Dr|Ir)$/gi, '')
    .replace(/,?\s*,/g, '') // Remove extra commas
    .trim();
    
  // Replace spaces with underscores for filename
  return cleanName.replace(/\s+/g, '_');
};

// Helper function to get Kepala BPS data
const getKepalaBpsData = async () => {
  try {
    // Prioritas 1: Cari berdasarkan jabatan "Kepala BPS Kabupaten/Kota"
    let kepalaBps = await prisma.user.findFirst({
      where: {
        jabatan: {
          contains: 'Kepala BPS Kabupaten/Kota',
          mode: 'insensitive'
        },
        isActive: true
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        jabatan: true,
        role: true
      }
    });

    // Prioritas 2: Jika tidak ada, cari berdasarkan role PIMPINAN
    if (!kepalaBps) {
      kepalaBps = await prisma.user.findFirst({
        where: {
          role: 'PIMPINAN',
          isActive: true
        },
        select: {
          id: true,
          nama: true,
          nip: true,
          jabatan: true,
          role: true
        }
      });
    }

    // Prioritas 3: Jika masih tidak ada, cari yang jabatannya mengandung "kepala"
    if (!kepalaBps) {
      kepalaBps = await prisma.user.findFirst({
        where: {
          jabatan: {
            contains: 'kepala',
            mode: 'insensitive'
          },
          isActive: true
        },
        select: {
          id: true,
          nama: true,
          nip: true,
          jabatan: true,
          role: true
        }
      });
    }

    return kepalaBps || {
      nama: 'Eko Purnomo, SST., MM',
      nip: '197309131994031004',
      jabatan: 'Kepala BPS Kabupaten/Kota'
    }; // Default dari seed data

  } catch (error) {
    console.error('❌ Error getting Kepala BPS data:', error);
    // Return default dari seed data jika error
    return {
      nama: 'Eko Purnomo, SST., MM',
      nip: '197309131994031004',
      jabatan: 'Kepala BPS Kabupaten/Kota'
    };
  }
};

// ===============================================
// ADMIN/PIMPINAN ROUTES - Certificate Management
// ===============================================

// 🔥 NEW: Get available templates
router.get('/templates', async (req, res) => {
  try {
    console.log('📋 Getting available certificate templates...');
    
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PIMPINAN') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak. Hanya admin dan pimpinan yang dapat mengakses template.'
      });
    }

    const availableTemplates = [];
    
    // Check which templates exist
    Object.keys(TEMPLATE_CONFIGS).forEach(templateKey => {
      const config = TEMPLATE_CONFIGS[templateKey];
      const templatePath = path.join(FOLDERS.TEMPLATE_SOURCE, config.fileName);
      
      availableTemplates.push({
        key: templateKey,
        fileName: config.fileName,
        displayName: config.displayName,
        description: config.description,
        exists: fs.existsSync(templatePath),
        path: templatePath
      });
    });

    console.log('✅ Available templates:', availableTemplates);

    res.json({
      success: true,
      data: {
        templates: availableTemplates,
        folderPath: FOLDERS.TEMPLATE_SOURCE
      }
    });

  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all best employees with filters
router.get('/management', async (req, res) => {
  try {
    console.log('📋 Certificate management request from:', req.user?.nama, 'Role:', req.user?.role);

    if (req.user.role !== 'ADMIN' && req.user.role !== 'PIMPINAN') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak. Hanya admin dan pimpinan yang dapat mengakses halaman ini.'
      });
    }

    // Extract filter parameters
    const { tahun, bulan, status } = req.query;
    let periodFilter = {};
    
    if (tahun) {
      periodFilter.tahun = parseInt(tahun);
    }
    
    if (bulan) {
      periodFilter.bulan = parseInt(bulan);
    }

    console.log('🔍 Period filter applied:', periodFilter);

    // Step 1: Get all best employees with optional period filter
    console.log('🔍 Searching for best employees...');
    
    const bestEmployees = await prisma.finalEvaluation.findMany({
      where: { 
        isBestEmployee: true,
        ...(Object.keys(periodFilter).length > 0 && {
          period: periodFilter
        })
      },
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            nip: true,
            jabatan: true,
            profilePicture: true
          }
        },
        period: {
          select: {
            id: true,
            namaPeriode: true,
            tahun: true,
            bulan: true
          }
        }
      },
      orderBy: [
        { period: { tahun: 'desc' } },
        { period: { bulan: 'desc' } },
        { finalScore: 'desc' }
      ]
    });

    console.log('📊 Found best employees:', bestEmployees.length);

    if (bestEmployees.length === 0) {
      return res.json({
        success: true,
        data: {
          bestEmployees: [],
          total: 0,
          filters: {
            tahun: tahun ? parseInt(tahun) : null,
            bulan: bulan ? parseInt(bulan) : null,
            status: status || null
          }
        },
        message: tahun || bulan ? 
          `Tidak ada best employee untuk filter periode yang dipilih.` : 
          'Belum ada best employee. Lakukan perhitungan final evaluation terlebih dahulu.'
      });
    }

    // Step 2: Get certificate status for each best employee
    console.log('🔍 Getting certificate status...');
    
    let certificateData = await Promise.all(
      bestEmployees.map(async (emp) => {
        try {
          const certificate = await prisma.certificate.findFirst({
            where: {
              user_id: emp.userId,
              period_id: emp.periodId
            },
            include: {
              generatedByUser: { 
                select: { nama: true } 
              },
              uploadedByUser: { 
                select: { nama: true } 
              }
            }
          });

          return {
            id: emp.id,
            user: emp.user,
            period: emp.period,
            finalScore: emp.finalScore,
            ranking: emp.ranking,
            certificate: certificate || null
          };
        } catch (certError) {
          console.error('❌ Error getting certificate for employee:', emp.user.nama, certError);
          return {
            id: emp.id,
            user: emp.user,
            period: emp.period,
            finalScore: emp.finalScore,
            ranking: emp.ranking,
            certificate: null
          };
        }
      })
    );

    // Apply status filter if provided
    if (status) {
      certificateData = certificateData.filter(emp => {
        const cert = emp.certificate;
        
        switch (status) {
          case 'BELUM_DIMULAI':
            return !cert;
          case 'TEMPLATE_GENERATED':
            return cert && cert.template_generated && !cert.is_uploaded;
          case 'COMPLETED':
            return cert && cert.is_uploaded && cert.status === 'COMPLETED';
          default:
            return true;
        }
      });
    }

    console.log('✅ Certificate data prepared for', certificateData.length, 'employees');

    res.json({
      success: true,
      data: {
        bestEmployees: certificateData,
        total: certificateData.length,
        filters: {
          tahun: tahun ? parseInt(tahun) : null,
          bulan: bulan ? parseInt(bulan) : null,
          status: status || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Certificate management error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 🔥 FIXED: Generate template dengan koordinat dan center alignment yang benar
router.post('/generate-template/:userId/:periodId', async (req, res) => {
  try {
    console.log('🔄 Generate template request from:', req.user?.nama, 'Role:', req.user?.role);
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Hanya admin yang dapat generate template sertifikat'
      });
    }

    const { userId, periodId } = req.params;
    const { templateType, nomorSertifikat } = req.body;

    if (!templateType || !TEMPLATE_CONFIGS[templateType]) {
      return res.status(400).json({
        success: false,
        error: 'Template type harus dipilih dan valid',
        availableTemplates: Object.keys(TEMPLATE_CONFIGS)
      });
    }

    if (!nomorSertifikat) {
      return res.status(400).json({
        success: false,
        error: 'Nomor sertifikat harus diisi'
      });
    }

    console.log('🔄 Generating template for user:', userId, 'period:', periodId);
    console.log('📝 Template type:', templateType);
    console.log('📝 Nomor sertifikat:', nomorSertifikat);

    // Verify this is a best employee
    const bestEmployee = await prisma.finalEvaluation.findFirst({
      where: {
        userId: userId,
        periodId: periodId,
        isBestEmployee: true
      },
      include: {
        user: true,
        period: true
      }
    });

    if (!bestEmployee) {
      return res.status(404).json({
        success: false,
        error: 'Best employee tidak ditemukan untuk periode ini'
      });
    }
    console.log('✅ Best employee found:', bestEmployee.user.nama);

    // Get template configuration
    const templateConfig = TEMPLATE_CONFIGS[templateType];
    const templatePath = path.join(FOLDERS.TEMPLATE_SOURCE, templateConfig.fileName);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        error: `Template ${templateConfig.displayName} tidak ditemukan di: ${templatePath}`,
        templatePath: templatePath,
        availableFiles: fs.existsSync(FOLDERS.TEMPLATE_SOURCE) ? fs.readdirSync(FOLDERS.TEMPLATE_SOURCE) : []
      });
    }

    console.log('📋 Found template:', templateConfig.displayName, 'at:', templatePath);

    // Get Kepala BPS data
    const kepalaBpsData = await getKepalaBpsData();
    console.log('👨‍💼 Kepala BPS data:', kepalaBpsData);

    // Check if template already exists
    let certificate = await prisma.certificate.findFirst({
      where: { 
        user_id: userId, 
        period_id: periodId 
      }
    });

    console.log('📄 Loading PDF template...');

    // Load existing PDF template
    const existingPdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // 🔥 FIXED: Get PDF page info for proper positioning
    const { width, height, firstPage } = getPDFPageInfo(pdfDoc);
    
    // Load fonts
    const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
    let ephesisFont, pattayaFont;
    
    try {
      if (fs.existsSync(path.join(fontsDir, 'Ephesis-Regular.ttf'))) {
        const ephesisFontBytes = fs.readFileSync(path.join(fontsDir, 'Ephesis-Regular.ttf'));
        pdfDoc.registerFontkit(fontkit);
        ephesisFont = await pdfDoc.embedFont(ephesisFontBytes);
      }
    } catch (fontError) {
      console.warn('⚠️ Custom font not available, using standard font:', fontError.message);
    }

    // Load standard fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Extract clean employee name (tanpa gelar)
    const employeeFullName = bestEmployee.user.nama;
    const employeeName = employeeFullName
      .replace(/,?\s*(A\.Md\.?|A\.Md\.Stat\.?|S\.T\.?|S\.Kom\.?|S\.Tr\.Stat\.?|S\.Si\.?|S\.Pd\.?|S\.E\.?|S\.Sos\.?|SST\.?|M\.M\.?|M\.Si\.?|M\.Kom\.?|M\.T\.?|M\.Pd\.?|Dr\.?|Ir\.?)$/gi, '')
      .replace(/,?\s*(AMd|AMdStat|ST|SKom|SST|STrStat|SSi|SPd|SE|SSos|MM|MSi|MKom|MT|MPd|Dr|Ir)$/gi, '')
      .trim();
    
    console.log('📝 Employee name:', employeeFullName, '-> Clean name:', employeeName);
    
    // Get period information
    const periodMonth = getMonthName(bestEmployee.period.bulan);
    const periodYear = bestEmployee.period.tahun;
    
    // Get current date for certificate print date
    const currentDate = new Date();
    const printDate = `${currentDate.getDate()} ${getMonthName(currentDate.getMonth() + 1)} ${currentDate.getFullYear()}`;
    
    // 🔥 FIXED: Apply coordinates based on template type
    const coords = templateConfig.coordinates;

    // 🔥 FIXED: Add nomor sertifikat dengan center alignment yang benar
    if (nomorSertifikat && coords.nomorSertifikat) {
      const nomorText = `Nomor: ${nomorSertifikat}`;
      const nomorCenterX = calculateCenterPosition(nomorText, font, coords.nomorSertifikat.fontSize, width);
      
      firstPage.drawText(nomorText, {
        x: nomorCenterX, // 🔥 FIXED: Menggunakan calculated center position
        y: coords.nomorSertifikat.y,
        size: coords.nomorSertifikat.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      console.log(`📝 Added nomor sertifikat: "${nomorText}" at center position X=${nomorCenterX}, Y=${coords.nomorSertifikat.y}`);
    }

    // 🔥 FIXED: Draw employee name dengan center alignment yang benar
    const nameFont = ephesisFont || boldFont;
    const nameCenterX = calculateCenterPosition(employeeName, nameFont, coords.employeeName.fontSize, width);
    
    firstPage.drawText(employeeName, {
      x: nameCenterX, // 🔥 FIXED: Menggunakan calculated center position
      y: coords.employeeName.y,
      size: coords.employeeName.fontSize,
      font: nameFont,
      color: rgb(0, 0, 0), 
    });
    
    console.log(`📝 Added employee name: "${employeeName}" at center position X=${nameCenterX}, Y=${coords.employeeName.y}`);

    // Draw period information
    const periodText = `Bulan ${periodMonth} Tahun ${periodYear}`;
    firstPage.drawText(periodText, {
      x: coords.periodText.x,
      y: coords.periodText.y,
      size: coords.periodText.fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // 🔥 FIXED: Apply different layouts based on template type
    if (templateType === 'TTD_BASAH') {
      // Layout untuk TTD Basah (center aligned)
      const dateText = `Pringsewu, ${printDate}`;
      const dateCenterX = calculateCenterPosition(dateText, font, coords.dateLocation.fontSize, width);
      
      firstPage.drawText(dateText, {
        x: dateCenterX, // 🔥 FIXED: Center alignment
        y: coords.dateLocation.y,
        size: coords.dateLocation.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Add Kepala BPS name (center aligned)
      const kepalaBpsNameCenterX = calculateCenterPosition(kepalaBpsData.nama, boldFont, coords.kepalaBpsName.fontSize, width);
      firstPage.drawText(kepalaBpsData.nama, {
        x: kepalaBpsNameCenterX, // 🔥 FIXED: Center alignment
        y: coords.kepalaBpsName.y,
        size: coords.kepalaBpsName.fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Add Kepala BPS NIP (center aligned)
      const nipText = `NIP. ${kepalaBpsData.nip}`;
      const nipCenterX = calculateCenterPosition(nipText, font, coords.nipKepala.fontSize, width);
      firstPage.drawText(nipText, {
        x: nipCenterX, // 🔥 FIXED: Center alignment
        y: coords.nipKepala.y,
        size: coords.nipKepala.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

    } else if (templateType === 'E_TTD') {
      // Layout untuk E-TTD (left aligned, sejajar atas bawah)
      
      const dateText = `Pringsewu, ${printDate}`;
      firstPage.drawText(dateText, {
        x: coords.dateLocationLeft.x, // Left aligned
        y: coords.dateLocationLeft.y,
        size: coords.dateLocationLeft.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      firstPage.drawText('Kepala Badan Pusat Statistik', {
        x: coords.kepalaBpsPositionLeft.x, // Left aligned
        y: coords.kepalaBpsPositionLeft.y,
        size: coords.kepalaBpsPositionLeft.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      firstPage.drawText('Kabupaten Pringsewu', {
        x: coords.kepalaBpsKabupatenLeft.x, // Left aligned
        y: coords.kepalaBpsKabupatenLeft.y,
        size: coords.kepalaBpsKabupatenLeft.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      firstPage.drawText(kepalaBpsData.nama, {
        x: coords.kepalaBpsNameLeft.x, // Left aligned
        y: coords.kepalaBpsNameLeft.y,
        size: coords.kepalaBpsNameLeft.fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      const nipText = `NIP. ${kepalaBpsData.nip}`;
      firstPage.drawText(nipText, {
        x: coords.nipKepalaLeft.x, // Left aligned
        y: coords.nipKepalaLeft.y,
        size: coords.nipKepalaLeft.fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    console.log('👨‍💼 Added Kepala BPS info with layout:', templateType);

    // Generate modified PDF
    const pdfBytes = await pdfDoc.save();

    // Save filled template to cert folder
    const cleanName = cleanEmployeeName(employeeName);
    const filename = `Template_${cleanName}_${periodMonth}_${periodYear}_${templateType}.pdf`;
    const outputPath = path.join(FOLDERS.GENERATED_TEMPLATES, filename);
    
    fs.writeFileSync(outputPath, pdfBytes);

    console.log('💾 Certificate generated with template type:', templateType, 'saved as:', filename);

    // Update or create certificate record
    if (certificate) {
      certificate = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          template_generated: true,
          template_path: `/uploads/cert/${filename}`,
          generated_by: req.user.id,
          generated_at: new Date(),
          certificate_number: nomorSertifikat,
          template_type: templateType,
          status: 'TEMPLATE_GENERATED'
        }
      });
    } else {
      certificate = await prisma.certificate.create({
        data: {
          user_id: userId,
          period_id: periodId,
          template_generated: true,
          template_path: `/uploads/cert/${filename}`,
          generated_by: req.user.id,
          generated_at: new Date(),
          certificate_number: nomorSertifikat,
          template_type: templateType,
          status: 'TEMPLATE_GENERATED'
        }
      });
    }

    console.log('✅ Certificate template filled successfully:', filename);

    res.json({
      success: true,
      message: `Sertifikat berhasil di-generate menggunakan ${templateConfig.displayName}`,
      data: {
        certificate,
        downloadUrl: `/uploads/cert/${filename}`,
        previewUrl: `/api/certificate/download-template/${userId}/${periodId}`,
        filename,
        employeeName: employeeName,
        period: `${periodMonth} ${periodYear}`,
        printDate: printDate,
        nomorSertifikat: nomorSertifikat,
        templateType: templateType,
        templateDisplayName: templateConfig.displayName,
        kepalaBps: kepalaBpsData,
        templateUsed: templateConfig.fileName,
        savedToFolder: 'uploads/cert',
        debug: {
          pdfDimensions: { width, height },
          centerCalculations: `Employee name center X: ${calculateCenterPosition(employeeName, nameFont, coords.employeeName.fontSize, width)}`
        }
      }
    });

  } catch (error) {
    console.error('❌ Template fill error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal generate sertifikat dari template: ' + error.message 
    });
  }
});

// Update certificate number
router.put('/update-number/:userId/:periodId', async (req, res) => {
  try {
    console.log('🔄 Update certificate number request from:', req.user?.nama);
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Hanya admin yang dapat mengupdate nomor sertifikat'
      });
    }

    const { userId, periodId } = req.params;
    const { nomorSertifikat } = req.body;

    if (!nomorSertifikat) {
      return res.status(400).json({
        success: false,
        error: 'Nomor sertifikat harus diisi'
      });
    }

    const certificate = await prisma.certificate.findFirst({
      where: { 
        user_id: userId, 
        period_id: periodId 
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate tidak ditemukan'
      });
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        certificate_number: nomorSertifikat,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Nomor sertifikat berhasil diupdate',
      data: { certificate: updatedCertificate }
    });

  } catch (error) {
    console.error('❌ Update certificate number error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal mengupdate nomor sertifikat: ' + error.message 
    });
  }
});

// 🔥 DELETE certificate - Reset to beginning
router.delete('/delete/:userId/:periodId', async (req, res) => {
  try {
    console.log('🗑️ EXPLICIT Delete route hit!');
    console.log('🗑️ User:', req.user?.nama, 'Role:', req.user?.role);
    console.log('🗑️ Params:', req.params);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // ✅ FIXED: Allow both ADMIN and PIMPINAN to delete
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PIMPINAN') {
      return res.status(403).json({
        success: false,
        error: 'Hanya admin dan pimpinan yang dapat menghapus sertifikat'
      });
    }

    const { userId, periodId } = req.params;

    console.log('🗑️ Processing delete for user:', userId, 'period:', periodId);

    // Find the certificate
    const certificate = await prisma.certificate.findFirst({
      where: { 
        user_id: userId, 
        period_id: periodId 
      },
      include: {
        user: {
          select: { nama: true }
        },
        period: {
          select: { namaPeriode: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate tidak ditemukan'
      });
    }

    console.log('📋 Found certificate to delete:', certificate.id);

    // Delete physical files if they exist
    const filesToDelete = [];
    
    // Template file in cert folder
    if (certificate.template_path && certificate.template_generated) {
      const templatePath = path.join(__dirname, '../..', certificate.template_path);
      if (fs.existsSync(templatePath)) {
        filesToDelete.push({ type: 'template', path: templatePath });
      }
    }

    // Final certificate file in certificates folder
    if (certificate.file_path && certificate.is_uploaded) {
      if (fs.existsSync(certificate.file_path)) {
        filesToDelete.push({ type: 'final', path: certificate.file_path });
      }
    }

    // Delete physical files
    let deletedFiles = [];
    for (const fileInfo of filesToDelete) {
      try {
        fs.unlinkSync(fileInfo.path);
        deletedFiles.push(`${fileInfo.type}: ${path.basename(fileInfo.path)}`);
        console.log('🗑️ Deleted file:', fileInfo.path);
      } catch (fileError) {
        console.warn('⚠️ Could not delete file:', fileInfo.path, fileError.message);
      }
    }

    // Delete certificate record from database
    await prisma.certificate.delete({
      where: { id: certificate.id }
    });

    console.log('✅ Certificate deleted successfully by:', req.user.nama, '(', req.user.role, ')');

    res.json({
      success: true,
      message: 'Sertifikat berhasil dihapus. Proses dapat dimulai dari awal.',
      data: {
        deletedCertificateId: certificate.id,
        employeeName: certificate.user.nama,
        periodName: certificate.period.namaPeriode,
        deletedFiles: deletedFiles,
        canRestart: true,
        deletedBy: {
          nama: req.user.nama,
          role: req.user.role
        }
      }
    });

  } catch (error) {
    console.error('❌ DELETE route error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal menghapus sertifikat: ' + error.message 
    });
  }
});

// Download template/preview dengan proper token handling
router.get('/download-template/:userId/:periodId', async (req, res) => {
  try {
    console.log('📥 Download/Preview template request');
    console.log('📥 Query params:', req.query);
    console.log('📥 Headers:', req.headers.authorization ? 'Has Auth Header' : 'No Auth Header');
    
    let user = req.user;
    
    // ✅ FIXED: Handle token from query string FIRST (untuk preview)
    if (req.query.token && !user) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET || 'bps-secret-key');
        
        const foundUser = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        
        if (foundUser) {
          user = foundUser;
          console.log('✅ User authenticated via query token:', foundUser.nama, 'Role:', foundUser.role);
        }
      } catch (tokenError) {
        console.error('❌ Query token verification failed:', tokenError.message);
        return res.status(401).json({
          success: false,
          error: 'Token tidak valid',
          code: 'INVALID_TOKEN'
        });
      }
    }
    
    if (!user) {
      console.error('❌ No valid authentication found');
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no valid token found',
        code: 'NO_AUTH'
      });
    }
    
    // ✅ FIXED: Allow both ADMIN and PIMPINAN
    if (user.role !== 'ADMIN' && user.role !== 'PIMPINAN') {
      console.error('❌ Insufficient permissions. User role:', user.role);
      return res.status(403).json({
        success: false,
        error: 'Hanya admin dan pimpinan yang dapat mengakses template sertifikat',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { userId, periodId } = req.params;
    console.log('📥 Processing request for user:', userId, 'period:', periodId, 'by:', user.nama);

    const certificate = await prisma.certificate.findFirst({
      where: { 
        user_id: userId, 
        period_id: periodId 
      },
      include: {
        user: true,
        period: true
      }
    });

    if (!certificate) {
      console.error('❌ Certificate record not found');
      return res.status(404).json({
        success: false,
        error: 'Certificate record tidak ditemukan',
        code: 'CERTIFICATE_NOT_FOUND'
      });
    }

    if (!certificate.template_generated || !certificate.template_path) {
      console.error('❌ Template not generated yet');
      return res.status(404).json({
        success: false,
        error: 'Template sertifikat belum di-generate',
        code: 'TEMPLATE_NOT_GENERATED'
      });
    }

    const fullPath = path.join(__dirname, '../..', certificate.template_path);
    console.log('📁 Looking for file at:', fullPath);

    if (!fs.existsSync(fullPath)) {
      console.error('❌ File not found on filesystem:', fullPath);
      return res.status(404).json({
        success: false,
        error: 'File template tidak ditemukan di server',
        code: 'FILE_NOT_FOUND',
        path: certificate.template_path
      });
    }

    console.log('✅ File found, serving PDF file');

    // Generate proper filename
    const cleanName = cleanEmployeeName(certificate.user.nama);
    const periodMonth = getMonthName(certificate.period.bulan);
    const periodYear = certificate.period.tahun;
    const templateType = certificate.template_type || 'TTD_BASAH';
    const properFilename = `Template_${cleanName}_${periodMonth}_${periodYear}_${templateType}.pdf`;
    
    console.log('📤 Setting filename:', properFilename);
    
    // ✅ FIXED: Check if this is a preview request
    const isPreview = req.query.preview === 'true' || req.headers['x-preview-mode'] === 'true';
    
    // Set comprehensive headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Preview-Mode');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
    
    if (isPreview) {
      // For preview, use inline disposition
      res.setHeader('Content-Disposition', `inline; filename="${properFilename}"`);
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      console.log('👁️ Serving as preview (inline)');
    } else {
      // For download, use attachment disposition
      res.setHeader('Content-Disposition', `attachment; filename="${properFilename}"`);
      console.log('📥 Serving as download (attachment)');
    }
    
    // Send the file
    res.sendFile(path.resolve(fullPath), (err) => {
      if (err) {
        console.error('❌ Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Gagal mengirim file PDF',
            code: 'FILE_SEND_ERROR'
          });
        }
      } else {
        console.log('✅ PDF file sent successfully');
      }
    });

  } catch (error) {
    console.error('❌ Download/preview error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error: ' + error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

// Upload final certificate (ADMIN & PIMPINAN)
router.post('/upload/:userId/:periodId', upload.single('certificate'), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PIMPINAN') {
      return res.status(403).json({
        success: false,
        error: 'Hanya admin dan pimpinan yang dapat upload sertifikat final'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File sertifikat harus diupload'
      });
    }

    const { userId, periodId } = req.params;
    console.log('📤 Uploading certificate for user:', userId, 'period:', periodId);

    let certificate = await prisma.certificate.findFirst({
      where: { 
        user_id: userId, 
        period_id: periodId 
      },
      include: {
        user: true,
        period: true
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Data sertifikat tidak ditemukan. Generate template terlebih dahulu.'
      });
    }

    // Generate proper final certificate filename
    const cleanName = cleanEmployeeName(certificate.user.nama);
    const periodMonth = getMonthName(certificate.period.bulan);
    const periodYear = certificate.period.tahun;
    const templateType = certificate.template_type || 'TTD_BASAH';
    const finalFilename = `Sertifikat_${cleanName}_${periodMonth}_${periodYear}_${templateType}${path.extname(req.file.originalname)}`;
    
    // Rename the uploaded file to proper format
    const oldPath = req.file.path;
    const newPath = path.join(path.dirname(oldPath), finalFilename);
    fs.renameSync(oldPath, newPath);

    certificate = await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        is_uploaded: true,
        file_name: finalFilename,
        file_url: `/uploads/certificates/${finalFilename}`,
        file_path: newPath,
        uploaded_by: req.user.id,
        uploaded_at: new Date(),
        status: 'COMPLETED'
      }
    });

    console.log('✅ Certificate uploaded successfully:', finalFilename);

    res.json({
      success: true,
      message: 'Sertifikat final berhasil diupload',
      data: {
        certificate,
        fileUrl: `/uploads/certificates/${finalFilename}`,
        fileName: finalFilename
      }
    });

  } catch (error) {
    console.error('❌ Certificate upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal upload sertifikat: ' + error.message 
    });
  }
});

// ===============================================
// USER ROUTES - My Certificates (STAFF ONLY)
// ===============================================

router.get('/my-certificates', async (req, res) => {
  try {
    console.log('🔄 Getting certificates for user:', req.user.id, 'nama:', req.user.nama);
    const currentUserId = req.user.id;
    
    const certificates = await prisma.certificate.findMany({
      where: { 
        user_id: currentUserId,
        is_uploaded: true,
        status: 'COMPLETED'
      },
      include: {
        period: true,
        user: {
          select: { nama: true }
        }
      },
      orderBy: [
        { period: { tahun: 'desc' } },
        { period: { bulan: 'desc' } }
      ]
    });

    console.log('📋 Found', certificates.length, 'certificates for user:', req.user.nama);

    const formattedCerts = certificates.map(cert => ({
      id: cert.id,
      periodId: cert.period_id,
      periodName: cert.period.namaPeriode,
      bulan: cert.period.bulan,
      tahun: cert.period.tahun,
      fileName: cert.file_name,
      fileUrl: cert.file_url,
      uploadedAt: cert.uploaded_at,
      certificateNumber: cert.certificate_number,
      templateType: cert.template_type
    }));

    res.json({
      success: true,
      data: {
        totalCertificates: formattedCerts.length,
        certificates: formattedCerts,
        hasCertificates: formattedCerts.length > 0
      }
    });

  } catch (error) {
    console.error('❌ My certificates error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get detailed certificates with scores
router.get('/my-certificates-detailed', async (req, res) => {
  try {
    console.log('🔄 Getting detailed certificates for user:', req.user.id, 'nama:', req.user.nama);
    const currentUserId = req.user.id;
    
    const certificates = await prisma.certificate.findMany({
      where: { 
        user_id: currentUserId,
        is_uploaded: true,
        status: 'COMPLETED'
      },
      include: {
        period: true,
        user: {
          select: { nama: true }
        }
      },
      orderBy: [
        { period: { tahun: 'desc' } },
        { period: { bulan: 'desc' } }
      ]
    });

    console.log('📋 Found', certificates.length, 'certificates, getting detailed scores...');

    // Get detailed scores for each certificate
    const detailedCerts = await Promise.all(
      certificates.map(async (cert) => {
        try {
          // Get final evaluation data
          const finalEval = await prisma.finalEvaluation.findFirst({
            where: {
              userId: currentUserId,
              periodId: cert.period_id,
              isBestEmployee: true
            }
          });

          // Get total evaluators count
          const evaluatorCount = await prisma.evaluation.count({
            where: {
              targetUserId: currentUserId,
              periodId: cert.period_id,
              status: 'SUBMITTED'
            }
          });

          return {
            id: cert.id,
            periodId: cert.period_id,
            periodName: cert.period.namaPeriode,
            bulan: cert.period.bulan,
            tahun: cert.period.tahun,
            fileName: cert.file_name,
            fileUrl: cert.file_url,
            uploadedAt: cert.uploaded_at,
            certificateNumber: cert.certificate_number,
            templateType: cert.template_type,
            // Detailed scores
            berakhlakScore: finalEval?.berakhlakScore || null,
            presensiScore: finalEval?.presensiScore || null,
            ckpScore: finalEval?.ckpScore || null,
            finalScore: finalEval?.finalScore || null,
            totalVoters: evaluatorCount || 0,
            ranking: finalEval?.ranking || null
          };
        } catch (scoreError) {
          console.error('❌ Error getting scores for certificate:', cert.id, scoreError);
          return {
            id: cert.id,
            periodId: cert.period_id,
            periodName: cert.period.namaPeriode,
            bulan: cert.period.bulan,
            tahun: cert.period.tahun,
            fileName: cert.file_name,
            fileUrl: cert.file_url,
            uploadedAt: cert.uploaded_at,
            certificateNumber: cert.certificate_number,
            templateType: cert.template_type,
            berakhlakScore: null,
            presensiScore: null,
            ckpScore: null,
            finalScore: null,
            totalVoters: 0,
            ranking: null
          };
        }
      })
    );

    res.json({
      success: true,
      data: {
        totalCertificates: detailedCerts.length,
        certificates: detailedCerts,
        hasCertificates: detailedCerts.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Detailed certificates error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Download certificate file
router.get('/download/:certificateId', async (req, res) => {
  try {
    console.log('📥 Download final certificate request');
    console.log('📥 Certificate ID:', req.params.certificateId);
    console.log('📥 User:', req.user?.nama, 'Role:', req.user?.role);
    
    let user = req.user;
    
    // Handle token from query string for direct URL access
    if (req.query.token && !user) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET || 'bps-secret-key');
        
        const foundUser = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        
        if (foundUser) {
          user = foundUser;
          console.log('✅ User authenticated via query token:', foundUser.nama, 'Role:', foundUser.role);
        }
      } catch (tokenError) {
        console.error('❌ Query token verification failed:', tokenError.message);
        return res.status(401).json({
          success: false,
          error: 'Token tidak valid',
          code: 'INVALID_TOKEN'
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { certificateId } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        user: true,
        period: true
      }
    });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Sertifikat tidak ditemukan'
      });
    }

    // ✅ FIXED: Check access permissions
    if (user.role === 'STAFF' && certificate.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Anda tidak memiliki akses untuk mengunduh sertifikat ini'
      });
    }

    // ✅ ADMIN & PIMPINAN can download any certificate, STAFF only their own
    if (user.role !== 'ADMIN' && user.role !== 'PIMPINAN' && certificate.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Anda tidak memiliki akses untuk mengunduh sertifikat ini'
      });
    }

    if (!certificate.is_uploaded || !certificate.file_path) {
      return res.status(404).json({
        success: false,
        error: 'File sertifikat belum tersedia'
      });
    }

    if (!fs.existsSync(certificate.file_path)) {
      return res.status(404).json({
        success: false,
        error: 'File sertifikat tidak ditemukan di server'
      });
    }

    console.log('📤 Downloading certificate:', certificate.file_name);

    // Use the proper filename that's already stored in database
    const filename = certificate.file_name || `Sertifikat_${certificate.id}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.sendFile(path.resolve(certificate.file_path));

  } catch (error) {
    console.error('❌ Certificate download error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal mengunduh sertifikat: ' + error.message 
    });
  }
});

// ===============================================
// HELPER FUNCTIONS
// ===============================================

function getRomanMonth(monthNumber) {
  const monthMap = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
  };
  return monthMap[monthNumber] || 'I';
}

function getMonthName(monthNumber) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNumber - 1] || 'Januari';
}

module.exports = router;