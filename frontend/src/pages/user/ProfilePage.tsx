/**
 * User Profile Page for ShareBuddy - Complete profile management with social features
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Badge, Alert, Image, Modal } from 'react-bootstrap';
import { 
  FaEdit, FaSave, FaTimes, FaCamera, FaUniversity, FaGraduationCap, 
  FaMapMarkerAlt, FaCalendarAlt, FaFileAlt, FaDownload, FaStar, 
  FaUserPlus, FaUserCheck, FaShare, FaCog, FaEye, FaCoins 
} from 'react-icons/fa';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  bio: string;
  university: string;
  major: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  isVerifiedAuthor: boolean;
  joinDate: string;
  credits: number;
  stats: {
    documentsUploaded: number;
    totalDownloads: number;
    totalViews: number;
    averageRating: number;
    followers: number;
    following: number;
  };
}

interface UserDocument {
  id: string;
  title: string;
  subject: string;
  downloads: number;
  views: number;
  rating: number;
  uploadDate: string;
  creditCost: number;
  isPremium: boolean;
}

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile] = useState(true); // Assume own profile for demo
  
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    username: 'testuser',
    fullName: 'Nguyễn Văn Test',
    email: 'test@example.com',
    bio: 'Sinh viên năm 3 ngành Khoa học máy tính tại ĐH Bách Khoa. Đam mê chia sẻ kiến thức và học hỏi từ cộng đồng.',
    university: 'Đại học Bách Khoa Hà Nội',
    major: 'Khoa học máy tính',
    location: 'Hà Nội, Việt Nam',
    avatarUrl: 'https://via.placeholder.com/150',
    coverUrl: 'https://via.placeholder.com/800x200',
    isVerifiedAuthor: false,
    joinDate: '2024-01-15',
    credits: 156,
    stats: {
      documentsUploaded: 12,
      totalDownloads: 245,
      totalViews: 1420,
      averageRating: 4.3,
      followers: 28,
      following: 15
    }
  });

  const [editForm, setEditForm] = useState({ ...profile });
  const [userDocuments] = useState<UserDocument[]>([
    {
      id: '1',
      title: 'Giáo trình Toán Cao Cấp A1',
      subject: 'Toán học',
      downloads: 45,
      views: 120,
      rating: 4.5,
      uploadDate: '2025-11-15',
      creditCost: 2,
      isPremium: true
    },
    {
      id: '2',
      title: 'Bài giảng Vật lý Đại cương',
      subject: 'Vật lý',
      downloads: 32,
      views: 89,
      rating: 4.2,
      uploadDate: '2025-11-14',
      creditCost: 1,
      isPremium: false
    }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setProfile({ ...editForm });
    setEditMode(false);
    // TODO: Save to backend
  };

  const handleCancel = () => {
    setEditForm({ ...profile });
    setEditMode(false);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: Update follow status in backend
  };

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      {/* Profile Header */}
      <Card className="mb-4 border-0 shadow-sm">
        <div 
          className="position-relative"
          style={{
            height: '200px',
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {isOwnProfile && (
            <Button 
              variant="outline-light" 
              size="sm" 
              className="position-absolute top-0 end-0 m-3"
            >
              <FaCamera className="me-1" />
              Đổi ảnh bìa
            </Button>
          )}
        </div>
        
        <Card.Body className="pt-0">
          <Row>
            <Col md={3} className="text-center">
              <div className="position-relative d-inline-block" style={{ marginTop: '-60px' }}>
                <Image
                  src={profile.avatarUrl}
                  alt="Avatar"
                  roundedCircle
                  width={120}
                  height={120}
                  className="border border-4 border-white shadow"
                />
                {isOwnProfile && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="position-absolute bottom-0 end-0"
                    style={{ borderRadius: '50%', width: '32px', height: '32px' }}
                    onClick={() => setShowAvatarModal(true)}
                  >
                    <FaCamera />
                  </Button>
                )}
              </div>
            </Col>
            
            <Col md={6}>
              <div style={{ marginTop: '20px' }}>
                <div className="d-flex align-items-center mb-2">
                  <h3 className="mb-0 me-2">{profile.fullName}</h3>
                  {profile.isVerifiedAuthor && (
                    <Badge bg="primary" className="d-flex align-items-center">
                      <FaStar className="me-1" size={12} />
                      Tác giả uy tín
                    </Badge>
                  )}
                </div>
                <p className="text-muted mb-2">@{profile.username}</p>
                <p className="mb-2">{profile.bio}</p>
                <div className="d-flex flex-wrap gap-2 text-muted small">
                  <span><FaUniversity className="me-1" />{profile.university}</span>
                  <span><FaGraduationCap className="me-1" />{profile.major}</span>
                  <span><FaMapMarkerAlt className="me-1" />{profile.location}</span>
                  <span><FaCalendarAlt className="me-1" />Tham gia {new Date(profile.joinDate).getFullYear()}</span>
                </div>
              </div>
            </Col>
            
            <Col md={3} className="text-end">
              <div style={{ marginTop: '20px' }}>
                {isOwnProfile ? (
                  <Button
                    variant={editMode ? "success" : "outline-primary"}
                    onClick={editMode ? handleSave : () => setEditMode(true)}
                    className="me-2"
                  >
                    {editMode ? <FaSave className="me-1" /> : <FaEdit className="me-1" />}
                    {editMode ? 'Lưu' : 'Chỉnh sửa'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={isFollowing ? "success" : "primary"}
                      onClick={handleFollow}
                      className="me-2"
                    >
                      {isFollowing ? <FaUserCheck className="me-1" /> : <FaUserPlus className="me-1" />}
                      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                    </Button>
                    <Button variant="outline-secondary" size="sm">
                      <FaShare />
                    </Button>
                  </>
                )}
                
                {editMode && (
                  <Button variant="outline-secondary" onClick={handleCancel} className="ms-2">
                    <FaTimes className="me-1" />
                    Hủy
                  </Button>
                )}
              </div>
            </Col>
          </Row>

          {/* Stats */}
          <Row className="mt-3">
            <Col className="text-center">
              <h5 className="mb-0">{profile.stats.documentsUploaded}</h5>
              <small className="text-muted">Tài liệu</small>
            </Col>
            <Col className="text-center">
              <h5 className="mb-0">{profile.stats.totalDownloads}</h5>
              <small className="text-muted">Lượt tải</small>
            </Col>
            <Col className="text-center">
              <h5 className="mb-0">{profile.stats.totalViews}</h5>
              <small className="text-muted">Lượt xem</small>
            </Col>
            <Col className="text-center">
              <h5 className="mb-0">{profile.stats.averageRating}/5</h5>
              <small className="text-muted">Đánh giá</small>
            </Col>
            <Col className="text-center">
              <h5 className="mb-0">{profile.stats.followers}</h5>
              <small className="text-muted">Theo dõi</small>
            </Col>
            <Col className="text-center">
              <h5 className="mb-0">{profile.credits}</h5>
              <small className="text-muted">Credits</small>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Content Tabs */}
      <Tabs
        id="profile-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'profile')}
        className="mb-4"
      >
        <Tab eventKey="profile" title="👤 Thông tin">
          {editMode ? (
            <Card>
              <Card.Header>
                <h6 className="mb-0">Chỉnh sửa thông tin cá nhân</h6>
              </Card.Header>
              <Card.Body>
                <Form>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Họ và tên *</Form.Label>
                        <Form.Control
                          type="text"
                          name="fullName"
                          value={editForm.fullName}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tên đăng nhập *</Form.Label>
                        <Form.Control
                          type="text"
                          name="username"
                          value={editForm.username}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Giới thiệu bản thân</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="bio"
                      value={editForm.bio}
                      onChange={handleInputChange}
                      placeholder="Hãy giới thiệu về bản thân, sở thích và mục tiêu học tập..."
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Trường đại học</Form.Label>
                        <Form.Control
                          type="text"
                          name="university"
                          value={editForm.university}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Chuyên ngành</Form.Label>
                        <Form.Control
                          type="text"
                          name="major"
                          value={editForm.major}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Địa điểm</Form.Label>
                    <Form.Control
                      type="text"
                      name="location"
                      value={editForm.location}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Form>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Header>
                <h6 className="mb-0">Thông tin cá nhân</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Email:</strong>
                      <p className="mb-0 text-muted">{profile.email}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Trường đại học:</strong>
                      <p className="mb-0 text-muted">{profile.university}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Chuyên ngành:</strong>
                      <p className="mb-0 text-muted">{profile.major}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Địa điểm:</strong>
                      <p className="mb-0 text-muted">{profile.location}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Ngày tham gia:</strong>
                      <p className="mb-0 text-muted">{new Date(profile.joinDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="mb-3">
                      <strong>Trạng thái:</strong>
                      <p className="mb-0">
                        {profile.isVerifiedAuthor ? (
                          <Badge bg="success">Tác giả uy tín</Badge>
                        ) : (
                          <Badge bg="secondary">Thành viên</Badge>
                        )}
                      </p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
        </Tab>

        <Tab eventKey="documents" title="📚 Tài liệu">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Tài liệu đã tải lên ({userDocuments.length})</h6>
              {isOwnProfile && (
                <Button variant="primary" size="sm">
                  <FaFileAlt className="me-1" />
                  Tải lên mới
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              <Row>
                {userDocuments.map((doc) => (
                  <Col md={6} lg={4} key={doc.id} className="mb-4">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="mb-0">{doc.title}</h6>
                          {doc.isPremium && (
                            <Badge bg="warning">Premium</Badge>
                          )}
                        </div>
                        <p className="text-muted small mb-2">{doc.subject}</p>
                        <div className="d-flex justify-content-between text-muted small">
                          <span><FaDownload className="me-1" />{doc.downloads}</span>
                          <span><FaEye className="me-1" />{doc.views}</span>
                          <span><FaStar className="me-1" />{doc.rating}</span>
                          <span><FaCoins className="me-1" />{doc.creditCost}</span>
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            {new Date(doc.uploadDate).toLocaleDateString('vi-VN')}
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="activity" title="📈 Hoạt động">
          <Card>
            <Card.Header>
              <h6 className="mb-0">Hoạt động gần đây</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-4">
                <FaFileAlt size={48} className="text-muted mb-3" />
                <p className="text-muted">Chưa có hoạt động nào được ghi nhận</p>
                <small className="text-muted">Hoạt động sẽ hiển thị khi bạn tải lên tài liệu hoặc tương tác với cộng đồng</small>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {isOwnProfile && (
          <Tab eventKey="settings" title="⚙️ Cài đặt">
            <Card>
              <Card.Header>
                <h6 className="mb-0">Cài đặt tài khoản</h6>
              </Card.Header>
              <Card.Body>
                <Alert variant="info">
                  <FaCog className="me-2" />
                  Các tùy chọn cài đặt nâng cao sẽ được bổ sung trong phiên bản tiếp theo.
                </Alert>
                
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <strong>Thông báo email</strong>
                    <p className="mb-0 text-muted small">Nhận thông báo qua email</p>
                  </div>
                  <Form.Check type="switch" defaultChecked />
                </div>
                
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <strong>Hiển thị profile công khai</strong>
                    <p className="mb-0 text-muted small">Cho phép người khác xem profile của bạn</p>
                  </div>
                  <Form.Check type="switch" defaultChecked />
                </div>
                
                <div className="d-flex justify-content-between align-items-center py-2">
                  <div>
                    <strong>Cho phép theo dõi</strong>
                    <p className="mb-0 text-muted small">Người khác có thể theo dõi hoạt động của bạn</p>
                  </div>
                  <Form.Check type="switch" defaultChecked />
                </div>
              </Card.Body>
            </Card>
          </Tab>
        )}
      </Tabs>

      {/* Avatar Upload Modal */}
      <Modal show={showAvatarModal} onHide={() => setShowAvatarModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thay đổi ảnh đại diện</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Image
            src={profile.avatarUrl}
            alt="Current avatar"
            roundedCircle
            width={150}
            height={150}
            className="mb-3"
          />
          <Form.Group>
            <Form.Label>Chọn ảnh mới</Form.Label>
            <Form.Control type="file" accept="image/*" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAvatarModal(false)}>
            Hủy
          </Button>
          <Button variant="primary">
            Lưu thay đổi
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProfilePage;