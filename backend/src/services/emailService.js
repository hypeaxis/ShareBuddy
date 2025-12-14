/**
 * Email Service - Nodemailer configuration for sending emails
 * Uses Gmail SMTP for development
 */

const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD // Gmail App Password
    }
  });
};

// Send email verification
const sendVerificationEmail = async (userEmail, username, verificationToken) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: `"ShareBuddy" <${config.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Xác thực email - ShareBuddy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 ShareBuddy</h1>
              <p>Xác thực tài khoản của bạn</p>
            </div>
            <div class="content">
              <h2>Xin chào ${username}!</h2>
              <p>Cảm ơn bạn đã đăng ký tài khoản ShareBuddy. Vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Xác thực Email</a>
              </div>
              <p>Hoặc copy link sau vào trình duyệt:</p>
              <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
              <p><strong>Lưu ý:</strong> Link xác thực có hiệu lực trong 24 giờ.</p>
              <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 ShareBuddy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Không thể gửi email xác thực');
  }
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, username, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"ShareBuddy" <${config.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Đặt lại mật khẩu - ShareBuddy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 ShareBuddy</h1>
              <p>Yêu cầu đặt lại mật khẩu</p>
            </div>
            <div class="content">
              <h2>Xin chào ${username}!</h2>
              <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Đặt lại mật khẩu</a>
              </div>
              <p>Hoặc copy link sau vào trình duyệt:</p>
              <p style="background: #fff; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
              <div class="warning">
                <p><strong>⚠️ Lưu ý quan trọng:</strong></p>
                <ul>
                  <li>Link đặt lại mật khẩu có hiệu lực trong 1 giờ</li>
                  <li>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này</li>
                  <li>Mật khẩu cũ vẫn còn hiệu lực cho đến khi bạn tạo mật khẩu mới</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>&copy; 2025 ShareBuddy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Không thể gửi email đặt lại mật khẩu');
  }
};

// Send welcome email after verification
const sendWelcomeEmail = async (userEmail, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"ShareBuddy" <${config.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Chào mừng đến với ShareBuddy! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Chào mừng đến với ShareBuddy!</h1>
            </div>
            <div class="content">
              <h2>Xin chào ${username}!</h2>
              <p>Tài khoản của bạn đã được xác thực thành công. Bạn nhận được <strong>10 credits miễn phí</strong> để bắt đầu!</p>
              
              <h3>🚀 Bạn có thể làm gì với ShareBuddy?</h3>
              
              <div class="feature">
                <strong>📤 Chia sẻ tài liệu</strong>
                <p>Tải lên tài liệu học tập và kiếm credits từ mỗi lượt tải xuống</p>
              </div>
              
              <div class="feature">
                <strong>📥 Tải xuống tài liệu</strong>
                <p>Truy cập hàng ngàn tài liệu học tập chất lượng cao</p>
              </div>
              
              <div class="feature">
                <strong>💬 Thảo luận và Q&A</strong>
                <p>Đặt câu hỏi và chia sẻ kiến thức với cộng đồng</p>
              </div>
              
              <div class="feature">
                <strong>⭐ Đánh giá và theo dõi</strong>
                <p>Đánh giá tài liệu và theo dõi tác giả yêu thích</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${config.FRONTEND_URL}/dashboard" class="button">Khám phá ngay</a>
              </div>
              
              <p style="margin-top: 30px;">Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 ShareBuddy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

// Send payment confirmation email
const sendPaymentConfirmationEmail = async (userEmail, username, paymentDetails) => {
  try {
    const transporter = createTransporter();
    
    const { amount, currency, credits, transactionId, paymentMethod } = paymentDetails;
    
    const mailOptions = {
      from: `"ShareBuddy" <${config.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Xác nhận thanh toán - ShareBuddy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .invoice { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total { font-size: 20px; font-weight: bold; color: #11998e; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Thanh toán thành công!</h1>
            </div>
            <div class="content">
              <h2>Xin chào ${username}!</h2>
              <p>Cảm ơn bạn đã mua credits trên ShareBuddy. Giao dịch của bạn đã được xử lý thành công.</p>
              
              <div class="invoice">
                <h3>Chi tiết giao dịch</h3>
                <div class="invoice-row">
                  <span>Mã giao dịch:</span>
                  <span><strong>${transactionId}</strong></span>
                </div>
                <div class="invoice-row">
                  <span>Số lượng credits:</span>
                  <span><strong>${credits} credits</strong></span>
                </div>
                <div class="invoice-row">
                  <span>Phương thức thanh toán:</span>
                  <span>${paymentMethod}</span>
                </div>
                <div class="invoice-row">
                  <span>Ngày giao dịch:</span>
                  <span>${new Date().toLocaleString('vi-VN')}</span>
                </div>
                <div class="invoice-row" style="border-bottom: none;">
                  <span class="total">Tổng cộng:</span>
                  <span class="total">${amount.toFixed(2)} ${currency}</span>
                </div>
              </div>
              
              <p>Credits đã được cộng vào tài khoản của bạn. Bạn có thể sử dụng ngay để tải xuống tài liệu!</p>
              
              <p style="background: #e8f5e9; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50;">
                💡 <strong>Mẹo:</strong> Bạn cũng có thể kiếm thêm credits bằng cách chia sẻ tài liệu chất lượng!
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 ShareBuddy. All rights reserved.</p>
              <p>Nếu có thắc mắc về giao dịch, vui lòng liên hệ support@sharebuddy.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending payment confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Send verified author notification
const sendVerifiedAuthorNotification = async (userEmail, username, isApproved, reviewNotes = '') => {
  try {
    const transporter = createTransporter();
    
    const subject = isApproved 
      ? '🎉 Yêu cầu Verified Author đã được chấp nhận!' 
      : 'Thông báo về yêu cầu Verified Author';
    
    const mailOptions = {
      from: `"ShareBuddy" <${config.EMAIL_USER}>`,
      to: userEmail,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${isApproved ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .badge { display: inline-block; background: ${isApproved ? '#4caf50' : '#f5576c'}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
            .notes { background: white; padding: 15px; border-radius: 5px; border-left: 4px solid ${isApproved ? '#4caf50' : '#ffc107'}; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${isApproved ? '🎉' : '📋'} Verified Author</h1>
            </div>
            <div class="content">
              <h2>Xin chào ${username}!</h2>
              <p>Yêu cầu trở thành <span class="badge">Verified Author</span> của bạn đã được xem xét.</p>
              
              ${isApproved ? `
                <p style="font-size: 18px; color: #4caf50;"><strong>✅ Chúc mừng! Yêu cầu của bạn đã được chấp nhận.</strong></p>
                <p>Bạn giờ đây là một Verified Author của ShareBuddy. Badge xanh sẽ xuất hiện bên cạnh tên của bạn.</p>
                
                <h3>🌟 Quyền lợi của Verified Author:</h3>
                <ul>
                  <li>Badge xanh verified bên cạnh tên</li>
                  <li>Tài liệu được ưu tiên hiển thị</li>
                  <li>Tăng độ tin cậy với người dùng</li>
                  <li>Nhận thêm credits cho mỗi tài liệu được tải</li>
                </ul>
              ` : `
                <p style="font-size: 18px; color: #f5576c;"><strong>❌ Yêu cầu của bạn chưa được chấp nhận.</strong></p>
                <p>Vui lòng xem xét các lý do bên dưới và gửi yêu cầu mới sau khi đã cải thiện.</p>
              `}
              
              ${reviewNotes ? `
                <div class="notes">
                  <strong>Ghi chú từ admin:</strong>
                  <p>${reviewNotes}</p>
                </div>
              ` : ''}
              
              ${!isApproved ? `
                <p>Bạn có thể gửi yêu cầu mới từ trang hồ sơ của mình.</p>
              ` : ''}
            </div>
            <div class="footer">
              <p>&copy; 2025 ShareBuddy. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Verified author notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verified author notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPaymentConfirmationEmail,
  sendVerifiedAuthorNotification
};
