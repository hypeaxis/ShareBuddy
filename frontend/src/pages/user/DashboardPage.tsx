/**
 * User Dashboard Page for ShareBuddy - Complete user analytics and management
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tab, Tabs, ProgressBar } from 'react-bootstrap';
import { 
  FaFileAlt, FaDownload, FaCoins, FaEye, FaUser, FaChartLine, 
  FaStar, FaHeart, FaShare, FaTrophy 
} from 'react-icons/fa';

interface DashboardStats {
  totalDocuments: number;
  totalDownloads: number;
  totalViews: number;
  currentCredits: number;
  creditEarned: number;
  creditSpent: number;
  averageRating: number;
  followers: number;
  following: number;
}

interface RecentDocument {
  id: string;
  title: string;
  downloads: number;
  views: number;
  rating: number;
  uploadDate: string;
  status: 'approved' | 'pending' | 'rejected';
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'spend' | 'bonus';
  description: string;
  date: string;
}

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats] = useState<DashboardStats>({
    totalDocuments: 12,
    totalDownloads: 245,
    totalViews: 1420,
    currentCredits: 38,
    creditEarned: 156,
    creditSpent: 118,
    averageRating: 4.3,
    followers: 28,
    following: 15
  });

  const [recentDocuments] = useState<RecentDocument[]>([
    {
      id: '1',
      title: 'Giáo trình Toán Cao Cấp A1',
      downloads: 45,
      views: 120,
      rating: 4.5,
      uploadDate: '2025-11-15',
      status: 'approved'
    },
    {
      id: '2',
      title: 'Bài giảng Vật lý Đại cương',
      downloads: 32,
      views: 89,
      rating: 4.2,
      uploadDate: '2025-11-14',
      status: 'approved'
    },
    {
      id: '3',
      title: 'Thực hành Java Spring Boot',
      downloads: 0,
      views: 5,
      rating: 0,
      uploadDate: '2025-11-16',
      status: 'pending'
    }
  ]);

  const [creditHistory] = useState<CreditTransaction[]>([
    {
      id: '1',
      amount: 15,
      type: 'earn',
      description: 'Tài liệu "Toán Cao Cấp A1" được tải xuống',
      date: '2025-11-16'
    },
    {
      id: '2',
      amount: -3,
      type: 'spend',
      description: 'Tải xuống "Cơ sở dữ liệu nâng cao"',
      date: '2025-11-15'
    },
    {
      id: '3',
      amount: 10,
      type: 'bonus',
      description: 'Bonus hoàn thành profile',
      date: '2025-11-14'
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge bg="success">Đã duyệt</Badge>;
      case 'pending':
        return <Badge bg="warning">Chờ duyệt</Badge>;
      case 'rejected':
        return <Badge bg="danger">Bị từ chối</Badge>;
      default:
        return <Badge bg="secondary">Không xác định</Badge>;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <FaCoins className="text-success" />;
      case 'spend':
        return <FaDownload className="text-danger" />;
      case 'bonus':
        return <FaTrophy className="text-warning" />;
      default:
        return <FaCoins />;
    }
  };

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <FaChartLine className="me-2 text-primary" size={24} />
          <h2 className="mb-0">Dashboard</h2>
        </div>
        <div className="d-flex align-items-center">
          <FaCoins className="me-1 text-warning" />
          <span className="fw-bold">{stats.currentCredits} Credits</span>
        </div>
      </div>

      <Tabs
        id="dashboard-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'overview')}
        className="mb-4"
      >
        <Tab eventKey="overview" title="📊 Tổng quan">
          {/* Statistics Cards */}
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <FaFileAlt size={32} className="text-primary mb-2" />
                  <h4 className="mb-1">{stats.totalDocuments}</h4>
                  <small className="text-muted">Tài liệu đã tải lên</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <FaDownload size={32} className="text-success mb-2" />
                  <h4 className="mb-1">{stats.totalDownloads}</h4>
                  <small className="text-muted">Lượt tải xuống</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <FaEye size={32} className="text-info mb-2" />
                  <h4 className="mb-1">{stats.totalViews}</h4>
                  <small className="text-muted">Lượt xem</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <FaStar size={32} className="text-warning mb-2" />
                  <h4 className="mb-1">{stats.averageRating}/5</h4>
                  <small className="text-muted">Đánh giá trung bình</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Credit Overview */}
          <Row className="g-4 mb-4">
            <Col md={8}>
              <Card className="h-100">
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaCoins className="me-2 text-warning" />
                    Thống kê Credits
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4} className="text-center">
                      <h5 className="text-success mb-1">+{stats.creditEarned}</h5>
                      <small className="text-muted">Credits kiếm được</small>
                    </Col>
                    <Col md={4} className="text-center">
                      <h5 className="text-danger mb-1">-{stats.creditSpent}</h5>
                      <small className="text-muted">Credits đã chi</small>
                    </Col>
                    <Col md={4} className="text-center">
                      <h5 className="text-primary mb-1">{stats.currentCredits}</h5>
                      <small className="text-muted">Credits hiện tại</small>
                    </Col>
                  </Row>
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Mức độ hoạt động</span>
                      <span>75%</span>
                    </div>
                    <ProgressBar now={75} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100">
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaUser className="me-2 text-info" />
                    Mạng xã hội
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between mb-3">
                    <div className="text-center">
                      <h5 className="mb-1">{stats.followers}</h5>
                      <small className="text-muted">Người theo dõi</small>
                    </div>
                    <div className="text-center">
                      <h5 className="mb-1">{stats.following}</h5>
                      <small className="text-muted">Đang theo dõi</small>
                    </div>
                  </div>
                  <Button variant="outline-primary" size="sm" className="w-100">
                    <FaHeart className="me-1" />
                    Quản lý kết nối
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="documents" title="📄 Tài liệu của tôi">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Tài liệu gần đây</h6>
              <Button variant="primary" size="sm">
                <FaFileAlt className="me-1" />
                Tải lên mới
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Tài liệu</th>
                    <th>Trạng thái</th>
                    <th>Lượt xem</th>
                    <th>Tải xuống</th>
                    <th>Đánh giá</th>
                    <th>Ngày tải</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaFileAlt className="me-2 text-primary" />
                          <strong>{doc.title}</strong>
                        </div>
                      </td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td>
                        <FaEye className="me-1 text-muted" />
                        {doc.views}
                      </td>
                      <td>
                        <FaDownload className="me-1 text-muted" />
                        {doc.downloads}
                      </td>
                      <td>
                        {doc.rating > 0 ? (
                          <div className="d-flex align-items-center">
                            <FaStar className="me-1 text-warning" />
                            {doc.rating}
                          </div>
                        ) : (
                          <span className="text-muted">Chưa có</span>
                        )}
                      </td>
                      <td>{new Date(doc.uploadDate).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <Button variant="outline-primary" size="sm">
                          <FaShare className="me-1" />
                          Chia sẻ
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="credits" title="💰 Lịch sử Credits">
          <Card>
            <Card.Header>
              <h6 className="mb-0 d-flex align-items-center">
                <FaCoins className="me-2 text-warning" />
                Giao dịch Credits gần đây
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Loại</th>
                    <th>Mô tả</th>
                    <th>Số lượng</th>
                    <th>Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {creditHistory.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="text-center">
                        {getTransactionIcon(transaction.type)}
                      </td>
                      <td>{transaction.description}</td>
                      <td>
                        <span className={`fw-bold ${
                          transaction.amount > 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                        </span>
                      </td>
                      <td>{new Date(transaction.date).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Card className="mt-4">
            <Card.Header>
              <h6 className="mb-0">💡 Cách kiếm Credits</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="text-center mb-3">
                  <FaFileAlt size={32} className="text-primary mb-2" />
                  <h6>Tải lên tài liệu</h6>
                  <p className="text-muted small">Mỗi tài liệu được duyệt: +5 credits</p>
                </Col>
                <Col md={4} className="text-center mb-3">
                  <FaDownload size={32} className="text-success mb-2" />
                  <h6>Tài liệu được tải</h6>
                  <p className="text-muted small">Mỗi lượt tải: +1 credit</p>
                </Col>
                <Col md={4} className="text-center mb-3">
                  <FaStar size={32} className="text-warning mb-2" />
                  <h6>Đánh giá cao</h6>
                  <p className="text-muted small">Đánh giá 5 sao: +2 credits</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="analytics" title="📈 Thống kê">
          <Row className="g-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0">📊 Hoạt động 7 ngày qua</h6>
                </Card.Header>
                <Card.Body>
                  <div className="text-center py-4">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <p className="text-muted">Biểu đồ thống kê sẽ được hiển thị ở đây</p>
                    <small className="text-muted">Tính năng đang được phát triển</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0">🎯 Mục tiêu tháng này</h6>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Tải lên tài liệu</span>
                      <span>8/15</span>
                    </div>
                    <ProgressBar now={53} />
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Kiếm credits</span>
                      <span>156/200</span>
                    </div>
                    <ProgressBar now={78} />
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Lượt xem</span>
                      <span>1420/2000</span>
                    </div>
                    <ProgressBar now={71} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default DashboardPage;