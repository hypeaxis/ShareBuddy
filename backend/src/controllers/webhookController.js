/**
 * Moderation Webhook Controller
 * Receives moderation results from the moderation service
 */

const { query, withTransaction } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Webhook endpoint to receive moderation results
 * POST /api/webhooks/moderation
 */
const receiveModerationResult = async (req, res, next) => {
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
      score: moderation_score
    });

    // Update moderation_jobs table
    await withTransaction(async (client) => {
      if (moderation_status === 'completed') {
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

        // Trigger will automatically update documents.status based on score
        // But we can also move file here if approved
        if (moderation_score > 0.5) {
          // Document approved - move from temp to permanent storage
          await moveFileToPermanentStorage(document_id);
        } else {
          // Document rejected - optionally delete temp file
          await deleteTempFile(document_id);
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
 * Move file from temp to permanent storage
 */
async function moveFileToPermanentStorage(document_id) {
  try {
    // Get file path from database
    const result = await query(
      'SELECT file_path, file_name FROM documents WHERE document_id = $1',
      [document_id]
    );

    if (result.rows.length === 0) {
      throw new Error('Document not found');
    }

    const { file_path, file_name } = result.rows[0];
    
    // Extract filename from path
    const filename = path.basename(file_path);
    const tempPath = path.join(__dirname, '../../uploads/temp', filename);
    const permanentPath = path.join(__dirname, '../../uploads/documents', filename);

    // Move file
    await fs.rename(tempPath, permanentPath);

    // Update file path in database
    const newFilePath = `/uploads/documents/${filename}`;
    await query(
      'UPDATE documents SET file_path = $1 WHERE document_id = $2',
      [newFilePath, document_id]
    );

    console.log(`File moved to permanent storage for document ${document_id}`);

  } catch (error) {
    console.error(`Failed to move file for document ${document_id}:`, error);
    // Don't throw - file move failure shouldn't block the webhook
  }
}

/**
 * Delete temporary file for rejected documents
 */
async function deleteTempFile(document_id) {
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
    const tempPath = path.join(__dirname, '../../uploads/temp', filename);

    // Delete file if exists
    try {
      await fs.unlink(tempPath);
      console.log(`Temp file deleted for rejected document ${document_id}`);
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
