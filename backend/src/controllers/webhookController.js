/**
 * Moderation Webhook Controller
 * Receives moderation results from the moderation service
 */

const { query, withTransaction } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const notificationService = require('../services/notificationService');

/**
 * Webhook endpoint to receive moderation results
 * POST /api/webhooks/moderation
 */
const receiveModerationResult = async (req, res, next) => {
  console.log(`\n\n🔔🔔🔔 WEBHOOK CALLED AT ${new Date().toISOString()} 🔔🔔🔔`);
  console.log(`Document ID: ${req.body.document_id}`);
  console.log(`Full body:`, JSON.stringify(req.body, null, 2));
  console.log(`Headers:`, req.headers);
  
  try {
    // Verify webhook secret
    const webhookSecret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.MODERATION_WEBHOOK_SECRET || 'default-webhook-secret-change-in-production';
    
    if (webhookSecret !== expectedSecret) {
      console.warn('Invalid webhook secret received');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const {
      document_id,
      moderation_status,
      moderation_score,
      moderation_flags,
      extracted_text_preview,
      model_version,
      error_message
    } = req.body;

    console.log(`Received moderation result for document ${document_id}:`, {
      status: moderation_status,
      score: moderation_score,
      flags: moderation_flags,
      model: model_version
    });

    console.log(`🔄 WEBHOOK START: Processing document ${document_id}`);
    let transactionSuccess = false;
    let creditAwarded = false;
    let errorDetails = null;
    let documentInfo = null; // Store document info for use after transaction

    // Update moderation_jobs table and award credits
    try {
      await withTransaction(async (client) => {
      if (moderation_status === 'completed') {
        // First, verify document exists and get info
        console.log(`Checking if document ${document_id} exists...`);
        const docCheckResult = await client.query(
          'SELECT document_id, author_id, title, status FROM documents WHERE document_id = $1',
          [document_id]
        );
        
        if (docCheckResult.rows.length === 0) {
          console.error(`❌ ERROR: Document ${document_id} does NOT exist in database!`);
          throw new Error(`Document ${document_id} not found`);
        }
        
        const documentInfo = docCheckResult.rows[0];
        console.log(`✓ Document found: "${documentInfo.title}" by user ${documentInfo.author_id}, current status: ${documentInfo.status}`);
        
        // Update job with results
        await client.query(
          `UPDATE moderation_jobs
           SET moderation_status = $1,
               moderation_score = $2,
               moderation_flags = $3,
               extracted_text_preview = $4,
               model_version = $5,
               completed_at = CURRENT_TIMESTAMP
           WHERE document_id = $6`,
          ['completed', moderation_score, moderation_flags, extracted_text_preview, model_version, document_id]
        );

        // Determine approval status
        const isApproved = moderation_score > 0.5;
        const newStatus = isApproved ? 'approved' : 'rejected';
        
        // Update document status explicitly (don't rely only on trigger)
        await client.query(
          `UPDATE documents
           SET status = $1,
               moderation_score = $2,
               has_moderation_data = TRUE,
               rejection_reason = $3
           WHERE document_id = $4`,
          [
            newStatus,
            moderation_score,
            isApproved ? null : `Document did not meet community guidelines (AI moderation score: ${moderation_score.toFixed(2)})`,
            document_id
          ]
        );
        
        console.log(`Document ${document_id} status updated to: ${newStatus}`);

        if (isApproved) {
          // Award credit using the info we already fetched
          const { author_id, title } = documentInfo;
          
          console.log(`Awarding credit to user ${author_id} for document ${document_id}...`);
          console.log(`Document title: ${title}`);
          console.log(`Transaction type: upload, Amount: 1, Reference: ${document_id}`);
          
          // Insert credit transaction
          try {
            const creditResult = await client.query(
              `INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING transaction_id, amount, user_id`,
              [author_id, 1, 'upload', document_id, `Tài liệu được duyệt: ${title}`]
            );
            
            console.log(`✅ Credit transaction created successfully:`);
            console.log(`   Transaction ID: ${creditResult.rows[0].transaction_id}`);
            console.log(`   User ID: ${creditResult.rows[0].user_id}`);
            console.log(`   Amount: +${creditResult.rows[0].amount} credit`);
            
            creditAwarded = true; // Mark success
            
          } catch (creditError) {
            console.error(`❌ FAILED to insert credit transaction:`, creditError);
            console.error(`   Error code: ${creditError.code}`);
            errorDetails = creditError.message;
            console.error(`   Error detail: ${creditError.detail}`);
            console.error(`   Error message: ${creditError.message}`);
            throw creditError; // Re-throw to rollback transaction
          }
          
          console.log(`✓ Document approved and credit awarded for ${document_id}`);
          
          // Send notification to author
          try {
            await notificationService.createNotification(
              documentInfo.author_id,
              notificationService.NOTIFICATION_TYPES.DOCUMENT_APPROVED,
              'Tài liệu được duyệt',
              `Tài liệu "${documentInfo.title}" của bạn đã được phê duyệt và công khai`,
              document_id
            );
            console.log(`✓ Notification sent to author ${documentInfo.author_id}`);
          } catch (notifError) {
            console.error(`⚠️ Failed to create notification for approved document:`, notifError.message);
          }
        } else {
          // Document rejected - delete file
          try {
            await deleteDocumentFile(document_id);
            console.log(`Document ${document_id} rejected - file deleted`);
          } catch (deleteError) {
            console.error(`⚠️ Failed to delete file for rejected document ${document_id}:`, deleteError.message);
          }
          
          // Send notification to author about rejection
          try {
            await notificationService.createNotification(
              documentInfo.author_id,
              notificationService.NOTIFICATION_TYPES.DOCUMENT_REJECTED,
              'Tài liệu bị từ chối',
              `Tài liệu "${documentInfo.title}" của bạn không đạt tiêu chuẩn cộng đồng và đã bị từ chối`,
              document_id
            );
            console.log(`✓ Rejection notification sent to author ${documentInfo.author_id}`);
          } catch (notifError) {
            console.error(`⚠️ Failed to create rejection notification:`, notifError.message);
          }
        }
      } else if (moderation_status === 'failed') {
        // Update job as failed
        await client.query(
          `UPDATE moderation_jobs
           SET moderation_status = $1,
               error_message = $2,
               completed_at = CURRENT_TIMESTAMP,
               retry_count = retry_count + 1
           WHERE document_id = $3`,
          ['failed', error_message, document_id]
        );

        // Mark document as rejected
        await client.query(
          `UPDATE documents
           SET status = 'rejected',
               rejection_reason = $1
           WHERE document_id = $2`,
          ['Moderation processing failed. Please try uploading again.', document_id]
        );
      }
    });
  transactionSuccess = true;
    } catch (txError) {
      console.error(`❌❌❌ TRANSACTION FAILED for document ${document_id}:`, txError.message);
      errorDetails = txError.message;
      throw txError;
    }

    console.log(`✅ WEBHOOK END: Transaction completed for ${document_id}`);
    console.log(`   Status: ${transactionSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Credit awarded: ${creditAwarded ? 'YES' : 'NO'}`);
    if (errorDetails) {
      console.log(`   Error: ${errorDetails}`);
    }
    
    console.log(`✓ Moderation result processed for document ${document_id}`);

    res.json({
      success: true,
      message: 'Moderation result received'
    });

  } catch (error) {
    console.error('Error processing moderation webhook:', error);
    next(error);
  }
};

/**
 * Delete file for rejected documents
 */
async function deleteDocumentFile(document_id) {
  try {
    const result = await query(
      'SELECT file_path FROM documents WHERE document_id = $1',
      [document_id]
    );

    if (result.rows.length === 0) {
      return;
    }

    const { file_path } = result.rows[0];
    const filename = path.basename(file_path);
    const filePath = path.join(__dirname, '../../uploads/documents', filename);

    // Delete file if exists
    try {
      await fs.unlink(filePath);
      console.log(`File deleted for rejected document ${document_id}`);
    } catch (err) {
      // File might already be deleted or not exist
      console.log(`Temp file not found for document ${document_id}`);
    }

  } catch (error) {
    console.error(`Failed to delete temp file for document ${document_id}:`, error);
  }
}

module.exports = {
  receiveModerationResult
};
