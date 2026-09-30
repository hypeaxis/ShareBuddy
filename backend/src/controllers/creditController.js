/**
 * Credit controller
 * Handles credit management, transactions, and credit-related operations
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');

// Get user's credit balance and transaction history
const getCreditBalance = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    // Get current balance
    const balanceResult = await query(
      'SELECT credits FROM users WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const balance = balanceResult.rows[0].credits;

    res.json({
      success: true,
      data: {
        balance: balance
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get credit transaction history with pagination
const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type; // 'earn', 'spend', 'bonus', 'penalty'

    // Build WHERE clause
    let whereCondition = 'WHERE ct.user_id = $1';
    let queryParams = [userId];

    if (type) {
      whereCondition += ' AND ct.transaction_type = $2';
      queryParams.push(type);
    }

    // Add pagination parameters
    queryParams.push(limit, offset);
    const limitParam = queryParams.length - 1;
    const offsetParam = queryParams.length;

    // Get transactions with related document info
    const transactionsResult = await query(
      `SELECT ct.transaction_id, ct.amount, ct.transaction_type, ct.description,
              ct.created_at, ct.reference_id,
              d.title as document_title, d.thumbnail_url
       FROM credit_transactions ct
       LEFT JOIN documents d ON ct.reference_id = d.document_id
       ${whereCondition}
       ORDER BY ct.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      queryParams
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM credit_transactions ct
       ${whereCondition}`,
      queryParams.slice(0, -2) // Remove limit and offset
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // Calculate summary statistics based on amount (positive = earned, negative = spent)
    const statsResult = await query(
      `SELECT 
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_earned,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spent,
         COUNT(CASE WHEN amount > 0 THEN 1 END) as earn_count,
         COUNT(CASE WHEN amount < 0 THEN 1 END) as spend_count
       FROM credit_transactions
       WHERE user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        transactions: transactionsResult.rows.map(row => ({
          id: row.transaction_id,
          amount: row.amount,
          type: row.transaction_type,
          description: row.description,
          createdAt: row.created_at,
          document: row.reference_id ? {
            id: row.reference_id,
            title: row.document_title,
            thumbnailUrl: row.thumbnail_url
          } : null
        })),
        statistics: {
          totalEarned: parseInt(stats.total_earned) || 0,
          totalSpent: parseInt(stats.total_spent) || 0,
          earnTransactions: parseInt(stats.earn_count),
          spendTransactions: parseInt(stats.spend_count)
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Gift credits to another user (admin only)
const giftCredits = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { targetUserId, amount, reason } = req.body;
    const adminUserId = req.user.user_id;

    // Check if target user exists
    const targetUserResult = await query(
      'SELECT username, full_name FROM users WHERE user_id = $1 AND is_active = true',
      [targetUserId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const targetUser = targetUserResult.rows[0];

    await withTransaction(async (client) => {
      // Add credits to target user
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
        [amount, targetUserId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, $3, $4)`,
        [targetUserId, amount, 'bonus', `Admin gift: ${reason} (by ${req.user.username})`]
      );
    });

    res.json({
      success: true,
      message: `Đã tặng ${amount} credits cho ${targetUser.username}`,
      data: {
        targetUser: {
          id: targetUserId,
          username: targetUser.username,
          fullName: targetUser.full_name
        },
        creditsGifted: amount,
        reason
      }
    });
  } catch (error) {
    next(error);
  }
};

// Deduct credits from user (admin only, for penalties)
const deductCredits = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { targetUserId, amount, reason } = req.body;
    const adminUserId = req.user.user_id;

    // Check if target user exists and has enough credits
    const targetUserResult = await query(
      'SELECT username, full_name, credits FROM users WHERE user_id = $1 AND is_active = true',
      [targetUserId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const targetUser = targetUserResult.rows[0];

    if (targetUser.credits < amount) {
      return res.status(400).json({
        success: false,
        error: 'Người dùng không có đủ credits để trừ',
        data: {
          currentBalance: targetUser.credits,
          requestedDeduction: amount
        }
      });
    }

    await withTransaction(async (client) => {
      // Deduct credits from target user
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE user_id = $2',
        [amount, targetUserId]
      );

      // Record transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, $3, $4)`,
        [targetUserId, -amount, 'penalty', `Admin penalty: ${reason} (by ${req.user.username})`]
      );
    });

    res.json({
      success: true,
      message: `Đã trừ ${amount} credits từ ${targetUser.username}`,
      data: {
        targetUser: {
          id: targetUserId,
          username: targetUser.username,
          fullName: targetUser.full_name
        },
        creditsDeducted: amount,
        newBalance: targetUser.credits - amount,
        reason
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get credit statistics for admin
const getCreditStatistics = async (req, res, next) => {
  try {
    const period = req.query.period || '30'; // days

    // Overall statistics
    const overallStats = await query(
      `SELECT 
         SUM(credits) as total_credits_in_system,
         COUNT(*) as total_users,
         AVG(credits) as avg_credits_per_user,
         MAX(credits) as max_credits
       FROM users 
       WHERE is_active = true`
    );

    // Transaction statistics for the period
    const transactionStats = await query(
      `SELECT 
         transaction_type,
         COUNT(*) as count,
         SUM(amount) as total_amount,
         AVG(amount) as avg_amount
       FROM credit_transactions 
       WHERE created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY transaction_type`
    );

    // Daily transaction volume for the period
    const dailyVolume = await query(
      `SELECT 
         DATE(created_at) as date,
         COUNT(*) as transaction_count,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits_added,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as credits_spent
       FROM credit_transactions 
       WHERE created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );

    // Top earning documents
    const topDocuments = await query(
      `SELECT 
         d.document_id, d.title, d.credit_cost,
         COUNT(ct.transaction_id) as purchase_count,
         SUM(ct.amount) as total_earned
       FROM documents d
       JOIN credit_transactions ct ON d.document_id = ct.reference_id
       WHERE ct.transaction_type = 'earn' AND ct.created_at >= NOW() - INTERVAL '${period} days'
       GROUP BY d.document_id, d.title, d.credit_cost
       ORDER BY total_earned DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        overall: {
          totalCreditsInSystem: parseInt(overallStats.rows[0].total_credits_in_system) || 0,
          totalUsers: parseInt(overallStats.rows[0].total_users),
          avgCreditsPerUser: parseFloat(overallStats.rows[0].avg_credits_per_user).toFixed(2),
          maxCredits: parseInt(overallStats.rows[0].max_credits) || 0
        },
        transactions: transactionStats.rows.reduce((acc, row) => {
          acc[row.transaction_type] = {
            count: parseInt(row.count),
            totalAmount: parseInt(row.total_amount),
            avgAmount: parseFloat(row.avg_amount).toFixed(2)
          };
          return acc;
        }, {}),
        dailyVolume: dailyVolume.rows.map(row => ({
          date: row.date,
          transactionCount: parseInt(row.transaction_count),
          creditsAdded: parseInt(row.credits_added) || 0,
          creditsSpent: parseInt(row.credits_spent) || 0
        })),
        topDocuments: topDocuments.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          creditCost: row.credit_cost,
          purchaseCount: parseInt(row.purchase_count),
          totalEarned: parseInt(row.total_earned)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Transfer credits between users
const transferCredits = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { targetUserId, amount, message } = req.body;
    const fromUserId = req.user.user_id;

    if (fromUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Không thể chuyển credits cho chính mình'
      });
    }

    // Check if sender has enough credits
    const fromUserResult = await query(
      'SELECT username, credits FROM users WHERE user_id = $1',
      [fromUserId]
    );

    const fromUser = fromUserResult.rows[0];
    if (fromUser.credits < amount) {
      return res.status(400).json({
        success: false,
        error: 'Bạn không có đủ credits để chuyển',
        data: {
          currentBalance: fromUser.credits,
          requestedAmount: amount
        }
      });
    }

    // Check if target user exists
    const targetUserResult = await query(
      'SELECT username, full_name FROM users WHERE user_id = $1 AND is_active = true',
      [targetUserId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng nhận không tồn tại'
      });
    }

    const targetUser = targetUserResult.rows[0];

    await withTransaction(async (client) => {
      // Deduct from sender
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE user_id = $2',
        [amount, fromUserId]
      );

      // Add to recipient
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
        [amount, targetUserId]
      );

      // Record transactions
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, $3, $4)`,
        [fromUserId, -amount, 'transfer', `Chuyển ${amount} credits cho ${targetUser.username}: ${message}`]
      );

      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, $3, $4)`,
        [targetUserId, amount, 'transfer', `Nhận ${amount} credits từ ${fromUser.username}: ${message}`]
      );
    });

    res.json({
      success: true,
      message: `Chuyển ${amount} credits thành công`,
      data: {
        sender: {
          username: fromUser.username,
          newBalance: fromUser.credits - amount
        },
        recipient: {
          id: targetUserId,
          username: targetUser.username,
          fullName: targetUser.full_name
        },
        amount,
        message
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreditBalance,
  getTransactionHistory,
  giftCredits,
  deductCredits,
  getCreditStatistics,
  transferCredits
};