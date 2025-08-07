const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('🔄 Initializing Sequelize connection...');
console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  pool: {
    max: 15,
    min: 3,
    acquire:5000,
    idle: 30000,
  },
  
  define: {
    timestamps: true,
    underscored: false,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  
  // Enable foreign key constraints
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true,
  }
});

// Test connection function
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

// Export both sequelize instance and test function
module.exports = {
  sequelize,
  testConnection
};