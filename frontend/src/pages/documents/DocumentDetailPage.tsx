/**
 * Document Detail Page - Trang chi tiết tài liệu với rating và comment
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDocumentById } from '../../store/slices/documentSlice';
import { useAuth } from '../../hooks/useAuth';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';
import RatingComponent from '../../components/ratings/RatingComponent';
import CommentSection from '../../components/comments/CommentSection';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const { currentDocument, isLoading, error } = useAppSelector(state => state.documents);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      dispatch(fetchDocumentById(id));
    }
  }, [dispatch, id]);

  const handleDownload = async () => {
    if (!currentDocument || !isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải tài liệu');
      return;
    }

    if (user?.credits && user.credits < currentDocument.creditCost) {
      toast.error('Không đủ credits để tải tài liệu này');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await documentService.downloadDocument(currentDocument.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDocument.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải tài liệu thành công!');
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải tài liệu');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBookmark = async () => {
    if (!currentDocument || !isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bookmark tài liệu');
      return;
    }

    try {
      if (currentDocument.userInteraction?.isBookmarked) {
        await documentService.removeBookmark(currentDocument.id);
        toast.success('Đã bỏ bookmark');
      } else {
        await documentService.bookmarkDocument(currentDocument.id);
        toast.success('Đã thêm vào bookmark');
      }
      
      // Refresh document data
      dispatch(fetchDocumentById(currentDocument.id));
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật bookmark');
    }
  };

  const renderRating = () => {
    if (!currentDocument) return null;
    
    const rating = parseFloat(currentDocument.avgRating || '0');
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`bi bi-star${i <= rating ? '-fill' : ''} rating-stars me-1`}
        />
      );
    }
    
    return (
      <div className="d-flex align-items-center">
        <div className="rating-stars">{stars}</div>
        <span className="ms-2 fw-bold">{rating.toFixed(1)}</span>
        <span className="text-muted ms-1">({currentDocument.ratingCount || 0} đánh giá)</span>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Đang tải chi tiết tài liệu..." />;
  }

  if (error || !currentDocument) {
    return (
      <Container className="py-4" style={{ marginTop: '80px' }}>
        <Alert variant="danger" className="text-center">
          <i className="bi bi-exclamation-triangle me-2" />
          {error || 'Không tìm thấy tài liệu'}
          <div className="mt-2">
            <Button variant="outline-danger" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none">Trang chủ</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/documents" className="text-decoration-none">Tài liệu</Link>
              </li>
              <li className="breadcrumb-item active">{currentDocument.title}</li>
            </ol>
          </nav>
        </Col>
      </Row>

      <Row>
        {/* Main Content */}
        <Col lg={8} className="mb-4">
          <Card className="shadow-sm">
            {currentDocument.thumbnailUrl && (
              <Card.Img 
                variant="top" 
                src={currentDocument.thumbnailUrl} 
                style={{ height: '300px', objectFit: 'cover' }}
              />
            )}
            
            <Card.Body>
              <h1 className="mb-3">{currentDocument.title}</h1>
              
              {/* Categories and Tags */}
              <div className="mb-3">
                <Badge bg="info" className="me-2">
                  📂 {currentDocument.category}
                </Badge>
                <Badge bg="secondary" className="me-2">
                  📖 {currentDocument.subject}
                </Badge>

              </div>
              
              {/* Rating */}
              <div className="mb-3">
                {renderRating()}
              </div>
              
              {/* Description */}
              <p className="text-muted mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                {currentDocument.description}
              </p>
              
              {/* Author Info */}
              {currentDocument.author && (
                <div className="d-flex align-items-center mb-4 p-3 bg-light rounded">
                  <img
                    src={currentDocument.author.avatarUrl || '/default-avatar.png'}
                    alt="Author"
                    className="user-avatar-lg me-3"
                  />
                  <div>
                    <h6 className="mb-1">
                      {currentDocument.author.fullName || currentDocument.author.username}
                      {currentDocument.author.isVerifiedAuthor && (
                        <i className="bi bi-patch-check-fill text-primary ms-2" />
                      )}
                    </h6>
                    <small className="text-muted">
                      {currentDocument.author.university && (
                        <><i className="bi bi-mortarboard me-1" />{currentDocument.author.university}<br /></>
                      )}
                      {currentDocument.author.major && (
                        <><i className="bi bi-book me-1" />{currentDocument.author.major}</>
                      )}
                    </small>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="d-flex gap-2 mb-4">
                {currentDocument.userInteraction?.canDownload && (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={isDownloading}
                    onClick={handleDownload}
                  >
                    {isDownloading ? (
                      <><Spinner size="sm" className="me-2" />Đang tải...</>
                    ) : (
                      <><i className="bi bi-download me-2" />Tải xuống ({currentDocument.creditCost} credits)</>
                    )}
                  </Button>
                )}
                
                {isAuthenticated && (
                  <Button
                    variant={currentDocument.userInteraction?.isBookmarked ? 'warning' : 'outline-warning'}
                    onClick={handleBookmark}
                  >
                    <i className={`bi bi-bookmark${currentDocument.userInteraction?.isBookmarked ? '-fill' : ''} me-2`} />
                    {currentDocument.userInteraction?.isBookmarked ? 'Đã bookmark' : 'Bookmark'}
                  </Button>
                )}
                
                <Button variant="outline-secondary">
                  <i className="bi bi-share me-2" />Chia sẻ
                </Button>
              </div>
            </Card.Body>
          </Card>
          
          {/* Tabs */}
          <Card className="mt-4">
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key || 'overview')}
                className="mb-3"
              >
                <Tab eventKey="overview" title="Tổng quan">
                  <Row>
                    <Col md={6}>
                      <h6>Thông tin tài liệu</h6>
                      <ul className="list-unstyled">
                        <li><strong>Tựa đề:</strong> {currentDocument.title}</li>

                        <li><strong>Ngày tải lên:</strong> {new Date(currentDocument.createdAt).toLocaleDateString('vi-VN')}</li>
                        <li><strong>Lượt tải:</strong> {currentDocument.downloadCount || 0}</li>
                        <li><strong>Trạng thái:</strong> 
                          <Badge bg={currentDocument.status === 'approved' ? 'success' : 'warning'} className="ms-1">
                            {currentDocument.status === 'approved' ? 'Đã duyệt' : 'Đang chờ duyệt'}
                          </Badge>
                        </li>
                      </ul>
                    </Col>
                    <Col md={6}>
                      <h6>Thống kê</h6>
                      <ul className="list-unstyled">
                        <li><strong>Lượt tải:</strong> {currentDocument.downloadCount || 0}</li>
                        <li><strong>Đánh giá trung bình:</strong> {parseFloat(currentDocument.avgRating || '0').toFixed(1)}/5</li>
                      </ul>
                    </Col>
                  </Row>
                </Tab>
                
                <Tab eventKey="ratings" title={`Đánh giá (${currentDocument.ratingCount || 0})`}>
                  <RatingComponent documentId={currentDocument.id} />
                </Tab>
                
                <Tab eventKey="comments" title="Bình luận">
                  <CommentSection documentId={currentDocument.id} />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Sidebar */}
        <Col lg={4}>
          {/* Quick Stats */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0"><i className="bi bi-graph-up me-2" />Thống kê nhanh</h6>
            </Card.Header>
            <Card.Body>
              <div className="row text-center">
                <div className="col-6">
                  <div className="fw-bold text-primary display-6">{currentDocument.downloadCount || 0}</div>
                  <small className="text-muted">Lượt tải</small>
                </div>
                <div className="col-6">
                  <div className="fw-bold text-success display-6">{currentDocument.downloadCount || 0}</div>
                  <small className="text-muted">Lượt tải</small>
                </div>
                <div className="col-6 mt-2">
                  <div className="fw-bold text-warning display-6">{parseFloat(currentDocument.avgRating || '0').toFixed(1)}</div>
                  <small className="text-muted">Đánh giá</small>
                </div>
              </div>
            </Card.Body>
          </Card>
          
          {/* Related Documents */}
          <Card>
            <Card.Header>
              <h6 className="mb-0"><i className="bi bi-collection me-2" />Tài liệu liên quan</h6>
            </Card.Header>
            <Card.Body>
              <p className="text-muted text-center">Đang cập nhật...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentDetailPage;