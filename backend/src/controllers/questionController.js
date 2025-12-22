/**
 * Question Controller - Handles Q&A for documents
 */

const { query, withTransaction } = require('../config/database');
const { validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');

// Get questions for a document
const getQuestions = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'recent'; // recent, votes, unanswered

    let orderClause = 'q.created_at DESC';
    if (sortBy === 'votes') {
      orderClause = 'q.vote_count DESC, q.created_at DESC';
    } else if (sortBy === 'unanswered') {
      orderClause = 'q.is_answered ASC, q.created_at DESC';
    }

    const result = await query(
      `SELECT 
        q.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author,
        COUNT(DISTINCT a.answer_id) as answer_count
       FROM questions q
       JOIN users u ON q.user_id = u.user_id
       LEFT JOIN answers a ON q.question_id = a.question_id
       WHERE q.document_id = $1
       GROUP BY q.question_id, u.user_id
       ORDER BY ${orderClause}
       LIMIT $2 OFFSET $3`,
      [documentId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM questions WHERE document_id = $1',
      [documentId]
    );

    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        questions: result.rows.map(q => ({
          id: q.question_id,
          title: q.title,
          content: q.content,
          isAnswered: q.is_answered,
          acceptedAnswerId: q.accepted_answer_id,
          voteCount: q.vote_count,
          viewCount: q.view_count,
          answerCount: parseInt(q.answer_count),
          author: {
            username: q.author_username,
            name: q.author_name,
            avatar: q.author_avatar,
            isVerifiedAuthor: q.is_verified_author
          },
          createdAt: q.created_at,
          updatedAt: q.updated_at
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single question with answers
const getQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    // Increment view count
    await query(
      'UPDATE questions SET view_count = view_count + 1 WHERE question_id = $1',
      [questionId]
    );

    // Get question
    const questionResult = await query(
      `SELECT 
        q.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author,
        d.title as document_title
       FROM questions q
       JOIN users u ON q.user_id = u.user_id
       JOIN documents d ON q.document_id = d.document_id
       WHERE q.question_id = $1`,
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    // Get answers
    const answersResult = await query(
      `SELECT 
        a.*,
        u.username as author_username,
        u.full_name as author_name,
        u.avatar_url as author_avatar,
        u.is_verified_author
       FROM answers a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.question_id = $1
       ORDER BY a.is_accepted DESC, a.vote_count DESC, a.created_at ASC`,
      [questionId]
    );

    const question = questionResult.rows[0];

    res.json({
      success: true,
      data: {
        question: {
          id: question.question_id,
          title: question.title,
          content: question.content,
          isAnswered: question.is_answered,
          acceptedAnswerId: question.accepted_answer_id,
          voteCount: question.vote_count,
          viewCount: question.view_count,
          documentId: question.document_id,
          documentTitle: question.document_title,
          author: {
            username: question.author_username,
            name: question.author_name,
            avatar: question.author_avatar,
            isVerifiedAuthor: question.is_verified_author
          },
          createdAt: question.created_at,
          updatedAt: question.updated_at
        },
        answers: answersResult.rows.map(a => ({
          id: a.answer_id,
          content: a.content,
          isAccepted: a.is_accepted,
          voteCount: a.vote_count,
          author: {
            username: a.author_username,
            name: a.author_name,
            avatar: a.author_avatar,
            isVerifiedAuthor: a.is_verified_author
          },
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create question
const createQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { documentId, title, content } = req.body;
    const userId = req.user.user_id;

    // Check if document exists
    const docResult = await query(
      'SELECT document_id, author_id FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];

    const result = await query(
      `INSERT INTO questions (document_id, user_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [documentId, userId, title, content]
    );

    // Award credits for asking question (only if not asking about own document)
    if (document.author_id !== userId) {
      await query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, 1, 'comment', 'Đặt câu hỏi về tài liệu', $2)`,
        [userId, result.rows[0].question_id]
      );

      await query(
        'UPDATE users SET credits = credits + 1 WHERE user_id = $1',
        [userId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Câu hỏi đã được tạo thành công',
      data: { questionId: result.rows[0].question_id }
    });
  } catch (error) {
    next(error);
  }
};

// Create answer
const createAnswer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { questionId, content } = req.body;
    const userId = req.user.user_id;

    // Check if question exists
    const questionResult = await query(
      `SELECT q.*, d.author_id as document_author_id 
       FROM questions q
       JOIN documents d ON q.document_id = d.document_id
       WHERE q.question_id = $1`,
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    const question = questionResult.rows[0];

    const result = await query(
      `INSERT INTO answers (question_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [questionId, userId, content]
    );

    // Award credits for answering (only if not answering about own document)
    if (question.document_author_id !== userId) {
      await query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, 2, 'comment', 'Trả lời câu hỏi', $2)`,
        [userId, result.rows[0].answer_id]
      );

      await query(
        'UPDATE users SET credits = credits + 2 WHERE user_id = $1',
        [userId]
      );
    }

    // Send notification to question author about new answer
    try {
      const answererResult = await query(
        'SELECT full_name FROM users WHERE user_id = $1',
        [userId]
      );
      
      if (answererResult.rows.length > 0 && question.user_id !== userId) {
        const answererName = answererResult.rows[0].full_name;
        await notificationService.createNotification(
          question.user_id,
          notificationService.NOTIFICATION_TYPES.NEW_QA_ANSWER,
          'Câu trả lời mới',
          `${answererName} đã trả lời câu hỏi của bạn`,
          null,
          userId
        );
        console.log(`✓ New answer notification sent to question author ${question.user_id}`);
      }
    } catch (notifError) {
      console.error(`⚠️ Failed to create new answer notification:`, notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Câu trả lời đã được tạo thành công',
      data: { answerId: result.rows[0].answer_id }
    });
  } catch (error) {
    next(error);
  }
};

// Accept answer (question author only)
const acceptAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.user_id;

    // Get answer and question details
    const result = await query(
      `SELECT a.*, q.user_id as question_author_id, q.question_id
       FROM answers a
       JOIN questions q ON a.question_id = q.question_id
       WHERE a.answer_id = $1`,
      [answerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu trả lời không tồn tại'
      });
    }

    const answer = result.rows[0];

    // Check if user is question author
    if (answer.question_author_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Chỉ tác giả câu hỏi mới có thể chấp nhận câu trả lời'
      });
    }

    // Prevent accepting own answer (self-Q&A fraud)
    if (answer.user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể chấp nhận câu trả lời của chính mình'
      });
    }

    await withTransaction(async (client) => {
      // Unmark previous accepted answer
      await client.query(
        `UPDATE answers SET is_accepted = FALSE WHERE question_id = $1`,
        [answer.question_id]
      );

      // Mark this answer as accepted
      await client.query(
        'UPDATE answers SET is_accepted = TRUE WHERE answer_id = $1',
        [answerId]
      );

      // Update question
      await client.query(
        `UPDATE questions 
         SET is_answered = TRUE, accepted_answer_id = $1 
         WHERE question_id = $2`,
        [answerId, answer.question_id]
      );

      // Bonus credits for accepted answer author
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, 5, 'bonus', 'Câu trả lời được chấp nhận', $2)`,
        [answer.user_id, answerId]
      );

      await client.query(
        'UPDATE users SET credits = credits + 5 WHERE user_id = $1',
        [answer.user_id]
      );
    });

    // Send notification to answer author about acceptance
    try {
      const answererResult = await query(
        'SELECT full_name FROM users WHERE user_id = $1',
        [answer.user_id]
      );
      
      if (answererResult.rows.length > 0) {
        const answererName = answererResult.rows[0].full_name;
        await notificationService.createNotification(
          answer.user_id,
          notificationService.NOTIFICATION_TYPES.ANSWER_ACCEPTED,
          'Câu trả lời được chấp nhận',
          `Câu trả lời của bạn đã được chấp nhận! Bạn nhận được +5 credits`,
          null,
          userId
        );
        console.log(`✓ Answer acceptance notification sent to user ${answer.user_id}`);
      }
    } catch (notifError) {
      console.error(`⚠️ Failed to create answer acceptance notification:`, notifError.message);
    }

    res.json({
      success: true,
      message: 'Câu trả lời đã được chấp nhận'
    });
  } catch (error) {
    next(error);
  }
};

// Vote on question
const voteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { voteType } = req.body; // 1 for upvote, -1 for downvote
    const userId = req.user.user_id;

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type không hợp lệ'
      });
    }

    await withTransaction(async (client) => {
      // Check existing vote
      const existingVote = await client.query(
        'SELECT * FROM question_votes WHERE question_id = $1 AND user_id = $2',
        [questionId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          // Remove vote
          await client.query(
            'DELETE FROM question_votes WHERE question_id = $1 AND user_id = $2',
            [questionId, userId]
          );
          
          await client.query(
            'UPDATE questions SET vote_count = vote_count - $1 WHERE question_id = $2',
            [voteType, questionId]
          );
        } else {
          // Change vote
          await client.query(
            'UPDATE question_votes SET vote_type = $1 WHERE question_id = $2 AND user_id = $3',
            [voteType, questionId, userId]
          );
          
          await client.query(
            'UPDATE questions SET vote_count = vote_count + $1 WHERE question_id = $2',
            [voteType * 2, questionId]
          );
        }
      } else {
        // New vote
        await client.query(
          'INSERT INTO question_votes (question_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [questionId, userId, voteType]
        );
        
        await client.query(
          'UPDATE questions SET vote_count = vote_count + $1 WHERE question_id = $2',
          [voteType, questionId]
        );
      }
    });

    res.json({
      success: true,
      message: 'Vote đã được cập nhật'
    });
  } catch (error) {
    next(error);
  }
};

// Vote on answer
const voteAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const { voteType } = req.body;
    const userId = req.user.user_id;

    if (![1, -1].includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: 'Vote type không hợp lệ'
      });
    }

    await withTransaction(async (client) => {
      const existingVote = await client.query(
        'SELECT * FROM answer_votes WHERE answer_id = $1 AND user_id = $2',
        [answerId, userId]
      );

      if (existingVote.rows.length > 0) {
        const currentVote = existingVote.rows[0].vote_type;
        
        if (currentVote === voteType) {
          await client.query(
            'DELETE FROM answer_votes WHERE answer_id = $1 AND user_id = $2',
            [answerId, userId]
          );
          
          await client.query(
            'UPDATE answers SET vote_count = vote_count - $1 WHERE answer_id = $2',
            [voteType, answerId]
          );
        } else {
          await client.query(
            'UPDATE answer_votes SET vote_type = $1 WHERE answer_id = $2 AND user_id = $3',
            [voteType, answerId, userId]
          );
          
          await client.query(
            'UPDATE answers SET vote_count = vote_count + $1 WHERE answer_id = $2',
            [voteType * 2, answerId]
          );
        }
      } else {
        await client.query(
          'INSERT INTO answer_votes (answer_id, user_id, vote_type) VALUES ($1, $2, $3)',
          [answerId, userId, voteType]
        );
        
        await client.query(
          'UPDATE answers SET vote_count = vote_count + $1 WHERE answer_id = $2',
          [voteType, answerId]
        );
      }
    });

    res.json({
      success: true,
      message: 'Vote đã được cập nhật'
    });
  } catch (error) {
    next(error);
  }
};

// Delete question
const deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const result = await query(
      'SELECT user_id FROM questions WHERE question_id = $1',
      [questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu hỏi không tồn tại'
      });
    }

    if (result.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền xóa câu hỏi này'
      });
    }

    await query('DELETE FROM questions WHERE question_id = $1', [questionId]);

    res.json({
      success: true,
      message: 'Câu hỏi đã được xóa'
    });
  } catch (error) {
    next(error);
  }
};

// Delete answer
const deleteAnswer = async (req, res, next) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const result = await query(
      'SELECT user_id FROM answers WHERE answer_id = $1',
      [answerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Câu trả lời không tồn tại'
      });
    }

    if (result.rows[0].user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền xóa câu trả lời này'
      });
    }

    await query('DELETE FROM answers WHERE answer_id = $1', [answerId]);

    res.json({
      success: true,
      message: 'Câu trả lời đã được xóa'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  getQuestion,
  createQuestion,
  createAnswer,
  acceptAnswer,
  voteQuestion,
  voteAnswer,
  deleteQuestion,
  deleteAnswer
};
