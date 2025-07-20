### 2. `database/schema.sql`
```sql
-- BPS Assessment System Database Schema
-- Generated from Prisma Schema
-- Date: 2025-01-XX
-- Version: 2.0.0 (Single BerAKHLAK Category)

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE "Role" AS ENUM ('STAFF', 'ADMIN', 'PIMPINAN');
CREATE TYPE "Gender" AS ENUM ('LK', 'PR');
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryRole" TEXT NOT NULL DEFAULT 'STAFF',
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "adminExpiry" TIMESTAMP(3),
    "jenisKelamin" "Gender" NOT NULL,
    "tanggalLahir" TIMESTAMP(3),
    "alamat" TEXT,
    "mobilePhone" TEXT,
    "pendidikanTerakhir" TEXT,
    "jabatan" TEXT,
    "golongan" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PNS',
    "instansi" TEXT NOT NULL DEFAULT 'BPS Kabupaten Pringsewu',
    "kantor" TEXT NOT NULL DEFAULT 'BPS Kabupaten Pringsewu',
    "username" TEXT NOT NULL,
    "profilePicture" TEXT,
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
    "bulan" INTEGER NOT NULL,
    "namaPeriode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- EVALUATION PARAMETERS (8 BerAKHLAK)
-- =============================================
CREATE TABLE "evaluation_parameters" (
    "id" TEXT NOT NULL,
    "namaParameter" TEXT NOT NULL,
    "deskripsi" TEXT,
    "urutan" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_parameters_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- EVALUATIONS TABLE (Single Category)
-- =============================================
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
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
    "score" INTEGER NOT NULL, -- 80-100 range
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- ATTENDANCE TABLE (Enhanced with Frequency)
-- =============================================
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "persentaseTotal" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    -- Boolean flags (compatibility)
    "adaTidakKerja" BOOLEAN NOT NULL DEFAULT false,
    "adaPulangAwal" BOOLEAN NOT NULL DEFAULT false,
    "adaTelat" BOOLEAN NOT NULL DEFAULT false,
    "adaAbsenApel" BOOLEAN NOT NULL DEFAULT false,
    "adaCuti" BOOLEAN NOT NULL DEFAULT false,
    -- Frequency counts
    "jumlahTidakKerja" INTEGER NOT NULL DEFAULT 0,
    "jumlahPulangAwal" INTEGER NOT NULL DEFAULT 0,
    "jumlahTelat" INTEGER NOT NULL DEFAULT 0,
    "jumlahAbsenApel" INTEGER NOT NULL DEFAULT 0,
    "jumlahCuti" INTEGER NOT NULL DEFAULT 0,
    -- Calculated deductions
    "penguranganTK" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "penguranganPSW" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "penguranganTLT" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "penguranganAPEL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "penguranganCT" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalMinus" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "nilaiPresensi" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "keterangan" TEXT,
    "inputBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CKP SCORES TABLE
-- =============================================
CREATE TABLE "ckp_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "keterangan" TEXT,
    "inputBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ckp_scores_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- FINAL EVALUATIONS TABLE (Single Category)
-- =============================================
CREATE TABLE "final_evaluations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "berakhlakScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presensiScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ckpScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "berakhlakWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presensiWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ckpWeighted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEvaluators" INTEGER NOT NULL DEFAULT 0,
    "isCandidate" BOOLEAN NOT NULL DEFAULT false,
    "ranking" INTEGER,
    "isBestEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_evaluations_pkey" PRIMARY KEY ("id")
);

-- =============================================
-- CERTIFICATE LOGS TABLE
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
-- UNIQUE CONSTRAINTS
-- =============================================
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "periods_tahun_bulan_key" ON "periods"("tahun", "bulan");
CREATE UNIQUE INDEX "evaluations_evaluatorId_periodId_targetUserId_key" ON "evaluations"("evaluatorId", "periodId", "targetUserId");
CREATE UNIQUE INDEX "evaluation_scores_evaluationId_parameterId_key" ON "evaluation_scores"("evaluationId", "parameterId");
CREATE UNIQUE INDEX "attendance_userId_periodId_key" ON "attendance"("userId", "periodId");
CREATE UNIQUE INDEX "ckp_scores_userId_periodId_key" ON "ckp_scores"("userId", "periodId");
CREATE UNIQUE INDEX "final_evaluations_userId_periodId_key" ON "final_evaluations"("userId", "periodId");

-- =============================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "evaluation_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "certificate_logs" ADD CONSTRAINT "certificate_logs_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;