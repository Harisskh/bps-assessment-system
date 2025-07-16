// backend/generate-secret.js
const crypto = require('crypto');

// Menghasilkan string acak sepanjang 64 karakter heksadesimal
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET:', jwtSecret);

// Jika Anda ingin base64 (lebih pendek tapi sama kuatnya)
const jwtSecretBase64 = crypto.randomBytes(32).toString('base64');
console.log('JWT_SECRET_BASE64:', jwtSecretBase64);