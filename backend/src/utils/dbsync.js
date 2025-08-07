const { sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Sync database and create initial data
 */
async function syncDatabase(options = {}) {
  const { force = false, seed = true } = options;
  
  console.log('🔄 Starting database synchronization...');
  
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log('✅ Database connection established.');
    
    // Sync all models
    await sequelize.sync({ force });
    console.log(`✅ Database ${force ? 'recreated' : 'synchronized'} successfully.`);
    
    if (seed) {
      await seedInitialData();
    }
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
}

/**
 * Seed initial data for development
 */
async function seedInitialData() {
  console.log('🌱 Seeding initial data...');
  
  const {
    User,
    Period,
    EvaluationParameter,
    AspekPenilaian,
    RentangNilai,
    SystemSetting
  } = require('../models');
  
  try {
    // Check if data already exists
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log('📋 Data already exists, skipping seed...');
      return;
    }
    
    // Hash passwords
    const defaultPassword = await bcrypt.hash('bps1810', 10);
    const adminPassword = await bcrypt.hash('admin1810', 10);
    const pimpinanPassword = await bcrypt.hash('pimpinan1810', 10);
    
    // =============================================
    // SEED EVALUATION PARAMETERS
    // =============================================
    const evaluationParams = [
      {
        namaParameter: 'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif',
        deskripsi: 'Menilai sikap pelayanan yang ramah dan solutif kepada masyarakat',
        urutan: 1,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Bertanggung Jawab, Disiplin, dan Jujur',
        deskripsi: 'Menilai tingkat tanggung jawab, disiplin, dan kejujuran dalam bekerja',
        urutan: 2,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan',
        deskripsi: 'Menilai profesionalisme dan semangat belajar serta berbagi ilmu',
        urutan: 3,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman',
        deskripsi: 'Menilai sikap saling membantu dan toleransi terhadap perbedaan',
        urutan: 4,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Menjaga Nama Baik BPS dan Berdedikasi',
        deskripsi: 'Menilai dedikasi dan komitmen menjaga reputasi institusi',
        urutan: 5,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan',
        deskripsi: 'Menilai kreativitas, inovasi, dan kemampuan adaptasi',
        urutan: 6,
        isActive: true,
      },
      {
        namaParameter: 'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja',
        deskripsi: 'Menilai kemampuan komunikasi dan kerjasama dalam tim',
        urutan: 7,
        isActive: true,
      },
      {
        namaParameter: 'Penampilan dan Kerapian',
        deskripsi: 'Menilai penampilan dan kerapian dalam berpakaian serta berperilaku',
        urutan: 8,
        isActive: true,
      }
    ];
    
    await EvaluationParameter.bulkCreate(evaluationParams);
    console.log('✅ Evaluation parameters seeded');
    
    // =============================================
    // SEED ASPEK PENILAIAN
    // =============================================
    const aspekPenilaian = [
      {
        namaAspek: 'Tokoh BerAKHLAK',
        deskripsi: 'Penilaian perilaku berdasarkan nilai-nilai BerAKHLAK',
        bobot: 0.30,
        urutan: 1,
        isActive: true,
      },
      {
        namaAspek: 'Rekap Ketidakhadiran',
        deskripsi: 'Penilaian kehadiran, ketepatan waktu, dan kedisiplinan',
        bobot: 0.40,
        urutan: 2,
        isActive: true,
      },
      {
        namaAspek: 'Rekap Capaian Kinerja Pegawai',
        deskripsi: 'Capaian Kinerja Pegawai berdasarkan target dan realisasi kerja',
        bobot: 0.30,
        urutan: 3,
        isActive: true,
      }
    ];
    
    await AspekPenilaian.bulkCreate(aspekPenilaian);
    console.log('✅ Aspek penilaian seeded');
    
    // =============================================
    // SEED RENTANG NILAI
    // =============================================
    const rentangNilai = [
      {
        kategori: 'berakhlak',
        ranking: 1,
        nilaiMin: 80,
        nilaiMax: 100,
        deskripsi: 'Rentang nilai untuk Tokoh BerAKHLAK (Single Category: 80-100)',
      }
    ];
    
    await RentangNilai.bulkCreate(rentangNilai);
    console.log('✅ Rentang nilai seeded');
    
    // =============================================
    // SEED PERIODS
    // =============================================
    const periods = [
      {
        tahun: 2025,
        bulan: 1,
        namaPeriode: 'Januari 2025',
        isActive: true,
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 31),
      },
      {
        tahun: 2025,
        bulan: 2,
        namaPeriode: 'Februari 2025',
        isActive: false,
        startDate: new Date(2025, 1, 1),
        endDate: new Date(2025, 1, 28),
      }
    ];
    
    await Period.bulkCreate(periods);
    console.log('✅ Periods seeded');
    
    // =============================================
    // SEED SYSTEM SETTINGS
    // =============================================
    const systemSettings = [
      {
        key: 'app_name',
        value: 'BPS Assessment System',
        description: 'SIPEKA Sistem Penilaian Kinerja Pegawai BPS',
      },
      {
        key: 'app_version',
        value: '2.0.0',
        description: 'Versi aplikasi (Single BerAKHLAK Category)',
      },
      {
        key: 'berakhlak_method',
        value: 'SINGLE_CATEGORY',
        description: 'Metode penilaian BerAKHLAK: SINGLE_CATEGORY',
      },
      {
        key: 'default_password',
        value: 'bps1810',
        description: 'Password default untuk user baru',
      }
    ];
    
    await SystemSetting.bulkCreate(systemSettings);
    console.log('✅ System settings seeded');
    
    // =============================================
    // SEED USERS
    // =============================================
    const users = [
      // Admin
      {
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
      },
      // Pimpinan
      {
        nip: '197309131994031004',
        nama: 'Eko Purnomo, SST., MM',
        jabatan: 'Kepala BPS Kabupaten/Kota',
        golongan: 'IV/b',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'eko.purnomo',
        role: 'PIMPINAN',
        password: pimpinanPassword,
        tanggalLahir: new Date(1973, 8, 13),
        email: 'eko.purnomo@bps.go.id',
        instansi: 'BPS Kabupaten Pringsewu',
        kantor: 'BPS Kabupaten Pringsewu',
        isActive: true,
        primaryRole: 'PIMPINAN',
        roles: ['PIMPINAN', 'STAFF'],
      },
      // Staff Sample
      {
        nip: '198810132010122005',
        nama: 'Resty Sopiyono, SST, M.E.K.K.',
        jabatan: 'Statistisi Ahli Madya BPS Kabupaten/Kota',
        golongan: 'IV/a',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'sresty',
        role: 'STAFF',
        password: defaultPassword,
        tanggalLahir: new Date(1988, 9, 13),
        email: 'sresty@bps.go.id',
        instansi: 'BPS Kabupaten Pringsewu',
        kantor: 'BPS Kabupaten Pringsewu',
        isActive: true,
        primaryRole: 'STAFF',
        roles: ['STAFF'],
      },
      {
        nip: '199405092016022001',
        nama: 'Fanisa Dwita Hanggarani, SST',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten/Kota',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'fanisa',
        role: 'STAFF',
        password: defaultPassword,
        tanggalLahir: new Date(1994, 4, 9),
        email: 'fanisa@bps.go.id',
        instansi: 'BPS Kabupaten Pringsewu',
        kantor: 'BPS Kabupaten Pringsewu',
        isActive: true,
        primaryRole: 'STAFF',
        roles: ['STAFF'],
      },
      {
        nip: '200006222023021004',  
        nama: 'Ahmad Rifjayansyah, S.Tr.Stat.',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten/Kota',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'ahmadrifjayansyah',
        role: 'STAFF',
        password: defaultPassword,
        tanggalLahir: new Date(2000, 5, 22),
        email: 'ahmadrifjayansyah@bps.go.id',
        instansi: 'BPS Kabupaten Pringsewu',
        kantor: 'BPS Kabupaten Pringsewu',
        isActive: true,
        primaryRole: 'STAFF',
        roles: ['STAFF'],
      }
    ];
    
    await User.bulkCreate(users);
    console.log('✅ Users seeded');
    
    console.log('🎉 Initial data seeding completed!');
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log('   👑 Admin: username="admin", password="admin1810"');
    console.log('   👨‍💼 Pimpinan: username="eko.purnomo", password="pimpinan1810"');
    console.log('   👥 Staff: username="[username]", password="bps1810"');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

/**
 * Drop all tables and recreate
 */
async function resetDatabase() {
  console.log('🔄 Resetting database...');
  await syncDatabase({ force: true, seed: true });
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection test successful.');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}

module.exports = {
  syncDatabase,
  seedInitialData,
  resetDatabase,
  testConnection
};