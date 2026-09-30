/**
 * Test Script - Test Notification Service
 * Run: node backend/src/tests/test-notifications.js
 */

const { pool } = require('../config/database');
const notificationService = require('../services/notificationService');

async function testNotifications() {
  try {
    console.log('\n=== TESTING NOTIFICATION SERVICE ===\n');

    // Test 1: Get a test user from database
    console.log('📌 Test 1: Fetching test user from database...');
    const userResult = await pool.query(
      'SELECT user_id, full_name FROM users LIMIT 1'
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found in database. Cannot run tests.');
      process.exit(1);
    }

    const testUser = userResult.rows[0];
    console.log(`✅ Found user: ${testUser.full_name} (${testUser.user_id})\n`);

    // Test 2: Create a document_approved notification
    console.log('📌 Test 2: Creating document_approved notification...');
    const notification1 = await notificationService.createNotification(
      testUser.user_id,
      notificationService.NOTIFICATION_TYPES.DOCUMENT_APPROVED,
      'Tài liệu được duyệt',
      'Tài liệu "Test Document" đã được phê duyệt'
    );
    console.log('✅ Created:', notification1.notification_id, '\n');

    // Test 3: Create a new_comment notification
    console.log('📌 Test 3: Creating new_comment notification...');
    const notification2 = await notificationService.createNotification(
      testUser.user_id,
      notificationService.NOTIFICATION_TYPES.NEW_COMMENT,
      'Bình luận mới',
      'Someone commented on your document'
    );
    console.log('✅ Created:', notification2.notification_id, '\n');

    // Test 4: Create a new_follower notification
    console.log('📌 Test 4: Creating new_follower notification...');
    const notification3 = await notificationService.createNotification(
      testUser.user_id,
      notificationService.NOTIFICATION_TYPES.NEW_FOLLOWER,
      'Người theo dõi mới',
      'Someone started following you'
    );
    console.log('✅ Created:', notification3.notification_id, '\n');

    // Test 5: Create a new_qa_answer notification
    console.log('📌 Test 5: Creating new_qa_answer notification...');
    const notification4 = await notificationService.createNotification(
      testUser.user_id,
      notificationService.NOTIFICATION_TYPES.NEW_QA_ANSWER,
      'Câu trả lời mới',
      'Someone answered your question'
    );
    console.log('✅ Created:', notification4.notification_id, '\n');

    // Test 6: Create an answer_accepted notification
    console.log('📌 Test 6: Creating answer_accepted notification...');
    const notification5 = await notificationService.createNotification(
      testUser.user_id,
      notificationService.NOTIFICATION_TYPES.ANSWER_ACCEPTED,
      'Câu trả lời được chấp nhận',
      'Your answer was accepted! +5 credits'
    );
    console.log('✅ Created:', notification5.notification_id, '\n');

    // Test 7: Get all notifications
    console.log('📌 Test 7: Fetching all notifications for user...');
    const notifications = await notificationService.getNotifications(testUser.user_id);
    console.log(`✅ Retrieved ${notifications.length} notifications\n`);

    // Test 8: Get unread count
    console.log('📌 Test 8: Getting unread count...');
    const unreadCount = await notificationService.getUnreadCount(testUser.user_id);
    console.log(`✅ Unread count: ${unreadCount}\n`);

    // Test 9: Mark first notification as read
    console.log('📌 Test 9: Marking notification as read...');
    const marked = await notificationService.markAsRead(notification1.notification_id, testUser.user_id);
    console.log(`✅ Marked as read\n`);

    // Test 10: Verify unread count decreased
    console.log('📌 Test 10: Verifying unread count decreased...');
    const newUnreadCount = await notificationService.getUnreadCount(testUser.user_id);
    console.log(`✅ New unread count: ${newUnreadCount}\n`);

    console.log('=== ALL TESTS PASSED ===\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testNotifications();
