/**
 * MyFeedPage - Personalized feed for authenticated users
 * Displays 4 sections:
 * 1. Documents from followed authors (horizontal scroll)
 * 2. Trending documents of the day (top 10)
 * 3. Recommendations based on user's interests (20 items)
 * 4. Hot Q&A discussions (5 items)
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';

interface Document {
  document_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  download_count: number;
  rating: number | string;
  author_name: string;
  created_at: string;
}

interface QAItem {
  question_id: string;
  title: string;
  reply_count: number;
  author_name: string;
  created_at: string;
}

const MyFeedPage: React.FC = () => {
  const [followingDocs, setFollowingDocs] = useState<Document[]>([]);
  const [trendingDocs, setTrendingDocs] = useState<Document[]>([]);
  const [recommendedDocs, setRecommendedDocs] = useState<Document[]>([]);
  const [hotQA, setHotQA] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState({
    following: true,
    trending: true,
    recommended: true,
    hotqa: true,
  });
  const [errors, setErrors] = useState({
    following: '',
    trending: '',
    recommended: '',
    hotqa: '',
  });

  useEffect(() => {
    fetchFollowingDocs();
    fetchTrendingDocs();
    fetchRecommendedDocs();
    fetchHotQA();
  }, []);

  const fetchFollowingDocs = async () => {
    try {
      const response = await apiClient.get('/feed/following-authors');
      setFollowingDocs(response.data.documents || []);
      setLoading((prev) => ({ ...prev, following: false }));
    } catch (error: any) {
      console.error('Failed to fetch following authors docs:', error);
      setErrors((prev) => ({ ...prev, following: 'Không thể tải tài liệu' }));
      setLoading((prev) => ({ ...prev, following: false }));
    }
  };

  const fetchTrendingDocs = async () => {
    try {
      const response = await apiClient.get('/feed/trending');
      setTrendingDocs(response.data.documents || []);
      setLoading((prev) => ({ ...prev, trending: false }));
    } catch (error: any) {
      console.error('Failed to fetch trending docs:', error);
      setErrors((prev) => ({ ...prev, trending: 'Không thể tải tài liệu trending' }));
      setLoading((prev) => ({ ...prev, trending: false }));
    }
  };

  const fetchRecommendedDocs = async () => {
    try {
      const response = await apiClient.get('/feed/recommendations');
      setRecommendedDocs(response.data.documents || []);
      setLoading((prev) => ({ ...prev, recommended: false }));
    } catch (error: any) {
      console.error('Failed to fetch recommended docs:', error);
      setErrors((prev) => ({ ...prev, recommended: 'Không thể tải gợi ý' }));
      setLoading((prev) => ({ ...prev, recommended: false }));
    }
  };

  const fetchHotQA = async () => {
    try {
      const response = await apiClient.get('/feed/hot-qa');
      setHotQA(response.data.questions || []);
      setLoading((prev) => ({ ...prev, hotqa: false }));
    } catch (error: any) {
      console.error('Failed to fetch hot Q&A:', error);
      setErrors((prev) => ({ ...prev, hotqa: 'Không thể tải thảo luận' }));
      setLoading((prev) => ({ ...prev, hotqa: false }));
    }
  };

  return (
    <Container className="py-4" style={{ paddingTop: '80px' }}>
      {/* Section 1: Following Authors Documents */}
      <Row className="mb-5">
        <Col xs={12}>
          <h4 className="mb-3">📚 Từ tác giả bạn follow</h4>
          {loading.following ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : errors.following ? (
            <Alert variant="danger">{errors.following}</Alert>
          ) : followingDocs.length === 0 ? (
            <Alert variant="info">
              Bạn chưa follow tác giả nào. <Link to="/documents">Khám phá tài liệu</Link> để tìm tác giả ưa thích!
            </Alert>
          ) : (
            <div className="horizontal-scroll-container pb-3">
              <div className="d-flex gap-3" style={{ overflowX: 'auto' }}>
                {followingDocs.map((doc) => (
                  <Card key={doc.document_id} style={{ minWidth: '280px', maxWidth: '280px' }} className="card-hover">
                    <Card.Img variant="top" src={doc.thumbnail_url || '/placeholder.png'} style={{ height: '160px', objectFit: 'cover' }} />
                    <Card.Body>
                      <Card.Title className="text-truncate" style={{ fontSize: '1rem' }}>{doc.title}</Card.Title>
                      <Card.Text className="text-muted small">
                        <i className="bi bi-person me-1"></i> {doc.author_name}
                      </Card.Text>
                      <Link to={`/documents/${doc.document_id}`} className="btn btn-sm btn-primary">
                        Xem chi tiết
                      </Link>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Col>
      </Row>

      {/* Section 2: Trending Documents */}
      <Row className="mb-5">
        <Col xs={12}>
          <h4 className="mb-3">🔥 Tài liệu trending trong ngày</h4>
          {loading.trending ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : errors.trending ? (
            <Alert variant="danger">{errors.trending}</Alert>
          ) : (
            <Row className="g-3">
              {trendingDocs.slice(0, 10).map((doc, index) => (
                <Col xs={12} md={6} key={doc.document_id}>
                  <Card className="card-hover h-100">
                    <Card.Body className="d-flex align-items-start gap-3">
                      <div className="badge bg-primary rounded-circle" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        {index + 1}
                      </div>
                      <div className="flex-grow-1">
                        <Link to={`/documents/${doc.document_id}`} className="text-decoration-none">
                          <Card.Title style={{ fontSize: '1rem' }}>{doc.title}</Card.Title>
                        </Link>
                        <Card.Text className="text-muted small mb-1">
                          <i className="bi bi-download me-1"></i> {doc.download_count} lượt tải
                          <span className="mx-2">•</span>
                          <i className="bi bi-star-fill text-warning me-1"></i> {Number(doc.rating || 0).toFixed(1)}
                        </Card.Text>
                        <Card.Text className="text-muted small">
                          <i className="bi bi-person me-1"></i> {doc.author_name}
                        </Card.Text>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      {/* Section 3: Recommendations */}
      <Row className="mb-5">
        <Col xs={12}>
          <h4 className="mb-3">💡 Bạn có thể quan tâm</h4>
          {loading.recommended ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : errors.recommended ? (
            <Alert variant="danger">{errors.recommended}</Alert>
          ) : (
            <Row className="g-3">
              {recommendedDocs.slice(0, 20).map((doc) => (
                <Col xs={12} sm={6} md={4} lg={3} key={doc.document_id}>
                  <Card className="h-100 card-hover">
                    <Card.Img variant="top" src={doc.thumbnail_url || '/placeholder.png'} style={{ height: '140px', objectFit: 'cover' }} />
                    <Card.Body>
                      <Card.Title className="text-truncate" style={{ fontSize: '0.95rem' }}>{doc.title}</Card.Title>
                      <Card.Text className="text-muted small">
                        <i className="bi bi-person me-1"></i> {doc.author_name}
                      </Card.Text>
                      <Link to={`/documents/${doc.document_id}`} className="btn btn-sm btn-outline-primary w-100">
                        Xem
                      </Link>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      {/* Section 4: Hot Q&A */}
      <Row className="mb-5">
        <Col xs={12}>
          <h4 className="mb-3">💬 Chủ đề Q&A nóng</h4>
          {loading.hotqa ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : errors.hotqa ? (
            <Alert variant="danger">{errors.hotqa}</Alert>
          ) : hotQA.length === 0 ? (
            <Alert variant="info">Chưa có thảo luận nào trong ngày hôm nay.</Alert>
          ) : (
            <Row className="g-3">
              {hotQA.slice(0, 5).map((qa) => (
                <Col xs={12} key={qa.question_id}>
                  <Card className="card-hover">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <Link to={`/qa/${qa.question_id}`} className="text-decoration-none">
                            <Card.Title style={{ fontSize: '1rem' }}>{qa.title}</Card.Title>
                          </Link>
                          <Card.Text className="text-muted small mb-0">
                            <i className="bi bi-person me-1"></i> {qa.author_name}
                            <span className="mx-2">•</span>
                            <i className="bi bi-chat-dots me-1"></i> {qa.reply_count} câu trả lời
                          </Card.Text>
                        </div>
                        <div className="badge bg-success" style={{ fontSize: '0.85rem' }}>
                          HOT
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MyFeedPage;
