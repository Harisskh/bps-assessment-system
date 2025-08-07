// models/index.js - FIXED VERSION WITH PROPER ASSOCIATIONS
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // 🔥 FIXED: Destructured import

// Define all models
const models = {};

// =============================================
// USER MODEL
// =============================================
models.User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  nip: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nama: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('STAFF', 'ADMIN', 'PIMPINAN'),
    defaultValue: 'STAFF',
  },
  jenisKelamin: {
    type: DataTypes.ENUM('LK', 'PR'),
    allowNull: false,
  },
  tanggalLahir: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  alamat: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  mobilePhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  pendidikanTerakhir: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  jabatan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  golongan: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PNS',
  },
  instansi: {
    type: DataTypes.STRING,
    defaultValue: 'BPS Kabupaten Pringsewu',
  },
  kantor: {
    type: DataTypes.STRING,
    defaultValue: 'BPS Kabupaten Pringsewu',
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  adminExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  primaryRole: {
    type: DataTypes.STRING,
    defaultValue: 'STAFF',
  },
  roles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
}, {
  tableName: 'users',
  indexes: [
    { fields: ['nip'] },
    { fields: ['username'] },
    { fields: ['role'] },
    { fields: ['isActive'] },
  ],
});

// =============================================
// PERIOD MODEL
// =============================================
models.Period = sequelize.define('Period', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  tahun: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2050,
    },
  },
  bulan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 12,
    },
  },
  namaPeriode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'periods',
  indexes: [
    { 
      fields: ['tahun', 'bulan'],
      unique: true,
    },
    { fields: ['isActive'] },
  ],
});

// =============================================
// EVALUATION PARAMETER MODEL
// =============================================
models.EvaluationParameter = sequelize.define('EvaluationParameter', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  namaParameter: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  deskripsi: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  urutan: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8,
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'evaluation_parameters',
  indexes: [
    { fields: ['urutan'] },
    { fields: ['isActive'] },
  ],
});

// =============================================
// EVALUATION MODEL
// =============================================
models.Evaluation = sequelize.define('Evaluation', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  evaluatorId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  periodId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'periods',
      key: 'id',
    },
  },
  targetUserId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('DRAFT', 'SUBMITTED'),
    defaultValue: 'DRAFT',
  },
  submitDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'evaluations',
  indexes: [
    { 
      fields: ['evaluatorId', 'periodId', 'targetUserId'],
      unique: true,
    },
    { fields: ['status'] },
    { fields: ['periodId'] },
  ],
});

// =============================================
// EVALUATION SCORE MODEL
// =============================================
models.EvaluationScore = sequelize.define('EvaluationScore', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  evaluationId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'evaluations',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  parameterId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'evaluation_parameters',
      key: 'id',
    },
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 80,
      max: 100,
    },
  },
}, {
  tableName: 'evaluation_scores',
  indexes: [
    { 
      fields: ['evaluationId', 'parameterId'],
      unique: true,
    },
  ],
});

// =============================================
// ATTENDANCE MODEL
// =============================================
models.Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  periodId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'periods',
      key: 'id',
    },
  },
  persentaseTotal: {
    type: DataTypes.FLOAT,
    defaultValue: 100.0,
  },
  jumlahTidakKerja: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  jumlahPulangAwal: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  jumlahTelat: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  jumlahAbsenApel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  jumlahCuti: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0 },
  },
  penguranganTK: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  penguranganPSW: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  penguranganTLT: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  penguranganAPEL: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  penguranganCT: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  totalMinus: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
  },
  nilaiPresensi: {
    type: DataTypes.FLOAT,
    defaultValue: 100.0,
    validate: {
      min: 0,
      max: 100,
    },
  },
  keterangan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  inputBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  adaAbsenApel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  adaCuti: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  adaPulangAwal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  adaTelat: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  adaTidakKerja: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'attendance',
  indexes: [
    { 
      fields: ['userId', 'periodId'],
      unique: true,
    },
  ],
});

// =============================================
// CKP SCORE MODEL
// =============================================
models.CkpScore = sequelize.define('CkpScore', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  periodId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'periods',
      key: 'id',
    },
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
      max: 100,
    },
  },
  keterangan: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  inputBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'ckp_scores',
  indexes: [
    { 
      fields: ['userId', 'periodId'],
      unique: true,
    },
  ],
});

// =============================================
// FINAL EVALUATION MODEL
// =============================================
models.FinalEvaluation = sequelize.define('FinalEvaluation', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  periodId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'periods',
      key: 'id',
    },
  },
  berakhlakScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  presensiScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  ckpScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  berakhlakWeighted: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  presensiWeighted: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  ckpWeighted: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  finalScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  totalEvaluators: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isCandidate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  ranking: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isBestEmployee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'final_evaluations',
  indexes: [
    { 
      fields: ['userId', 'periodId'],
      unique: true,
    },
    { fields: ['finalScore'] },
    { fields: ['isCandidate'] },
    { fields: ['isBestEmployee'] },
  ],
});

