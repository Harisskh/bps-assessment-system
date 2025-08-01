// backend/src/controllers/profileController.js - SMART RESIZE VERSION
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');

const prisma = new PrismaClient();

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
};

// GET current user profile
const getCurrentProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        mobilePhone: true,
        pendidikanTerakhir: true,
        status: true,
        instansi: true,
        kantor: true,
        jabatan: true,
        golongan: true,
        username: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User tidak ditemukan' 
      });
    }

    res.json({ 
      success: true,
      data: {
        user: user
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
};

// 🔥 SMART IMAGE PROCESSING FUNCTION
const processProfileImage = async (inputPath, outputPath) => {
  try {
    console.log('🖼️ Starting smart image processing...');
    
    // Load image
    const image = await Jimp.read(inputPath);
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();
    
    console.log('📏 Original dimensions:', { width: originalWidth, height: originalHeight });
    
    const targetSize = 400; // Target size 400x400 (lebih kecil dari 500x500 untuk kualitas lebih baik)
    
    // 🔥 SMART RESIZE ALGORITHM
    let processedImage;
    
    if (originalWidth === originalHeight) {
      // Perfect square - just resize
      console.log('✨ Perfect square image - simple resize');
      processedImage = image.resize(targetSize, targetSize, Jimp.RESIZE_LANCZOS);
      
    } else if (Math.abs(originalWidth - originalHeight) < Math.min(originalWidth, originalHeight) * 0.1) {
      // Nearly square (difference < 10%) - resize to square
      console.log('✨ Nearly square image - resize to square');
      processedImage = image.resize(targetSize, targetSize, Jimp.RESIZE_LANCZOS);
      
    } else {
      // Rectangular image - smart crop to center
      console.log('✨ Rectangular image - smart center crop');
      
      const minDimension = Math.min(originalWidth, originalHeight);
      const maxDimension = Math.max(originalWidth, originalHeight);
      
      // Only crop if the difference is significant
      if (maxDimension / minDimension > 1.3) {
        // Crop to square first (center crop)
        const cropSize = minDimension;
        const cropX = Math.floor((originalWidth - cropSize) / 2);
        const cropY = Math.floor((originalHeight - cropSize) / 2);
        
        processedImage = image
          .crop(cropX, cropY, cropSize, cropSize)
          .resize(targetSize, targetSize, Jimp.RESIZE_LANCZOS);
      } else {
        // Minor difference - just resize
        processedImage = image.resize(targetSize, targetSize, Jimp.RESIZE_LANCZOS);
      }
    }
    
    // Apply quality settings
    await processedImage
      .quality(95) // Increase quality to 95% (was 90%)
      .writeAsync(outputPath);
    
    console.log('✅ Smart image processing completed');
    console.log('📄 Output file size:', fs.statSync(outputPath).size, 'bytes');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Image processing error:', error);
    return { success: false, error: error.message };
  }
};

// UPDATE user profile
const updateProfile = async (req, res) => {
  try {
    const {
      nama,
      email,
      mobilePhone,
      alamat,
      username
    } = req.body;

    console.log('📝 Update profile request:', {
      userId: req.user.id,
      body: req.body,
      hasFile: !!req.file,
      fileName: req.file?.filename
    });

    // Validasi input
    if (!nama || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'Nama dan email wajib diisi' 
      });
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format email tidak valid' 
      });
    }

    // Cek apakah email sudah digunakan user lain
    const existingUserByEmail = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: req.user.id }
      }
    });

    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Email sudah digunakan pengguna lain' 
      });
    }

    // Cek apakah username sudah digunakan user lain (jika username diisi)
    if (username) {
      const existingUserByUsername = await prisma.user.findFirst({
        where: {
          username: username,
          id: { not: req.user.id }
        }
      });

      if (existingUserByUsername) {
        return res.status(400).json({ 
          success: false,
          error: 'Username sudah digunakan pengguna lain' 
        });
      }
    }

    // Siapkan data untuk update
    const updateData = {
      nama,
      email,
      mobilePhone: mobilePhone || null,
      alamat: alamat || null,
      username: username || null,
      updatedAt: new Date()
    };

    // 🔥 SMART IMAGE PROCESSING WITH JIMP
    if (req.file) {
        console.log('🔍 Processing file upload with smart algorithm...');
        
        // Basic file validation
        if (!req.file.mimetype.startsWith('image/')) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: 'File harus berupa gambar' 
            });
        }

        // File size validation (max 10MB for higher quality)
        if (req.file.size > 10 * 1024 * 1024) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: 'Ukuran file maksimal 10MB' 
            });
        }

        // Delete old profile picture
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { profilePicture: true }
        });

        if (currentUser?.profilePicture) {
            const oldFileName = path.basename(currentUser.profilePicture);
            const oldFilePath = path.join(__dirname, '../../uploads/profiles', oldFileName);
            
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Old profile picture deleted');
            }
        }

        // Generate new filename with timestamp
        const fileExtension = path.extname(req.file.originalname);
        const newFileName = `profile-${req.user.id}-${Date.now()}${fileExtension}`;
        const newPath = path.join(__dirname, '../../uploads/profiles', newFileName);
        
        ensureDirectoryExistence(newPath);

        // Process image with smart algorithm
        const processingResult = await processProfileImage(req.file.path, newPath);
        
        if (!processingResult.success) {
            // Cleanup and return error
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: `Gagal memproses gambar: ${processingResult.error}` 
            });
        }

        // Delete original uploaded file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Save new image path
        updateData.profilePicture = `/uploads/profiles/${newFileName}`;
        
        console.log('💾 New profile picture saved:', updateData.profilePicture);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        mobilePhone: true,
        pendidikanTerakhir: true,
        status: true,
        instansi: true,
        kantor: true,
        jabatan: true,
        golongan: true,
        username: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ Profile updated successfully:', {
      userId: updatedUser.id,
      profilePicture: updatedUser.profilePicture,
      username: updatedUser.username
    });

    res.json({
      success: true,
      message: 'Profile berhasil diperbarui',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    
    // Cleanup uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Cleanup: Deleted uploaded file due to error');
    }

    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        return res.status(400).json({ 
          success: false,
          error: 'Email sudah digunakan' 
        });
      }
      if (error.meta?.target?.includes('username')) {
        return res.status(400).json({ 
          success: false,
          error: 'Username sudah digunakan' 
        });
      }
      return res.status(400).json({ 
        success: false,
        error: 'Data sudah digunakan' 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan saat memperbarui profile' 
    });
  }
};

// DELETE profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePicture: true }
    });

    if (!user?.profilePicture) {
      return res.status(404).json({ 
        success: false,
        error: 'Foto profile tidak ditemukan' 
      });
    }

    console.log('🗑️ Deleting profile picture:', user.profilePicture);

    // Delete file from filesystem
    const fileName = path.basename(user.profilePicture);
    const filePath = path.join(__dirname, '../../uploads/profiles', fileName);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('✅ Profile picture file deleted');
    }

    // Update database
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePicture: null },
      select: {
        id: true,
        nip: true,
        nama: true,
        email: true,
        role: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        mobilePhone: true,
        pendidikanTerakhir: true,
        status: true,
        instansi: true,
        kantor: true,
        jabatan: true,
        golongan: true,
        username: true,
        profilePicture: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ 
      success: true,
      message: 'Foto profile berhasil dihapus',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('❌ Error deleting profile picture:', error);
    res.status(500).json({ 
      success: false,
      error: 'Terjadi kesalahan saat menghapus foto' 
    });
  }
};

module.exports = {
  getCurrentProfile,
  updateProfile,
  deleteProfilePicture
};