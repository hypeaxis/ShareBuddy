/**
 * Email Verification Page
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Button } from 'react-bootstrap';
import axios from 'axios';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token xác thực không hợp lệ');
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/auth/verify-email?token=${token}`
        );

        if (response.data.success) {
          setStatus('success');
          setMessage('Email đã được xác thực thành công!');
        } else {
          setStatus('error');
          setMessage(response.data.error || 'Xác thực email thất bại');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.error || 
          'Có lỗi xảy ra khi xác thực email. Vui lòng thử lại.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <div className="d-flex justify-content-center">
        <Card style={{ maxWidth: '500px', width: '100%' }}>
          <Card.Body className="p-4 text-center">
            {status === 'loading' && (
              <>
                <Spinner animation="border" variant="primary" className="mb-3" />
                <h4>Đang xác thực email...</h4>
                <p className="text-muted">Vui lòng đợi trong giây lát</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mb-3">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#28a745"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <Alert variant="success">
                  <Alert.Heading>Xác thực thành công!</Alert.Heading>
                  <p>{message}</p>
                </Alert>
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  className="mt-3"
                >
                  Đăng nhập ngay
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-3">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#dc3545"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <Alert variant="danger">
                  <Alert.Heading>Xác thực thất bại</Alert.Heading>
                  <p>{message}</p>
                </Alert>
                <Button
                  variant="outline-primary"
                  onClick={() => navigate('/login')}
                  className="mt-3 me-2"
                >
                  Về trang đăng nhập
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/resend-verification')}
                  className="mt-3"
                >
                  Gửi lại email xác thực
                </Button>
              </>
            )}
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
};

export default VerifyEmailPage;