// =============================================
// CERTIFICATE MODEL
// =============================================
models.Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  period_id: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'periods',
      key: 'id',
    },
  },
  certificate_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  template_generated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  template_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  template_type: {
    type: DataTypes.STRING,
    defaultValue: 'TTD_BASAH',
  },
  is_uploaded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  file_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('TEMPLATE_PENDING', 'TEMPLATE_GENERATED', 'PROCESSING', 'COMPLETED'),
    defaultValue: 'TEMPLATE_PENDING',
  },
  generated_by: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  uploaded_by: {
    type: DataTypes.STRING,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'certificates',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['period_id'] },
    { fields: ['status'] },
    { fields: ['user_id', 'period_id'] },
    { fields: ['template_type'] },
  ],
});

// =============================================
// 🔥 FIXED ASSOCIATIONS WITH PROPER ALIASES
// =============================================

// User associations - FIXED WITH PROPER ALIASES
models.User.hasMany(models.Evaluation, { 
  as: 'evaluationsGiven', 
  foreignKey: 'evaluatorId' 
});

models.User.hasMany(models.Evaluation, { 
  as: 'evaluationsReceived', 
  foreignKey: 'targetUserId' 
});

models.User.hasMany(models.Attendance, { 
  as: 'attendances',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.User.hasMany(models.CkpScore, { 
  as: 'ckpScores',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.User.hasMany(models.FinalEvaluation, { 
  as: 'finalEvaluations',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.User.hasMany(models.Certificate, { 
  as: 'certificates', 
  foreignKey: 'user_id' 
});

models.User.hasMany(models.Certificate, { 
  as: 'generatedCerts', 
  foreignKey: 'generated_by' 
});

models.User.hasMany(models.Certificate, { 
  as: 'uploadedCerts', 
  foreignKey: 'uploaded_by' 
});

// Period associations - FIXED WITH PROPER ALIASES
models.Period.hasMany(models.Evaluation, { 
  as: 'evaluations',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

models.Period.hasMany(models.Attendance, { 
  as: 'attendances',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

models.Period.hasMany(models.CkpScore, { 
  as: 'ckpScores',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

models.Period.hasMany(models.FinalEvaluation, { 
  as: 'finalEvaluations',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

models.Period.hasMany(models.Certificate, { 
  as: 'certificates',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'period_id' 
});

// Evaluation associations - ALREADY CORRECT
models.Evaluation.belongsTo(models.User, { 
  as: 'evaluator', 
  foreignKey: 'evaluatorId' 
});

models.Evaluation.belongsTo(models.User, { 
  as: 'target', 
  foreignKey: 'targetUserId' 
});

models.Evaluation.belongsTo(models.Period, { 
  as: 'period',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

models.Evaluation.hasMany(models.EvaluationScore, { 
  as: 'scores',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'evaluationId', 
  onDelete: 'CASCADE' 
});

// EvaluationScore associations - FIXED WITH ALIASES
models.EvaluationScore.belongsTo(models.Evaluation, { 
  as: 'evaluation',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'evaluationId' 
});

models.EvaluationScore.belongsTo(models.EvaluationParameter, { 
  as: 'parameter',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'parameterId' 
});

// EvaluationParameter associations
models.EvaluationParameter.hasMany(models.EvaluationScore, { 
  as: 'scores',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'parameterId' 
});

// Attendance associations - FIXED WITH ALIASES
models.Attendance.belongsTo(models.User, { 
  as: 'user',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.Attendance.belongsTo(models.Period, { 
  as: 'period',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

// CkpScore associations - FIXED WITH ALIASES
models.CkpScore.belongsTo(models.User, { 
  as: 'user',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.CkpScore.belongsTo(models.Period, { 
  as: 'period',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

// FinalEvaluation associations - FIXED WITH ALIASES
models.FinalEvaluation.belongsTo(models.User, { 
  as: 'user',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'userId' 
});

models.FinalEvaluation.belongsTo(models.Period, { 
  as: 'period',  // 🔥 FIXED: Added explicit alias
  foreignKey: 'periodId' 
});

// Certificate associations - ALREADY CORRECT
models.Certificate.belongsTo(models.User, { 
  as: 'user', 
  foreignKey: 'user_id' 
});

models.Certificate.belongsTo(models.Period, { 
  as: 'period', 
  foreignKey: 'period_id' 
});

models.Certificate.belongsTo(models.User, { 
  as: 'generatedByUser', 
  foreignKey: 'generated_by' 
});

models.Certificate.belongsTo(models.User, { 
  as: 'uploadedByUser', 
  foreignKey: 'uploaded_by' 
});

// Export models and sequelize instance
module.exports = {
  sequelize,
  ...models,
};