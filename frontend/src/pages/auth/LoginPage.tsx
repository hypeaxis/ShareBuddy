/**
 * Login Page for ShareBuddy
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from '../../types';
import '../../styles/AuthPages.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearAuthError } = useAuth();
  
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (error) clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await login(formData);
      if (result.type === 'auth/login/fulfilled') {
        navigate('/dashboard');
      }
      // If rejected, error will be shown via useAuth error state
      // Form data is preserved automatically
    } catch (err) {
      console.error('Login error:', err);
      // Error is already handled by Redux, just prevent any page reload
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
        <Col md={6} lg={4}>
          <Card className="card-hover">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h3 className="fw-bold text-gradient-purple">Đăng nhập</h3>
                <p className="text-muted">Chào mừng trở lại với ShareBuddy!</p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={clearAuthError}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Nhập email của bạn"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="rememberMe"
                    label="Ghi nhớ đăng nhập"
                    onChange={handleChange}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 btn-gradient-purple"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </Form>

              {/* OAuth Buttons */}
              <div className="my-3">
                <div className="text-center text-muted mb-2">
                  <small>Hoặc đăng nhập với</small>
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
                  Đăng nhập với Google
                </Button>
                
                <Button
                  variant="outline-primary"
                  className="w-100 d-flex align-items-center justify-content-center"
                  onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/facebook`}
                >
                  <svg width="18" height="18" className="me-2" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Đăng nhập với Facebook
                </Button>
              </div>

              <div className="text-center mt-4">
                <p className="mb-2">
                  <Link to="/forgot-password" className="text-decoration-none">
                    Quên mật khẩu?
                  </Link>
                </p>
                <p>
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="text-decoration-none fw-bold">
                    Đăng ký ngay
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

export default LoginPage;