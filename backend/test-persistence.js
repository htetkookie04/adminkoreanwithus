/**
 * Test script to verify database persistence
 * Run this after setting up the database and starting the server
 * 
 * Usage: node test-persistence.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = 'admin@koreanwithus.com';
const ADMIN_PASSWORD = 'admin123';

let accessToken = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    accessToken = response.data.data.accessToken;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestData() {
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    console.log('\n📝 Creating test data...');
    
    // Create a test user
    const userResponse = await axios.post(
      `${API_URL}/users`,
      {
        email: `test-${Date.now()}@example.com`,
        password: 'test123',
        firstName: 'Test',
        lastName: 'User',
        roleId: 8,
        status: 'active'
      },
      { headers }
    );
    const userId = userResponse.data.data.id;
    console.log(`✅ Created user: ${userId}`);
    
    // Create a test course
    const courseResponse = await axios.post(
      `${API_URL}/courses`,
      {
        title: `Test Course ${Date.now()}`,
        slug: `test-course-${Date.now()}`,
        description: 'Test course description',
        level: 'Beginner',
        capacity: 20,
        price: 50000,
        active: true
      },
      { headers }
    );
    const courseId = courseResponse.data.data.id;
    console.log(`✅ Created course: ${courseId}`);
    
    // Create an enrollment
    const enrollmentResponse = await axios.post(
      `${API_URL}/enrollments`,
      {
        userId: userId,
        courseId: courseId,
        source: 'test'
      },
      { headers }
    );
    const enrollmentId = enrollmentResponse.data.data.id;
    console.log(`✅ Created enrollment: ${enrollmentId}`);
    
    return { userId, courseId, enrollmentId };
  } catch (error) {
    console.error('❌ Failed to create test data:', error.response?.data || error.message);
    throw error;
  }
}

async function verifyDataExists(testData) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    console.log('\n🔍 Verifying data exists...');
    
    // Check user exists
    const userResponse = await axios.get(
      `${API_URL}/users/${testData.userId}`,
      { headers }
    );
    console.log(`✅ User ${testData.userId} exists: ${userResponse.data.data.email}`);
    
    // Check course exists
    const courseResponse = await axios.get(
      `${API_URL}/courses/${testData.courseId}`,
      { headers }
    );
    console.log(`✅ Course ${testData.courseId} exists: ${courseResponse.data.data.title}`);
    
    // Check enrollment exists
    const enrollmentResponse = await axios.get(
      `${API_URL}/enrollments/${testData.enrollmentId}`,
      { headers }
    );
    console.log(`✅ Enrollment ${testData.enrollmentId} exists`);
    
    return true;
  } catch (error) {
    console.error('❌ Data verification failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPersistence() {
  console.log('🧪 Testing Database Persistence\n');
  console.log('=' .repeat(50));
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n❌ Cannot proceed without login');
    process.exit(1);
  }
  
  // Step 2: Create test data
  const testData = await createTestData();
  
  // Step 3: Verify data exists
  const verified = await verifyDataExists(testData);
  
  if (verified) {
    console.log('\n' + '='.repeat(50));
    console.log('✅ PERSISTENCE TEST PASSED');
    console.log('\nNext steps:');
    console.log('1. Logout and login again');
    console.log('2. Restart the server');
    console.log('3. Verify data still exists');
  } else {
    console.log('\n' + '='.repeat(50));
    console.log('❌ PERSISTENCE TEST FAILED');
    process.exit(1);
  }
}

// Run test
testPersistence().catch(console.error);

