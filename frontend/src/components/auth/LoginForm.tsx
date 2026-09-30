/**
 * LoginForm - Form đăng nhập với validation và UX tối ưu
 */

import React, { useState } from 'react';
import { Form, Button, Card, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const maxAttempts = 5;
  
  // Get redirect URL from location state or default to home
  const from = location.state?.from?.pathname || '/';

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    
    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email không đúng định dạng';
      }
    }
    
    // Validate password
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is locked out due to too many attempts
    if (loginAttempts >= maxAttempts) {
      toast.error('Tài khoản tạm thời bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await login({
        email: formData.email.trim(),
        password: formData.password
      });
      
      toast.success('Đăng nhập thành công!');
      
      // Redirect to intended page or home
      navigate(from, { replace: true });
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Increment login attempts
      setLoginAttempts(prev => prev + 1);
      
      // Handle specific error cases
      if (error.status === 401) {
        toast.error('Email/tên đăng nhập hoặc mật khẩu không đúng');
        setErrors({ email: 'Email hoặc mật khẩu không đúng' });
      } else if (error.status === 423) {
        toast.error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin.');
      } else if (error.status === 403) {
        toast.error('Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực.');
      } else {
        toast.error(error.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
      }
      
      // Show warning when approaching max attempts
      const remainingAttempts = maxAttempts - loginAttempts - 1;
      if (remainingAttempts > 0 && remainingAttempts <= 2) {
        toast.warning(`Còn ${remainingAttempts} lần thử. Tài khoản sẽ bị khóa tạm thời nếu đăng nhập sai tiếp.`);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password', { 
      state: { email: formData.email }
    });
  };

  // Check if email is valid format
  const isEmail = formData.email.includes('@');

  return (
    <div className="login-form-container">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              {/* Header */}
              <div className="text-center mb-4">
                <h3 className="fw-bold mb-2">Đăng nhập</h3>
                <p className="text-muted">
                  Chào mừng bạn quay lại với ShareBuddy
                </p>
              </div>

              {/* Login attempts warning */}
              {loginAttempts > 2 && loginAttempts < maxAttempts && (
                <Alert variant="warning" className="mb-3">
                  <i className="bi bi-exclamation-triangle me-2" />
                  Bạn đã đăng nhập sai {loginAttempts} lần. 
                  Còn {maxAttempts - loginAttempts} lần thử trước khi tài khoản bị khóa tạm thời.
                </Alert>
              )}

              {loginAttempts >= maxAttempts && (
                <Alert variant="danger" className="mb-3">
                  <i className="bi bi-shield-exclamation me-2" />
                  Tài khoản đã bị khóa tạm thời do đăng nhập sai quá nhiều lần.
                  Vui lòng thử lại sau 15 phút hoặc <Link to="/forgot-password">đặt lại mật khẩu</Link>.
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* Email/Username Field */}
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-envelope" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Nhập email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      isInvalid={!!errors.email}
                      disabled={isLoading || loginAttempts >= maxAttempts}
                      autoComplete="username"
                      autoFocus
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Nhập địa chỉ email bạn đã đăng ký
                  </Form.Text>
                </Form.Group>

                {/* Password Field */}
                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-lock" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={formData.password}
                      onChange={handleInputChange('password')}
                      isInvalid={!!errors.password}
                      disabled={isLoading || loginAttempts >= maxAttempts}
                      autoComplete="current-password"
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || loginAttempts >= maxAttempts}
                    >
                      <i className={`bi bi-eye${showPassword ? '-slash' : ''}`} />
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>

                {/* Remember Me & Forgot Password */}
                <Row className="mb-3">
                  <Col xs={6}>
                    <Form.Check
                      type="checkbox"
                      id="rememberMe"
                      label="Ghi nhớ đăng nhập"
                      checked={formData.rememberMe}
                      onChange={handleInputChange('rememberMe')}
                      disabled={isLoading || loginAttempts >= maxAttempts}
                    />
                  </Col>
                  <Col xs={6} className="text-end">
                    <Button
                      variant="link"
                      className="p-0 text-decoration-none"
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                    >
                      Quên mật khẩu?
                    </Button>
                  </Col>
                </Row>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-100 mb-3"
                  disabled={isLoading || loginAttempts >= maxAttempts}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2" />
                      Đăng nhập
                    </>
                  )}
                </Button>

                {/* Social Login Buttons */}
                <div className="text-center mb-3">
                  <small className="text-muted">Hoặc đăng nhập với</small>
                </div>
                
                <Row className="g-2 mb-3">
                  <Col xs={6}>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="w-100"
                      disabled={isLoading || loginAttempts >= maxAttempts}
                      onClick={() => {/* Handle Google login */}}
                    >
                      <i className="bi bi-google me-2" />
                      Google
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="w-100"
                      disabled={isLoading || loginAttempts >= maxAttempts}
                      onClick={() => {/* Handle Facebook login */}}
                    >
                      <i className="bi bi-facebook me-2" />
                      Facebook
                    </Button>
                  </Col>
                </Row>

                {/* Register Link */}
                <div className="text-center">
                  <span className="text-muted">Chưa có tài khoản? </span>
                  <Link to="/register" className="text-decoration-none">
                    Đăng ký ngay
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>

          {/* Additional Help */}
          <div className="text-center mt-3">
            <small className="text-muted">
              Gặp khó khăn khi đăng nhập? 
              <Link to="/support" className="text-decoration-none ms-1">
                Liên hệ hỗ trợ
              </Link>
            </small>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default LoginForm;