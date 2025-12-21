/**
 * User Profile Page for ShareBuddy - Complete profile management with social features
 */

import React, { useState, useEffect, use } from 'react';
import { Container, Row, Col, Card, Button, Form, Tab, Tabs, Badge, Alert, Image, Modal, Spinner, Table, ProgressBar } from 'react-bootstrap';
import { 
  FaEdit, FaSave, FaTimes, FaCamera, FaUniversity, FaGraduationCap, 
  FaCalendarAlt, FaFileAlt, FaDownload, FaStar, 
  FaUserPlus, FaUserCheck, FaShare, FaCog, FaEye, FaCoins, FaTrophy, FaChartLine, FaUser 
} from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { creditService } from '../../services/creditService';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ModerationStatusBadge from '../../components/ModerationStatusBadge';
import apiClient from '../../services/api';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import '../../styles/ProfilePage.css';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
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

interface UserSettings {
  email_notifications: boolean;
  is_public_profile: boolean;
  allow_follow_activity: boolean;
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
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    email_notifications: true,
    is_public_profile: true,
    allow_follow_activity: true
  });

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
            emailVerified: currentUser.emailVerified || false,
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

            // Update document count in profile stats - only count approved documents for consistency
            const approvedCount = docs.filter((doc: any) => doc.status === 'approved').length;
            setProfile(prev => prev ? {
              ...prev,
              stats: {
                ...prev.stats,
                documentsUploaded: approvedCount
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

  // Load credit history when switching to credits tab
  useEffect(() => {
    const loadCreditHistory = async () => {
      if (activeTab === 'credits' && isOwnProfile) {
        try {
          setCreditsLoading(true);
          const response = await creditService.getTransactionHistory(1, 20);
          if (response.success && response.data) {
            const transactions = response.data.transactions || [];
            setCreditHistory(transactions.map((t: any) => ({
              id: t.id,
              amount: t.amount,
              type: t.type === 'earn' ? 'earn' : t.type === 'bonus' ? 'bonus' : 'spend',
              description: t.description || t.reason || 'Giao dịch',
              date: t.createdAt || t.created_at,
              relatedDocument: t.documentTitle || t.document_title
            })));
          }
        } catch (err) {
          console.error('❌ Error loading credit history:', err);
        } finally {
          setCreditsLoading(false);
        }
      }
    };

    loadCreditHistory();
  }, [activeTab, isOwnProfile]);

  const fetchSettings = async () => {
    try {
      const response = await userService.getUserSettings();
      if (response.success && response.data) {
        setSettings({
        email_notifications: response.data.email_notifications 
          ?? response.data.emailNotifications 
          ?? true,

        is_public_profile: response.data.is_public_profile 
          ?? response.data.profilePublic 
          ?? true,

        allow_follow_activity: response.data.allow_follow_activity 
          ?? response.data.allowFollowing 
          ?? true
        });
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      setError('Không thể tải cài đặt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (isOwnProfile) {
    fetchSettings();
  }
}, [isOwnProfile]);

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

  const handleResendVerification = async () => {
    try {
      setSendingVerification(true);
      setError('');
      setSuccessMessage('');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sharebuddy_token')}`
        },
        body: JSON.stringify({
          email: profile?.email || currentUser?.email
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Email xác minh đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setError(data.error || 'Không thể gửi email xác minh');
      }
    } catch (err: any) {
      console.error('Error resending verification:', err);
      setError('Không thể gửi email xác minh. Vui lòng thử lại sau.');
    } finally {
      setSendingVerification(false);
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
  // Profile Settings

  const handleToggle = async (settingKey: keyof UserSettings, value: boolean) => {
    setUpdating(settingKey);
    
    try {
      let endpoint = '';
      let payload = {};

      switch (settingKey) {
        case 'email_notifications':
          endpoint = '/settings/email-notifications';
          payload = { enabled: value };
          break;
        case 'is_public_profile':
          endpoint = '/settings/profile-visibility';
          payload = { isPublic: value };
          break;
        case 'allow_follow_activity':
          endpoint = '/settings/allow-following';
          payload = { allowed: value };
          break;
      }

      const response = await apiClient.patch(endpoint, payload);

      if (response.data.success) {
        setSettings(prev => ({ ...prev, [settingKey]: value }));
        toast.success(response.data.message || 'Cập nhật thành công');
      }
    } catch (error: any) {
      console.error('Failed to update setting:', error);
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
      // Revert the toggle on error
      fetchSettings();
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Đang tải cài đặt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        <Alert.Heading>Lỗi</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await userService.updateUserSettings(settings);
      if (response.success) {
        toast.success('Cài đặt đã được lưu');
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.error || 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <div className="profile-page">
      {/* Background Image */}
      <div className="profile-bg-container">
        <div className="profile-bg-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Professional profile background"
          className="bg-image"
        />
      </div>

      {/* Content */}
      <div className="profile-page-content">
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
            height: '100px',
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
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
                  <h3 
                    className="mb-0 me-2">{profile.fullName}
                    {profile.isVerifiedAuthor && <VerifiedBadge />}
                  </h3>
                </div>
                <p className="text-muted mb-2">@{profile.username}</p>

                <div className="d-flex flex-wrap gap-2 text-muted small">
                  {profile.university && <span><FaUniversity className="me-1" />{profile.university}</span>}
                  {profile.major && <span><FaGraduationCap className="me-1" />{profile.major}</span>}
                  <span><FaCalendarAlt className="me-1" />Tham gia {new Date(profile.joinDate).getFullYear()}</span>
                </div>
                <p className="mb-2">{profile.bio}</p>
              </div>
            </Col>
            
            <Col md={3} className="text-end">
              <div style={{ marginTop: '20px' }}>
                {!isOwnProfile && (
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
              </div>
            </Col>
          </Row>

          {/* Stats - Compact Single Row */}
          <Row className="mt-4 g-2">
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaFileAlt size={20} className="text-primary mb-1" />
                  <h5 className="mb-0">{profile.stats.documentsUploaded}</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Tài liệu</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaDownload size={20} className="text-success mb-1" />
                  <h5 className="mb-0">{profile.stats.totalDownloads}</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Lượt tải</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaEye size={20} className="text-info mb-1" />
                  <h5 className="mb-0">{profile.stats.totalViews}</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Lượt xem</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaStar size={20} className="text-warning mb-1" />
                  <h5 className="mb-0">{profile.stats.averageRating.toFixed(1)}/5</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Đánh giá</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaUserPlus size={20} className="text-secondary mb-1" />
                  <h5 className="mb-0">{profile.stats.followers}/{profile.stats.following}</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Theo dõi</small>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} lg={2}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Body className="text-center py-2 px-2">
                  <FaCoins size={20} className="text-warning mb-1" />
                  <h5 className="mb-0">{profile.credits}</h5>
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Credits</small>
                </Card.Body>
              </Card>
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
        <Tab eventKey="profile" title={
          <>
            <FaUser className="me-2" />
            <span className="d-none d-md-inline">Thông tin</span>
          </>
        }>
          {editMode ? (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Chỉnh sửa thông tin cá nhân</h6>
                <div>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleSave}
                    className="me-2"
                  >
                    <FaSave className="me-1" />
                    Lưu
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                    <FaTimes className="me-1" />
                    Hủy
                  </Button>
                </div>
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
                        <Form.Label>Trường đại học</Form.Label>
                        <Form.Control
                          type="text"
                          name="university"
                          value={editForm.university}
                          onChange={handleInputChange}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col>
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

                </Form>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Thông tin cá nhân</h6>
                {isOwnProfile && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setEditMode(true)}
                  >
                    <FaEdit className="me-1" />
                    Chỉnh sửa
                  </Button>
                )}
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <strong>Email:</strong>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <p className="mb-0 text-muted">{profile.email}</p>
                        {profile.emailVerified ? (
                          <Badge bg="success" className="d-flex align-items-center gap-1">
                            <i className="bi bi-check-circle-fill"></i>
                            Đã xác minh
                          </Badge>
                        ) : (
                          <>
                            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
                              <i className="bi bi-exclamation-circle-fill"></i>
                              Chưa xác minh
                            </Badge>
                            {isOwnProfile && (
                              <Button 
                                size="sm" 
                                variant="outline-primary"
                                onClick={handleResendVerification}
                                disabled={sendingVerification}
                              >
                                {sendingVerification ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                    Đang gửi...
                                  </>
                                ) : (
                                  <>
                                    <i className="bi bi-envelope me-1"></i>
                                    Gửi xác minh email
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
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

        <Tab eventKey="documents" title={
          <>
            <FaFileAlt className="me-2" />
            <span className="d-none d-md-inline">Tài liệu</span>
          </>
        }>
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
          <Tab eventKey="credits" title={
            <>
              <FaCoins className="me-2" />
              <span className="d-none d-md-inline">Lịch sử Credits</span>
            </>
          }>

            {/* How to earn credits info */}
            <Card className="mt-4">
              <Card.Header>
                <h6 className="mb-0">💡 Cách kiếm Credits</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={4} className="text-center mb-3">
                    <FaFileAlt size={20} className="text-primary mb-2" />
                    <h6>Tải lên tài liệu</h6>
                    <p className="text-muted small mb-0">Mỗi tài liệu được duyệt: +1 credits</p>
                  </Col>
                  <Col md={4} className="text-center mb-3">
                    <FaDownload size={20} className="text-success mb-2" />
                    <h6>Tài liệu được tải</h6>
                    <p className="text-muted small mb-0">Mỗi tài liệu được tải: +credits</p>
                  </Col>
                  <Col md={4} className="text-center mb-3">
                    <FaStar size={20} className="text-warning mb-2" />
                    <h6>Đánh giá cao</h6>
                    <p className="text-muted small mb-0">Mỗi đánh giá 5 sao: +2 credits</p>
                  </Col>
                </Row>
                <div className="text-center mt-3">
                  <Button variant="primary" onClick={() => navigate('/purchase-credits')}>
                    <FaCoins className="me-2" />
                    Mua thêm Credits
                  </Button>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h6 className="mb-0 d-flex align-items-center justify-content-between">
                  <span>
                    <FaCoins className="me-2 text-warning" />
                    Giao dịch Credits
                  </span>
                  <Badge bg="primary">{profile?.credits || 0} Credits</Badge>
                </h6>
              </Card.Header>
              <Card.Body className="p-0">
                {creditsLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted">Đang tải lịch sử giao dịch...</p>
                  </div>
                ) : creditHistory.length === 0 ? (
                  <div className="text-center py-5">
                    <FaCoins size={48} className="text-muted mb-3" />
                    <p className="text-muted">Chưa có giao dịch nào</p>
                  </div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '60px' }} className="text-center">Loại</th>
                        <th>Mô tả</th>
                        <th style={{ width: '120px' }} className="text-end">Số lượng</th>
                        <th style={{ width: '150px' }}>Ngày</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditHistory.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="text-center">
                            {transaction.type === 'earn' && <FaCoins className="text-success" size={20} />}
                            {transaction.type === 'spend' && <FaDownload className="text-danger" size={20} />}
                            {transaction.type === 'bonus' && <FaTrophy className="text-warning" size={20} />}
                          </td>
                          <td>
                            <div>{transaction.description}</div>
                            {transaction.relatedDocument && (
                              <small className="text-muted">{transaction.relatedDocument}</small>
                            )}
                          </td>
                          <td className="text-end">
                            <span className={`fw-bold ${
                              transaction.amount > 0 ? 'text-success' : 'text-danger'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                            </span>
                          </td>
                          <td>{new Date(transaction.date).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Tab>
        )}

        {isOwnProfile && (
          <Tab eventKey="settings" title={
            <>
              <FaCog className="me-2" />
              <span className="d-none d-md-inline">Cài đặt</span>
            </>
          }>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Cài đặt tài khoản</h6>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <Form.Label className="mb-1 fw-bold">Thông báo email</Form.Label>
                      <p className="mb-0 text-muted small">Nhận thông báo qua email</p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="email-notifications"
                      checked={settings.email_notifications}
                      onChange={(e) => handleToggle('email_notifications', e.target.checked)}
                      style={{ transform: 'scale(1.3)' }}
                    />
                  </div>
                
                  {settings.email_notifications && (
                    <Alert variant="info" className="small mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      Bạn sẽ nhận email về: tài liệu mới, bình luận, lượt theo dõi, và thông báo quan trọng
                    </Alert>
                  )}
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <Form.Label className="mb-1 fw-bold">Hiển thị profile công khai</Form.Label>
                      <p className="mb-0 text-muted small">Cho phép người khác xem profile của bạn</p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="public-profile"
                      checked={settings.is_public_profile}
                      onChange={(e) => handleToggle('is_public_profile', e.target.checked)}
                      style={{ transform: 'scale(1.3)' }}
                    />
                  </div>
                </Form.Group>
                {!settings.is_public_profile && (
                  <Alert variant="warning" className="small mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Profile riêng tư: Chỉ bạn mới có thể xem thông tin cá nhân
                  </Alert>
                )}

                <Form.Group className="mb-0">
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <div>
                      <Form.Label className="mb-1 fw-bold">Cho phép theo dõi hoạt động</Form.Label>
                      <p className="mb-0 text-muted small">Người khác có thể theo dõi hoạt động của bạn</p>
                    </div>
                    <Form.Check
                      type="switch"
                      id="follow-activity"
                      checked={settings.allow_follow_activity}
                      onChange={(e) => handleToggle('allow_follow_activity', e.target.checked)}
                      style={{ transform: 'scale(1.3)' }}
                    />
                  </div>
                </Form.Group>
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
      </div>
    </div>
  );
};

export default ProfilePage;
