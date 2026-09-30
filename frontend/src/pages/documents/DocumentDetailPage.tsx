/**
 * Document Detail Page
 * Layout: Left Column (Info, Q&A, Comments) | Right Column (Preview)
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDocumentById, toggleBookmark } from '../../store/slices/documentSlice';
import { getCurrentUser } from '../../store/slices/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';
import RatingComponent from '../../components/ratings/RatingComponent';
import CommentSection from '../../components/comments/CommentSection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import QuestionList from '../../components/QuestionList'; 
import DocumentPreview from '../../components/DocumentPreview';
import AuthorProfileModal from '../../components/documents/AuthorProfileModal';

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const { currentDocument, isLoading, error } = useAppSelector(state => state.documents);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

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

    if (user?.credits && user.credits < currentDocument.creditCost && currentDocument.userInteraction?.canDownload !== true) {
      toast.error(`Không đủ credits. Cần ${currentDocument.creditCost} credits.`);
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await documentService.downloadDocument(currentDocument.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 1. Use actual fileName if available
      if (currentDocument.fileName) {
        link.download = currentDocument.fileName;
      } 
      // 2. Or construct from Title + Extension
      else if (currentDocument.title && currentDocument.fileType) {
        const ext = currentDocument.fileType.startsWith('.') ? currentDocument.fileType : `.${currentDocument.fileType}`;
        link.download = `${currentDocument.title}${ext}`;
      }
      // 3. Fallback (try to infer from blob type or default to pdf)
      else {
        // Simple fallback
        link.download = `${currentDocument.title || 'document'}.pdf`; 
      }

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải tài liệu thành công!');
      // Update credits
      dispatch(fetchDocumentById(currentDocument.id));
      
      // Refresh user data to update credits in Navbar
      dispatch(getCurrentUser());
    } catch (error: any) {
      console.error("Download failed", error);
      toast.error(error.message || 'Không thể tải tài liệu');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAuthorClick = (authorId: string) => {
    setSelectedAuthorId(authorId);
    setShowAuthorModal(true);
  };

  const handleBookmark = async () => {
    if (!currentDocument || !isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bookmark');
      return;
    }
    
    try {
        const isBookmarked = !!currentDocument.userInteraction?.isBookmarked;
        await dispatch(toggleBookmark({ 
            documentId: currentDocument.id, 
            isBookmarked: isBookmarked 
        })).unwrap();
        
        toast.success(isBookmarked ? 'Đã bỏ bookmark' : 'Đã thêm vào bookmark');
    } catch (error: any) {
        toast.error(error.message || 'Lỗi cập nhật bookmark');
    }
  };

  const renderRating = () => {
    if (!currentDocument) return null;
    const rating = parseFloat(currentDocument.avgRating || '0');
    return (
      <div className="d-flex align-items-center mb-2">
        <div className="text-warning me-1 small">
           {[...Array(5)].map((_, i) => (
             <i key={i} className={`bi bi-star${i < Math.round(rating) ? '-fill' : ''}`} />
           ))}
        </div>
        <span className="fw-bold small">{rating.toFixed(1)}</span>
        <span className="text-muted ms-1 small">({currentDocument.ratingCount || 0} đánh giá · {currentDocument.downloadCount} lượt tải)</span>
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner message="Đang tải..." />;
  
  if (error || !currentDocument) {
    return (
      <Container className="py-5 mt-5">
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {error || 'Không tìm thấy tài liệu'}
          <Button variant="link" onClick={() => navigate(-1)}>Quay lại</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 mt-5">
      <Button 
        variant="link" 
        className="mb-4 p-0 text-decoration-none"
        onClick={() => navigate(-1)}
      >
        <i className="bi bi-arrow-left me-2"></i>
        Quay lại
      </Button>

      <Row>
        {/* --- LEFT COLUMN --- */}
        <Col lg={7}>
          <div className="sticky-top" style={{ top: '100px', zIndex: 1 }}>
            <Card className="shadow-sm border-0">
              <Card.Header className="fw-bold py-3 border-bottom">
                <i className="bi bi-eye me-2"></i> Xem trước tài liệu
              </Card.Header>
              <Card.Body className="p-0">
                <DocumentPreview documentId={currentDocument.id} />
              </Card.Body>
              <Card.Footer className="text-center small text-muted">
                Bạn đang xem bản xem trước giới hạn.
              </Card.Footer>
            </Card>

            {currentDocument.tags && currentDocument.tags.length > 0 && (
              <Card className="mt-3 shadow-sm border-0">
                <Card.Body>
                  <h6 className="mb-3">Tags</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {currentDocument.tags.map((tag, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="border">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
        
        {/* --- RIGHT COLUMN (Preview) --- */}
        <Col lg={5}>
            <Card className="shadow-sm mb-3 border-0">
            <Card.Body className="p-3">
              <h1 className="h3 mb-2">{currentDocument.title}</h1>
              
              <div className="mb-2">
               <Badge bg="primary" className="me-2">{currentDocument.subject}</Badge>
               {currentDocument.author?.university && (
                <Badge bg="secondary">{currentDocument.author.university}</Badge>
               )}
              </div>
              
              {renderRating()}

              <div className="d-flex align-items-center justify-content-between mb-3 p-2 rounded">
              <div 
                className="d-flex align-items-center" 
                onClick={() => {
                  console.log('🖱️ Author clicked, ID:', currentDocument.author.id, 'Full author:', currentDocument.author);
                  handleAuthorClick(currentDocument.author.id);
                }}
                style={{cursor: 'pointer'}}
                role="button"
              >
                <img 
                src={currentDocument.author.avatarUrl || 'https://via.placeholder.com/50'} 
                alt="Author" 
                className="rounded-circle me-2"
                width="40" height="40"
                style={{objectFit: 'cover'}}
                />
                <div>
                <div className="fw-bold small">
                  {currentDocument.author.fullName || currentDocument.author.username}
                  {currentDocument.author.isVerifiedAuthor && <i className="bi bi-patch-check-fill text-primary ms-1" />}
                </div>
                <div className="text-muted" style={{fontSize: '0.75rem'}}>
                  {new Date(currentDocument.createdAt).toLocaleDateString('vi-VN')}
                </div>
                </div>
              </div>

              <div className="d-flex gap-2">
                <Button 
                variant="success" 
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                >
                {isDownloading ? <Spinner size="sm" /> : <i className="bi bi-download me-1" />}
                {currentDocument.creditCost === 0 ? 'Miễn phí' : `${currentDocument.creditCost} Credits`}
                </Button>
                <Button 
                variant={currentDocument.userInteraction?.isBookmarked ? "warning" : "outline-warning"}
                size="sm"
                onClick={handleBookmark}
                >
                <i className={`bi bi-bookmark${currentDocument.userInteraction?.isBookmarked ? '-fill' : ''}`} />
                </Button>
              </div>
              </div>

              <div className="mb-2">
              <h6 className="mb-2">Mô tả</h6>
              <p className="text-secondary small mb-0" style={{ whiteSpace: 'pre-line' }}>{currentDocument.description}</p>
              </div>
            </Card.Body>
          </Card>

          

          {/* TABS for Q&A, Comments, Ratings */}
          <Card className="shadow-sm border-0">
            <Card.Body className="p-3">
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'questions')} className="mb-3">
                {/* 1. Q&A Tab */}
                <Tab eventKey="questions" title={`Q&A (${currentDocument.questionCount || 0})`}>
                  <QuestionList documentId={currentDocument.id} />
                </Tab>
                
                {/* 2. Comments Tab */}
                {/*
                <Tab eventKey="comments" title={`Bình luận (${currentDocument.commentCount || 0})`}>
                  <CommentSection documentId={currentDocument.id} />
                </Tab>
                */}

                {/* 3. Ratings Tab */}
                <Tab eventKey="ratings" title={`Đánh giá (${currentDocument.ratingCount})`}>
                  <RatingComponent documentId={currentDocument.id} />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      {/* Author Profile Modal */}
      <AuthorProfileModal
        show={showAuthorModal}
        onHide={() => setShowAuthorModal(false)}
        authorId={selectedAuthorId || ''}
      />
    </Container>
  );
};

export default DocumentDetailPage;