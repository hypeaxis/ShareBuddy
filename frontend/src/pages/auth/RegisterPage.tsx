/**
 * Register Page for ShareBuddy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RegisterForm } from '../../types';
import apiClient from '../../services/api';
import '../../styles/AuthPages.css';

// Debounce helper
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; feedback: string; color: string } => {
  if (!password) return { score: 0, feedback: '', color: 'secondary' };

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push('Ít nhất 8 ký tự');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Chữ hoa');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Chữ thường');
  }

  // Number or special char check
  if (/[0-9]/.test(password) || /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 25;
  } else {
    feedback.push('Số hoặc ký tự đặc biệt');
  }

  let strengthText = '';
  let color = 'danger';

  if (score <= 25) {
    strengthText = 'Yếu';
    color = 'danger';
  } else if (score <= 50) {
    strengthText = 'Trung bình';
    color = 'warning';
  } else if (score <= 75) {
    strengthText = 'Khá';
    color = 'info';
  } else {
    strengthText = 'Mạnh';
    color = 'success';
  }

  const feedbackText = feedback.length > 0 
    ? `Cần thêm: ${feedback.join(', ')}` 
    : 'Mật khẩu mạnh!';

  return { score, feedback: `${strengthText} - ${feedbackText}`, color };
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearAuthError } = useAuth();
  
  const [formData, setFormData] = useState<RegisterForm>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    university: '',
    major: '',
  });

  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Validation states
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '', color: 'secondary' });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  // Debounced username for API check
  const debouncedUsername = useDebounce(formData.username, 500);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3) {
        setUsernameStatus({ checking: false, available: null, message: '' });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: '' });

      try {
        const response = await apiClient.get(`/auth/check-username?username=${debouncedUsername}`);
        const available = response.data.available;
        
        setUsernameStatus({
          checking: false,
          available,
          message: available 
            ? '✓ Tên đăng nhập có thể sử dụng' 
            : '✗ Tên đăng nhập đã được sử dụng'
        });
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: ''
        });
      }
    };

    checkUsername();
  }, [debouncedUsername]);

  // Check password strength
  useEffect(() => {
    if (formData.password) {
      const strength = calculatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: '', color: 'secondary' });
    }
  }, [formData.password]);

  // Check password match
  useEffect(() => {
    if (formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordsMatch(null);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      alert('Vui lòng chấp nhận điều khoản sử dụng');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    if (usernameStatus.available === false) {
      alert('Tên đăng nhập đã được sử dụng, vui lòng chọn tên khác');
      return;
    }

    if (passwordStrength.score < 50) {
      const confirm = window.confirm('Mật khẩu của bạn chưa đủ mạnh. Bạn có muốn tiếp tục?');
      if (!confirm) return;
    }

    const result = await register(formData);
    if (result.type === 'auth/register/fulfilled') {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      {/* Background Image */}
      <div className="auth-bg-container">
        <div className="auth-bg-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80" 
          alt="Students collaborating"
          className="bg-image"
        />
      </div>

      {/* Content */}
      <Container className="py-5" style={{ marginTop: '80px' }}>
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="card-hover">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h3 className="fw-bold text-gradient-purple">Đăng ký tài khoản</h3>
                <p className="text-muted">Tham gia cộng đồng ShareBuddy ngay hôm nay!</p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={clearAuthError}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tên đăng nhập *</Form.Label>
                      <div className="position-relative">
                        <Form.Control
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleChange}
                          placeholder="Nhập tên đăng nhập"
                          required
                          isValid={usernameStatus.available === true}
                          isInvalid={usernameStatus.available === false}
                        />
                        {usernameStatus.checking && (
                          <Spinner 
                            animation="border" 
                            size="sm" 
                            className="position-absolute top-50 end-0 translate-middle-y me-3"
                          />
                        )}
                      </div>
                      {usernameStatus.message && (
                        <Form.Text className={usernameStatus.available ? 'text-success' : 'text-danger'}>
                          {usernameStatus.message}
                        </Form.Text>
                      )}
                      <Form.Text className="text-muted d-block">
                        Tối thiểu 3 ký tự
                      </Form.Text>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Nhập email của bạn"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Họ và tên *</Form.Label>
                  <Form.Control
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nhập họ và tên đầy đủ"
                    required
                  />
                </Form.Group>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Trường đại học</Form.Label>
                      <Form.Control
                        type="text"
                        name="university"
                        value={formData.university || ''}
                        onChange={handleChange}
                        placeholder="VD: Đại học Bách Khoa Hà Nội"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Chuyên ngành</Form.Label>
                      <Form.Control
                        type="text"
                        name="major"
                        value={formData.major || ''}
                        onChange={handleChange}
                        placeholder="VD: Khoa học máy tính"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Mật khẩu *</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Nhập mật khẩu"
                        required
                      />
                      {formData.password && (
                        <>
                          <div className="mt-2">
                            <ProgressBar 
                              now={passwordStrength.score} 
                              variant={passwordStrength.color}
                              style={{ height: '5px' }}
                            />
                          </div>
                          <Form.Text className={`text-${passwordStrength.color}`}>
                            {passwordStrength.feedback}
                          </Form.Text>
                        </>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Xác nhận mật khẩu *</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Nhập lại mật khẩu"
                        required
                        isValid={passwordsMatch === true}
                        isInvalid={passwordsMatch === false}
                      />
                      {passwordsMatch === true && (
                        <Form.Text className="text-success">
                          ✓ Mật khẩu khớp
                        </Form.Text>
                      )}
                      {passwordsMatch === false && (
                        <Form.Text className="text-danger">
                          ✗ Mật khẩu không khớp
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label={
                      <span>
                        Tôi đồng ý với{' '}
                        <Link to="/terms" className="text-decoration-none">
                          điều khoản sử dụng
                        </Link>{' '}
                        và{' '}
                        <Link to="/privacy" className="text-decoration-none">
                          chính sách bảo mật
                        </Link>
                      </span>
                    }
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 btn-gradient-purple"
                  disabled={isLoading || !acceptTerms}
                >
                  {isLoading ? 'Đang đăng ký...' : 'Đăng ký tài khoản'}
                </Button>
              </Form>

              {/* OAuth Buttons */}
              <div className="my-3">
                <div className="text-center text-muted my-3">
                  <small>Hoặc đăng ký với</small>
                </div>
                
                <Button
                  variant="outline-danger"
                  className="w-100 mb-2 d-flex align-items-center justify-content-center"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`}
                >
                  <svg width="18" height="18" className="me-2" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                  </svg>
                  Đăng ký với Google
                </Button>
                
                <Button
                  variant="outline-primary"
                  className="w-100 d-flex align-items-center justify-content-center"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/facebook`}
                >
                  <svg width="18" height="18" className="me-2" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Đăng ký với Facebook
                </Button>
              </div>

              <div className="text-center mt-4">
                <p>
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="text-decoration-none fw-bold">
                    Đăng nhập ngay
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;