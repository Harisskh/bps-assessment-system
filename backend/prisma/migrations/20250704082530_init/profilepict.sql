-- Migration SQL untuk menambahkan kolom profilePicture
-- Jalankan di database PostgreSQL Anda

-- 1. Tambahkan kolom profilePicture ke tabel users
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;

-- 2. Tambahkan index untuk performa yang lebih baik
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users("profilePicture");

-- 3. Update existing users (opsional) - set default profile picture jika diperlukan
-- UPDATE users SET "profilePicture" = NULL WHERE "profilePicture" IS NULL;

-- 4. Verifikasi kolom telah ditambahkan
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'profilePicture';