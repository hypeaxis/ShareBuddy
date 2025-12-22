/**
 * Test script for notification service
 * Run: node test-notification.js
 */

require('dotenv').config({ path: './backend/.env' });

const { pool } = require('./backend/src/config/database');
const notificationService = require('./backend/src/services/notificationService');

async function testNotifications() {
  try {
    console.log('\n🔔 Starting Notification Service Test...\n');
    
    // Test 1: Check if pool is available
    console.log('📋 Test 1: Checking database pool...');
    const testQuery = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection OK:', testQuery.rows[0].current_time);
    
    // Test 2: Check NOTIFICATION_TYPES
    console.log('\n📋 Test 2: Checking NOTIFICATION_TYPES...');
    console.log('Available types:', notificationService.NOTIFICATION_TYPES);
    
    // Test 3: Create a test notification
    console.log('\n📋 Test 3: Creating test notification...');
    const testUserId = '123e4567-e89b-12d3-a456-426614174000'; // UUID format
    const notification = await notificationService.createNotification(
      testUserId,
      notificationService.NOTIFICATION_TYPES.NEW_COMMENT,
      'Test Notification',
      'This is a test notification to verify the service works',
      '987e4567-e89b-12d3-a456-426614174999',
      null
    );
    console.log('✅ Notification created:', notification);
    
    // Test 4: Retrieve the notification
    console.log('\n📋 Test 4: Retrieving notification...');
    const notifications = await notificationService.getNotifications(testUserId, false, 10, 0);
    console.log('✅ Notifications retrieved:', notifications);
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNotifications();
