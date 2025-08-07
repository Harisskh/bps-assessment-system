'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🌱 Starting database seeding for BPS Assessment System...');

    // Hash passwords
    const defaultPassword = await bcrypt.hash('bps1810', 10);
    const adminPassword = await bcrypt.hash('admin1810', 10);
    const pimpinanPassword = await bcrypt.hash('pimpinan1810', 10);

    // =============================================
    // 1. SEED EVALUATION PARAMETERS
    // =============================================
    console.log('📋 Seeding Evaluation Parameters...');
    
    const evaluationParameters = [
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif',
        deskripsi: 'Menilai sikap pelayanan yang ramah dan solutif kepada masyarakat',
        urutan: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Bertanggung Jawab, Disiplin, dan Jujur',
        deskripsi: 'Menilai tingkat tanggung jawab, disiplin, dan kejujuran dalam bekerja',
        urutan: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan',
        deskripsi: 'Menilai profesionalisme dan semangat belajar serta berbagi ilmu',
        urutan: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman',
        deskripsi: 'Menilai sikap saling membantu dan toleransi terhadap perbedaan',
        urutan: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Menjaga Nama Baik BPS dan Berdedikasi',
        deskripsi: 'Menilai dedikasi dan komitmen menjaga reputasi institusi',
        urutan: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan',
        deskripsi: 'Menilai kreativitas, inovasi, dan kemampuan adaptasi',
        urutan: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja',
        deskripsi: 'Menilai kemampuan komunikasi dan kerjasama dalam tim',
        urutan: 7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaParameter: 'Penampilan dan Kerapian',
        deskripsi: 'Menilai penampilan dan kerapian dalam berpakaian serta berperilaku',
        urutan: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await queryInterface.bulkInsert('evaluation_parameters', evaluationParameters);

    // =============================================
    // 2. SEED ASPEK PENILAIAN
    // =============================================
    console.log('📊 Seeding Aspek Penilaian...');
    
    const aspekPenilaian = [
      {
        id: uuidv4(),
        namaAspek: 'Tokoh BerAKHLAK',
        deskripsi: 'Penilaian perilaku berdasarkan nilai-nilai BerAKHLAK',
        bobot: 0.30,
        urutan: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaAspek: 'Rekap Ketidakhadiran',
        deskripsi: 'Penilaian kehadiran, ketepatan waktu, dan kedisiplinan',
        bobot: 0.40,
        urutan: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        namaAspek: 'Rekap Capaian Kinerja Pegawai',
        deskripsi: 'Capaian Kinerja Pegawai berdasarkan target dan realisasi kerja',
        bobot: 0.30,
        urutan: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await queryInterface.bulkInsert('aspek_penilaian', aspekPenilaian);

    // =============================================
    // 3. SEED RENTANG NILAI
    // =============================================
    console.log('📈 Seeding Rentang Nilai...');
    
    const rentangNilai = [
      {
        id: uuidv4(),
        kategori: 'berakhlak',
        ranking: 1,
        nilaiMin: 80,
        nilaiMax: 100,
        deskripsi: 'Rentang nilai untuk Tokoh BerAKHLAK (Single Category: 80-100)',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await queryInterface.bulkInsert('rentang_nilai', rentangNilai);

    // =============================================
    // 4. SEED PERIODS
    // =============================================
    console.log('📅 Seeding Periods...');
    
    const periods = [
      {
        id: uuidv4(),
        tahun: 2025,
        bulan: 1,
        namaPeriode: 'Januari 2025',
        isActive: true,
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 31),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        tahun: 2025,
        bulan: 2,
        namaPeriode: 'Februari 2025',
        isActive: false,
        startDate: new Date(2025, 1, 1),
        endDate: new Date(2025, 1, 28),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        tahun: 2025,
        bulan: 3,
        namaPeriode: 'Maret 2025',
        isActive: false,
        startDate: new Date(2025, 2, 1),
        endDate: new Date(2025, 2, 31),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await queryInterface.bulkInsert('periods', periods);

    // =============================================
    // 5. SEED SYSTEM SETTINGS
    // =============================================
    console.log('⚙️ Seeding System Settings...');
    
    const systemSettings = [
      {
        id: uuidv4(),
        key: 'app_name',
        value: 'BPS Assessment System',
        description: 'SIPEKA Sistem Penilaian Kinerja Pegawai BPS',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        key: 'app_version',
        value: '2.0.0',
        description: 'Versi aplikasi (Single BerAKHLAK Category)',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        key: 'berakhlak_method',
        value: 'SINGLE_CATEGORY',
        description: 'Metode penilaian BerAKHLAK: SINGLE_CATEGORY',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        key: 'berakhlak_range',
        value: '80-100',
        description: 'Rentang nilai BerAKHLAK: 80-100',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        key: 'default_password',
        value: 'bps1810',
        description: 'Password default untuk user baru',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        key: 'min_evaluators_for_candidate',
        value: '3',
        description: 'Minimum jumlah pemilih untuk menjadi kandidat Best Employee',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    await queryInterface.bulkInsert('system_settings', systemSettings);

    // =============================================
    // 6. SEED USERS
    // =============================================
    console.log('👥 Seeding Users...');

    // Admin User
    const adminUser = {
      id: uuidv4(),
      nip: '000000000000000000',
      nama: 'Administrator System',
      email: 'admin@bps.go.id',
      password: adminPassword,
      role: 'ADMIN',
      jenisKelamin: 'LK',
      jabatan: 'Administrator System',
      golongan: 'IV/c',
      status: 'PNS',
      instansi: 'BPS Kabupaten Pringsewu',
      kantor: 'BPS Kabupaten Pringsewu',
      username: 'admin',
      isActive: true,
      primaryRole: 'ADMIN',
      roles: ['ADMIN'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await queryInterface.bulkInsert('users', [adminUser]);

    // Pegawai BPS (Real Data from BPS Pringsewu)
    const pegawaiBPS = [
  {
    id: uuidv4(),
    nip: '197309131994031004',
    nama: 'Eko Purnomo, SST., MM',
    jabatan: 'Kepala BPS Kabupaten/Kota',
    golongan: 'IV/b',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'eko.purnomo',
    role: 'PIMPINAN',
    password: pimpinanPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1973, 8, 13),
    email: 'eko.purnomo@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'PIMPINAN',
    roles: ['PIMPINAN', 'STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '197205201994031004',
    nama: 'Erwansyah Yusup',
    jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'erwansyah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1972, 4, 20),
    email: 'erwansyah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '197509032006041020',
    nama: 'Tri Budi Setiawan',
    jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'tri.bs',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1975, 8, 3),
    email: 'tri.bs@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198405212007011001',
    nama: 'Fazani',
    jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'fazani',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1984, 4, 21),
    email: 'fazani@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '197008032007012004',
    nama: 'Agistin Nafta',
    jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'agistin.nafta',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1970, 7, 3),
    email: 'agistin.nafta@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198002022009011010',
    nama: 'Saifu Rohmatullah',
    jabatan: 'Fungsional Umum BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'saifu.rohmatullah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1980, 1, 2),
    email: 'saifu.rohmatullah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198810132010122005',
    nama: 'Resty Sopiyono, SST, M.E.K.K.',
    jabatan: 'Statistisi Ahli Madya BPS Kabupaten/Kota',
    golongan: 'IV/a',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'sresty',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1988, 9, 13),
    email: 'sresty@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '197205231995121001',
    nama: 'Syamsul Bahri, S.Si',
    jabatan: 'Pranata Komputer Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'bahri.syamsul',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1972, 4, 23),
    email: 'bahri.syamsul@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '197007112003121003',
    nama: 'Andi Stiawan, SP',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'andi.stiawan',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1970, 6, 11),
    email: 'andi.stiawan@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198207182005022001',
    nama: 'Dewi Yuliana S., S.T.',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'dewiyuliana',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1982, 6, 18),
    email: 'dewiyuliana@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198506202007012005',
    nama: 'Fithriyah, SST',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'fitriyah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1985, 5, 20),
    email: 'fitriyah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198309022009022008',
    nama: 'Arum Pratiwi, SST',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'arump',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1983, 8, 2),
    email: 'arump@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198702162009022009',
    nama: 'Nisalasi Ikhsan Nurfathillah, SST',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'nisalasi',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1987, 1, 16),
    email: 'nisalasi@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198902082010121005',
    nama: 'Ahmad Rifki Febrianto, SST, M.EKK',
    jabatan: 'Pranata Komputer Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'arifki',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1989, 1, 8),
    email: 'arifki@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198005262011011005',
    nama: 'Muhamad Zaenuri, S.P.',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/d',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'muh.zaenuri',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1980, 4, 26),
    email: 'muh.zaenuri@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198908092013112001',
    nama: 'Dinny Pravitasari, SST, M.S.E.',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/c',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'dinnypravita',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1989, 7, 9),
    email: 'dinnypravita@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198410012011011013',
    nama: 'Surachman Budiarto, S.Si',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'budi.surachman',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1984, 9, 1),
    email: 'budi.surachman@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199405092016022001',
    nama: 'Fanisa Dwita Hanggarani, SST',
    jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'fanisa',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1994, 4, 9),
    email: 'fanisa@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199404202017012001',
    nama: 'Annisa Fauziatul Mardiyah, SST',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'annisa.mardiyah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1994, 3, 20),
    email: 'annisa.mardiyah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199707132019122001',
    nama: 'Sela Anisada, S.Tr.Stat.',
    jabatan: 'Pranata Komputer Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'sela.anisada',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1997, 6, 13),
    email: 'sela.anisada@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199910302022012002',
    nama: 'Esa Anindika Sari, S.Tr.Stat.',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'esa.anindika',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1999, 9, 30),
    email: 'esa.anindika@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199911292022012002',
    nama: 'Miftahul Husna, S.Tr.Stat.',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'miftahul.husna',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1999, 10, 29),
    email: 'miftahul.husna@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '200006222023021004',
    nama: 'Ahmad Rifjayansyah, S.Tr.Stat.',
    jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
    golongan: 'III/a',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'ahmadrifjayansyah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(2000, 5, 22),
    email: 'ahmadrifjayansyah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199304242024211005',
    nama: 'Riki Afrianto, A.Md.',
    jabatan: 'Pranata Komputer Terampil BPS Kabupaten/Kota',
    golongan: 'VII',
    status: 'PPPK',
    jenisKelamin: 'LK',
    username: 'rikiafrianto-pppk',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1993, 3, 24),
    email: 'rikiafrianto-pppk@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '200002092023022003',
    nama: 'Ayu Setianingsih, A.Md.Stat.',
    jabatan: 'Statistisi Terampil BPS Kabupaten/Kota',
    golongan: 'II/c',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'ayusetianingsih',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(2000, 1, 9),
    email: 'ayusetianingsih@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '200001262023022001',
    nama: 'Dini Alfitri Zahra, A.Md.Stat.',
    jabatan: 'Statistisi Terampil BPS Kabupaten/Kota',
    golongan: 'II/c',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'dinialfitrizahra',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(2000, 0, 26),
    email: 'dinialfitrizahra@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198605302009111001',
    nama: 'Singgih Adiwijaya, S.E., M.M.',
    jabatan: 'Analis Pengelolaan Keuangan APBN Ahli Muda Subbagian Umum',
    golongan: 'III/c',
    status: 'PNS',
    jenisKelamin: 'LK',
    username: 'singgih.adiwijaya',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1986, 4, 30),
    email: 'singgih.adiwijaya@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198512212012122002',
    nama: 'Diah Hadianing Putri, S.Si',
    jabatan: 'Statistisi Penyelia Subbagian Umum',
    golongan: 'III/c',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'diah.hp',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1985, 11, 21),
    email: 'diah.hp@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '198905052011012013',
    nama: 'Fitri Nurjanah, S.E., M.M.',
    jabatan: 'Pranata Keuangan APBN Mahir Subbagian Umum',
    golongan: 'III/b',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'fitri.nurjanah',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1989, 4, 5),
    email: 'fitri.nurjanah@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    nip: '199902142022012004',
    nama: 'Eklesia Valentia, A.Md.Kb.N.',
    jabatan: 'Pranata Keuangan APBN Terampil Subbagian Umum',
    golongan: 'II/c',
    status: 'PNS',
    jenisKelamin: 'PR',
    username: 'eklesia.valentia',
    role: 'STAFF',
    password: defaultPassword, // Ganti dengan variabel password Anda
    tanggalLahir: new Date(1999, 1, 14),
    email: 'eklesia.valentia@bps.go.id',
    instansi: 'BPS Kabupaten Pringsewu',
    kantor: 'BPS Kabupaten Pringsewu',
    isActive: true,
    primaryRole: 'STAFF',
    roles: ['STAFF'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

    await queryInterface.bulkInsert('users', pegawaiBPS);

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${evaluationParameters.length} Evaluation Parameters`);
    console.log(`   • ${aspekPenilaian.length} Aspek Penilaian`);
    console.log(`   • ${rentangNilai.length} Rentang Nilai (Single Category)`);
    console.log(`   • ${periods.length} Periods`);
    console.log(`   • ${systemSettings.length} System Settings`);
    console.log(`   • ${pegawaiBPS.length + 1} Users (including admin)`);
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log('   👑 Admin: username="admin", password="admin1810"');
    console.log('   👨‍💼 Pimpinan: username="eko.purnomo", password="pimpinan1810"');
    console.log('   👥 Staff: username="[username]", password="bps1810"');
  },

  down: async (queryInterface, Sequelize) => {
    // Delete in reverse order to avoid foreign key constraints
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('system_settings', null, {});
    await queryInterface.bulkDelete('periods', null, {});
    await queryInterface.bulkDelete('rentang_nilai', null, {});
    await queryInterface.bulkDelete('aspek_penilaian', null, {});
    await queryInterface.bulkDelete('evaluation_parameters', null, {});
  }
};