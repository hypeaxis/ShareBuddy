/**
 * Admin Page for ShareBuddy - Complete admin panel with system management
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Tab, Tabs, Alert, Modal, ProgressBar } from 'react-bootstrap';
import { 
  FaUsers, FaFileAlt, FaChartLine, FaFlag, FaCog, FaTrash, FaEdit, 
  FaCheck, FaTimes, FaEye, FaCoins, FaExclamationTriangle,
  FaUserShield, FaDatabase, FaServer, FaBell, FaSearch, FaFilter, FaUser
} from 'react-icons/fa';

interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  pendingReviews: number;
  totalReports: number;
  systemLoad: number;
  storageUsed: number;
}

interface PendingDocument {
  id: string;
  title: string;
  author: string;
  uploadDate: string;
  fileSize: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned';
  joinDate: string;
  documentsCount: number;
  credits: number;
}

interface SystemReport {
  id: string;
  type: 'user' | 'document' | 'comment';
  reportedBy: string;
  target: string;
  reason: string;
  date: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  
  const [stats] = useState<AdminStats>({
    totalUsers: 2847,
    totalDocuments: 15623,
    pendingReviews: 23,
    totalReports: 8,
    systemLoad: 68,
    storageUsed: 45
  });

  const [pendingDocuments] = useState<PendingDocument[]>([
    {
      id: '1',
      title: 'Giáo trình Toán cao cấp mới nhất',
      author: 'nguyenvana',
      uploadDate: '2025-11-17',
      fileSize: '2.4 MB',
      category: 'Toán học',
      status: 'pending'
    },
    {
      id: '2',
      title: 'Bài giảng Vật lý đại cương',
      author: 'tranthib',
      uploadDate: '2025-11-16',
      fileSize: '5.1 MB',
      category: 'Vật lý',
      status: 'pending'
    }
  ]);

  const [users] = useState<UserAccount[]>([
    {
      id: '1',
      username: 'nguyenvana',
      email: 'nguyenvana@email.com',
      role: 'user',
      status: 'active',
      joinDate: '2025-01-15',
      documentsCount: 12,
      credits: 45
    },
    {
      id: '2',
      username: 'tranthib',
      email: 'tranthib@email.com',
      role: 'moderator',
      status: 'active',
      joinDate: '2024-11-20',
      documentsCount: 28,
      credits: 89
    }
  ]);

  const [reports] = useState<SystemReport[]>([
    {
      id: '1',
      type: 'document',
      reportedBy: 'user123',
      target: 'Tài liệu vi phạm bản quyền',
      reason: 'Nội dung vi phạm bản quyền',
      date: '2025-11-16',
      status: 'pending'
    },
    {
      id: '2',
      type: 'user',
      reportedBy: 'user456',
      target: 'spam_user',
      reason: 'Spam và quấy rối',
      date: '2025-11-15',
      status: 'pending'
    }
  ]);

  const getStatusBadge = (status: string, type: 'document' | 'user' | 'report' = 'document') => {
    const variants = {
      document: {
        pending: 'warning',
        approved: 'success', 
        rejected: 'danger'
      },
      user: {
        active: 'success',
        suspended: 'warning',
        banned: 'danger'
      },
      report: {
        pending: 'warning',
        resolved: 'success',
        dismissed: 'secondary'
      }
    };
    
    return <Badge bg={variants[type][status as keyof typeof variants[typeof type]]}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      user: 'secondary',
      moderator: 'info',
      admin: 'danger'
    };
    return <Badge bg={variants[role as keyof typeof variants]}>{role}</Badge>;
  };

  const handleDocumentAction = (id: string, action: 'approve' | 'reject') => {
    console.log(`${action} document ${id}`);
    // TODO: Implement API call
  };

  const handleUserAction = (id: string, action: 'suspend' | 'ban' | 'activate') => {
    console.log(`${action} user ${id}`);
    // TODO: Implement API call
  };

  const handleReportAction = (id: string, action: 'resolve' | 'dismiss') => {
    console.log(`${action} report ${id}`);
    // TODO: Implement API call
  };

  return (
    <Container fluid className="py-4" style={{ marginTop: '80px' }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <FaUserShield className="me-2 text-danger" size={24} />
          <h2 className="mb-0">Bảng điều khiển quản trị</h2>
        </div>
        <Alert variant="warning" className="mb-0 py-1 px-2">
          <FaExclamationTriangle className="me-1" />
          <small>Khu vực quản trị - Chỉ dành cho admin</small>
        </Alert>
      </div>

      <Tabs
        id="admin-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'dashboard')}
        className="mb-4"
      >
        <Tab eventKey="dashboard" title="📊 Tổng quan">
          {/* System Stats */}
          <Row className="g-4 mb-4">
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <FaUsers size={32} className="text-primary mb-2" />
                  <h4 className="mb-1">{stats.totalUsers.toLocaleString()}</h4>
                  <small className="text-muted">Tổng người dùng</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <FaFileAlt size={32} className="text-success mb-2" />
                  <h4 className="mb-1">{stats.totalDocuments.toLocaleString()}</h4>
                  <small className="text-muted">Tổng tài liệu</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <FaFlag size={32} className="text-warning mb-2" />
                  <h4 className="mb-1">{stats.pendingReviews}</h4>
                  <small className="text-muted">Chờ phê duyệt</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100 border-0 shadow-sm">
                <Card.Body>
                  <FaExclamationTriangle size={32} className="text-danger mb-2" />
                  <h4 className="mb-1">{stats.totalReports}</h4>
                  <small className="text-muted">Báo cáo chờ xử lý</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* System Health */}
          <Row className="g-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaServer className="me-2 text-info" />
                    Tình trạng hệ thống
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Tải hệ thống</span>
                      <span>{stats.systemLoad}%</span>
                    </div>
                    <ProgressBar 
                      now={stats.systemLoad} 
                      variant={stats.systemLoad > 80 ? 'danger' : stats.systemLoad > 60 ? 'warning' : 'success'}
                    />
                  </div>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Dung lượng đã sử dụng</span>
                      <span>{stats.storageUsed}%</span>
                    </div>
                    <ProgressBar 
                      now={stats.storageUsed} 
                      variant={stats.storageUsed > 80 ? 'danger' : stats.storageUsed > 60 ? 'warning' : 'success'}
                    />
                  </div>
                  <div className="text-center">
                    <Button variant="outline-primary" size="sm">
                      <FaDatabase className="me-1" />
                      Xem chi tiết
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaChartLine className="me-2 text-success" />
                    Hoạt động gần đây
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="text-center py-4">
                    <FaChartLine size={48} className="text-muted mb-3" />
                    <p className="text-muted">Biểu đồ thống kê sẽ hiển thị ở đây</p>
                    <small className="text-muted">Tính năng đang được phát triển</small>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="documents" title="📄 Quản lý tài liệu">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Tài liệu chờ phê duyệt ({pendingDocuments.length})</h6>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" size="sm">
                  <FaFilter className="me-1" />
                  Lọc
                </Button>
                <Button variant="outline-secondary" size="sm">
                  <FaSearch className="me-1" />
                  Tìm kiếm
                </Button>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Tài liệu</th>
                    <th>Tác giả</th>
                    <th>Danh mục</th>
                    <th>Kích thước</th>
                    <th>Ngày tải</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaFileAlt className="me-2 text-primary" />
                          <strong>{doc.title}</strong>
                        </div>
                      </td>
                      <td>{doc.author}</td>
                      <td>{doc.category}</td>
                      <td>{doc.fileSize}</td>
                      <td>{new Date(doc.uploadDate).toLocaleDateString('vi-VN')}</td>
                      <td>{getStatusBadge(doc.status, 'document')}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </Button>
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => handleDocumentAction(doc.id, 'approve')}
                            title="Phê duyệt"
                          >
                            <FaCheck />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleDocumentAction(doc.id, 'reject')}
                            title="Từ chối"
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="users" title="👥 Quản lý người dùng">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Danh sách người dùng</h6>
              <Button variant="primary" size="sm">
                <FaUsers className="me-1" />
                Thêm người dùng
              </Button>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Tài liệu</th>
                    <th>Credits</th>
                    <th>Ngày tham gia</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="me-2 text-muted" />
                          <strong>{user.username}</strong>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{getStatusBadge(user.status, 'user')}</td>
                      <td>{user.documentsCount}</td>
                      <td>
                        <FaCoins className="me-1 text-warning" />
                        {user.credits}
                      </td>
                      <td>{new Date(user.joinDate).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-info" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </Button>
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'suspend')}
                            title="Tạm khóa"
                          >
                            <FaEdit />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleUserAction(user.id, 'ban')}
                            title="Cấm vĩnh viễn"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="reports" title="🚩 Báo cáo vi phạm">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Báo cáo chờ xử lý ({reports.length})</h6>
            </Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Loại</th>
                    <th>Người báo cáo</th>
                    <th>Đối tượng</th>
                    <th>Lý do</th>
                    <th>Ngày báo cáo</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <Badge bg="info">{report.type}</Badge>
                      </td>
                      <td>{report.reportedBy}</td>
                      <td>{report.target}</td>
                      <td>{report.reason}</td>
                      <td>{new Date(report.date).toLocaleDateString('vi-VN')}</td>
                      <td>{getStatusBadge(report.status, 'report')}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => handleReportAction(report.id, 'resolve')}
                            title="Giải quyết"
                          >
                            <FaCheck />
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => handleReportAction(report.id, 'dismiss')}
                            title="Bỏ qua"
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="settings" title="⚙️ Cài đặt hệ thống">
          <Row className="g-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaCog className="me-2" />
                    Cài đặt chung
                  </h6>
                </Card.Header>
                <Card.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Tên hệ thống</Form.Label>
                      <Form.Control type="text" defaultValue="ShareBuddy" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Credits mặc định cho người dùng mới</Form.Label>
                      <Form.Control type="number" defaultValue="10" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Kích thước file tối đa (MB)</Form.Label>
                      <Form.Control type="number" defaultValue="10" />
                    </Form.Group>
                    <Button variant="primary">Lưu cài đặt</Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0 d-flex align-items-center">
                    <FaBell className="me-2" />
                    Cài đặt thông báo
                  </h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <strong>Thông báo tài liệu mới</strong>
                      <p className="mb-0 text-muted small">Thông báo khi có tài liệu mới được tải lên</p>
                    </div>
                    <Form.Check type="switch" defaultChecked />
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <strong>Thông báo báo cáo</strong>
                      <p className="mb-0 text-muted small">Thông báo khi có báo cáo vi phạm mới</p>
                    </div>
                    <Form.Check type="switch" defaultChecked />
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <div>
                      <strong>Backup tự động</strong>
                      <p className="mb-0 text-muted small">Tự động sao lưu dữ liệu hàng ngày</p>
                    </div>
                    <Form.Check type="switch" defaultChecked />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      {/* User Detail Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chi tiết người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Row>
              <Col md={6}>
                <h6>Thông tin cơ bản</h6>
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Vai trò:</strong> {getRoleBadge(selectedUser.role)}</p>
                <p><strong>Trạng thái:</strong> {getStatusBadge(selectedUser.status, 'user')}</p>
              </Col>
              <Col md={6}>
                <h6>Thống kê</h6>
                <p><strong>Số tài liệu:</strong> {selectedUser.documentsCount}</p>
                <p><strong>Credits:</strong> {selectedUser.credits}</p>
                <p><strong>Ngày tham gia:</strong> {new Date(selectedUser.joinDate).toLocaleDateString('vi-VN')}</p>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AdminPage;