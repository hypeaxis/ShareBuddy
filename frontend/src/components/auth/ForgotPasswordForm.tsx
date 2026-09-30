/**
 * ForgotPasswordForm - Form quên mật khẩu với multi-step process
 */

import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

interface ForgotPasswordData {
  email: string;
}

const ForgotPasswordForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get email from location state if redirected from login
  const initialEmail = location.state?.email || '';
  
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: initialEmail
  });
  
  const [errors, setErrors] = useState<Partial<ForgotPasswordData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ForgotPasswordData> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email không đúng định dạng';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData({ email: value });
    
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await authService.requestPasswordReset(formData.email.trim());
      
      setIsSubmitted(true);
      setResendCooldown(60); // 60 seconds cooldown
      
      toast.success('Đã gửi link đặt lại mật khẩu đến email của bạn!');
      
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      if (error.status === 404) {
        setErrors({ email: 'Không tìm thấy tài khoản với email này' });
        toast.error('Email không tồn tại trong hệ thống');
      } else if (error.status === 429) {
        toast.error('Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.');
        setResendCooldown(300); // 5 minutes cooldown for rate limit
      } else {
        toast.error(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    
    try {
      await authService.requestPasswordReset(formData.email.trim());
      setResendCooldown(60);
      toast.success('Đã gửi lại link đặt lại mật khẩu!');
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi lại email. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="forgot-password-success">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-sm">
              <Card.Body className="p-4 text-center">
                {/* Success Icon */}
                <div className="mb-4">
                  <i className="bi bi-envelope-check display-1 text-success" />
                </div>

                {/* Success Message */}
                <h4 className="fw-bold mb-3">Email đã được gửi!</h4>
                <p className="text-muted mb-4">
                  Chúng tôi đã gửi link đặt lại mật khẩu đến:
                  <br />
                  <strong>{formData.email}</strong>
                </p>

                <Alert variant="info" className="text-start mb-4">
                  <i className="bi bi-info-circle me-2" />
                  <strong>Lưu ý:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Link có hiệu lực trong vòng 15 phút</li>
                    <li>Kiểm tra cả thư mục spam/junk mail</li>
                    <li>Nếu không nhận được email, hãy thử gửi lại</li>
                  </ul>
                </Alert>

                {/* Action Buttons */}
                <div className="d-grid gap-2">
                  <Button
                    variant="outline-primary"
                    onClick={handleResendEmail}
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
                        Gửi lại email
                      </>
                    )}
                  </Button>

                  <Button
                    variant="link"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ email: '' });
                      setErrors({});
                    }}
                  >
                    Thử với email khác
                  </Button>
                </div>

                {/* Back to Login */}
                <div className="mt-4">
                  <Link to="/login" className="text-decoration-none">
                    <i className="bi bi-arrow-left me-2" />
                    Quay lại đăng nhập
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="forgot-password-form">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              {/* Header */}
              <div className="text-center mb-4">
                <i className="bi bi-key display-4 text-primary mb-3" />
                <h3 className="fw-bold mb-2">Quên mật khẩu?</h3>
                <p className="text-muted">
                  Không sao! Nhập email của bạn và chúng tôi sẽ gửi link đặt lại mật khẩu.
                </p>
              </div>

              <Form onSubmit={handleSubmit}>
                {/* Email Field */}
                <Form.Group className="mb-4">
                  <Form.Label>Địa chỉ email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-envelope" />
                    </InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="Nhập email đã đăng ký"
                      value={formData.email}
                      onChange={handleInputChange}
                      isInvalid={!!errors.email}
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Email bạn đã sử dụng khi đăng ký tài khoản ShareBuddy
                  </Form.Text>
                </Form.Group>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-100 mb-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2" />
                      Gửi link đặt lại mật khẩu
                    </>
                  )}
                </Button>

                {/* Navigation Links */}
                <Row className="text-center">
                  <Col xs={6}>
                    <Link to="/login" className="text-decoration-none">
                      <i className="bi bi-arrow-left me-1" />
                      Quay lại đăng nhập
                    </Link>
                  </Col>
                  <Col xs={6}>
                    <Link to="/register" className="text-decoration-none">
                      Tạo tài khoản mới
                      <i className="bi bi-arrow-right ms-1" />
                    </Link>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          {/* Security Note */}
          <div className="text-center mt-3">
            <small className="text-muted">
              <i className="bi bi-shield-check me-1" />
              Chúng tôi sẽ không bao giờ yêu cầu mật khẩu của bạn qua email
            </small>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ForgotPasswordForm;