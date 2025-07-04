// seed.js
// Complete script untuk mengisi database BPS dengan data awal

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // =====================
    // 1. SEED EVALUATION PARAMETERS (8 Parameter BERAKHLAK)
    // =====================
    console.log('📋 Seeding Evaluation Parameters...');
    
    const evaluationParameters = [
      {
        namaParameter: 'Perilaku Melayani Sepenuh Hati, Ramah, dan Solutif',
        deskripsi: 'Menilai sikap pelayanan yang ramah dan solutif kepada masyarakat',
        urutan: 1,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Bertanggung Jawab, Disiplin, dan Jujur',
        deskripsi: 'Menilai tingkat tanggung jawab, disiplin, dan kejujuran dalam bekerja',
        urutan: 2,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Profesional, Senang Belajar, dan Berbagi Pengetahuan',
        deskripsi: 'Menilai profesionalisme dan semangat belajar serta berbagi ilmu',
        urutan: 3,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Suka Menolong, Toleransi, dan Menghargai Keberagaman',
        deskripsi: 'Menilai sikap saling membantu dan toleransi terhadap perbedaan',
        urutan: 4,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Menjaga Nama Baik BPS dan Berdedikasi',
        deskripsi: 'Menilai dedikasi dan komitmen menjaga reputasi institusi',
        urutan: 5,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Kreatif, Inovatif, dan Siap terhadap Perubahan',
        deskripsi: 'Menilai kreativitas, inovasi, dan kemampuan adaptasi',
        urutan: 6,
        isActive: true
      },
      {
        namaParameter: 'Perilaku Komunikatif dan Mampu Bekerja Sama antar Tim Kerja',
        deskripsi: 'Menilai kemampuan komunikasi dan kerjasama dalam tim',
        urutan: 7,
        isActive: true
      },
      {
        namaParameter: 'Penampilan dan Kerapian',
        deskripsi: 'Menilai penampilan dan kerapian dalam berpakaian serta berperilaku',
        urutan: 8,
        isActive: true
      }
    ];

    // Delete existing evaluation parameters first
    await prisma.evaluationParameter.deleteMany({});
    
    // Create new evaluation parameters
    await prisma.evaluationParameter.createMany({
      data: evaluationParameters,
      skipDuplicates: true
    });

    // =====================
    // 2. SEED ASPEK PENILAIAN
    // =====================
    console.log('📊 Seeding Aspek Penilaian...');
    
    const aspekPenilaian = [
      {
        namaAspek: 'Tokoh BerAKHLAK',
        deskripsi: 'Penilaian perilaku berdasarkan nilai-nilai BerAKHLAK (Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif)',
        bobot: 0.30,
        urutan: 1,
        isActive: true
      },
      {
        namaAspek: 'Presensi',
        deskripsi: 'Penilaian kehadiran, ketepatan waktu, dan kedisiplinan dalam bekerja',
        bobot: 0.40,
        urutan: 2,
        isActive: true
      },
      {
        namaAspek: 'CKP',
        deskripsi: 'Capaian Kinerja Pegawai berdasarkan target dan realisasi kerja',
        bobot: 0.30,
        urutan: 3,
        isActive: true
      }
    ];

    for (const aspek of aspekPenilaian) {
      await prisma.aspekPenilaian.upsert({
        where: { namaAspek: aspek.namaAspek },
        update: aspek,
        create: aspek
      });
    }

    // =====================
    // 3. SEED RENTANG NILAI
    // =====================
    console.log('📈 Seeding Rentang Nilai...');
    
    const rentangNilai = [
      {
        kategori: 'tokoh_ke_1',
        ranking: 1,
        nilaiMin: 96,
        nilaiMax: 100,
        deskripsi: 'Rentang nilai untuk Tokoh BerAKHLAK ke-1 (Sangat Baik)'
      },
      {
        kategori: 'tokoh_ke_2',
        ranking: 2,
        nilaiMin: 86,
        nilaiMax: 95,
        deskripsi: 'Rentang nilai untuk Tokoh BerAKHLAK ke-2 (Baik)'
      },
      {
        kategori: 'tokoh_ke_3',
        ranking: 3,
        nilaiMin: 80,
        nilaiMax: 85,
        deskripsi: 'Rentang nilai untuk Tokoh BerAKHLAK ke-3 (Cukup Baik)'
      }
    ];

    for (const rentang of rentangNilai) {
      await prisma.rentangNilai.upsert({
        where: { 
          kategori_ranking: {
            kategori: rentang.kategori,
            ranking: rentang.ranking
          }
        },
        update: rentang,
        create: rentang
      });
    }

    // =====================
    // 4. SEED PERIODS
    // =====================
    console.log('📅 Seeding Periods...');
    
    const currentDate = new Date();
    const periods = [
      {
        tahun: 2025,
        bulan: 1,
        namaPeriode: 'Januari 2025',
        noPeriode: 1,
        isActive: true,
        startDate: new Date(2025, 0, 1), // January 1, 2025
        endDate: new Date(2025, 0, 31)   // January 31, 2025
      },
      {
        tahun: 2025,
        bulan: 2,
        namaPeriode: 'Februari 2025',
        noPeriode: 2,
        isActive: false,
        startDate: new Date(2025, 1, 1), // February 1, 2025
        endDate: new Date(2025, 1, 28)   // February 28, 2025
      },
      {
        tahun: 2025,
        bulan: 3,
        namaPeriode: 'Maret 2025',
        noPeriode: 3,
        isActive: false,
        startDate: new Date(2025, 2, 1), // March 1, 2025
        endDate: new Date(2025, 2, 31)   // March 31, 2025
      }
    ];

    for (const period of periods) {
      await prisma.period.upsert({
        where: { 
          tahun_bulan: {
            tahun: period.tahun,
            bulan: period.bulan
          }
        },
        update: period,
        create: period
      });
    }

    // =====================
    // 5. SEED SYSTEM SETTINGS
    // =====================
    console.log('⚙️ Seeding System Settings...');
    
    const systemSettings = [
      {
        key: 'app_name',
        value: 'BPS Assessment System',
        description: 'Nama aplikasi sistem penilaian'
      },
      {
        key: 'app_version',
        value: '1.0.0',
        description: 'Versi aplikasi'
      },
      {
        key: 'evaluation_deadline_days',
        value: '7',
        description: 'Batas waktu pengisian evaluasi dalam hari'
      },
      {
        key: 'min_evaluators_for_candidate',
        value: '3',
        description: 'Minimum jumlah pemilih untuk menjadi kandidat Best Employee'
      },
      {
        key: 'max_candidates_shown',
        value: '10',
        description: 'Maksimal kandidat yang ditampilkan di leaderboard'
      },
      {
        key: 'default_password',
        value: 'bps2025',
        description: 'Password default untuk user baru'
      }
    ];

    for (const setting of systemSettings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, description: setting.description },
        create: setting
      });
    }

    // =====================
    // 6. SEED USERS (ADMIN + PEGAWAI BPS)
    // =====================
    console.log('👥 Seeding Users...');
    
    // Hash passwords
    const defaultPassword = await bcrypt.hash('bps2025', 10);
    const adminPassword = await bcrypt.hash('admin2025', 10);
    const pimpinanPassword = await bcrypt.hash('pimpinan2025', 10);

    // Admin User
    const adminUser = {
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
      isActive: true
    };

    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: adminUser
    });

    // Pegawai BPS (Real Data from BPS Pringsewu)
    const pegawaiBPS = [
      {
        nip: '197309131994031004',
        nama: 'Eko Purnomo, SST., MM',
        jabatan: 'Kepala BPS Kabupaten Pringsewu',
        golongan: 'IV/b',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'eko.purnomo',
        role: 'PIMPINAN',
        password: pimpinanPassword
      },
      {
        nip: '197205201994031004',
        nama: 'Erwansyah Yusup',
        jabatan: 'Fungsional Umum BPS Kabupaten Pringsewu',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'erwansyah',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '197509032006041020',
        nama: 'Tri Budi Setiawan',
        jabatan: 'Fungsional Umum BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'tri.bs',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198405212007011001',
        nama: 'Fazani',
        jabatan: 'Fungsional Umum BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'fazani',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '197008032007012004',
        nama: 'Agistin Nafta',
        jabatan: 'Fungsional Umum BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'agistin.nafta',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198002022009011010',
        nama: 'Saifu Rohmatullah',
        jabatan: 'Fungsional Umum BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'saifu.rohmatullah',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198810132010122005',
        nama: 'Resty Sopiyono, SST, M.E.K.K.',
        jabatan: 'Statistisi Ahli Madya BPS Kabupaten Pringsewu',
        golongan: 'IV/a',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'resty.sopiyono',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '197205231995121001',
        nama: 'Syamsul Bahri, S.Si',
        jabatan: 'Pranata Komputer Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'syamsul.bahri',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '197007112003121003',
        nama: 'Andi Stiawan, SP',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'andi.stiawan',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198207182005022001',
        nama: 'Dewi Yuliana S., S.T.',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'dewi.yuliana',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198506202007012005',
        nama: 'Fithriyah, SST',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'fithriyah',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198309022009022008',
        nama: 'Arum Pratiwi, SST',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'arum.pratiwi',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198702162009022009',
        nama: 'Nisalasi Ikhsan Nurfathillah, SST',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'nisalasi.ikhsan',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198902082010121005',
        nama: 'Ahmad Rifki Febrianto, SST, M.EKK',
        jabatan: 'Pranata Komputer Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'ahmad.rifki',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198005262011011005',
        nama: 'Muhamad Zaenuri, S.P.',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/d',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'muhamad.zaenuri',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198908092013112001',
        nama: 'Dinny Pravitasari, SST, M.S.E.',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/c',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'dinny.pravitasari',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '198410012011011013',
        nama: 'Surachman Budiarto, S.Si',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'surachman.budiarto',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199405092016022001',
        nama: 'Fanisa Dwita Hanggarani, SST',
        jabatan: 'Statistisi Ahli Muda BPS Kabupaten Pringsewu',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'fanisa.dwita',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199404202017012001',
        nama: 'Annisa Fauziatul Mardiyah, SST',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'annisa.mardiyah',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199707132019122001',
        nama: 'Sela Anisada, S.Tr.Stat.',
        jabatan: 'Pranata Komputer Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/b',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'sela.anisada',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199910302022012002',
        nama: 'Esa Anindika Sari, S.Tr.Stat.',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'esa.anindika',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199911292022012002',
        nama: 'Miftahul Husna, S.Tr.Stat.',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'miftahul.husna',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '200006222023021004',
        nama: 'Ahmad Rifjayansyah, S.Tr.Stat.',
        jabatan: 'Statistisi Ahli Pertama BPS Kabupaten Pringsewu',
        golongan: 'III/a',
        status: 'PNS',
        jenisKelamin: 'LK',
        username: 'ahmad.rifjayansyah',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '199304242024211005',
        nama: 'Riki Afrianto, A.Md.',
        jabatan: 'Pranata Komputer Terampil BPS Kabupaten Pringsewu',
        golongan: 'VII',
        status: 'PPPK',
        jenisKelamin: 'LK',
        username: 'riki.afrianto',
        role: 'STAFF',
        password: defaultPassword
      },
      {
        nip: '200002092023022003',
        nama: 'Ayu Setianingsih, A.Md.Stat.',
        jabatan: 'Statistisi Terampil BPS Kabupaten Pringsewu',
        golongan: 'II/c',
        status: 'PNS',
        jenisKelamin: 'PR',
        username: 'ayu.setianingsih',
        role: 'STAFF',
        password: defaultPassword
      }
    ];

    // Create all BPS employees
    for (const pegawai of pegawaiBPS) {
      await prisma.user.upsert({
        where: { username: pegawai.username },
        update: {},
        create: {
          nip: pegawai.nip,
          nama: pegawai.nama,
          email: `${pegawai.username}@bps.go.id`,
          password: pegawai.password,
          role: pegawai.role,
          jenisKelamin: pegawai.jenisKelamin,
          jabatan: pegawai.jabatan,
          golongan: pegawai.golongan,
          status: pegawai.status,
          instansi: 'BPS Kabupaten Pringsewu',
          kantor: 'BPS Kabupaten Pringsewu',
          username: pegawai.username,
          isActive: true
        }
      });
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${evaluationParameters.length} Evaluation Parameters`);
    console.log(`   • ${aspekPenilaian.length} Aspek Penilaian`);
    console.log(`   • ${rentangNilai.length} Rentang Nilai`);
    console.log(`   • ${periods.length} Periods`);
    console.log(`   • ${systemSettings.length} System Settings`);
    console.log(`   • ${pegawaiBPS.length + 1} Users (including admin)`);
    console.log('');
    console.log('🔑 Default Login Credentials:');
    console.log('   👑 Admin: username="admin", password="admin2025"');
    console.log('   👨‍💼 Pimpinan: username="eko.purnomo", password="pimpinan2025"');
    console.log('   👥 Staff: username="[username]", password="bps2025"');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other files
module.exports = { main };

// Run seeding if this file is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('🎉 Seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}