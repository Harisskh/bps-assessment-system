-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'ADMIN', 'PIMPINAN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LK', 'PR');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "namaPeriode" TEXT NOT NULL,
    "noPeriode" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_parameters" (
    "id" TEXT NOT NULL,
    "namaParameter" TEXT NOT NULL,
    "deskripsi" TEXT,
    "urutan" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "ranking" INTEGER NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'DRAFT',
    "submitDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_scores" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "persentaseTotal" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "adaTidakKerja" BOOLEAN NOT NULL DEFAULT false,
    "adaPulangAwal" BOOLEAN NOT NULL DEFAULT false,
    "adaTelat" BOOLEAN NOT NULL DEFAULT false,
    "adaAbsenApel" BOOLEAN NOT NULL DEFAULT false,
    "adaCuti" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
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

-- CreateTable
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
    "tokoh1Count" INTEGER NOT NULL DEFAULT 0,
    "tokoh2Count" INTEGER NOT NULL DEFAULT 0,
    "tokoh3Count" INTEGER NOT NULL DEFAULT 0,
    "isCandidate" BOOLEAN NOT NULL DEFAULT false,
    "ranking" INTEGER,
    "isBestEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "final_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aspek_penilaian" (
    "id" TEXT NOT NULL,
    "namaAspek" TEXT NOT NULL,
    "deskripsi" TEXT,
    "bobot" DOUBLE PRECISION NOT NULL,
    "urutan" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aspek_penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentang_nilai" (
    "id" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "ranking" INTEGER NOT NULL,
    "nilaiMin" INTEGER NOT NULL,
    "nilaiMax" INTEGER NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rentang_nilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "periods_tahun_bulan_key" ON "periods"("tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_evaluatorId_periodId_targetUserId_key" ON "evaluations"("evaluatorId", "periodId", "targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluationId_parameterId_key" ON "evaluation_scores"("evaluationId", "parameterId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_userId_periodId_key" ON "attendance"("userId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "ckp_scores_userId_periodId_key" ON "ckp_scores"("userId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "final_evaluations_userId_periodId_key" ON "final_evaluations"("userId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "aspek_penilaian_namaAspek_key" ON "aspek_penilaian"("namaAspek");

-- CreateIndex
CREATE UNIQUE INDEX "rentang_nilai_kategori_ranking_key" ON "rentang_nilai"("kategori", "ranking");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_scores" ADD CONSTRAINT "evaluation_scores_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "evaluation_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ckp_scores" ADD CONSTRAINT "ckp_scores_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_evaluations" ADD CONSTRAINT "final_evaluations_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
