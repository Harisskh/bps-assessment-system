// backend/routes/certificate.js - UPDATED WITH DELETE FEATURE & NEW FOLDER STRUCTURE
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

// Generate certificate with nomor sertifikat input and Kepala BPS data
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
    // Get nomor sertifikat from request body
    const { nomorSertifikat } = req.body;

    console.log('🔄 Generating template for user:', userId, 'period:', periodId);
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

    console.log('📄 Loading existing PDF template from temp_cert folder...');

    // 🔥 NEW: Path ke template PDF dari folder temp_cert
    const possibleTemplates = [
      'template_certificate.pdf',
      'certificate_template.pdf', 
      'sertifikat_template.pdf',
      'template.pdf'
    ];
    
    let actualTemplatePath = null;
    
    // Cari file template yang ada di folder temp_cert
    for (const templateName of possibleTemplates) {
      const testPath = path.join(FOLDERS.TEMPLATE_SOURCE, templateName);
      if (fs.existsSync(testPath)) {
        actualTemplatePath = testPath;
        console.log('📋 Found template:', templateName, 'in temp_cert folder');
        break;
      }
    }
    
    // Jika tidak ada template, buat error
    if (!actualTemplatePath) {
      const files = fs.existsSync(FOLDERS.TEMPLATE_SOURCE) ? fs.readdirSync(FOLDERS.TEMPLATE_SOURCE) : [];
      console.log('📁 Files in temp_cert directory:', files);
      
      return res.status(404).json({
        success: false,
        error: 'Template PDF tidak ditemukan. Pastikan file template ada di folder uploads/temp_cert/',
        availableFiles: files,
        searchedPath: FOLDERS.TEMPLATE_SOURCE
      });
    }

    // Baca template PDF yang sudah ada
    const existingPdfBytes = fs.readFileSync(actualTemplatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Load fonts (pastikan folder fonts ada)
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

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    console.log('📐 Template loaded - Size:', width, 'x', height);

    // Load standard fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Extract clean employee name (tanpa gelar)
    const employeeFullName = bestEmployee.user.nama;
    const employeeName = employeeFullName
      // Versi 1: Menghapus gelar dengan titik (e.g., S.T., M.M., A.Md.Stat.)
      .replace(/,?\s*(A\.Md\.?|A\.Md\.Stat\.?|A\.Md\.Kb\.N\.?|S\.P\.?|S\.T\.?|S\.Kom\.?|S\.Tr\.Stat\.?|S\.Si\.?|S\.Pd\.?|S\.E\.?|S\.Sos\.?|SST\.?|M\.E\.K\.K\.?|M\.EKK\.?|M\.S\.E\.?|M\.M\.?|M\.Si\.?|M\.Kom\.?|M\.T\.?|M\.Pd\.?|Dr\.?|Ir\.?)$/gi, '')
      // Versi 2: Menghapus gelar tanpa titik (e.g., ST, MM, AMdStat)
      .replace(/,?\s*(AMd|AMdStat|AMdKbN|SP|ST|SKom|SST|STrStat|Stat|SSi|SPd|SE|SSos|MEKK|MSE|MM|MSi|MKom|MT|MPd|Dr|Ir)$/gi, '')
      .trim();
    
    console.log('📝 Employee name:', employeeFullName, '-> Clean name:', employeeName);
    
    // Calculate text width untuk centering
    const nameFont = ephesisFont || boldFont;
    const textWidth = nameFont.widthOfTextAtSize(employeeName, 75);
    
    // Get period information
    const periodMonth = getMonthName(bestEmployee.period.bulan);
    const periodYear = bestEmployee.period.tahun;
    
    // Get current date for certificate print date
    const currentDate = new Date();
    const printDate = `${currentDate.getDate()} ${getMonthName(currentDate.getMonth() + 1)} ${currentDate.getFullYear()}`;
    const dateText = `Pringsewu, ${printDate}`;
    const dateTextWidth = font.widthOfTextAtSize(dateText, 18);

    // Add nomor sertifikat if provided
    if (nomorSertifikat) {
      const nomorText = `Nomor: ${nomorSertifikat}`;
      const nomorTextWidth = font.widthOfTextAtSize(nomorText, 16);
      
      firstPage.drawText(nomorText, {
        x: (width - nomorTextWidth) / 2,
        y: height - 150, // Position di atas nama, sesuaikan dengan template
        size: 16,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      console.log('📝 Added nomor sertifikat:', nomorText);
    }

    // Draw employee name on PDF
    firstPage.drawText(employeeName, {
      x: (width - textWidth) / 2,
      y: height - 260, // Adjust Y position based on your template
      size: 75,
      font: nameFont,
      color: rgb(0, 0, 0), 
    });

    // Draw period information
    const periodText = `Bulan ${periodMonth} Tahun ${periodYear}`;
    firstPage.drawText(periodText, {
      x: width - 285, // Adjust X position based on your template
      y: height - 305, // Adjust Y position based on your template
      size: 14,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Draw date and location
    firstPage.drawText(dateText, {
      x: (width - dateTextWidth) / 2,
      y: 205, // Adjust Y position based on your template
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Add Kepala BPS name (below "Kepala BPS Kabupaten Pringsewu")
    const kepalaBpsNameWidth = boldFont.widthOfTextAtSize(kepalaBpsData.nama, 18);
    firstPage.drawText(kepalaBpsData.nama, {
      x: (width - kepalaBpsNameWidth) / 2,
      y: 80, // Position di bawah tanggal, sesuaikan dengan template
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Add Kepala BPS NIP (below name)
    const nipText = `NIP. ${kepalaBpsData.nip}`;
    const nipTextWidth = font.widthOfTextAtSize(nipText, 14);
    firstPage.drawText(nipText, {
      x: (width - nipTextWidth) / 2,
      y: 60, // Position di bawah nama kepala, sesuaikan dengan template
      size: 14,
      font: font,
      color: rgb(0, 0, 0),
    });

    console.log('👨‍💼 Added Kepala BPS info:', kepalaBpsData.nama, 'NIP:', kepalaBpsData.nip);

    // Generate modified PDF
    const pdfBytes = await pdfDoc.save();

    // 🔥 NEW: Save filled template ke folder cert dengan format yang diminta
    const cleanName = cleanEmployeeName(employeeName);
    const filename = `Template_${cleanName}_${periodMonth}_${periodYear}.pdf`;
    const outputPath = path.join(FOLDERS.GENERATED_TEMPLATES, filename);
    
    fs.writeFileSync(outputPath, pdfBytes);

    console.log('💾 Certificate generated with NEW format in cert folder:', filename);

    // Update or create certificate record
    if (certificate) {
      certificate = await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          template_generated: true,
          template_path: `/uploads/cert/${filename}`,
          generated_by: req.user.id,
          generated_at: new Date(),
          certificate_number: nomorSertifikat || certificate.certificate_number,
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
          certificate_number: nomorSertifikat || null,
          status: 'TEMPLATE_GENERATED'
        }
      });
    }

    console.log('✅ Certificate template filled successfully:', filename);

    res.json({
      success: true,
      message: 'Sertifikat berhasil di-generate dari template',
      data: {
        certificate,
        downloadUrl: `/uploads/cert/${filename}`,
        previewUrl: `/api/certificate/download-template/${userId}/${periodId}`,
        filename,
        employeeName: employeeName,
        period: `${periodMonth} ${periodYear}`,
        printDate: printDate,
        nomorSertifikat: nomorSertifikat,
        kepalaBps: kepalaBpsData,
        templateUsed: path.basename(actualTemplatePath),
        savedToFolder: 'uploads/cert'
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

// 🔥 NEW: DELETE certificate - Reset to beginning
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
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Hanya admin yang dapat menghapus sertifikat'
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

    console.log('✅ Certificate deleted successfully');

    res.json({
      success: true,
      message: 'Sertifikat berhasil dihapus. Proses dapat dimulai dari awal.',
      data: {
        deletedCertificateId: certificate.id,
        employeeName: certificate.user.nama,
        periodName: certificate.period.namaPeriode,
        deletedFiles: deletedFiles,
        canRestart: true
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

// Test route untuk memastikan DELETE berfungsi
router.all('/test-delete', (req, res) => {
  res.json({
    success: true,
    message: 'DELETE route is registered and working!',
    method: req.method,
    timestamp: new Date().toISOString(),
    user: req.user?.nama || 'Not authenticated'
  });
});

console.log('✅ EXPLICIT DELETE route registered: DELETE /delete/:userId/:periodId');
console.log('✅ TEST route registered: ALL /test-delete');


// Download template/preview dengan proper token handling
router.get('/download-template/:userId/:periodId', async (req, res) => {
  try {
    console.log('📥 Download/Preview template request');
    console.log('📥 Query params:', req.query);
    console.log('📥 Headers:', req.headers.authorization ? 'Has Auth Header' : 'No Auth Header');
    
    let user = req.user;
    
    // Handle token from query string first (untuk preview)
    if (req.query.token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET || 'bps-secret-key');
        
        const foundUser = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });
        
        if (foundUser) {
          user = foundUser;
          console.log('✅ User authenticated via header token:', foundUser.nama);
        }
      } catch (headerTokenError) {
        console.error('❌ Header token verification failed:', headerTokenError);
        return res.status(401).json({
          success: false,
          error: 'Token header tidak valid',
          code: 'INVALID_HEADER_TOKEN'
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
    
    if (user.role !== 'ADMIN' && user.role !== 'PIMPINAN') {
      console.error('❌ Insufficient permissions. User role:', user.role);
      return res.status(403).json({
        success: false,
        error: 'Hanya admin dan pimpinan yang dapat mengakses sertifikat',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const { userId, periodId } = req.params;
    console.log('📥 Processing request for user:', userId, 'period:', periodId);

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
        error: 'Certificate record tidak ditemukan di database',
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
    const properFilename = `Template_${cleanName}_${periodMonth}_${periodYear}.pdf`;
    
    console.log('📤 Setting filename:', properFilename);
    
    // Check if this is a preview request
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
    const finalFilename = `Sertifikat_${cleanName}_${periodMonth}_${periodYear}${path.extname(req.file.originalname)}`;
    
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
      certificateNumber: cert.certificate_number
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
    const { certificateId } = req.params;
    const currentUserId = req.user.id;

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

    // Check access permissions
    if (req.user.role === 'STAFF' && certificate.user_id !== currentUserId) {
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