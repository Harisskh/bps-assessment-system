const { Op } = require('sequelize');

/**
 * Validate NIP format (18 digits)
 */
function validateNip(nip) {
  if (!nip || typeof nip !== 'string') return false;
  return /^\d{18}$/.test(nip);
}

/**
 * Validate username format
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  // Allow letters, numbers, dots, and underscores, 3-50 characters
  return /^[a-zA-Z0-9._]{3,50}$/.test(username);
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate score range for BerAKHLAK (80-100)
 */
function validateBerakhlakScore(score) {
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 80 && numScore <= 100;
}

/**
 * Validate CKP score range (0-100)
 */
function validateCkpScore(score) {
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
}

/**
 * Validate attendance percentage (0-100)
 */
function validateAttendanceScore(score) {
  const numScore = Number(score);
  return !isNaN(numScore) && numScore >= 0 && numScore <= 100;
}

/**
 * Validate period data
 */
function validatePeriod(tahun, bulan) {
  const year = Number(tahun);
  const month = Number(bulan);
  
  return (
    !isNaN(year) && year >= 2020 && year <= 2050 &&
    !isNaN(month) && month >= 1 && month <= 12
  );
}

/**
 * Check if username is unique
 */
async function isUsernameUnique(username, excludeId = null) {
  const { User } = require('../models');
  const whereClause = { username };
  
  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }
  
  const user = await User.findOne({ where: whereClause });
  return !user;
}

/**
 * Check if NIP is unique
 */
async function isNipUnique(nip, excludeId = null) {
  const { User } = require('../models');
  const whereClause = { nip };
  
  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }
  
  const user = await User.findOne({ where: whereClause });
  return !user;
}

/**
 * Validate user data for creation/update
 */
async function validateUserData(userData, isUpdate = false, userId = null) {
  const errors = [];
  
  // Required fields for creation
  if (!isUpdate) {
    if (!userData.nip) errors.push('NIP is required');
    if (!userData.nama) errors.push('Nama is required');
    if (!userData.username) errors.push('Username is required');
    if (!userData.jenisKelamin) errors.push('Jenis kelamin is required');
  }
  
  // Validate NIP format
  if (userData.nip && !validateNip(userData.nip)) {
    errors.push('NIP must be 18 digits');
  }
  
  // Validate username format
  if (userData.username && !validateUsername(userData.username)) {
    errors.push('Username format is invalid');
  }
  
  // Validate email format
  if (userData.email && !validateEmail(userData.email)) {
    errors.push('Email format is invalid');
  }
  
  // Check uniqueness
  if (userData.username) {
    const usernameUnique = await isUsernameUnique(userData.username, userId);
    if (!usernameUnique) {
      errors.push('Username already exists');
    }
  }
  
  if (userData.nip) {
    const nipUnique = await isNipUnique(userData.nip, userId);
    if (!nipUnique) {
      errors.push('NIP already exists');
    }
  }
  
  // Validate enum values
  if (userData.jenisKelamin && !['LK', 'PR'].includes(userData.jenisKelamin)) {
    errors.push('Invalid jenis kelamin');
  }
  
  if (userData.role && !['STAFF', 'ADMIN', 'PIMPINAN'].includes(userData.role)) {
    errors.push('Invalid role');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateNip,
  validateUsername,
  validateEmail,
  validateBerakhlakScore,
  validateCkpScore,
  validateAttendanceScore,
  validatePeriod,
  isUsernameUnique,
  isNipUnique,
  validateUserData
};