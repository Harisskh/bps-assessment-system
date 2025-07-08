// Prisma Schema untuk Sistem BPS Pringsewu - REFINED VERSION
// File: prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =====================
// USER MANAGEMENT
// =====================

model User {
  id                String   @id @default(cuid())
  nip               String   @unique
  nama              String
  email             String?  
  password          String
  role              Role     @default(STAFF)
  jenisKelamin      Gender
  tanggalLahir      DateTime?
  alamat            String?
  mobilePhone       String?
  pendidikanTerakhir String?
  jabatan           String?
  golongan          String?   // IV/b, III/a, etc.
  status            String   @default("PNS") // PNS, PPPK
  instansi          String   @default("BPS Kabupaten Pringsewu")
  kantor            String   @default("BPS Kabupaten Pringsewu")
  username          String   @unique
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  evaluationsGiven    Evaluation[] @relation("Evaluator")
  evaluationsReceived Evaluation[] @relation("Target")
  attendances         Attendance[]
  ckpScores          CkpScore[]
  finalEvaluations   FinalEvaluation[]

  @@map("users")
}

enum Role {
  STAFF
  ADMIN
  PIMPINAN
}

enum Gender {
  LK
  PR
}

// =====================
// PERIOD MANAGEMENT
// =====================

model Period {
  id           String   @id @default(cuid())
  tahun        Int
  bulan        Int      // 1-12
  namaPeriode  String   // "Januari 2025", "Februari 2025"
  noPeriode    Int?     // urutan periode dalam tahun
  isActive     Boolean  @default(false)
  startDate    DateTime?
  endDate      DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  evaluations      Evaluation[]
  attendances      Attendance[]
  ckpScores       CkpScore[]
  finalEvaluations FinalEvaluation[]

  @@unique([tahun, bulan])
  @@map("periods")
}

// =====================
// EVALUATION PARAMETERS (8 Parameter BERAKHLAK)
// =====================

model EvaluationParameter {
  id            String   @id @default(cuid())
  namaParameter String
  deskripsi     String?
  urutan        Int      // 1-8 (urutan parameter)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  // Relations
  evaluationScores EvaluationScore[]

  @@map("evaluation_parameters")
}

// =====================
// TOKOH BERAKHLAK EVALUATION SYSTEM
// =====================

model Evaluation {
  id           String            @id @default(cuid())
  evaluatorId  String
  periodId     String
  targetUserId String
  ranking      Int               // 1, 2, 3 (tokoh ke-1, ke-2, ke-3)
  status       EvaluationStatus  @default(DRAFT)
  submitDate   DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  // Relations
  evaluator User   @relation("Evaluator", fields: [evaluatorId], references: [id])
  target    User   @relation("Target", fields: [targetUserId], references: [id])
  period    Period @relation(fields: [periodId], references: [id])
  scores    EvaluationScore[]

  @@unique([evaluatorId, periodId, targetUserId])
  @@map("evaluations")
}

model EvaluationScore {
  id           String @id @default(cuid())
  evaluationId String
  parameterId  String
  score        Int    // 80-100 (sesuai rentang tokoh ke-1/2/3)
  createdAt    DateTime @default(now())

  // Relations
  evaluation Evaluation          @relation(fields: [evaluationId], references: [id], onDelete: Cascade)
  parameter  EvaluationParameter @relation(fields: [parameterId], references: [id])

  @@unique([evaluationId, parameterId])
  @@map("evaluation_scores")
}

enum EvaluationStatus {
  DRAFT
  SUBMITTED
}

// =====================
// ATTENDANCE SYSTEM (40% bobot)
// =====================

