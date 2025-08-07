// controllers/profileController.js - OPTIMIZED FOR INSTANT LOADING
const { User } = require('../../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

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
    const user = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['password']
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

// 🚀 OPTIMIZED SHARP PROCESSING - INSTANT LOADING
const processProfileImageOptimized = async (inputPath, outputPath) => {
  try {
    console.log('⚡ Starting OPTIMIZED image processing...');
    const startTime = Date.now();
    
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();
    const { width: originalWidth, height: originalHeight, format: originalFormat } = metadata;
    
    console.log('📏 Original image:', { 
      width: originalWidth, 
      height: originalHeight, 
      format: originalFormat,
      size: `${Math.round(metadata.size / 1024)}KB`
    });
    
    // 🔥 SMALLER TARGET SIZE for faster loading
    const targetSize = 300; // Reduced from 400 to 300 (33% smaller)
    
    // Smart resize strategy
    let sharpInstance = sharp(inputPath);
    
    const aspectRatio = originalWidth / originalHeight;
    const isSquare = Math.abs(aspectRatio - 1) < 0.1;
    const isNearSquare = Math.abs(aspectRatio - 1) < 0.2;
    
    if (isSquare) {
      console.log('✨ Square image - direct resize');
      sharpInstance = sharpInstance.resize(targetSize, targetSize, {
        kernel: sharp.kernel.lanczos2, // Changed from lanczos3 to lanczos2 (faster)
        fit: 'fill'
      });
      
    } else if (isNearSquare) {
      console.log('✨ Near-square image - resize to square');
      sharpInstance = sharpInstance.resize(targetSize, targetSize, {
        kernel: sharp.kernel.lanczos2,
        fit: 'fill'
      });
      
    } else {
      console.log('✨ Rectangular image - smart crop');
      
      const minDimension = Math.min(originalWidth, originalHeight);
      const cropLeft = Math.round((originalWidth - minDimension) / 2);
      const cropTop = Math.round((originalHeight - minDimension) / 2);
      
      sharpInstance = sharpInstance
        .extract({
          left: cropLeft,
          top: cropTop,
          width: minDimension,
          height: minDimension
        })
        .resize(targetSize, targetSize, {
          kernel: sharp.kernel.lanczos2,
          fit: 'inside'
        });
    }
    
    // 🔥 OPTIMIZED OUTPUT FOR INSTANT LOADING
    const outputBuffer = await sharpInstance
      .jpeg({
        quality: 85,           // Reduced from 92 to 85 (smaller file)
        progressive: false,    // 🚨 DISABLED progressive loading!
        mozjpeg: true,         // Keep mozjpeg for better compression
        trellisQuantisation: false,  // Disable for faster processing
        overshootDeringing: false,   // Disable for faster processing
        optimiseScans: false,  // Disable for faster processing
        optimiseCoding: true   // Enable for better compression
      })
      .toBuffer();
    
    // Write to file
    await fs.promises.writeFile(outputPath, outputBuffer);
    
    const processingTime = Date.now() - startTime;
    const outputSize = outputBuffer.length;
    const compressionRatio = ((metadata.size - outputSize) / metadata.size * 100).toFixed(1);
    
    console.log('✅ OPTIMIZED processing completed:', {
      processingTime: `${processingTime}ms`,
      originalSize: `${Math.round(metadata.size / 1024)}KB`,
      outputSize: `${Math.round(outputSize / 1024)}KB`,
      compressionRatio: `${compressionRatio}% smaller`,
      dimensions: `${targetSize}x${targetSize}px`,
      progressive: 'DISABLED'
    });
    
    return { 
      success: true, 
      processingTime,
      originalSize: metadata.size,
      outputSize: outputSize,
      compressionRatio: parseFloat(compressionRatio)
    };
    
  } catch (error) {
    console.error('❌ SHARP processing error:', error);
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
      fileName: req.file?.filename,
      fileSize: req.file?.size ? `${Math.round(req.file.size / 1024)}KB` : null
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
    const existingUserByEmail = await User.findOne({
      where: {
        email: email,
        id: { [Op.ne]: req.user.id }
      }
    });

    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Email sudah digunakan pengguna lain' 
      });
    }

    // Cek apakah username sudah digunakan user lain
    if (username) {
      const existingUserByUsername = await User.findOne({
        where: {
          username: username,
          id: { [Op.ne]: req.user.id }
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

    // 🚀 OPTIMIZED IMAGE PROCESSING
    if (req.file) {
        console.log('🔍 Processing file with OPTIMIZED settings...');
        const uploadStartTime = Date.now();
        
        // File validation
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: 'File harus berupa gambar (JPEG, PNG, atau WebP)' 
            });
        }

        // Reduced file size limit for faster processing
        if (req.file.size > 10 * 1024 * 1024) { // Reduced from 15MB to 10MB
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: 'Ukuran file maksimal 10MB' 
            });
        }

        // Quick image validation
        try {
            const metadata = await sharp(req.file.path).metadata();
            if (!metadata.width || !metadata.height) {
                throw new Error('Invalid image format');
            }
            
            // Skip validation logging for faster processing
            console.log('📊 Image validated:', `${metadata.width}x${metadata.height}`);
        } catch (validationError) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: 'File gambar tidak valid' 
            });
        }

        // Delete old profile picture
        const currentUser = await User.findByPk(req.user.id, {
            attributes: ['profilePicture']
        });

        if (currentUser?.profilePicture) {
            const oldFileName = path.basename(currentUser.profilePicture);
            const oldFilePath = path.join(__dirname, '../../uploads/profiles', oldFileName);
            
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('🗑️ Old profile picture deleted');
            }
        }

        // Generate new filename
        const timestamp = Date.now();
        const newFileName = `profile-${req.user.id}-${timestamp}.jpg`;
        const newPath = path.join(__dirname, '../../uploads/profiles', newFileName);
        
        ensureDirectoryExistence(newPath);

        // 🚀 Process with OPTIMIZED settings
        const processingResult = await processProfileImageOptimized(req.file.path, newPath);
        
        if (!processingResult.success) {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                error: `Gagal memproses gambar: ${processingResult.error}` 
            });
        }

        // Cleanup original file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        updateData.profilePicture = `/uploads/profiles/${newFileName}`;
        
        const totalProcessingTime = Date.now() - uploadStartTime;
        console.log('💾 OPTIMIZED processing completed:', {
            fileName: newFileName,
            totalTime: `${totalProcessingTime}ms`,
            sharpTime: `${processingResult.processingTime}ms`,
            finalSize: `${Math.round(processingResult.outputSize / 1024)}KB`,
            expectedLoadTime: '< 1 second'
        });
    }

    // Update user
    const [affectedRows] = await User.update(updateData, {
      where: { id: req.user.id }
    });

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User tidak ditemukan'
      });
    }

    // Get updated user data
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['password']
      }
    });

    console.log('✅ Profile updated successfully:', {
      userId: updatedUser.id,
      profilePicture: updatedUser.profilePicture,
      hasNewImage: !!req.file
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

    if (error.name === 'SequelizeUniqueConstraintError') {
      if (error.fields && error.fields.email) {
        return res.status(400).json({ 
          success: false,
          error: 'Email sudah digunakan' 
        });
      }
      if (error.fields && error.fields.username) {
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
    const user = await User.findByPk(req.user.id, {
      attributes: ['profilePicture']
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
    await User.update(
      { 
        profilePicture: null,
        updatedAt: new Date()
      },
      { where: { id: req.user.id } }
    );

    // Get updated user data
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: {
        exclude: ['password']
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
      error: 'Terjadi kesalahan saat menghapus foto profile' 
    });
  }
};

module.exports = {
  getCurrentProfile,
  updateProfile,
  deleteProfilePicture
};