/**
 * Welcome/Landing Page for ShareBuddy (unauthenticated users)
 * Displays marketing content with hero section and feature cards
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const WelcomePage: React.FC = () => {
  return (
    <Container className="py-4 py-md-5" style={{ paddingTop: '80px' }}>
      <Row className="text-center mb-4 mb-md-5">
        <Col>
          <h1 className="display-5 display-md-4 fw-bold text-gradient-purple mb-3">
            📚 Chào mừng đến ShareBuddy
          </h1>
          <p className="lead text-muted px-3 px-md-0">
            Nền tảng chia sẻ tài liệu học tập dành cho sinh viên Việt Nam
          </p>
          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3 mt-4">
            <Link
              to="/documents"
              className="btn btn-primary btn-lg btn-gradient-purple"
            >
              Khám phá tài liệu
            </Link>
            <Link
              to="/register"
              className="btn btn-outline-primary btn-lg"
            >
              Tham gia ngay
            </Link>
          </div>
        </Col>
      </Row>

      <Row className="mb-4 mb-md-5 g-3 g-md-4">
        <Col xs={12} sm={6} md={4}>
          <Card className="h-100 card-hover">
            <Card.Body className="text-center p-4">
              <div className="accent-blue fs-1 mb-3">📖</div>
              <Card.Title>Thư viện phong phú</Card.Title>
              <Card.Text>
                Hàng nghìn tài liệu học tập từ các trường đại học hàng đầu Việt Nam
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="h-100 card-hover">
            <Card.Body className="text-center p-4">
              <div className="accent-green fs-1 mb-3">🤝</div>
              <Card.Title>Cộng đồng hỗ trợ</Card.Title>
              <Card.Text>
                Kết nối với sinh viên cùng chuyên ngành, chia sẻ kinh nghiệm học tập
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={4}>
          <Card className="h-100 card-hover">
            <Card.Body className="text-center p-4">
              <div className="accent-yellow fs-1 mb-3">⭐</div>
              <Card.Title>Chất lượng đảm bảo</Card.Title>
              <Card.Text>
                Hệ thống đánh giá và kiểm duyệt giúp đảm bảo chất lượng tài liệu
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="text-center mt-4 mt-md-5">
        <Col>
          <h2 className="mb-3 mb-md-4">Tại sao chọn ShareBuddy?</h2>
          <p className="text-muted px-3 px-md-5">
            ShareBuddy giúp sinh viên dễ dàng tìm kiếm, chia sẻ và đánh giá tài liệu học tập.
            Tham gia cộng đồng ngay hôm nay!
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default WelcomePage;
