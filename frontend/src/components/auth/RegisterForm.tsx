/**
 * RegisterForm - Form đăng ký với validation toàn diện và UX tối ưu
 */

import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Alert, Row, Col, InputGroup, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { toast } from 'react-toastify';

interface RegisterFormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  subscribeNewsletter: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    subscribeNewsletter: true
  });
  
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Real-time username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (formData.username.length >= 3) {
        setIsCheckingUsername(true);
        try {
          // Username check would be implemented by backend
          // For now, assume available if length >= 3
          setUsernameAvailable(formData.username.length >= 3);
        } catch (error) {
          setUsernameAvailable(null);
        } finally {
          setIsCheckingUsername(false);
        }
      } else {
        setUsernameAvailable(null);
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.username]);

  // Real-time email availability check
  useEffect(() => {
    const checkEmail = async () => {
      if (formData.email.includes('@')) {
        setIsCheckingEmail(true);
        try {
          // Email check would be implemented by backend
          // For now, assume available if valid email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          setEmailAvailable(emailRegex.test(formData.email));
        } catch (error) {
          setEmailAvailable(null);
        } finally {
          setIsCheckingEmail(false);
        }
      } else {
        setEmailAvailable(null);
      }
    };

    const debounceTimer = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.email]);

  // Password strength calculation
  useEffect(() => {
    const calculateStrength = (password: string): number => {
      let strength = 0;
      
      if (password.length >= 8) strength += 20;
      if (password.length >= 12) strength += 10;
      if (/[a-z]/.test(password)) strength += 15;
      if (/[A-Z]/.test(password)) strength += 15;
      if (/\d/.test(password)) strength += 15;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20;
      if (password.length >= 16) strength += 5;
      
      return Math.min(strength, 100);
    };

    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  const validateField = (field: keyof RegisterFormData, value: any): string => {
    switch (field) {
      case 'fullName':
        if (!value.trim()) return 'Vui lòng nhập họ và tên';
        if (value.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự';
        if (value.trim().length > 50) return 'Họ và tên không được vượt quá 50 ký tự';
        if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(value.trim())) return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng';
        return '';

      case 'username':
        if (!value.trim()) return 'Vui lòng nhập tên đăng nhập';
        if (value.length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
        if (value.length > 20) return 'Tên đăng nhập không được vượt quá 20 ký tự';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
        if (/^[0-9]/.test(value)) return 'Tên đăng nhập không được bắt đầu bằng số';
        return '';

      case 'email':
        if (!value.trim()) return 'Vui lòng nhập email';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Email không đúng định dạng';
        return '';

      case 'password':
        if (!value) return 'Vui lòng nhập mật khẩu';
        if (value.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
        if (value.length > 128) return 'Mật khẩu không được vượt quá 128 ký tự';
        if (!/(?=.*[a-z])/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ thường';
        if (!/(?=.*[A-Z])/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 chữ hoa';
        if (!/(?=.*\d)/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 số';
        if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(value)) return 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt';
        return '';

      case 'confirmPassword':
        if (!value) return 'Vui lòng xác nhận mật khẩu';
        if (value !== formData.password) return 'Mật khẩu xác nhận không khớp';
        return '';

      case 'agreeToTerms':
        if (!value) return 'Vui lòng đồng ý với điều khoản sử dụng';
        return '';

      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(key => {
      const field = key as keyof RegisterFormData;
      if (field !== 'subscribeNewsletter') {
        const error = validateField(field, formData[field]);
        if (error) newErrors[field] = error;
      }
    });

    // Additional validations
    if (usernameAvailable === false) {
      newErrors.username = 'Tên đăng nhập đã được sử dụng';
    }
    
    if (emailAvailable === false) {
      newErrors.email = 'Email đã được sử dụng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = ['agreeToTerms', 'subscribeNewsletter'].includes(field) 
      ? e.target.checked 
      : e.target.value;
      
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
    
    // Real-time validation for critical fields
    if (['password', 'confirmPassword'].includes(field)) {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin đăng ký');
      return;
    }

    setIsLoading(true);
    
    try {
      const registerData = {
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };

      await authService.register(registerData);
      
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.');
      
      // Redirect to email verification page
      navigate('/verify-email', { 
        state: { 
          email: formData.email,
          message: 'Chúng tôi đã gửi link xác thực đến email của bạn. Vui lòng kiểm tra hộp thư (kể cả thư mục spam).'
        }
      });
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.status === 409) {
        // Handle conflict errors (username/email already exists)
        const message = error.message || 'Thông tin đăng ký đã được sử dụng';
        if (message.includes('username')) {
          setErrors(prev => ({ ...prev, username: 'Tên đăng nhập đã được sử dụng' }));
        }
        if (message.includes('email')) {
          setErrors(prev => ({ ...prev, email: 'Email đã được sử dụng' }));
        }
        toast.error(message);
      } else if (error.status === 422) {
        // Validation errors from server
        if (error.data?.errors) {
          setErrors(error.data.errors);
        }
        toast.error('Dữ liệu đăng ký không hợp lệ');
      } else {
        toast.error(error.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 40) return 'danger';
    if (strength < 70) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = (strength: number): string => {
    if (strength < 40) return 'Yếu';
    if (strength < 70) return 'Trung bình';
    return 'Mạnh';
  };

  return (
    <div className="register-form-container">
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <Card className="shadow-sm">
            <Card.Body className="p-4">
              {/* Header */}
              <div className="text-center mb-4">
                <h3 className="fw-bold mb-2">Đăng ký tài khoản</h3>
                <p className="text-muted">
                  Tham gia cộng đồng chia sẻ tài liệu ShareBuddy
                </p>
              </div>

              <Form onSubmit={handleSubmit}>
                {/* Full Name */}
                <Form.Group className="mb-3">
                  <Form.Label>Họ và tên *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-person" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Nhập họ và tên đầy đủ"
                      value={formData.fullName}
                      onChange={handleInputChange('fullName')}
                      isInvalid={!!errors.fullName}
                      disabled={isLoading}
                      autoComplete="name"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.fullName}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>

                {/* Username */}
                <Form.Group className="mb-3">
                  <Form.Label>Tên đăng nhập *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-at" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Nhập tên đăng nhập"
                      value={formData.username}
                      onChange={handleInputChange('username')}
                      isInvalid={!!errors.username}
                      isValid={usernameAvailable === true && formData.username.length >= 3}
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    {isCheckingUsername && (
                      <InputGroup.Text>
                        <div className="spinner-border spinner-border-sm" />
                      </InputGroup.Text>
                    )}
                    {!isCheckingUsername && usernameAvailable === true && (
                      <InputGroup.Text className="text-success">
                        <i className="bi bi-check-circle-fill" />
                      </InputGroup.Text>
                    )}
                    {!isCheckingUsername && usernameAvailable === false && (
                      <InputGroup.Text className="text-danger">
                        <i className="bi bi-x-circle-fill" />
                      </InputGroup.Text>
                    )}
                    <Form.Control.Feedback type="invalid">
                      {errors.username}
                    </Form.Control.Feedback>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Chỉ sử dụng chữ cái, số và dấu gạch dưới. Từ 3-20 ký tự.
                  </Form.Text>
                </Form.Group>

                {/* Email */}
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-envelope" />
                    </InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="Nhập địa chỉ email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      isInvalid={!!errors.email}
                      isValid={emailAvailable === true && formData.email.includes('@')}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                    {isCheckingEmail && (
                      <InputGroup.Text>
                        <div className="spinner-border spinner-border-sm" />
                      </InputGroup.Text>
                    )}
                    {!isCheckingEmail && emailAvailable === true && (
                      <InputGroup.Text className="text-success">
                        <i className="bi bi-check-circle-fill" />
                      </InputGroup.Text>
                    )}
                    {!isCheckingEmail && emailAvailable === false && (
                      <InputGroup.Text className="text-danger">
                        <i className="bi bi-x-circle-fill" />
                      </InputGroup.Text>
                    )}
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>

                {/* Password */}
                <Form.Group className="mb-3">
                  <Form.Label>Mật khẩu *</Form.Label>
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
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      <i className={`bi bi-eye${showPassword ? '-slash' : ''}`} />
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                  </InputGroup>
                  
                  {/* Password Strength */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted">Độ mạnh mật khẩu:</small>
                        <small className={`text-${getPasswordStrengthColor(passwordStrength)}`}>
                          {getPasswordStrengthText(passwordStrength)}
                        </small>
                      </div>
                      <ProgressBar
                        now={passwordStrength}
                        variant={getPasswordStrengthColor(passwordStrength)}
                        style={{ height: '4px' }}
                      />
                    </div>
                  )}
                </Form.Group>

                {/* Confirm Password */}
                <Form.Group className="mb-3">
                  <Form.Label>Xác nhận mật khẩu *</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <i className="bi bi-lock-fill" />
                    </InputGroup.Text>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={formData.confirmPassword}
                      onChange={handleInputChange('confirmPassword')}
                      isInvalid={!!errors.confirmPassword}
                      isValid={!!(formData.confirmPassword && formData.confirmPassword === formData.password)}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      <i className={`bi bi-eye${showConfirmPassword ? '-slash' : ''}`} />
                    </Button>
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>

                {/* Terms Agreement */}
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="agreeToTerms"
                    label={
                      <span>
                        Tôi đồng ý với{' '}
                        <Link to="/terms" target="_blank" className="text-decoration-none">
                          Điều khoản sử dụng
                        </Link>{' '}
                        và{' '}
                        <Link to="/privacy" target="_blank" className="text-decoration-none">
                          Chính sách bảo mật
                        </Link>
                      </span>
                    }
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange('agreeToTerms')}
                    isInvalid={!!errors.agreeToTerms}
                    disabled={isLoading}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.agreeToTerms}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Newsletter Subscription */}
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="subscribeNewsletter"
                    label="Nhận thông báo về tài liệu mới và cập nhật từ ShareBuddy"
                    checked={formData.subscribeNewsletter}
                    onChange={handleInputChange('subscribeNewsletter')}
                    disabled={isLoading}
                  />
                </Form.Group>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-100 mb-3"
                  disabled={isLoading || !formData.agreeToTerms}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" />
                      Đang tạo tài khoản...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2" />
                      Tạo tài khoản
                    </>
                  )}
                </Button>

                {/* Login Link */}
                <div className="text-center">
                  <span className="text-muted">Đã có tài khoản? </span>
                  <Link to="/login" className="text-decoration-none">
                    Đăng nhập ngay
                  </Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RegisterForm;