// backend/routes/certificate.js - FINAL VERSION WITH BIGGER ITALIC FONT & FIXED FORMAT
const express = require('express');
const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware auth untuk semua routes
router.use(authenticateToken);

// GET: Get user's best employee awards (MENU UTAMA)
router.get('/my-awards', async (req, res) => {
  try {
    console.log('🔄 Getting awards for user:', req.user.id, 'nama:', req.user.nama);
    const currentUserId = req.user.id;
    
    // Get all periods where this user was best employee
    const bestEmployeeRecords = await prisma.finalEvaluation.findMany({
      where: { 
        userId: currentUserId,
        isBestEmployee: true
      },
      include: {
        period: true
      },
      orderBy: [
        { period: { tahun: 'desc' } },
        { period: { bulan: 'desc' } }
      ]
    });

    console.log('📊 Found', bestEmployeeRecords.length, 'best employee records for user:', req.user.nama);

    // 🔥 DEVELOPMENT MODE: Skip certificate download history for testing
    // Comment out these lines in production:
    
    const certificateHistory = await prisma.certificateLog.findMany({
      where: { userId: currentUserId },
      include: {
        period: true
      }
    });
    
    
    // 🔥 FORCE RESET for development - always show as not downloaded
    // const certificateHistory = []; // Empty array for testing
    
    console.log('📋 Found', certificateHistory.length, 'certificate download records (DEV MODE: RESET)');

    // Create map of downloaded certificates
    const downloadMap = new Map();
    certificateHistory.forEach(cert => {
      downloadMap.set(cert.periodId, cert);
    });

    // Format awards data
    const awards = bestEmployeeRecords.map(record => ({
      periodId: record.period.id,
      periodName: record.period.namaPeriode,
      bulan: record.period.bulan,
      tahun: record.period.tahun,
      finalScore: record.finalScore,
      ranking: record.ranking,
      hasDownloaded: downloadMap.has(record.period.id), // Will be false in dev mode
      downloadInfo: downloadMap.get(record.period.id) || null
    }));

    console.log('✅ Returning', awards.length, 'awards for user:', req.user.nama, '(DEV MODE: All show as not downloaded)');

    res.json({
      success: true,
      data: {
        totalAwards: awards.length,
        awards: awards,
        hasAnyAwards: awards.length > 0
      }
    });

  } catch (error) {
    console.error('❌ My awards error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// POST: Generate certificate - FINAL VERSION WITH BIGGER ITALIC FONT & FIXED FORMAT
router.post('/generate/:periodId', async (req, res) => {
  try {
    const { periodId } = req.params;
    const currentUserId = req.user.id;
    
    console.log('🔄 === CERTIFICATE GENERATION START ===');
    console.log('🔄 Period:', periodId, 'User:', req.user.nama, 'ID:', currentUserId);
    
    // Cek apakah user ini adalah best employee untuk periode tersebut
    const bestEmployee = await prisma.finalEvaluation.findFirst({
      where: { 
        periodId: periodId,
        userId: currentUserId,
        isBestEmployee: true
      },
      include: {
        user: true,
        period: true
      }
    });

    if (!bestEmployee) {
      console.log('❌ User is not best employee for this period');
      return res.status(403).json({ 
        success: false,
        error: 'Anda tidak berhak mengunduh sertifikat untuk periode ini' 
      });
    }

    console.log('✅ User verified as best employee:', bestEmployee.user.nama, 'for period:', bestEmployee.period.namaPeriode);

    // 🔥 DEVELOPMENT MODE: Skip existing certificate check for testing
    const existingCert = null; // Always generate new for development

    console.log('📋 Development mode: Always generating new certificate');

    // Generate certificate number
    const certNumber = generateCertificateNumber(bestEmployee.period, existingCert);
    
    // Get current date for generation
    const generateDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });

    console.log('📄 Certificate details:', {
      number: certNumber,
      date: generateDate,
      employee: bestEmployee.user.nama,
      period: bestEmployee.period.namaPeriode
    });

    // 🔥 TEMPLATE PATH - TRY MULTIPLE LOCATIONS AND NAMES
    const templateDirectories = [
      path.join(__dirname, '../templates'),
      path.join(__dirname, '../../templates'),
      path.join(process.cwd(), 'templates'),
      path.join(process.cwd(), 'backend/templates')
    ];
    
    const templateNames = [
      'certificate_template_siapik.pdf',
      'certificate_template.pdf',
      'template_sertifikat.pdf',
      'sertifikat_template.pdf'
    ];
    
    let templatePath = null;
    let foundTemplate = false;
    
    console.log('🔍 Searching for template files...');
    
    for (const dir of templateDirectories) {
      console.log('📁 Checking directory:', dir);
      if (fs.existsSync(dir)) {
        console.log('✅ Directory exists:', dir);
        const files = fs.readdirSync(dir);
        console.log('📄 Files in directory:', files);
        
        for (const fileName of templateNames) {
          const testPath = path.join(dir, fileName);
          console.log('🔍 Testing template path:', testPath);
          if (fs.existsSync(testPath)) {
            templatePath = testPath;
            foundTemplate = true;
            console.log('✅ Found template:', templatePath);
            break;
          }
        }
        if (foundTemplate) break;
      } else {
        console.log('❌ Directory not found:', dir);
      }
    }

    if (!templatePath || !foundTemplate) {
      console.log('❌ No template found, will create from scratch');
      
      // 🔥 CREATE PDF FROM SCRATCH - WITH BIGGER ITALIC FONT
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique); // 🔥 NEW: Italic font
      const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique); // 🔥 NEW: Bold Italic
      
      const { width, height } = page.getSize();
      const darkBlue = rgb(0.1, 0.2, 0.5);
      const gold = rgb(0.8, 0.7, 0.2);
      const black = rgb(0, 0, 0);
      
      // Draw border
      page.drawRectangle({
        x: 40, y: 40, width: width - 80, height: height - 80,
        borderColor: darkBlue, borderWidth: 3,
      });
      
      // Header
      page.drawText('BPS KABUPATEN PRINGSEWU', {
        x: width / 2 - 120, y: height - 120, size: 16, font: boldFont, color: darkBlue,
      });
      
      // Title
      page.drawText('SERTIFIKAT', {
        x: width / 2 - 80, y: height - 180, size: 36, font: boldFont, color: darkBlue,
      });
      
      page.drawText('PEGAWAI TERBAIK', {
        x: width / 2 - 95, y: height - 220, size: 20, font: boldFont, color: gold,
      });
      
      // Content
      page.drawText('Diberikan Kepada:', {
        x: width / 2 - 80, y: height - 280, size: 14, font: font, color: black,
      });
      
      // 🔥 FIXED: Employee name - BIGGER ITALIC FONT LIKE AHMAD RIFJAYANSYAH
      const employeeName = bestEmployee.user.nama;
      const nameSize = 36; // INCREASED from 32 to 36 for even bigger font
      const nameWidth = nameSize * employeeName.length * 0.6; // Better calculation
      
      page.drawText(employeeName, {
        x: width / 2 - (nameWidth / 2), y: height - 330, 
        size: nameSize, font: boldItalicFont, color: darkBlue, // 🔥 ITALIC BOLD FONT
      });
      
      // Underline
      page.drawLine({
        start: { x: 150, y: height - 340 }, end: { x: width - 150, y: height - 340 },
        thickness: 1, color: black,
      });
      
      // Description
      const description = `Sebagai Best Employee of the Month BPS Kabupaten Pringsewu`;
      page.drawText(description, {
        x: width / 2 - (description.length * 3), y: height - 380, 
        size: 12, font: font, color: black,
      });
      
      // 🔥 FIXED: Period - NO TAB BETWEEN MEI AND TAHUN
      const periodText = `Bulan ${getMonthName(bestEmployee.period.bulan)} Tahun ${bestEmployee.period.tahun}`;
      const periodWidth = periodText.length * 7; // Better calculation for centering
      page.drawText(periodText, {
        x: width / 2 - (periodWidth / 2), y: height - 410, 
        size: 14, font: boldFont, color: darkBlue,
      });
      
      // Footer
      page.drawText(`Pringsewu, ${generateDate}`, {
        x: width - 200, y: 180, size: 12, font: font, color: black,
      });
      
      page.drawText('Kepala BPS Kabupaten Pringsewu', {
        x: width - 250, y: 160, size: 12, font: font, color: black,
      });
      
      page.drawText('(_________________________)', {
        x: width - 230, y: 100, size: 12, font: font, color: black,
      });
      
      // Certificate number
      page.drawText(`No. Sertifikat: ${certNumber}`, {
        x: 70, y: 70, size: 10, font: font, color: black,
      });
      
      const pdfBytes = await pdfDoc.save();
      console.log('✅ PDF created from scratch, size:', pdfBytes.length, 'bytes');
      
      // Save PDF bytes for response
      var finalPdfBytes = pdfBytes;
      
    } else {
      console.log('📄 Using template:', templatePath);
      
      // Load template and modify
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      const { width, height } = firstPage.getSize();
      console.log('📐 Template dimensions:', width, 'x', height);
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique); // 🔥 NEW: Italic
      const boldItalicFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique); // 🔥 NEW: Bold Italic
      
      // 🔥 COORDINATES - UPDATED FOR BIGGER ITALIC FONT
      const textConfig = {
        employeeName: { 
          x: width / 2 - 140, y: height / 2 + 50, 
          fontSize: 36, font: boldItalicFont, color: rgb(0.1, 0.3, 0.6) // 🔥 BIGGER + ITALIC
        },
        periodText: { 
          x: width / 2 - 80, y: height / 2 - 30, 
          fontSize: 16, font: boldFont, color: rgb(0, 0, 0) 
        },
        generateDate: { 
          x: width / 2 + 20, y: height / 2 - 100, 
          fontSize: 12, font: font, color: rgb(0, 0, 0) 
        }
      };
      
      console.log('✏️ Adding text to template...');
      
      // 🔥 IMPROVED: Better text centering for italic font
      const employeeName = bestEmployee.user.nama;
      const nameWidth = employeeName.length * (textConfig.employeeName.fontSize * 0.65); // Adjusted for italic
      const centeredEmployeeNameX = (width - nameWidth) / 2;
      
      firstPage.drawText(employeeName, {
        ...textConfig.employeeName,
        x: centeredEmployeeNameX
      });
      
      // 🔥 FIXED: Period format - NO TAB BETWEEN MONTH AND YEAR
      const periodText = `Bulan ${getMonthName(bestEmployee.period.bulan)} Tahun ${bestEmployee.period.tahun}`;
      const periodWidth = periodText.length * (textConfig.periodText.fontSize * 0.6);
      const centeredPeriodX = (width - periodWidth) / 2;
      
      firstPage.drawText(periodText, {
        ...textConfig.periodText,
        x: centeredPeriodX
      });
      
      firstPage.drawText(generateDate, textConfig.generateDate);
      
      const pdfBytes = await pdfDoc.save();
      console.log('✅ PDF modified successfully, size:', pdfBytes.length, 'bytes');
      
      var finalPdfBytes = pdfBytes;
    }
    
    // 🔥 DEVELOPMENT MODE: Don't save to database for testing
    
    if (!existingCert) {
      await prisma.certificateLog.create({
        data: {
          userId: currentUserId,
          periodId: periodId,
          certificateNumber: certNumber,
          generatedBy: currentUserId
        }
      });
      console.log('📝 Certificate log created in database');
    }
    
    console.log('📝 Development mode: Skipping database save');
    
    // Set response headers
    const filename = `Sertifikat_${bestEmployee.user.nama.replace(/\s+/g, '_')}_${getMonthName(bestEmployee.period.bulan)}_Tahun_${bestEmployee.period.tahun}.pdf`;
    
    console.log('📤 Sending PDF response with filename:', filename);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': finalPdfBytes.length
    });
    
    console.log('✅ === CERTIFICATE GENERATION COMPLETE ===');
    res.send(Buffer.from(finalPdfBytes));
    
  } catch (error) {
    console.error('❌ === CERTIFICATE GENERATION ERROR ===');
    console.error('❌ Error details:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: 'Gagal generate sertifikat: ' + error.message
    });
  }
});

// Helper functions
function generateCertificateNumber(period, existingCert) {
  if (existingCert) {
    return existingCert.certificateNumber;
  }
  
  const monthMap = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
  };
  
  const monthRoman = monthMap[period.bulan] || 'I';
  const sequenceNumber = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  
  return `${sequenceNumber}/BPS-PWU/${monthRoman}/${period.tahun}`;
}

function getMonthName(monthNumber) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNumber - 1] || 'Januari';
}

// GET: Certificate history - UNTUK ADMIN/PIMPINAN SAJA
router.get('/history', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PIMPINAN') {
      return res.status(403).json({
        success: false,
        error: 'Akses ditolak'
      });
    }

    const certificates = await prisma.certificateLog.findMany({
      include: {
        user: true,
        period: true,
        generatedByUser: true
      },
      orderBy: { generatedAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    console.error('Certificate history error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;