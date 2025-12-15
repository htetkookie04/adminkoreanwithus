#!/usr/bin/env node

/**
 * Debugging script for 500 Internal Server Errors
 * Run this script to check common issues that cause 500 errors
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checks = [];

// Check 1: Environment Variables
function checkEnvVars() {
  console.log('\n📋 Checking Environment Variables...');
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = [];
  
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
      console.log(`  ❌ ${key}: Missing`);
    } else {
      const value = key === 'JWT_SECRET' ? '***hidden***' : process.env[key];
      console.log(`  ✅ ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    }
  });
  
  if (missing.length > 0) {
    checks.push({ name: 'Environment Variables', status: 'FAIL', issues: missing });
  } else {
    checks.push({ name: 'Environment Variables', status: 'PASS' });
  }
}

// Check 2: Database Connection
async function checkDatabaseConnection() {
  console.log('\n🔌 Checking Database Connection...');
  try {
    await prisma.$connect();
    console.log('  ✅ Database connection: Success');
    checks.push({ name: 'Database Connection', status: 'PASS' });
  } catch (error) {
    console.log('  ❌ Database connection: Failed');
    console.log(`     Error: ${error.message}`);
    checks.push({ 
      name: 'Database Connection', 
      status: 'FAIL', 
      issues: [error.message] 
    });
    return false;
  }
  return true;
}

// Check 3: Required Tables Exist
async function checkTables() {
  console.log('\n📊 Checking Required Tables...');
  const requiredTables = ['Course', 'Lecture', 'User', 'Enrollment'];
  const missing = [];
  
  for (const table of requiredTables) {
    try {
      // Try to query the table
      const model = prisma[table.toLowerCase()];
      if (!model) {
        missing.push(table);
        console.log(`  ❌ ${table}: Model not found in Prisma Client`);
        continue;
      }
      
      // Try a simple count query
      await model.findFirst();
      console.log(`  ✅ ${table}: Exists`);
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('Unknown model')) {
        missing.push(table);
        console.log(`  ❌ ${table}: Table does not exist`);
      } else {
        // Other errors might be OK (e.g., no data)
        console.log(`  ✅ ${table}: Exists (query error: ${error.message.substring(0, 50)})`);
      }
    }
  }
  
  if (missing.length > 0) {
    checks.push({ 
      name: 'Database Tables', 
      status: 'FAIL', 
      issues: [`Missing tables: ${missing.join(', ')}`] 
    });
  } else {
    checks.push({ name: 'Database Tables', status: 'PASS' });
  }
}

// Check 4: Prisma Client Status
async function checkPrismaClient() {
  console.log('\n🔧 Checking Prisma Client...');
  try {
    // Try to query a simple table
    const userCount = await prisma.user.count();
    console.log(`  ✅ Prisma Client: Working (found ${userCount} users)`);
    checks.push({ name: 'Prisma Client', status: 'PASS' });
  } catch (error) {
    console.log('  ❌ Prisma Client: Error');
    console.log(`     Error: ${error.message}`);
    checks.push({ 
      name: 'Prisma Client', 
      status: 'FAIL', 
      issues: [error.message] 
    });
  }
}

// Check 5: Sample Data Queries
async function checkSampleQueries() {
  console.log('\n🔍 Testing Sample Queries...');
  
  // Test courses query
  try {
    const courses = await prisma.course.findMany({ take: 1 });
    console.log(`  ✅ Courses query: Success (found ${courses.length} courses)`);
  } catch (error) {
    console.log(`  ❌ Courses query: Failed - ${error.message}`);
    checks.push({ 
      name: 'Sample Queries', 
      status: 'FAIL', 
      issues: [`Courses query failed: ${error.message}`] 
    });
    return;
  }
  
  // Test lectures query
  try {
    const lectures = await prisma.lecture.findMany({ take: 1 });
    console.log(`  ✅ Lectures query: Success (found ${lectures.length} lectures)`);
    checks.push({ name: 'Sample Queries', status: 'PASS' });
  } catch (error) {
    console.log(`  ❌ Lectures query: Failed - ${error.message}`);
    checks.push({ 
      name: 'Sample Queries', 
      status: 'FAIL', 
      issues: [`Lectures query failed: ${error.message}`] 
    });
  }
}

// Main function
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 500 Error Debugging Script');
  console.log('═══════════════════════════════════════════════════════');
  
  checkEnvVars();
  
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    console.log('\n⚠️  Cannot proceed with database checks - connection failed');
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }
  
  await checkTables();
  await checkPrismaClient();
  await checkSampleQueries();
  
  printSummary();
  await prisma.$disconnect();
}

function printSummary() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Summary');
  console.log('═══════════════════════════════════════════════════════');
  
  const passed = checks.filter(c => c.status === 'PASS').length;
  const failed = checks.filter(c => c.status === 'FAIL').length;
  
  checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.status}`);
    if (check.issues) {
      check.issues.forEach(issue => {
        console.log(`   └─ ${issue}`);
      });
    }
  });
  
  console.log(`\n✅ Passed: ${passed}/${checks.length}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${checks.length}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Fix the issues listed above');
    console.log('   2. Check backend server logs for detailed error messages');
    console.log('   3. Review DEBUGGING_500_ERROR.md for detailed guidance');
    console.log('   4. Ensure all migrations are applied: npx prisma migrate deploy');
  } else {
    console.log('\n🎉 All checks passed! If you still see 500 errors:');
    console.log('   1. Check backend server logs for specific error messages');
    console.log('   2. Verify authentication token is valid');
    console.log('   3. Check Network tab in browser DevTools for request details');
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Script error:', error);
  process.exit(1);
});