model Attendance {
  id         String   @id @default(cuid())
  userId     String
  periodId   String
  
  // Persentase Total (default 100%)
  persentaseTotal Float @default(100.0)
  
  // Input boolean untuk tracking pelanggaran (compatibility)
  adaTidakKerja      Boolean @default(false)  // TK - apakah ada tidak kerja
  adaPulangAwal      Boolean @default(false)  // PSW - apakah ada pulang sebelum waktunya
  adaTelat           Boolean @default(false)  // TLT - apakah ada telat
  adaAbsenApel       Boolean @default(false)  // APEL - apakah ada absen apel
  adaCuti            Boolean @default(false)  // CT - apakah ada cuti
  
  // NEW: Input angka untuk jumlah pelanggaran
  jumlahTidakKerja   Int @default(0)          // Berapa kali tidak kerja
  jumlahPulangAwal   Int @default(0)          // Berapa kali pulang awal
  jumlahTelat        Int @default(0)          // Berapa kali telat
  jumlahAbsenApel    Int @default(0)          // Berapa kali absen apel
  jumlahCuti         Int @default(0)          // Berapa kali cuti
  
  // Pengurangan otomatis berdasarkan boolean di atas
  penguranganTK      Float @default(0.0)    // -30% max
  penguranganPSW     Float @default(0.0)    // -10% max  
  penguranganTLT     Float @default(0.0)    // -10% max
  penguranganAPEL    Float @default(0.0)    // -10% max
  penguranganCT      Float @default(0.0)    // -5% max
  
  // Total Minus (otomatis calculated)
  totalMinus      Float @default(0.0)
  
  // Nilai Final Presensi (100 - totalMinus)
  nilaiPresensi   Float @default(100.0)
  
  keterangan String?
  inputBy    String  // admin yang input
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user   User   @relation(fields: [userId], references: [id])
  period Period @relation(fields: [periodId], references: [id])

  @@unique([userId, periodId])
  @@map("attendance")
}

// =====================
// CKP SYSTEM (30% bobot)
// =====================

model CkpScore {
  id         String   @id @default(cuid())
  userId     String
  periodId   String
  score      Float    // 0-100
  keterangan String?
  inputBy    String   // admin yang input
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  user   User   @relation(fields: [userId], references: [id])
  period Period @relation(fields: [periodId], references: [id])

  @@unique([userId, periodId])
  @@map("ckp_scores")
}

// =====================
// FINAL EVALUATION & BEST EMPLOYEE
// =====================

model FinalEvaluation {
  id               String   @id @default(cuid())
  userId           String
  periodId         String
  
  // Skor per aspek
  berakhlakScore   Float    @default(0)  // Hasil rata-rata dari 3 kategori tokoh berakhlak
  presensiScore    Float    @default(0)  // Dari attendance (40% bobot)
  ckpScore         Float    @default(0)  // Dari CKP (30% bobot)
  
  // Skor final dengan bobot
  berakhlakWeighted Float   @default(0)  // berakhlakScore * 30%
  presensiWeighted  Float   @default(0)  // presensiScore * 40%
  ckpWeighted       Float   @default(0)  // ckpScore * 30%
  finalScore        Float   @default(0)  // total weighted score
  
  // Statistik pemilihan
  totalEvaluators   Int     @default(0)  // total yang memilih user ini
  tokoh1Count       Int     @default(0)  // berapa yang pilih sebagai tokoh 1
  tokoh2Count       Int     @default(0)  // berapa yang pilih sebagai tokoh 2
  tokoh3Count       Int     @default(0)  // berapa yang pilih sebagai tokoh 3
  
  // Status kandidat
  isCandidate       Boolean @default(false) // masuk kandidat berdasarkan jumlah pemilih
  ranking           Int?                     // ranking final
  isBestEmployee    Boolean @default(false)  // best employee of the month
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  user   User   @relation(fields: [userId], references: [id])
  period Period @relation(fields: [periodId], references: [id])

  @@unique([userId, periodId])
  @@map("final_evaluations")
}

// =====================
// MASTER DATA & CONFIGURATION
// =====================

model AspekPenilaian {
  id            String   @id @default(cuid())
  namaAspek     String   @unique
  deskripsi     String?
  bobot         Float    // 0.3 untuk BerAKHLAK, 0.4 untuk Presensi, 0.3 untuk CKP
  urutan        Int
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())

  @@map("aspek_penilaian")
}

model RentangNilai {
  id         String   @id @default(cuid())
  kategori   String   // "tokoh_ke_1", "tokoh_ke_2", "tokoh_ke_3"
  ranking    Int      // 1, 2, 3
  nilaiMin   Int      // 96, 86, 80
  nilaiMax   Int      // 100, 95, 85
  deskripsi  String?  // "Tokoh Berakhlak Terbaik", dst
  createdAt  DateTime @default(now())

  @@unique([kategori, ranking])
  @@map("rentang_nilai")
}

// =====================
// SYSTEM SETTINGS
// =====================

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("system_settings")
}