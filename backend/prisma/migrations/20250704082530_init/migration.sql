### `database/migration.sql` (Complete & Updated)
```sql
-- =============================================
-- BPS ASSESSMENT SYSTEM - COMPLETE MIGRATION SQL
-- Generated from Prisma Schema v2.0.0
-- Date: 2025-01-XX
-- Features: Single BerAKHLAK Category, Multi-Role, Enhanced Attendance, Certificate System
-- =============================================

-- Drop existing objects if they exist (for clean migration)
DROP TABLE IF EXISTS certificate_logs CASCADE;
DROP TABLE IF EXISTS final_evaluations CASCADE;
DROP TABLE IF EXISTS ckp_scores CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS evaluation_scores CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS evaluation_parameters CASCADE;
DROP TABLE IF EXISTS rentang_nilai CASCADE;
DROP TABLE IF EXISTS aspek_penilaian CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS periods CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop enums if they exist
DROP TYPE IF EXISTS "EvaluationStatus" CASCADE;
DROP TYPE IF EXISTS "Gender" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- =============================================
-- CREATE ENUMS
-- =============================================
CREATE TYPE "Role" AS ENUM ('STAFF', 'ADMIN', 'PIMPINAN');
CREATE TYPE "Gender" AS ENUM ('LK', 'PR');
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- =============================================
-- USERS TABLE (Enhanced with Multi-Role & Profile Picture)
-- =============================================
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    
    -- 🔥 NEW: Multi-Role System
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],     -- Array of roles: ["STAFF", "ADMIN"]
    "primaryRole" TEXT NOT NULL DEFAULT 'STAFF', -- Primary role for display
    "role" "Role" NOT NULL DEFAULT 'STAFF',      -- Keep for backward compatibility
    
    -- 🔥 NEW: Admin Expiry (Optional)
    "adminExpiry" TIMESTAMP(3),                  -- Auto-revoke admin role after this date
    
    "jenisKelamin" "Gender" NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "alamat" TEXT,
    "mobilePhone" TEXT,
    "pendidikanTerakhir" TEXT,
    "jabatan" TEXT,
    "golongan" TEXT,                             -- IV/b, III/a, etc.
    "status" TEXT NOT NULL DEFAULT 'PNS',       -- PNS, PPPK
    "instansi" TEXT NOT NULL DEFAULT 'BPS Kabupaten Pringsewu',
    "kantor" TEXT NOT NULL DEFAULT 'BPS Kabupaten Pringsewu',
    "username" TEXT NOT NULL,
    "profilePicture" TEXT,                       -- 🔥 NEW: Profile picture path
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- PERIODS TABLE
-- =============================================
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,                    -- 1-12
    "namaPeriode" TEXT NOT NULL,                 -- "Januari 2025", "Februari 2025"
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- EVALUATION PARAMETERS (8 Parameter BERAKHLAK)
-- =============================================
CREATE TABLE "evaluation_parameters" (
    "id" TEXT NOT NULL,
    "namaParameter" TEXT NOT NULL,
    "deskripsi" TEXT,
    "urutan" INTEGER NOT NULL,                   -- 1-8 (urutan parameter)
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_parameters_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- EVALUATIONS TABLE (🔥 UPDATED: Single Category - No Ranking Field)
-- =============================================
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    -- 🔥 REMOVED: ranking field - no longer needed for single category
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- EVALUATION SCORES TABLE
-- =============================================
CREATE TABLE "evaluation_scores" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,                    -- 🔥 UPDATED: 80-100 (single range for all)
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- ATTENDANCE TABLE (🔥 ENHANCED: With Frequency Counts)
-- =============================================
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    
    -- Persentase Total (default 100%)
    "persentaseTotal" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    
    -- 🔥 EXISTING: Boolean fields (keep for compatibility)
    "adaTidakKerja" BOOLEAN NOT NULL DEFAULT false,      -- TK - apakah ada tidak kerja
    "adaPulangAwal" BOOLEAN NOT NULL DEFAULT false,      -- PSW - apakah ada pulang sebelum waktunya
    "adaTelat" BOOLEAN NOT NULL DEFAULT false,           -- TLT - apakah ada telat
    "adaAbsenApel" BOOLEAN NOT NULL DEFAULT false,       -- APEL - apakah ada absen apel
    "adaCuti" BOOLEAN NOT NULL DEFAULT false,            -- CT - apakah ada cuti
    
    -- 🔥 NEW: Count fields (yang sudah ada di DB)
    "jumlahTidakKerja" INTEGER NOT NULL DEFAULT 0,       -- Berapa kali tidak kerja
    "jumlahPulangAwal" INTEGER NOT NULL DEFAULT 0,       -- Berapa kali pulang awal
    "jumlahTelat" INTEGER NOT NULL DEFAULT 0,            -- Berapa kali telat
    "jumlahAbsenApel" INTEGER NOT NULL DEFAULT 0,        -- Berapa kali absen apel
    "jumlahCuti" INTEGER NOT NULL DEFAULT 0,             -- Berapa kali cuti
    
    -- 🔥 CALCULATION: Pengurangan fields
    "penguranganTK" DOUBLE PRECISION NOT NULL DEFAULT 0.0,    -- -30% max
    "penguranganPSW" DOUBLE PRECISION NOT NULL DEFAULT 0.0,   -- -10% max  
    "penguranganTLT" DOUBLE PRECISION NOT NULL DEFAULT 0.0,   -- -10% max
    "penguranganAPEL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,  -- -10% max
    "penguranganCT" DOUBLE PRECISION NOT NULL DEFAULT 0.0,    -- -5% max
    
    -- Total Minus (otomatis calculated)
    "totalMinus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Nilai Final Presensi (100 - totalMinus)
    "nilaiPresensi" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    
    "keterangan" TEXT,
    "inputBy" TEXT NOT NULL,                             -- admin yang input
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CKP SCORES TABLE (30% bobot)
-- =============================================
CREATE TABLE "ckp_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,           -- 0-100
    "keterangan" TEXT,
    "inputBy" TEXT NOT NULL,                     -- admin yang input
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ckp_scores_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- FINAL EVALUATIONS TABLE (🔥 UPDATED: Single Category)
-- =============================================
CREATE TABLE "final_evaluations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    
    -- 🔥 UPDATED: Single BerAKHLAK score calculation
    "berakhlakScore" DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Direct total from single category
    "presensiScore" DOUBLE PRECISION NOT NULL DEFAULT 0,   -- From attendance (40% bobot)
    "ckpScore" DOUBLE PRECISION NOT NULL DEFAULT 0,        -- From CKP (30% bobot)
    
    -- 🔥 UPDATED: New calculation method - total can exceed 100
    "berakhlakWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,  -- berakhlakScore * 30%
    "presensiWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,   -- presensiScore * 40%
    "ckpWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,        -- ckpScore * 30%
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,         -- total weighted score (can be > 100)
    
    -- 🔥 UPDATED: Simplified statistics - no more tokoh1/2/3 count
    "totalEvaluators" INTEGER NOT NULL DEFAULT 0,             -- total yang memilih user ini
    
    -- Status kandidat
    "isCandidate" BOOLEAN NOT NULL DEFAULT false,             -- masuk kandidat berdasarkan jumlah pemilih
    "ranking" INTEGER,                                         -- ranking final
    "isBestEmployee" BOOLEAN NOT NULL DEFAULT false,          -- best employee of the month
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_evaluations_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CERTIFICATE SYSTEM (🔥 NEW)
-- =============================================
CREATE TABLE "certificate_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "certificate_number" VARCHAR(100) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    
    CONSTRAINT "certificate_logs_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- MASTER DATA & CONFIGURATION (🔥 UPDATED: Single Category)
-- =============================================
CREATE TABLE "aspek_penilaian" (
    "id" TEXT NOT NULL,
    "namaAspek" TEXT NOT NULL,
    "deskripsi" TEXT,
    "bobot" DOUBLE PRECISION NOT NULL,           -- 0.3 untuk BerAKHLAK, 0.4 untuk Presensi, 0.3 untuk CKP
    "urutan" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aspek_penilaian_pkey" PRIMARY KEY ("id")
);

-- 🔥 UPDATED: Single range for BerAKHLAK
CREATE TABLE "rentang_nilai" (
    "id" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,                    -- "berakhlak" (single category)
    "ranking" INTEGER NOT NULL,                  -- 1 (single ranking)
    "nilaiMin" INTEGER NOT NULL,                 -- 80
    "nilaiMax" INTEGER NOT NULL,                 -- 100
    "deskripsi" TEXT,                            -- "Tokoh BerAKHLAK"
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rentang_nilai_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- SYSTEM SETTINGS
-- =============================================
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CREATE UNIQUE INDEXES
-- =============================================
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "periods_tahun_bulan_key" ON "periods"("tahun", "bulan");

-- 🔥 UPDATED: Remove ranking from unique constraint (single category)
CREATE UNIQUE INDEX "evaluations_evaluatorId_periodId_targetUserId_key" ON "evaluations"("evaluatorId", "periodId", "targetUserId");

CREATE UNIQUE INDEX "evaluation_scores_evaluationId_parameterId_key" ON "evaluation_scores"("evaluationId", "parameterId");
CREATE UNIQUE INDEX "attendance_userId_periodId_key" ON "attendance"("userId", "periodId");
CREATE UNIQUE INDEX "ckp_scores_userId_periodId_key" ON "ckp_scores"("userId", "periodId");
CREATE UNIQUE INDEX "final_evaluations_userId_periodId_key" ON "final_evaluations"("userId", "periodId");
CREATE UNIQUE INDEX "aspek_penilaian_namaAspek_key" ON "aspek_penilaian"("namaAspek");
CREATE UNIQUE INDEX "rentang_nilai_kategori_ranking_key" ON "rentang_nilai"("kategori", "ranking");
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- =============================================
-- CREATE PERFORMANCE INDEXES
-- =============================================
-- Indexes for common queries
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
CREATE INDEX "periods_isActive_idx" ON "periods"("isActive");
CREATE INDEX "evaluations_periodId_idx" ON "evaluations"("periodId");
CREATE INDEX "evaluations_targetUserId_idx" ON "evaluations"("targetUserId");
CREATE INDEX "evaluations_evaluatorId_idx" ON "evaluations"("evaluatorId");
CREATE INDEX "evaluations_status_idx" ON "evaluations"("status");
CREATE INDEX "final_evaluations_periodId_idx" ON "final_evaluations"("periodId");
CREATE INDEX "final_evaluations_isCandidate_idx" ON "final_evaluations"("isCandidate");
CREATE INDEX "final_evaluations_isBestEmployee_idx" ON "final_evaluations"("isBestEmployee");
CREATE INDEX "certificate_logs_period_id_idx" ON "certificate_logs"("period_id");
CREATE INDEX "certificate_logs_user_id_idx" ON "certificate_logs"("user_id");

-- =============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- =============================================
-- Users relationships
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatorId_fkey" 
    FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_targetUserId_fkey" 
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Certificate relationships
ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_generated_by_fkey" 
    FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Period relationships  
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_periodId_fkey" 
    FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance" ADD CONSTRAINT "attendance_periodId_fkey" 
    FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_periodId_fkey" 
    FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_periodId_fkey" 
    FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_period_id_fkey" 
    FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Evaluation relationships
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluationId_fkey" 
    FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_parameterId_fkey" 
    FOREIGN KEY ("parameterId") REFERENCES "evaluation_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- ADD CHECK CONSTRAINTS FOR DATA INTEGRITY
-- =============================================
-- Score range constraints
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "check_score_range" 
    CHECK ("score" >= 80 AND "score" <= 100);

ALTER TABLE "ckp_scores" ADD CONSTRAINT "check_ckp_score_range" 
    CHECK ("score" >= 0 AND "score" <= 100);

ALTER TABLE "attendance" ADD CONSTRAINT "check_nilaiPresensi_range" 
    CHECK ("nilaiPresensi" >= 0 AND "nilaiPresensi" <= 100);

-- Period constraints
ALTER TABLE "periods" ADD CONSTRAINT "check_bulan_range" 
    CHECK ("bulan" >= 1 AND "bulan" <= 12);

ALTER TABLE "periods" ADD CONSTRAINT "check_tahun_range" 
    CHECK ("tahun" >= 2020 AND "tahun" <= 2050);

-- Evaluation parameter constraints
ALTER TABLE "evaluation_parameters" ADD CONSTRAINT "check_urutan_range" 
    CHECK ("urutan" >= 1 AND "urutan" <= 8);

-- Attendance frequency constraints (non-negative)
ALTER TABLE "attendance" ADD CONSTRAINT "check_frequency_non_negative" 
    CHECK ("jumlahTidakKerja" >= 0 AND "jumlahPulangAwal" >= 0 AND 
           "jumlahTelat" >= 0 AND "jumlahAbsenApel" >= 0 AND "jumlahCuti" >= 0);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE "users" IS 'Master data pegawai BPS dengan sistem multi-role';
COMMENT ON TABLE "periods" IS 'Periode penilaian bulanan';
COMMENT ON TABLE "evaluation_parameters" IS '8 parameter BerAKHLAK untuk penilaian';
COMMENT ON TABLE "evaluations" IS 'Penilaian tokoh berakhlak (single category)';
COMMENT ON TABLE "evaluation_scores" IS 'Detail skor per parameter (80-100)';
COMMENT ON TABLE "attendance" IS 'Data presensi dengan sistem frekuensi bertingkat';
COMMENT ON TABLE "ckp_scores" IS 'Capaian Kinerja Pegawai';
COMMENT ON TABLE "final_evaluations" IS 'Hasil akhir perhitungan best employee';
COMMENT ON TABLE "certificate_logs" IS 'Log sertifikat best employee';

COMMENT ON COLUMN "users"."roles" IS 'Array roles untuk multi-role system';
COMMENT ON COLUMN "users"."primaryRole" IS 'Primary role untuk display';
COMMENT ON COLUMN "users"."adminExpiry" IS 'Tanggal expiry untuk admin role temporary';
COMMENT ON COLUMN "users"."profilePicture" IS 'Path file foto profil';

COMMENT ON COLUMN "attendance"."jumlahTidakKerja" IS 'Frekuensi tidak kerja dalam periode';
COMMENT ON COLUMN "attendance"."jumlahPulangAwal" IS 'Frekuensi pulang sebelum waktunya';
COMMENT ON COLUMN "attendance"."jumlahTelat" IS 'Frekuensi keterlambatan';
COMMENT ON COLUMN "attendance"."jumlahAbsenApel" IS 'Frekuensi absen apel';
COMMENT ON COLUMN "attendance"."jumlahCuti" IS 'Frekuensi penggunaan cuti';

COMMENT ON COLUMN "evaluation_scores"."score" IS 'Skor 80-100 untuk single BerAKHLAK category';
COMMENT ON COLUMN "final_evaluations"."totalEvaluators" IS 'Total penilai untuk kandidat best employee';

-- =============================================
-- MIGRATION COMPLETION MESSAGE
-- =============================================
DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ===== BPS ASSESSMENT SYSTEM MIGRATION COMPLETED =====';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Features:';
    RAISE NOTICE '   • Single BerAKHLAK Category (80-100 score range)';
    RAISE NOTICE '   • Multi-Role System (STAFF, ADMIN, PIMPINAN)';
    RAISE NOTICE '   • Enhanced Attendance with Frequency Tracking';
    RAISE NOTICE '   • Certificate System for Best Employees';
    RAISE NOTICE '   • Performance Indexes for Fast Queries';
    RAISE NOTICE '   • Data Integrity Constraints';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next Steps:';
    RAISE NOTICE '   1. Run: npx prisma generate';
    RAISE NOTICE '   2. Run: npx prisma db seed';
    RAISE NOTICE '   3. Verify: npx prisma studio';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Tables Created:';
    RAISE NOTICE '   • users (with multi-role & profile picture)';
    RAISE NOTICE '   • periods (evaluation periods)';
    RAISE NOTICE '   • evaluation_parameters (8 BerAKHLAK parameters)';
    RAISE NOTICE '   • evaluations (single category evaluations)';
    RAISE NOTICE '   • evaluation_scores (80-100 scores)';
    RAISE NOTICE '   • attendance (enhanced with frequency counts)';
    RAISE NOTICE '   • ckp_scores (performance scores)';
    RAISE NOTICE '   • final_evaluations (best employee calculation)';
    RAISE NOTICE '   • certificate_logs (certificate audit trail)';
    RAISE NOTICE '   • aspek_penilaian (evaluation aspects config)';
    RAISE NOTICE '   • rentang_nilai (score ranges config)';
    RAISE NOTICE '   • system_settings (application settings)';
    RAISE NOTICE '';
    RAISE NOTICE '🏢 BPS Kabupaten Pringsewu - Ready for Assessment! 🏢';
    RAISE NOTICE '';
END $;