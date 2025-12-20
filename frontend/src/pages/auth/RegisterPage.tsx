/**
 * Register Page for ShareBuddy
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RegisterForm } from '../../types';

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

    const result = await register(formData);
    if (result.type === 'auth/register/fulfilled') {
      navigate('/dashboard');
    }
  };

  return (
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
                      <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Nhập tên đăng nhập"
                        required
                      />
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
                      />
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
  );
};

export default RegisterPage;