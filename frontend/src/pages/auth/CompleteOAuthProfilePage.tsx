/**
 * Complete OAuth Profile Page - Yêu cầu người dùng OAuth thiết lập mật khẩu
 * Trang này hiển thị khi người dùng đăng ký/đăng nhập lần đầu qua OAuth
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/api';

const CompleteOAuthProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    university: '',
    major: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If user already has password, they can leave this page
    if (isAuthenticated && user && user.hasPassword === true) {
      console.log('✅ User already has password, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/auth/complete-oauth-profile', {
        password: formData.password,
        university: formData.university || null,
        major: formData.major || null,
      });

      if (response.data.success) {
        setSuccess('Cập nhật thông tin thành công! Đang chuyển hướng...');
        
        // Reload user data to update hasPassword flag
        await refreshUser();
        
        // Redirect to dashboard - ProtectedRoute will allow access now
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (!user) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="card-hover">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h3 className="fw-bold text-gradient-purple">Hoàn tất đăng ký</h3>
                <p className="text-muted">
                  Chào mừng <strong>{user.fullName || user.username}</strong>!
                  <br />
                  Vui lòng thiết lập mật khẩu để có thể đăng nhập mà không cần {user.authProvider}.
                </p>
                <Alert variant="info" className="text-start">
                  <small>
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Bước này là bắt buộc.</strong> Bạn cần thiết lập mật khẩu để có thể tiếp tục sử dụng hệ thống.
                  </small>
                </Alert>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success">
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu mới *</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    required
                    minLength={6}
                  />
                  <Form.Text className="text-muted">
                    Mật khẩu này sẽ cho phép bạn đăng nhập trực tiếp mà không cần {user.authProvider}.
                  </Form.Text>
                </Form.Group>

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

                <hr className="my-4" />

                <p className="text-muted small mb-3">
                  <em>Thông tin bổ sung (không bắt buộc):</em>
                </p>

                <Form.Group className="mb-3">
                  <Form.Label>Trường đại học</Form.Label>
                  <Form.Control
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    placeholder="VD: Đại học Bách Khoa Hà Nội"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Chuyên ngành</Form.Label>
                  <Form.Control
                    type="text"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="VD: Khoa học máy tính"
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 btn-gradient-purple"
                  disabled={isLoading || !!success}
                >
                  {isLoading ? 'Đang cập nhật...' : 'Hoàn tất và tiếp tục'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CompleteOAuthProfilePage;
