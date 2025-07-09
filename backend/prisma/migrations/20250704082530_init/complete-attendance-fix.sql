-- Complete Migration Script for Attendance System
-- File: migrations/complete_attendance_fix.sql

-- Step 1: Add columns for tracking the count of violations
ALTER TABLE "attendance" 
ADD COLUMN IF NOT EXISTS "jumlahTidakKerja" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "jumlahPulangAwal" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "jumlahTelat" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "jumlahAbsenApel" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "jumlahCuti" INTEGER DEFAULT 0;

-- Step 2: Update existing records to have default values based on boolean fields
UPDATE "attendance" SET 
  "jumlahTidakKerja" = CASE WHEN "adaTidakKerja" = true THEN 1 ELSE 0 END,
  "jumlahPulangAwal" = CASE WHEN "adaPulangAwal" = true THEN 1 ELSE 0 END,
  "jumlahTelat" = CASE WHEN "adaTelat" = true THEN 1 ELSE 0 END,
  "jumlahAbsenApel" = CASE WHEN "adaAbsenApel" = true THEN 1 ELSE 0 END,
  "jumlahCuti" = CASE WHEN "adaCuti" = true THEN 1 ELSE 0 END
WHERE "jumlahTidakKerja" = 0 AND "jumlahPulangAwal" = 0 AND "jumlahTelat" = 0 
      AND "jumlahAbsenApel" = 0 AND "jumlahCuti" = 0;

-- Step 3: Create sample data for testing (Optional)
-- Insert sample periods if not exists
INSERT INTO "periods" ("id", "tahun", "bulan", "namaPeriode", "isActive", "createdAt", "updatedAt")
SELECT 'period-july-2025', 2025, 7, 'Juli 2025', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "periods" WHERE "tahun" = 2025 AND "bulan" = 7);

-- Step 4: Create sample evaluation parameters if not exists
INSERT INTO "evaluation_parameters" ("id", "namaParameter", "deskripsi", "urutan", "isActive", "createdAt")
VALUES 
  ('param-1', 'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif', 'Penilaian terhadap sikap pelayanan yang baik', 1, true, NOW()),
  ('param-2', 'Perilaku Bertanggung Jawab, Disiplin, dan Jujur', 'Penilaian terhadap tanggung jawab dan kedisiplinan', 2, true, NOW()),
  ('param-3', 'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan', 'Penilaian terhadap sikap profesional dan pengembangan diri', 3, true, NOW()),
  ('param-4', 'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman', 'Penilaian terhadap sikap tolong menolong dan toleransi', 4, true, NOW()),
  ('param-5', 'Perilaku Menjaga Nama Baik BPS dan Berdedikasi', 'Penilaian terhadap dedikasi dan menjaga nama baik institusi', 5, true, NOW()),
  ('param-6', 'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan', 'Penilaian terhadap kreativitas dan adaptabilitas', 6, true, NOW()),
  ('param-7', 'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja', 'Penilaian terhadap kemampuan komunikasi dan teamwork', 7, true, NOW()),
  ('param-8', 'Penampilan dan Kerapian', 'Penilaian terhadap penampilan dan kerapian dalam bekerja', 8, true, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Step 5: Create score ranges for tokoh berakhlak if not exists
INSERT INTO "rentang_nilai" ("id", "kategori", "ranking", "nilaiMin", "nilaiMax", "deskripsi", "createdAt")
VALUES 
  ('range-1', 'tokoh_ke_1', 1, 96, 100, 'Tokoh Berakhlak 1 (Terbaik)', NOW()),
  ('range-2', 'tokoh_ke_2', 2, 86, 95, 'Tokoh Berakhlak 2 (Baik)', NOW()),
  ('range-3', 'tokoh_ke_3', 3, 80, 85, 'Tokoh Berakhlak 3 (Cukup)', NOW())
ON CONFLICT ("kategori", "ranking") DO NOTHING;

-- Step 7: Verify the migration
SELECT 
  'attendance' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN "jumlahTidakKerja" IS NOT NULL THEN 1 END) as with_jumlah_tk,
  COUNT(CASE WHEN "jumlahPulangAwal" IS NOT NULL THEN 1 END) as with_jumlah_psw
FROM "attendance"
UNION ALL
SELECT 
  'periods' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_periods,
  NULL as with_jumlah_psw
FROM "periods"
UNION ALL
SELECT 
  'evaluation_parameters' as table_name,
  COUNT(*) as record_count,
  COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_params,
  NULL as with_jumlah_psw
FROM "evaluation_parameters";