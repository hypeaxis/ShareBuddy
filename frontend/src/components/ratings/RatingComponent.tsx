import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Modal, ProgressBar, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { ratingService } from '../../services/ratingService';
import { Rating, RatingStatistics } from '../../types';
import { toast } from 'react-toastify';
import VerifiedBadge from '../common/VerifiedBadge';

interface RatingComponentProps {
  documentId: string;
}

const RatingComponent: React.FC<RatingComponentProps> = ({ documentId }) => {
  const { isAuthenticated } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStatistics | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [newRating, setNewRating] = useState({ rating: 0, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadAllData = async () => {
    try {
      // Load List & Stats
      const res = await ratingService.getDocumentRatings(documentId, 1, 10);
      if (res.success && res.data) {
        setRatings(res.data.ratings || []);
        if (res.data.statistics) {
          setRatingStats(res.data.statistics);
        }
      }

      // Load User Rating
      if (isAuthenticated) {
        try {
          const userRes = await ratingService.getUserRating(documentId);
          if (userRes.success && userRes.data && userRes.data.rating) {
            const r = userRes.data.rating;
            setUserRating(r);
            setNewRating({ 
              rating: r.rating, 
              comment: r.comment || '' // Populate comment for editing
            });
          }
        } catch (e) { /* ignore 404 */ }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [documentId, isAuthenticated]);

  const handleSubmitRating = async () => {
    if (!isAuthenticated) return toast.error('Vui lòng đăng nhập');
    if (newRating.rating === 0) return toast.error('Chọn số sao');

    setIsSubmitting(true);
    try {
      await ratingService.rateDocument(documentId, newRating.rating, newRating.comment);
      toast.success('Đánh giá thành công!');
      setShowRatingModal(false);
      await loadAllData(); // Reload everything to show new/updated rating
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="d-inline-flex">
        {[1, 2, 3, 4, 5].map(i => (
          <i
            key={i}
            className={`bi bi-star${i <= rating ? '-fill' : ''} text-warning`}
            style={{ 
              cursor: interactive ? 'pointer' : 'default', 
              fontSize: interactive ? '1.5rem' : '1rem',
              marginRight: '2px'
            }}
            onClick={interactive && onChange ? () => onChange(i) : undefined}
          />
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!ratingStats || !ratingStats.distribution) return null;
    const total = ratingStats.totalRatings || 0;
    
    return (
      <div>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingStats.distribution[String(star)] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <Row key={star} className="align-items-center mb-1 g-0">
              <Col xs={3} className="text-end pe-2"><small>{star} <i className="bi bi-star-fill text-warning"></i></small></Col>
              <Col xs={7}><ProgressBar now={percentage} variant="warning" style={{ height: '6px' }} /></Col>
              <Col xs={2} className="ps-2"><small className="text-muted">{count}</small></Col>
            </Row>
          );
        })}
      </div>
    );
  };

  if (isLoading) return <div className="text-center py-4">Đang tải...</div>;

  const avgRating = ratingStats?.avgRating ? parseFloat(ratingStats.avgRating) : 0;

  return (
    <div className="rating-component">
      <Row className="mb-4">
        <Col md={6} className="text-center d-flex flex-column justify-content-center border-end">
          <div className="display-4 fw-bold text-white mb-0">{avgRating.toFixed(1)}</div>
          <div className="mb-2">{renderStars(Math.round(avgRating))}</div>
          <div className="text-muted small">{ratingStats?.totalRatings || 0} đánh giá</div>
        </Col>
        <Col md={6}>{renderRatingDistribution()}</Col>
      </Row>

      {isAuthenticated && (
        <div className="mb-4 text-center">
          {userRating ? (
            <div className="p-3 rounded border d-flex justify-content-between align-items-center">
              <div><span className="fw-bold me-2">Đánh giá của bạn:</span> {renderStars(userRating.rating)}</div>
              <Button variant="link" size="sm" onClick={() => setShowRatingModal(true)}>Chỉnh sửa</Button>
            </div>
          ) : (
            <Button variant="outline-primary" onClick={() => setShowRatingModal(true)} className="w-100">
              <i className="bi bi-pencil-square me-2" /> Viết đánh giá
            </Button>
          )}
        </div>
      )}

      <div>
        <h6 className="mb-3 border-bottom pb-2">Đánh giá từ cộng đồng</h6>
        {ratings.length === 0 ? (
          <div className="text-center py-3 text-muted">Chưa có đánh giá nào.</div>
        ) : (
          ratings.map((rating) => (
            // Key must be unique. Using rating.id which comes from DB rating_id
            <Card key={rating.id} className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <div className="d-flex align-items-start">
                  <img
                    src={rating.user.avatarUrl || 'https://via.placeholder.com/40'}
                    alt="User"
                    className="rounded-circle me-3"
                    width="40" height="40"
                    style={{objectFit: 'cover'}}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=U'; }}
                  />
                  <div className="flex-grow-1">
                    <h6 className="mb-0 fw-bold">{rating.user.fullName || rating.user.username} {rating.user.isVerifiedAuthor && <VerifiedBadge />}</h6>
                    <div className="d-flex align-items-center mt-1">
                      {renderStars(rating.rating)}
                      <span className="text-muted ms-2 small">• {new Date(rating.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                    {/* Fixed: Display comment if it exists */}
                    {rating.comment && (
                      <p className="mt-2 mb-0 text-secondary">{rating.comment}</p>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>

      <Modal show={showRatingModal} onHide={() => setShowRatingModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{userRating ? 'Chỉnh sửa' : 'Đánh giá'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <div className="d-flex justify-content-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <i key={star} 
                   className={`bi bi-star${star <= newRating.rating ? '-fill' : ''} fs-1 text-warning`}
                   style={{ cursor: 'pointer' }}
                   onClick={() => setNewRating(prev => ({ ...prev, rating: star }))} />
              ))}
            </div>
          </div>
          <Form.Group>
            <Form.Control 
              as="textarea" 
              rows={3} 
              placeholder="Nhập nhận xét (tùy chọn)..." 
              value={newRating.comment}
              onChange={(e) => setNewRating(prev => ({ ...prev, comment: e.target.value }))} 
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowRatingModal(false)}>Hủy</Button>
          <Button variant="primary" onClick={handleSubmitRating} disabled={isSubmitting || newRating.rating === 0}>Gửi</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RatingComponent;
