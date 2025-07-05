// debug-check-users.js
// Script untuk cek user di database

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
        isActive: true
      },
      orderBy: { role: 'asc' }
    });

    console.log('📊 All Users:');
    allUsers.forEach(user => {
      console.log(`   ${user.role.padEnd(10)} | ${user.username.padEnd(20)} | ${user.nama} | Active: ${user.isActive}`);
    });

    console.log('\n🎯 Looking for Pimpinan user...');
    
    // Check specific pimpinan user
    const pimpinanUser = await prisma.user.findUnique({
      where: { username: 'eko.purnomo' }
    });

    if (pimpinanUser) {
      console.log('✅ Pimpinan user found:');
      console.log(`   ID: ${pimpinanUser.id}`);
      console.log(`   Username: ${pimpinanUser.username}`);
      console.log(`   Nama: ${pimpinanUser.nama}`);
      console.log(`   Role: ${pimpinanUser.role}`);
      console.log(`   Active: ${pimpinanUser.isActive}`);
      console.log(`   Email: ${pimpinanUser.email}`);
      
      // Test password
      console.log('\n🔐 Testing password...');
      const testPassword = 'pimpinan2025';
      const isPasswordValid = await bcrypt.compare(testPassword, pimpinanUser.password);
      console.log(`   Password "${testPassword}" is ${isPasswordValid ? '✅ VALID' : '❌ INVALID'}`);
      
    } else {
      console.log('❌ Pimpinan user NOT found!');
      console.log('   Username "eko.purnomo" does not exist in database');
      console.log('   Need to run seed again or create user manually');
    }

    // Check admin user for comparison
    console.log('\n🔧 Checking admin user for comparison...');
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (adminUser) {
      console.log('✅ Admin user found:');
      console.log(`   Username: ${adminUser.username}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Active: ${adminUser.isActive}`);
    } else {
      console.log('❌ Admin user NOT found!');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUsers()
  .then(() => {
    console.log('\n✅ User check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

// Usage: node debug-check-users.js