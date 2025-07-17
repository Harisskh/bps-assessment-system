// backend/src/controllers/profileController.js - UPDATED WITH SMART CROPPING
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

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

    // Jika ada file upload
    if (req.file) {
        const originalFilename = req.file.filename;
        const originalPath = req.file.path;
        const hdThumbnailFilename = `hd-${originalFilename}`;
        const hdThumbnailPath = path.join(__dirname, '../../uploads/profiles', hdThumbnailFilename);

        ensureDirectoryExistence(hdThumbnailPath);

        // --- INILAH PERUBAHANNYA ---
        await sharp(originalPath)
            .resize({ 
                width: 400, 
                height: 400, 
                fit: 'cover',
                // Parameter 'gravity' untuk smart cropping
                gravity: sharp.strategy.entropy 
            })
            .jpeg({ quality: 90 })
            .toFile(hdThumbnailPath);

      // Hapus foto lama jika ada
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { profilePicture: true }
      });

      if (currentUser?.profilePicture) {
        // Extract filename from database path
        const oldFileName = path.basename(currentUser.profilePicture);
        const oldFilePath = path.join(__dirname, '../../uploads/profiles', oldFileName);
        
        console.log('🗑️ Deleting old file:', oldFilePath);
        
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('✅ Old file deleted successfully');
        }
      }

      // Set correct path format
      updateData.profilePicture = `/uploads/profiles/${hdThumbnailFilename}`;
      if (fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath);
      }
      console.log('💾 New HD profile picture path:', updateData.profilePicture);
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
    
    // Hapus file yang diupload jika terjadi error
    if (req.file) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Cleanup: Deleted uploaded file due to error');
      }
    }

    if (error.code === 'P2002') {
      // Tentukan field mana yang duplicate
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

    // Hapus file dari filesystem
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