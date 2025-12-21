/**
 * Welcome/Landing Page for ShareBuddy (unauthenticated users)
 * Modern redesign with animated background and minimalist icons
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import ShareBuddyLogo from '../components/common/ShareBuddyLogo';
import { Link } from 'react-router-dom';
import '../styles/WelcomePage.css';

// Modern Icon Components with SVG gradients
const FeatureIcon: React.FC<{ type: 'library' | 'community' | 'quality' | 'share' | 'search' | 'secure' }> = ({ type }) => {
  const icons = {
    library: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="libraryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect x="8" y="12" width="32" height="36" rx="3" fill="url(#libraryGrad)" opacity="0.2"/>
        <rect x="16" y="8" width="32" height="36" rx="3" fill="url(#libraryGrad)" opacity="0.5"/>
        <path d="M20 20h20M20 26h16M20 32h18" stroke="url(#libraryGrad)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    community: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="communityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="8" fill="url(#communityGrad)" opacity="0.3"/>
        <circle cx="36" cy="20" r="8" fill="url(#communityGrad)" opacity="0.5"/>
        <circle cx="28" cy="36" r="8" fill="url(#communityGrad)" opacity="0.7"/>
        <path d="M20 28c0-4 4-8 8-8s8 4 8 8" stroke="url(#communityGrad)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    quality: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="qualityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M28 8l6 12 13 2-9.5 9 2.2 13-11.7-6-11.7 6 2.2-13-9.5-9 13-2z" fill="url(#qualityGrad)" opacity="0.8"/>
        <circle cx="28" cy="28" r="6" fill="url(#qualityGrad)"/>
      </svg>
    ),
    share: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="shareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="14" cy="28" r="8" fill="url(#shareGrad)" opacity="0.5"/>
        <circle cx="42" cy="18" r="8" fill="url(#shareGrad)" opacity="0.7"/>
        <circle cx="42" cy="38" r="8" fill="url(#shareGrad)" opacity="0.7"/>
        <path d="M22 26l16-6M22 30l16 6" stroke="url(#shareGrad)" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    search: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="14" stroke="url(#searchGrad)" strokeWidth="3" fill="none"/>
        <path d="M34 34l12 12" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="8" fill="url(#searchGrad)" opacity="0.3"/>
      </svg>
    ),
    secure: (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="secureGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <path d="M28 8c-8 4-16 4-16 4v16c0 12 16 20 16 20s16-8 16-20V12s-8 0-16-4z" fill="url(#secureGrad)" opacity="0.8"/>
        <path d="M20 28l6 6 10-12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  };
  
  return <div className="feature-icon">{icons[type]}</div>;
};

const WelcomePage: React.FC = () => {
  return (
    <div className="welcome-page">
      {/* Animated Background */}
      <div className="welcome-bg-animated">
        <div className="bg-gradient-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80" 
          alt="Students collaborating"
          className="bg-image"
        />
      </div>

      {/* Hero Section */}
      <Container className="hero-section" style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <Row className="justify-content-center text-center">
          <Col lg={10} xl={8}>
            <div className="hero-logo-wrapper mb-4">
              <ShareBuddyLogo width={80} height={80} />
            </div>
            <h1 className="hero-title display-3 fw-bold mb-4">
              Học Tập Cùng Nhau,<br />
              <span className="text-gradient">Thành Công Rực Rỡ</span>
            </h1>
            <p className="hero-subtitle lead mb-5 px-md-5">
              Nền tảng chia sẻ tài liệu học tập hàng đầu cho sinh viên Việt Nam.
              Kết nối tri thức, chia sẻ kinh nghiệm, cùng nhau tiến bộ.
            </p>
            <div className="hero-cta d-flex flex-column flex-sm-row justify-content-center gap-3">
              <Link to="/documents" className="btn btn-primary btn-lg btn-gradient-purple px-5 py-3">
                <span className="me-2">🚀</span>
                Khám Phá Ngay
              </Link>
              <Link to="/register" className="btn btn-outline-light btn-lg px-5 py-3 btn-outline-custom">
                Tham Gia Miễn Phí
              </Link>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Features Section */}
      <Container className="features-section py-5">
        <Row className="text-center mb-5">
          <Col>
            <h2 className="section-title display-5 fw-bold mb-3">Tại Sao Chọn ShareBuddy?</h2>
            <p className="section-subtitle text-muted">Những tính năng nổi bật giúp bạn học tập hiệu quả hơn</p>
          </Col>
        </Row>

        <Row className="g-4 mb-5">
          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="library" />
                <h4 className="feature-title mt-4 mb-3">Thư Viện Đa Dạng</h4>
                <p className="feature-description text-muted">
                  Hàng nghìn tài liệu từ các trường đại học hàng đầu, được phân loại chi tiết theo ngành, môn học.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="community" />
                <h4 className="feature-title mt-4 mb-3">Cộng Đồng Sôi Động</h4>
                <p className="feature-description text-muted">
                  Kết nối với hàng ngàn sinh viên, chia sẻ kinh nghiệm và cùng nhau phát triển.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="quality" />
                <h4 className="feature-title mt-4 mb-3">Chất Lượng Đảm Bảo</h4>
                <p className="feature-description text-muted">
                  Hệ thống đánh giá và kiểm duyệt chặt chẽ, đảm bảo tài liệu chính xác và hữu ích.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="share" />
                <h4 className="feature-title mt-4 mb-3">Chia Sẻ Dễ Dàng</h4>
                <p className="feature-description text-muted">
                  Upload và chia sẻ tài liệu của bạn chỉ với vài click, giúp đỡ bạn bè cùng tiến bộ.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="search" />
                <h4 className="feature-title mt-4 mb-3">Tìm Kiếm Thông Minh</h4>
                <p className="feature-description text-muted">
                  Công cụ tìm kiếm mạnh mẽ với bộ lọc chi tiết, giúp bạn tìm đúng tài liệu cần thiết.
                </p>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={6} lg={4}>
            <Card className="feature-card h-100 border-0">
              <Card.Body className="text-center p-4">
                <FeatureIcon type="secure" />
                <h4 className="feature-title mt-4 mb-3">An Toàn & Bảo Mật</h4>
                <p className="feature-description text-muted">
                  Thông tin cá nhân được bảo vệ tuyệt đối, tuân thủ các tiêu chuẩn bảo mật cao nhất.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Stats Section */}
        <Row className="stats-section text-center g-4 py-5">
          <Col xs={6} md={3}>
            <div className="stat-item">
              <h3 className="stat-number text-gradient">10K+</h3>
              <p className="stat-label text-muted">Tài Liệu</p>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <h3 className="stat-number text-gradient">5K+</h3>
              <p className="stat-label text-muted">Sinh Viên</p>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <h3 className="stat-number text-gradient">50+</h3>
              <p className="stat-label text-muted">Trường ĐH</p>
            </div>
          </Col>
          <Col xs={6} md={3}>
            <div className="stat-item">
              <h3 className="stat-number text-gradient">100+</h3>
              <p className="stat-label text-muted">Chuyên Ngành</p>
            </div>
          </Col>
        </Row>

        {/* CTA Section */}
        <Row className="cta-section text-center py-5">
          <Col lg={8} className="mx-auto">
            <div className="cta-card p-5">
              <h2 className="display-6 fw-bold mb-4">Sẵn Sàng Bắt Đầu?</h2>
              <p className="lead mb-4 text-muted">
                Tham gia cộng đồng ShareBuddy ngay hôm nay và trải nghiệm cách học tập hiện đại, hiệu quả.
              </p>
              <Link to="/register" className="btn btn-primary btn-lg btn-gradient-purple px-5 py-3">
                Đăng Ký Miễn Phí
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default WelcomePage;
