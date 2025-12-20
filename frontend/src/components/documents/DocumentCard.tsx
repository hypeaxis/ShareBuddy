/**
 * DocumentCard Component - Hiển thị thông tin tài liệu dạng card
 * Features: Preview, rating, bookmark, download, author info
 */

import React, { useState } from 'react';
import { Card, Badge, Button, OverlayTrigger, Tooltip, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Document } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../store/hooks';
import { toggleBookmark } from '../../store/slices/documentSlice';
import { getCurrentUser } from '../../store/slices/authSlice';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';

interface DocumentCardProps {
  document: Document;
  showAuthor?: boolean;
  compact?: boolean;
  onBookmark?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onAuthorClick?: (authorId: string) => void;
  className?: string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ 
  document: doc, 
  showAuthor = true,
  compact = false,
  onBookmark, 
  onDownload,
  onAuthorClick,
  className 
}) => {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const [isDownloading, setIsDownloading] = useState(false);
  const [showUnbookmarkModal, setShowUnbookmarkModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  // --- HELPER TO FIX IMAGE URL ---
  const getImageUrl = (url?: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url;

    // Get Base URL
    let baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    
    // Remove '/api' suffix if present
    baseUrl = baseUrl.replace(/\/api\/?$/, '');
    baseUrl = baseUrl.replace(/\/$/, '');

    // Clean Image Path (Handle Windows backslashes)
    let imagePath = url.replace(/\\/g, '/');
    
    // Ensure leading slash
    if (!imagePath.startsWith('/')) {
      imagePath = `/${imagePath}`;
    }

    const finalUrl = `${baseUrl}${imagePath}`;
    console.log('Thumbnail URL:', finalUrl); // Debug log
    return finalUrl;
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bookmark tài liệu');
      return;
    }

    if (doc.userInteraction?.isBookmarked) {
      setShowUnbookmarkModal(true);
      return;
    }

    performBookmarkToggle();
  };

  const performBookmarkToggle = async () => {
    try {
      await dispatch(toggleBookmark({
        documentId: doc.id,
        isBookmarked: doc.userInteraction?.isBookmarked || false
      })).unwrap();
      
      toast.success(
        doc.userInteraction?.isBookmarked 
          ? 'Đã bỏ bookmark' 
          : 'Đã thêm vào bookmark'
      );
      
      if (onBookmark) onBookmark(doc.id);
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Có lỗi xảy ra khi bookmark');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải xuống');
      return;
    }

    if (user?.credits && user.credits < doc.creditCost) {
      toast.error('Không đủ credit để tải xuống');
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await documentService.downloadDocument(doc.id);
      
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      
      if (doc.fileName) {
        link.download = doc.fileName;
      } else if (doc.title && doc.fileType) {
        const ext = doc.fileType.startsWith('.') ? doc.fileType : `.${doc.fileType}`;
        link.download = `${doc.title}${ext}`;
      } else {
        link.download = `${doc.title}.pdf`;
      }

      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải xuống thành công!');
      if (onDownload) onDownload(doc.id);
      
      dispatch(getCurrentUser());
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Có lỗi xảy ra khi tải xuống');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAuthorClick && doc.author) {
      onAuthorClick(doc.author.id);
    }
  };

  const renderRating = () => {
    const rating = parseFloat(doc.avgRating || '0');
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`bi bi-star${i <= rating ? '-fill text-warning' : ''}`}
        />
      );
    }
    
    return (
      <div className="d-flex align-items-center">
        <div className="rating-stars me-2">{stars}</div>
        <small className="text-muted">({doc.ratingCount || 0})</small>
      </div>
    );
  };

  const imageUrl = getImageUrl(doc.thumbnailUrl);
  const showFallback = !imageUrl || imageError;

  return (
    <Card 
      className={`document-card ${compact ? 'card-compact' : ''} ${className || ''}`}
    >
      {/* Document Thumbnail */}
      <div className="card-img-wrapper" style={{ 
        height: compact ? '140px' : '200px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Link to={`/documents/${doc.id}`} style={{ 
          display: 'block', 
          height: '100%', 
          width: '100%',
          textDecoration: 'none' 
        }}>
          {!showFallback && imageUrl && (
            <Card.Img 
              variant="top"
              src={imageUrl}
              alt={doc.title}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: 'block'
              }}
              onError={() => {
                console.error('Image failed to load:', imageUrl);
                setImageError(true);
              }}
            />
          )}
          
          {/* Fallback Icon */}
          {showFallback && (
            <div 
              className="d-flex align-items-center justify-content-center"
              style={{ 
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              <i className="bi bi-file-earmark-text text-white" style={{ fontSize: '3rem' }} />
            </div>
          )}
        </Link>
      </div>
      
      <Card.Body className="d-flex flex-column">
        {/* Title */}
        <Card.Title className={`${compact ? 'h6' : 'h5'} mb-2 text-truncate`} title={doc.title}>
          <Link to={`/documents/${doc.id}`} className="text-decoration-none" style={{ position: 'relative', zIndex: 1 }}>
            {doc.title}
          </Link>
        </Card.Title>
        
        {/* Description */}
        {doc.description && (
          <Card.Text 
            className={`text-muted mb-3 ${compact ? 'small' : ''}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {doc.description}
          </Card.Text>
        )}

        {/* Subject Badge */}
        {doc.subject && (
          <div className="mb-2">
            <Badge bg="secondary" className="me-2">
              <i className="bi bi-book me-1" />
              {doc.subject}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="mb-3 d-flex flex-wrap gap-1">
            {doc.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} bg="info" pill style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-tag-fill me-1" />
                {tag}
              </Badge>
            ))}
            {doc.tags.length > 3 && (
              <Badge bg="light" text="dark" pill style={{ fontSize: '0.7rem' }}>
                +{doc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Author Info */}
        {showAuthor && doc.author && (
          <div className="d-flex align-items-center mb-2 pb-2 border-bottom">
            <img
              src={doc.author.avatarUrl || '/default-avatar.png'}
              alt="Author"
              className="user-avatar-sm rounded-circle me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover', cursor: 'pointer' }}
              onClick={handleAuthorClick}
            />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center">
                <small 
                  className="text-muted fw-medium text-truncate" 
                  style={{ 
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  onClick={handleAuthorClick}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {doc.author.fullName || doc.author.username}
                </small>
                {doc.author.isVerifiedAuthor && (
                  <i className="bi bi-patch-check-fill text-primary ms-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="d-flex align-items-center mb-3">
          {renderRating()}
        </div>

        {/* Upload Time and Actions Row */}
        <div className="d-flex align-items-center justify-content-between mb-2 gap-3">
          <small className="text-muted fst-italic" style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
          </small>
          
          {/* Action Buttons */}
          <div className="d-flex align-items-center gap-2" style={{ position: 'relative', zIndex: 2 }}>
            {/* Bookmark Button */}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>
                {doc.userInteraction?.isBookmarked ? 'Bỏ bookmark' : 'Bookmark'}
              </Tooltip>}
            >
              <Button
                variant={doc.userInteraction?.isBookmarked ? 'warning' : 'outline-warning'}
                size="sm"
                onClick={handleBookmark}
                className="rounded-circle"
                style={{ width: '32px', height: '32px', padding: 0 }}
              >
                <i className={`bi bi-bookmark${doc.userInteraction?.isBookmarked ? '-fill' : ''}`} />
              </Button>
            </OverlayTrigger>

            {/* Download Button */}
            <OverlayTrigger placement="top" overlay={<Tooltip>Tải xuống - {doc.creditCost} credits</Tooltip>}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading || !doc.userInteraction?.canDownload}
                className="d-flex align-items-center gap-1 px-3"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', fontWeight: '500' }}
              >
                {isDownloading ? <div className="spinner-border spinner-border-sm" /> : 
                  <>
                    <i className="bi bi-download" />
                    <span className="ms-1" style={{ fontSize: '0.75rem' }}>{doc.downloadCount || 0}</span>
                    <span className="mx-1">•</span>
                    <span style={{ fontSize: '0.75rem' }}>{doc.creditCost}</span>
                    <i className="bi bi-coin" style={{ fontSize: '0.75rem' }} />
                  </>
                }
              </Button>
            </OverlayTrigger>
          </div>
        </div>
      </Card.Body>

      {/* Unbookmark Confirmation Modal */}
      <Modal
        show={showUnbookmarkModal}
        onHide={() => setShowUnbookmarkModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Bỏ bookmark cho <strong>{doc.title}</strong>?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowUnbookmarkModal(false)}
          >
            Hủy
          </Button>
          <Button 
            variant="warning" 
            onClick={() => {
              setShowUnbookmarkModal(false);
              performBookmarkToggle();
            }}
          >
            Bỏ bookmark
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default DocumentCard;