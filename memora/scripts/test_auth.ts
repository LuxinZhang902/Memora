/**
 * Test Authentication System
 * Run: npx tsx scripts/test_auth.ts
 */

import { signupWithPassword, loginWithPassword } from '../lib/auth';

async function testAuth() {
  const testEmail = 'test@example.com';
  const testPassword = 'password123';

  console.log('\n=== Testing Authentication System ===\n');

  // Test 1: Signup
  console.log('1. Testing Signup...');
  const signupResult = await signupWithPassword(testEmail, testPassword);
  
  if (signupResult.success) {
    console.log('✅ Signup successful!');
    console.log('User:', JSON.stringify(signupResult.user, null, 2));
  } else {
    console.log('❌ Signup failed:', signupResult.error);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Login with correct password
  console.log('\n2. Testing Login with correct password...');
  const loginResult = await loginWithPassword(testEmail, testPassword);
  
  if (loginResult.success) {
    console.log('✅ Login successful!');
    console.log('User:', JSON.stringify(loginResult.user, null, 2));
  } else {
    console.log('❌ Login failed:', loginResult.error);
  }

  // Test 3: Login with wrong password
  console.log('\n3. Testing Login with wrong password...');
  const wrongLoginResult = await loginWithPassword(testEmail, 'wrongpassword');
  
  if (wrongLoginResult.success) {
    console.log('❌ Login should have failed but succeeded!');
  } else {
    console.log('✅ Login correctly failed:', wrongLoginResult.error);
  }

  console.log('\n=== Test Complete ===\n');
}

testAuth().catch(console.error);
