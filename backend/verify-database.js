/**
 * Database Verification Script
 * Run this to verify your database connection and setup
 * Usage: node verify-database.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'korean_with_us',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function verifyDatabase() {
  console.log('🔍 Verifying database setup...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('   ✅ Database connection successful\n');

    // Check tables exist
    console.log('2. Checking required tables...');
    const tables = [
      'users', 'courses', 'enrollments', 'lectures', 
      'schedules', 'timetable', 'roles', 'permissions'
    ];
    
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (result.rows[0].exists) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' MISSING - Run migrations!`);
      }
    }
    console.log('');

    // Check for MOCK_MODE
    console.log('3. Checking environment configuration...');
    if (process.env.MOCK_MODE === 'true') {
      console.log('   ⚠️  WARNING: MOCK_MODE is enabled!');
      console.log('   ⚠️  Data will NOT be saved to database.');
      console.log('   ⚠️  Remove MOCK_MODE from .env file.\n');
    } else {
      console.log('   ✅ MOCK_MODE is disabled (database mode)\n');
    }

    // Check sample data
    console.log('4. Checking sample data...');
    const [userCount, courseCount, enrollmentCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM courses'),
      pool.query('SELECT COUNT(*) as count FROM enrollments')
    ]);

    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Courses: ${courseCount.rows[0].count}`);
    console.log(`   Enrollments: ${enrollmentCount.rows[0].count}\n`);

    // Check password hashing
    console.log('5. Checking password hashing...');
    const userWithPassword = await pool.query(
      "SELECT password_hash FROM users WHERE password_hash IS NOT NULL LIMIT 1"
    );
    
    if (userWithPassword.rows.length > 0) {
      const hash = userWithPassword.rows[0].password_hash;
      if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
        console.log('   ✅ Passwords are properly hashed (bcrypt)\n');
      } else {
        console.log('   ⚠️  WARNING: Passwords may not be hashed correctly\n');
      }
    } else {
      console.log('   ℹ️  No users with passwords found\n');
    }

    console.log('✅ Database verification complete!');
    console.log('\nNext steps:');
    console.log('1. Ensure MOCK_MODE is NOT set in .env');
    console.log('2. Run all migrations if tables are missing');
    console.log('3. Start the backend server');
    console.log('4. Test creating a user and verify it saves to database');

  } catch (error) {
    console.error('❌ Database verification failed:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check database is running');
    console.error('2. Verify .env file has correct database credentials');
    console.error('3. Ensure database "korean_with_us" exists');
  } finally {
    await pool.end();
  }
}

verifyDatabase();

