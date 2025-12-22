/**
 * Payment Service - Stripe Integration
 * Handles credit purchases, payment processing, and transactions
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query, withTransaction } = require('../config/database');


// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET is not set - webhooks will not work');
}

// Get available credit packages
const getCreditPackages = async () => {
  try {
    const result = await query(
      `SELECT package_id, credits, price_usd, price_vnd, bonus_credits, is_popular, display_order
       FROM credit_packages
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching credit packages:', error);
    throw error;
  }
};

// Create Stripe Payment Intent
const createPaymentIntent = async (userId, packageId, currency = 'usd') => {
  try {
    // Get package details
    const packageResult = await query(
      'SELECT * FROM credit_packages WHERE package_id = $1 AND is_active = TRUE',
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      throw new Error('Package không tồn tại hoặc không còn hoạt động');
    }

    const pkg = packageResult.rows[0];
    const baseCredits = parseInt(pkg.credits);
    const bonusCredits = pkg.bonus_credits ? parseInt(pkg.bonus_credits) : 0;
    const totalCredits = baseCredits + bonusCredits;

    let amount = 0;
    const selectedCurrency = currency?.toLowerCase() === 'vnd' ? 'vnd' : 'usd';
    if (selectedCurrency === 'usd') {
      amount = Math.round(pkg.price_usd * 100);
    } else {
      // Stripe only supports some currencies for direct payment
      // We convert VND to USD for Stripe and keep currency metadata as VND
      amount = Math.round(pkg.price_vnd / 26300 * 100); // Rough conversion
    }
    // Get or create Stripe customer
    const userResult = await query(
      'SELECT email, username FROM users WHERE user_id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User không tồn tại');
    }

    const user = userResult.rows[0];

    // Check if user already has a Stripe customer ID
    let stripeCustomerId;
    const existingCustomer = await query(
      'SELECT stripe_customer_id FROM payment_transactions WHERE user_id = $1 AND stripe_customer_id IS NOT NULL LIMIT 1',
      [userId]
    );

    if (existingCustomer.rows.length > 0) {
      stripeCustomerId = existingCustomer.rows[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: userId,
          username: user.username
        }
      });
      stripeCustomerId = customer.id;
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd', // Charge in USD, even for VND purchases
      customer: stripeCustomerId,
      metadata: {
        user_id: userId,
        package_id: packageId,
        credits: totalCredits.toString(),
        bonusCredits: bonusCredits.toString(),
        original_currency: selectedCurrency,
        original_amount: selectedCurrency === 'usd' ? pkg.price_usd : pkg.price_vnd
      },
      description: `Purchase ${totalCredits} credits (Includes ${bonusCredits} bonus) for ShareBuddy`
    });

    // Save transaction to database
    await query(
      `INSERT INTO payment_transactions 
       (user_id, stripe_payment_intent_id, stripe_customer_id, amount, currency, credits_purchased, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, paymentIntent.id, stripeCustomerId, amount / 100, selectedCurrency, totalCredits, 'pending']
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount / 100,
      currency: selectedCurrency,
      credits: totalCredits,
      bonus: bonusCredits
    };
  } catch (error) {
    console.error('Create payment intent error:', error);
    throw error;
  }
};

// Handle Stripe Webhook Events
const handleWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return { received: true };
  } catch (error) {
    console.error('Webhook handler error:', error);
    throw error;
  }
};

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    return await withTransaction(async (client) => {
      // Update payment transaction
      const checkResult = await client.query(
        `SELECT payment_id, payment_status, user_id, credits_purchased 
         FROM payment_transactions 
         WHERE stripe_payment_intent_id = $1
         FOR UPDATE`,
        [paymentIntent.id]
      );

      if (checkResult.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const { payment_id, payment_status, user_id, credits_purchased } = checkResult.rows[0];

      // 2. If already succeeded, skip processing (IDEMPOTENT CHECK)
      if (payment_status === 'succeeded') {
        console.log(`⚠️ Payment ${paymentIntent.id} already processed. Skipping.`);
        return { success: true, alreadyProcessed: true };
      }

      const duplicateCheck = await client.query(
        `SELECT transaction_id FROM credit_transactions 
         WHERE reference_id = $1 AND transaction_type = 'purchase'`,
        [payment_id] // Truyền UUID vào đây => Hợp lệ
      );

      if (duplicateCheck.rows.length > 0) {
        console.log(`⚠️ Credits already awarded for Payment UUID ${payment_id}. Skipping.`);

      // Fix status cho đồng bộ nếu cần
        if (payment_status !== 'succeeded') {
             await client.query(
                `UPDATE payment_transactions SET payment_status = 'succeeded', updated_at = NOW() 
                 WHERE payment_id = $1`,
                [payment_id]
            );
        }
        return { success: true, alreadyProcessed: true };
      }

      console.log(`Processing payment UUID ${payment_id} for user ${user_id}.`);

      // 3. Update payment status to 'succeeded'
      await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'succeeded', updated_at = NOW()
         WHERE payment_id = $1`,
        [payment_id]
      );

      // Add credits to user account
      await client.query(
        'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
        [credits_purchased, user_id]
      );

      // Create credit transaction record
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user_id,
          credits_purchased,
          'purchase',
          `Purchased ${credits_purchased} credits via Stripe`,
          payment_id
        ]
      );
      console.log('✅ PaymentIntent ID:', paymentIntent.id);

      // Create notification
      await client.query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, $2, $3, $4)`,
        [
          user_id,
          'payment_successful',
          'Payment Successful',
          `You have successfully purchased ${credits_purchased} credits!`
        ]
      );

      console.log(`Payment succeeded for user ${user_id}: ${credits_purchased} credits added`);
      return { success: true };
    });
  } catch (error) {
    console.error('Handle payment success error:', error);
    throw error;
  }
};

// Handle failed payment
const handlePaymentFailure = async (paymentIntent) => {
  try {

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
    // Update payment transaction
    await query(
      `UPDATE payment_transactions 
       SET payment_status = 'failed', error_message = $2, updated_at = NOW()
       WHERE stripe_payment_intent_id = $1`,
      [paymentIntent.id, errorMessage]
    );

    // Get user ID
    const userResult = await query(
      'SELECT user_id FROM payment_transactions WHERE stripe_payment_intent_id = $1',
      [paymentIntent.id]
    );

    if (userResult.rows.length > 0) {
      // Create notification
      await query(
        `INSERT INTO notifications (user_id, type, title, content)
         VALUES ($1, $2, $3, $4)`,
        [
          userResult.rows[0].user_id,
          'payment_failed',
          'Payment Failed',
          'Your payment could not be processed. Please try again.'
        ]
      );
    }

    console.log(`Payment failed for payment intent ${paymentIntent.id}`);
    return { success: true };
  } catch (error) {
    console.error('Handle payment failure error:', error);
    throw error;
  }
};

// Handle refund
const handleRefund = async (charge) => {
  try {
    const paymentIntentId = charge.payment_intent;

    return await withTransaction(async (client) => {
      // Get transaction details
      const txResult = await client.query(
        'SELECT user_id, credits_purchased FROM payment_transactions WHERE stripe_payment_intent_id = $1',
        [paymentIntentId]
      );

      if (txResult.rows.length === 0) {
        throw new Error('Transaction not found for refund');
      }

      const { user_id, credits_purchased } = txResult.rows[0];

      // Update payment transaction
      await client.query(
        `UPDATE payment_transactions 
         SET payment_status = 'refunded', updated_at = NOW()
         WHERE stripe_payment_intent_id = $1`,
        [paymentIntentId]
      );

      // Deduct credits from user account
      await client.query(
        'UPDATE users SET credits = credits - $1 WHERE user_id = $2 AND credits >= $1',
        [credits_purchased, user_id]
      );

      // Create credit transaction record
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
         VALUES ($1, $2, $3, $4)`,
        [
          user_id,
          -credits_purchased,
          'penalty',
          `Refund: ${credits_purchased} credits deducted`
        ]
      );

      console.log(`Refund processed for user ${user_id}: ${credits_purchased} credits deducted`);
      return { success: true };
    });
  } catch (error) {
    console.error('Handle refund error:', error);
    throw error;
  }
};

// Get payment history for user
const getPaymentHistory = async (userId, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        payment_id,
        stripe_payment_intent_id,
        amount,
        currency,
        credits_purchased,
        payment_status,
        error_message,
        created_at
       FROM payment_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1',
      [userId]
    );

    return {
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
};

// Verify payment status
const verifyPayment = async (paymentIntentId) => {
  try {
    // 1. Kiểm tra trạng thái trong DB trước (nhanh nhất)
    const dbResult = await query(
      'SELECT payment_status FROM payment_transactions WHERE stripe_payment_intent_id = $1',
      [paymentIntentId]
    );

    if (dbResult.rows.length > 0) {
      const status = dbResult.rows[0].payment_status;
      // Nếu DB đã báo thành công, trả về ngay (Client verify lần 2, 3...)
      if (status === 'succeeded') {
        return { status: 'succeeded', source: 'database' };
      }
    }

    // 2. Nếu DB chưa cập nhật (pending) hoặc chưa có, hỏi Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 3. Nếu Stripe báo thành công, nhưng DB vẫn chưa (Webhook trễ hoặc lỗi)
    if (paymentIntent.status === 'succeeded') {
      console.log(`⚠️ Client verified success but DB is pending. Syncing now... ID: ${paymentIntentId}`);
      
      // GỌI HÀM NÀY ĐỂ XỬ LÝ: Nó sẽ dùng FOR UPDATE để tránh xung đột với Webhook
      const syncResult = await handlePaymentSuccess(paymentIntent);
      
      return {
        status: 'succeeded',
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        synced: true,
        ...syncResult
      };
    }

    // 4. Trường hợp chưa thanh toán xong (pending/failed)
    return {
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };

  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

module.exports = {
  getCreditPackages,
  createPaymentIntent,
  handleWebhook,
  handlePaymentSuccess,
  handlePaymentFailure,
  handleRefund,
  getPaymentHistory,
  verifyPayment
};
