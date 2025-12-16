/**
 * User Profile Page for ShareBuddy - Complete profile management with social features
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Badge, Alert, Image, Modal, Spinner } from 'react-bootstrap';
import { 
  FaEdit, FaSave, FaTimes, FaCamera, FaUniversity, FaGraduationCap, 
  FaCalendarAlt, FaFileAlt, FaDownload, FaStar, 
  FaUserPlus, FaUserCheck, FaShare, FaCog, FaEye, FaCoins 
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ModerationStatusBadge from '../../components/ModerationStatusBadge';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  bio: string;
  university: string;
  major: string;
  avatarUrl: string;
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
  status?: string;
}

const ProfilePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'profile';
  
  const [activeTab, setActiveTab] = useState(tabParam);
  const [editMode, setEditMode] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === profile?.id;

  // Load user profile and data
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // Check if user ID is valid
      if (!currentUser.id || currentUser.id === 'undefined') {
        console.error('Invalid user ID:', currentUser.id);
        setError('User ID không hợp lệ. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        console.log('Loading profile for user ID:', currentUser.id);
        
        // Get profile data
        const response = await userService.getUserProfile(currentUser.id);
        if (response.success && response.data) {
          const userData = response.data;
          setProfile({
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName,
            email: currentUser.email,
            bio: userData.bio || '',
            university: userData.university || '',
            major: userData.major || '',
            avatarUrl: userData.avatarUrl || 'https://via.placeholder.com/150',
            isVerifiedAuthor: userData.isVerifiedAuthor,
            joinDate: userData.createdAt,
            credits: userData.credits,
            stats: {
              documentsUploaded: userData.stats?.documentCount || 0,
              totalDownloads: 0,
              totalViews: 0,
              averageRating: userData.stats?.avgRating ? parseFloat(userData.stats.avgRating) : 0,
              followers: userData.stats?.followerCount || 0,
              following: userData.stats?.followingCount || 0
            }
          });
          setEditForm({
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName,
            bio: userData.bio || '',
            university: userData.university || '',
            major: userData.major || ''
          });
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err?.error || 'Không thể tải thông tin profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser, navigate]);

  // Load documents when switching to documents tab
  useEffect(() => {
    const loadDocuments = async () => {
      // Always reload documents when switching to documents tab to get latest data
      if (activeTab === 'documents' && profile?.id && profile.id !== 'undefined') {
        try {
          setDocumentsLoading(true);
          console.log('📄 Loading documents for user:', profile.id);
          const response = await userService.getUserDocuments(profile.id);
          if (response.success && response.data) {
            const docs = response.data.documents || [];
            console.log('✅ Documents loaded:', docs.length);
            setUserDocuments(docs.map((doc: any) => ({
              id: doc.id,
              title: doc.title,
              subject: doc.subject || 'Chưa phân loại',
              downloads: doc.downloadCount || 0,
              views: doc.viewCount || 0,
              rating: doc.avgRating ? parseFloat(doc.avgRating) : 0,
              uploadDate: doc.createdAt,
              creditCost: doc.creditCost || 0,
              isPremium: doc.isPremium || false,
              status: doc.status || 'pending'
            })));

            // Update document count in profile stats
            setProfile(prev => prev ? {
              ...prev,
              stats: {
                ...prev.stats,
                documentsUploaded: docs.length
              }
            } : null);
          }
        } catch (err) {
          console.error('❌ Error loading documents:', err);
        } finally {
          setDocumentsLoading(false);
        }
      }
    };

    loadDocuments();
  }, [activeTab, profile?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccessMessage('');
      
      const response = await userService.updateProfile({
        fullName: editForm.fullName,
        bio: editForm.bio,
        university: editForm.university,
        major: editForm.major
      });
      
      if (response.success && response.data) {
        const userData = response.data;
        setProfile(prev => prev ? {
          ...prev,
          fullName: userData.fullName,
          bio: userData.bio || '',
          university: userData.university || '',
          major: userData.major || ''
        } : null);
        setEditMode(false);
        setSuccessMessage('Cập nhật profile thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err?.error || 'Không thể cập nhật profile');
    }
  };

  const handleCancel = () => {
    setEditForm(profile || {});
    setEditMode(false);
    setError('');
  };

  const handleFollow = async () => {
    if (!profile) return;
    
    try {
      if (isFollowing) {
        await userService.unfollowUser(profile.id);
      } else {
        await userService.followUser(profile.id);
      }
      setIsFollowing(!isFollowing);
      
      // Update follower count
      setProfile(prev => prev ? {
        ...prev,
        stats: {
          ...prev.stats,
          followers: prev.stats.followers + (isFollowing ? -1 : 1)
        }
      } : null);
    } catch (err: any) {
      console.error('Error following/unfollowing user:', err);
      setError(err?.error || 'Không thể thực hiện thao tác');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Kích thước ảnh không được vượt quá 2MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file ảnh');
        return;
      }
      setAvatarFile(file);
      setError('');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    try {
      setUploadingAvatar(true);
      setError('');
      
      const response = await userService.uploadAvatar(avatarFile);
      
      if (response.success && response.data) {
        const newAvatarUrl = typeof response.data === 'string' ? response.data : response.data.avatarUrl;
        setProfile(prev => prev ? {
          ...prev,
          avatarUrl: newAvatarUrl
        } : null);
        setShowAvatarModal(false);
        setAvatarFile(null);
        setSuccessMessage('Cập nhật ảnh đại diện thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError(err?.error || 'Không thể tải lên ảnh đại diện');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-4" style={{ marginTop: '80px' }}>
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Đang tải thông tin profile...</p>
        </div>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container className="py-4" style={{ marginTop: '80px' }}>
        <Alert variant="danger">
          <Alert.Heading>Lỗi</Alert.Heading>
          <p>{error || 'Không thể tải thông tin profile'}</p>
          <Button variant="outline-danger" onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      {/* Success/Error Messages */}
      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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
                  style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setShowAvatarModal(true)}
                >
                  <FaCamera size={14} />
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
                  {profile.university && <span><FaUniversity className="me-1" />{profile.university}</span>}
                  {profile.major && <span><FaGraduationCap className="me-1" />{profile.major}</span>}
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
              <div className="d-flex gap-2 align-items-center">
                {isOwnProfile && userDocuments.length > 0 && (
                  <Form.Select 
                    size="sm" 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{ width: 'auto' }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Đang kiểm duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Bị từ chối</option>
                  </Form.Select>
                )}
                {isOwnProfile && (
                  <Button variant="primary" size="sm" onClick={() => navigate('/upload')}>
                    <FaFileAlt className="me-1" />
                    Tải lên mới
                  </Button>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              {documentsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" size="sm" />
                  <p className="mt-2 text-muted small">Đang tải tài liệu...</p>
                </div>
              ) : userDocuments.length === 0 ? (
                <div className="text-center py-4">
                  <FaFileAlt size={48} className="text-muted mb-3" />
                  <p className="text-muted">Chưa có tài liệu nào</p>
                  {isOwnProfile && (
                    <Button variant="primary" size="sm" onClick={() => navigate('/upload')}>
                      Tải lên tài liệu đầu tiên
                    </Button>
                  )}
                </div>
              ) : (
                <Row>
                {userDocuments
                  .filter(doc => {
                    if (!isOwnProfile) return doc.status === 'approved'; // Only show approved for others
                    if (statusFilter === 'all') return true;
                    return doc.status === statusFilter;
                  })
                  .map((doc) => (
                  <Col md={6} lg={4} key={doc.id} className="mb-4">
                    <Card className="h-100 border-0 shadow-sm">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="mb-0 flex-grow-1">{doc.title}</h6>
                          <div className="d-flex gap-1 flex-shrink-0 flex-wrap justify-content-end">
                            {doc.isPremium && (
                              <Badge bg="warning" className="ms-1">Premium</Badge>
                            )}
                            {isOwnProfile && doc.status && (
                              <div className="ms-1">
                                <ModerationStatusBadge 
                                  status={doc.status as 'pending' | 'approved' | 'rejected'} 
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
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
              )}
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
      <Modal show={showAvatarModal} onHide={() => {
        setShowAvatarModal(false);
        setAvatarFile(null);
        setError('');
      }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thay đổi ảnh đại diện</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Image
            src={avatarFile ? URL.createObjectURL(avatarFile) : profile.avatarUrl}
            alt="Avatar preview"
            roundedCircle
            width={150}
            height={150}
            className="mb-3"
            style={{ objectFit: 'cover' }}
          />
          <Form.Group>
            <Form.Label>Chọn ảnh mới</Form.Label>
            <Form.Control 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarChange}
            />
            <Form.Text className="text-muted">
              Kích thước tối đa: 2MB. Định dạng: JPG, PNG, GIF
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowAvatarModal(false);
              setAvatarFile(null);
              setError('');
            }}
            disabled={uploadingAvatar}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAvatarUpload}
            disabled={!avatarFile || uploadingAvatar}
          >
            {uploadingAvatar ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang tải lên...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProfilePage;