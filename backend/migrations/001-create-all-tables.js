'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create ENUMS first
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_role" AS ENUM ('STAFF', 'ADMIN', 'PIMPINAN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_users_jenisKelamin" AS ENUM ('LK', 'PR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "EvaluationStatus" AS ENUM ('DRAFT', 'SUBMITTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "CertificateStatus" AS ENUM ('TEMPLATE_PENDING', 'TEMPLATE_GENERATED', 'PROCESSING', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      nip: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('STAFF', 'ADMIN', 'PIMPINAN'),
        defaultValue: 'STAFF',
      },
      jenisKelamin: {
        type: Sequelize.ENUM('LK', 'PR'),
        allowNull: false,
      },
      tanggalLahir: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      alamat: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mobilePhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pendidikanTerakhir: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      jabatan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      golongan: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'PNS',
      },
      instansi: {
        type: Sequelize.STRING,
        defaultValue: 'BPS Kabupaten Pringsewu',
      },
      kantor: {
        type: Sequelize.STRING,
        defaultValue: 'BPS Kabupaten Pringsewu',
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      profilePicture: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      adminExpiry: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      primaryRole: {
        type: Sequelize.STRING,
        defaultValue: 'STAFF',
      },
      roles: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create indexes for users
    await queryInterface.addIndex('users', ['nip']);
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['isActive']);

    // Create periods table
    await queryInterface.createTable('periods', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      tahun: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bulan: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      namaPeriode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for periods
    await queryInterface.addConstraint('periods', {
      fields: ['tahun', 'bulan'],
      type: 'unique',
      name: 'unique_tahun_bulan'
    });

    // Create evaluation_parameters table
    await queryInterface.createTable('evaluation_parameters', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      namaParameter: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create evaluations table
    await queryInterface.createTable('evaluations', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      evaluatorId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      periodId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'periods',
          key: 'id',
        },
      },
      targetUserId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      status: {
        type: Sequelize.ENUM('DRAFT', 'SUBMITTED'),
        defaultValue: 'DRAFT',
      },
      submitDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for evaluations
    await queryInterface.addConstraint('evaluations', {
      fields: ['evaluatorId', 'periodId', 'targetUserId'],
      type: 'unique',
      name: 'unique_evaluation'
    });

    // Create evaluation_scores table
    await queryInterface.createTable('evaluation_scores', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      evaluationId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'evaluations',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      parameterId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'evaluation_parameters',
          key: 'id',
        },
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for evaluation_scores
    await queryInterface.addConstraint('evaluation_scores', {
      fields: ['evaluationId', 'parameterId'],
      type: 'unique',
      name: 'unique_evaluation_parameter'
    });

    // Create attendance table
    await queryInterface.createTable('attendance', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      periodId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'periods',
          key: 'id',
        },
      },
      persentaseTotal: {
        type: Sequelize.FLOAT,
        defaultValue: 100.0,
      },
      jumlahTidakKerja: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      jumlahPulangAwal: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      jumlahTelat: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      jumlahAbsenApel: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      jumlahCuti: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      penguranganTK: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      penguranganPSW: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      penguranganTLT: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      penguranganAPEL: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      penguranganCT: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      totalMinus: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0,
      },
      nilaiPresensi: {
        type: Sequelize.FLOAT,
        defaultValue: 100.0,
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      inputBy: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      adaAbsenApel: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      adaCuti: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      adaPulangAwal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      adaTelat: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      adaTidakKerja: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for attendance
    await queryInterface.addConstraint('attendance', {
      fields: ['userId', 'periodId'],
      type: 'unique',
      name: 'unique_user_period_attendance'
    });

    // Create ckp_scores table
    await queryInterface.createTable('ckp_scores', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      periodId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'periods',
          key: 'id',
        },
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      inputBy: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for ckp_scores
    await queryInterface.addConstraint('ckp_scores', {
      fields: ['userId', 'periodId'],
      type: 'unique',
      name: 'unique_user_period_ckp'
    });

    // Create final_evaluations table
    await queryInterface.createTable('final_evaluations', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      periodId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'periods',
          key: 'id',
        },
      },
      berakhlakScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      presensiScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      ckpScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      berakhlakWeighted: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      presensiWeighted: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      ckpWeighted: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      finalScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },
      totalEvaluators: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      isCandidate: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      ranking: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      isBestEmployee: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for final_evaluations
    await queryInterface.addConstraint('final_evaluations', {
      fields: ['userId', 'periodId'],
      type: 'unique',
      name: 'unique_user_period_final'
    });

    // Create aspek_penilaian table
    await queryInterface.createTable('aspek_penilaian', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      namaAspek: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      bobot: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      urutan: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create rentang_nilai table
    await queryInterface.createTable('rentang_nilai', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      kategori: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ranking: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      nilaiMin: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      nilaiMax: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      deskripsi: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add unique constraint for rentang_nilai
    await queryInterface.addConstraint('rentang_nilai', {
      fields: ['kategori', 'ranking'],
      type: 'unique',
      name: 'unique_kategori_ranking'
    });

    // Create system_settings table
    await queryInterface.createTable('system_settings', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create certificates table
    await queryInterface.createTable('certificates', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      period_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'periods',
          key: 'id',
        },
      },
      certificate_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      template_generated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      template_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      template_type: {
        type: Sequelize.STRING,
        defaultValue: 'TTD_BASAH',
      },
      is_uploaded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('TEMPLATE_PENDING', 'TEMPLATE_GENERATED', 'PROCESSING', 'COMPLETED'),
        defaultValue: 'TEMPLATE_PENDING',
      },
      generated_by: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      uploaded_by: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for certificates
    await queryInterface.addIndex('certificates', ['period_id']);
    await queryInterface.addIndex('certificates', ['status']);
    await queryInterface.addIndex('certificates', ['user_id', 'period_id']);
    await queryInterface.addIndex('certificates', ['template_type']);

    // Add check constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE "evaluation_scores" ADD CONSTRAINT "check_score_range" 
        CHECK ("score" >= 80 AND "score" <= 100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "ckp_scores" ADD CONSTRAINT "check_ckp_score_range" 
        CHECK ("score" >= 0 AND "score" <= 100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "attendance" ADD CONSTRAINT "check_nilaiPresensi_range" 
        CHECK ("nilaiPresensi" >= 0 AND "nilaiPresensi" <= 100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "periods" ADD CONSTRAINT "check_bulan_range" 
        CHECK ("bulan" >= 1 AND "bulan" <= 12);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "periods" ADD CONSTRAINT "check_tahun_range" 
        CHECK ("tahun" >= 2020 AND "tahun" <= 2050);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "evaluation_parameters" ADD CONSTRAINT "check_urutan_range" 
        CHECK ("urutan" >= 1 AND "urutan" <= 8);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "attendance" ADD CONSTRAINT "check_frequency_non_negative" 
        CHECK ("jumlahTidakKerja" >= 0 AND "jumlahPulangAwal" >= 0 AND 
               "jumlahTelat" >= 0 AND "jumlahAbsenApel" >= 0 AND "jumlahCuti" >= 0);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to avoid foreign key constraint issues
    await queryInterface.dropTable('certificates');
    await queryInterface.dropTable('system_settings');
    await queryInterface.dropTable('rentang_nilai');
    await queryInterface.dropTable('aspek_penilaian');
    await queryInterface.dropTable('final_evaluations');
    await queryInterface.dropTable('ckp_scores');
    await queryInterface.dropTable('attendance');
    await queryInterface.dropTable('evaluation_scores');
    await queryInterface.dropTable('evaluations');
    await queryInterface.dropTable('evaluation_parameters');
    await queryInterface.dropTable('periods');
    await queryInterface.dropTable('users');

    // Drop enums
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "CertificateStatus"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "EvaluationStatus"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "Gender"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "Role"');
  }
};