/**
 * Verified Author Service
 * Handles automatic verified author badge system based on criteria
 */

const { query, withTransaction } = require('../config/database');

// Criteria for automatic verification
const VERIFICATION_CRITERIA = {
  MIN_DOCUMENTS: 5,
  MIN_FIVE_STAR_DOCUMENTS: 3,
  MIN_TOTAL_DOWNLOADS: 10,
  REQUIRE_EMAIL_VERIFIED: true
};

// Get user's progress towards verification
const getVerificationProgress = async (userId) => {
  try {
    console.log('📊 Getting verification progress for user:', userId);
    
    // Get user info
    const userResult = await query(
      'SELECT email_verified, is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found:', userId);
      throw new Error('Người dùng không tồn tại');
    }

    const user = userResult.rows[0];
    console.log('✅ User info:', { email_verified: user.email_verified, is_verified: user.is_verified_author });

    // Get document stats
    const statsResult = await query(
      `SELECT 
        COUNT(DISTINCT d.document_id) as total_documents,
        COUNT(DISTINCT CASE WHEN d.average_rating >= 5.0 THEN d.document_id END) as five_star_documents,
        COALESCE(SUM(d.download_count), 0) as total_downloads
       FROM documents d
       WHERE d.author_id = $1 AND d.status = 'approved'`,
      [userId]
    );

    const stats = statsResult.rows[0];
    console.log('✅ Document stats:', stats);

    const progress = {
      isVerified: user.is_verified_author,
      criteria: {
        emailVerified: {
          current: user.email_verified,
          required: VERIFICATION_CRITERIA.REQUIRE_EMAIL_VERIFIED,
          met: user.email_verified === true
        },
        totalDocuments: {
          current: parseInt(stats.total_documents) || 0,
          required: VERIFICATION_CRITERIA.MIN_DOCUMENTS,
          met: parseInt(stats.total_documents) >= VERIFICATION_CRITERIA.MIN_DOCUMENTS
        },
        fiveStarDocuments: {
          current: parseInt(stats.five_star_documents) || 0,
          required: VERIFICATION_CRITERIA.MIN_FIVE_STAR_DOCUMENTS,
          met: parseInt(stats.five_star_documents) >= VERIFICATION_CRITERIA.MIN_FIVE_STAR_DOCUMENTS
        },
        totalDownloads: {
          current: parseInt(stats.total_downloads) || 0,
          required: VERIFICATION_CRITERIA.MIN_TOTAL_DOWNLOADS,
          met: parseInt(stats.total_downloads) >= VERIFICATION_CRITERIA.MIN_TOTAL_DOWNLOADS
        }
      }
    };

    // Check if all criteria are met
    const allCriteriaMet = Object.values(progress.criteria).every(c => c.met);

    const result = {
      ...progress,
      eligibleForVerification: allCriteriaMet && !user.is_verified_author
    };

    console.log('✅ Progress result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in getVerificationProgress:', error);
    throw error;
  }
};

// Auto-verify user if criteria are met
const checkAndAutoVerify = async (userId) => {
  try {
    const progress = await getVerificationProgress(userId);

    if (progress.eligibleForVerification) {
      return await withTransaction(async (client) => {
        // Update user verified status
        await client.query(
          'UPDATE users SET is_verified_author = TRUE, verified_at = NOW() WHERE user_id = $1',
          [userId]
        );

        // Create notification
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, $2, $3, $4)`,
          [
            userId,
            'system',
            '🎉 Chúc mừng! Bạn đã trở thành Tác giả uy tín',
            'Bạn đã đáp ứng đủ tiêu chuẩn và tự động nhận được huy hiệu Tác giả uy tín. Badge xanh sẽ xuất hiện bên cạnh tên của bạn!'
          ]
        );

        return { verified: true, message: 'Đã tự động cấp verified badge' };
      });
    }

    return { verified: false, message: 'Chưa đủ tiêu chuẩn' };
  } catch (error) {
    throw error;
  }
};

// Get verified authors list
const getVerifiedAuthors = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.bio,
        u.university,
        u.major,
        COUNT(DISTINCT d.document_id) as document_count,
        AVG(d.average_rating) as avg_rating,
        SUM(d.download_count) as total_downloads,
        COUNT(DISTINCT f.follower_id) as follower_count
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.author_id AND d.status = 'approved'
       LEFT JOIN follows f ON u.user_id = f.following_id
       WHERE u.is_verified_author = TRUE
       GROUP BY u.user_id
       ORDER BY total_downloads DESC, avg_rating DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM users WHERE is_verified_author = TRUE'
    );

    return {
      authors: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

// Check if user is verified
const isVerified = async (userId) => {
  try {
    const result = await query(
      'SELECT is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );

    return result.rows[0]?.is_verified_author || false;
  } catch (error) {
    return false;
  }
};

module.exports = {
  getVerifiedAuthors,
  isVerified,
  getVerificationProgress,
  checkAndAutoVerify,
  VERIFICATION_CRITERIA
};
