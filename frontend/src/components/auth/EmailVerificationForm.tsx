/**
 * EmailVerificationForm - Xác thực email và resend verification
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Row, Col } from 'react-bootstrap';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

const EmailVerificationForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get email and message from location state or URL params
  const emailFromState = location.state?.email;
  const messageFromState = location.state?.message;
  const tokenFromUrl = searchParams.get('token');
  const emailFromUrl = searchParams.get('email');
  
  const email = emailFromState || emailFromUrl || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(!!tokenFromUrl);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Auto-verify if token is in URL
  useEffect(() => {
    if (tokenFromUrl && emailFromUrl) {
      handleTokenVerification(tokenFromUrl, emailFromUrl);
    }
  }, [tokenFromUrl, emailFromUrl]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleTokenVerification = async (token: string, email: string) => {
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      await authService.verifyEmail(token);
      
      setIsVerified(true);
      toast.success('Xác thực email thành công!');
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Tài khoản đã được xác thực. Vui lòng đăng nhập.',
            email: email
          }
        });
      }, 3000);
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      if (error.status === 400) {
        setVerificationError('Link xác thực không hợp lệ hoặc đã hết hạn');
      } else if (error.status === 404) {
        setVerificationError('Không tìm thấy yêu cầu xác thực này');
      } else if (error.status === 409) {
        setVerificationError('Email đã được xác thực trước đó');
        // Still redirect to login if already verified
        setTimeout(() => {
          navigate('/login', { state: { email: email }});
        }, 3000);
      } else {
        setVerificationError(error.message || 'Có lỗi xảy ra khi xác thực email');
      }
      
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || resendCooldown > 0) return;
    
    setIsLoading(true);
    
    try {
      await authService.resendVerification();
      
      setResendCooldown(60); // 60 seconds cooldown
      toast.success('Đã gửi lại email xác thực!');
      
    } catch (error: any) {
      console.error('Resend verification error:', error);
      
      if (error.status === 429) {
        toast.error('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.');
        setResendCooldown(300); // 5 minutes cooldown
      } else if (error.status === 409) {
        toast.error('Email đã được xác thực. Bạn có thể đăng nhập ngay.');
        navigate('/login', { state: { email: email }});
      } else {
        toast.error(error.message || 'Không thể gửi lại email xác thực. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Success state - Email verified
  if (isVerified) {
    return (
      <div className="email-verification-success">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-sm">
              <Card.Body className="p-4 text-center">
                {/* Success Animation */}
                <div className="mb-4">
                  <i className="bi bi-check-circle-fill display-1 text-success" />
                </div>

                <h4 className="fw-bold text-success mb-3">
                  Xác thực thành công! 🎉
                </h4>
                
                <p className="text-muted mb-4">
                  Email <strong>{emailFromUrl || email}</strong> đã được xác thực thành công.
                  <br />
                  Bạn sẽ được chuyển đến trang đăng nhập trong giây lát...
                </p>

                <div className="mb-4">
                  <div className="spinner-border text-primary" style={{ width: '2rem', height: '2rem' }} />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-100"
                  onClick={() => navigate('/login', { state: { email: emailFromUrl || email }})}
                >
                  <i className="bi bi-box-arrow-in-right me-2" />
                  Đăng nhập ngay
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Verifying state
  if (isVerifying) {
    return (
      <div className="email-verification-loading">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-sm">
              <Card.Body className="p-4 text-center">
                <div className="mb-4">
                  <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} />
                </div>

                <h4 className="fw-bold mb-3">Đang xác thực email...</h4>
                <p className="text-muted">
                  Vui lòng chờ trong giây lát, chúng tôi đang xác thực email của bạn.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Error state
  if (verificationError) {
    return (
      <div className="email-verification-error">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-sm">
              <Card.Body className="p-4 text-center">
                <div className="mb-4">
                  <i className="bi bi-x-circle-fill display-1 text-danger" />
                </div>

                <h4 className="fw-bold text-danger mb-3">Xác thực thất bại</h4>
                <p className="text-muted mb-4">{verificationError}</p>

                <Alert variant="warning" className="text-start mb-4">
                  <i className="bi bi-info-circle me-2" />
                  <strong>Có thể do:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Link xác thực đã hết hạn (có hiệu lực 24 giờ)</li>
                    <li>Link đã được sử dụng</li>
                    <li>Email đã được xác thực trước đó</li>
                  </ul>
                </Alert>

                <div className="d-grid gap-2">
                  {email && (
                    <Button
                      variant="primary"
                      onClick={handleResendVerification}
                      disabled={isLoading || resendCooldown > 0}
                    >
                      {isLoading ? (
                        <>
                          <div className="spinner-border spinner-border-sm me-2" />
                          Đang gửi...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <i className="bi bi-clock me-2" />
                          Gửi lại sau {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-clockwise me-2" />
                          Gửi lại email xác thực
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate('/login')}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Quay lại đăng nhập
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Default state - Waiting for verification
  return (
    <div className="email-verification-waiting">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm">
            <Card.Body className="p-4 text-center">
              {/* Icon */}
              <div className="mb-4">
                <i className="bi bi-envelope-exclamation display-1 text-primary" />
              </div>

              {/* Title */}
              <h3 className="fw-bold mb-3">Xác thực email của bạn</h3>
              
              {/* Message */}
              <div className="mb-4">
                {messageFromState ? (
                  <p className="text-muted">{messageFromState}</p>
                ) : (
                  <p className="text-muted">
                    Chúng tôi đã gửi email xác thực đến:
                    <br />
                    <strong>{email}</strong>
                  </p>
                )}
              </div>

              {/* Instructions */}
              <Alert variant="info" className="text-start mb-4">
                <i className="bi bi-info-circle me-2" />
                <strong>Hướng dẫn:</strong>
                <ol className="mb-0 mt-2">
                  <li>Mở email trong hộp thư của bạn</li>
                  <li>Click vào link xác thực trong email</li>
                  <li>Hoàn tất quá trình đăng ký</li>
                </ol>
              </Alert>

              {/* Action Buttons */}
              <div className="d-grid gap-2 mb-4">
                {email && (
                  <Button
                    variant="outline-primary"
                    onClick={handleResendVerification}
                    disabled={isLoading || resendCooldown > 0}
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" />
                        Đang gửi...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        <i className="bi bi-clock me-2" />
                        Gửi lại sau {resendCooldown}s
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2" />
                        Không nhận được email? Gửi lại
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="link"
                  onClick={() => navigate('/register')}
                >
                  Thay đổi email đăng ký
                </Button>
              </div>

              {/* Tips */}
              <div className="text-start">
                <small className="text-muted">
                  <strong>Mẹo:</strong>
                  <ul className="mb-0">
                    <li>Kiểm tra thư mục spam/junk mail</li>
                    <li>Thêm ShareBuddy vào danh sách an toàn</li>
                    <li>Email xác thực có hiệu lực trong 24 giờ</li>
                  </ul>
                </small>
              </div>

              {/* Support Link */}
              <div className="mt-4">
                <Link to="/support" className="text-decoration-none">
                  <i className="bi bi-question-circle me-1" />
                  Cần hỗ trợ?
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmailVerificationForm;