/**
 * Recommended Documents Component - Shows personalized recommendations
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth';

interface RecommendedDocument {
  document_id: string;
  title: string;
  description: string;
  university: string;
  subject: string;
  average_rating: number;
  download_count: number;
  thumbnail_url: string | null;
  username: string;
  full_name: string;
  is_verified_author: boolean;
}

const RecommendedDocuments: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchRecommendations();
  }, [isAuthenticated]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      const endpoint = isAuthenticated 
        ? '/api/recommendations?limit=12'
        : '/api/recommendations/popular?limit=12';

      const config = isAuthenticated && token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {};

      const response = await axios.get(endpoint, config);
      
      const docs = response.data.data.recommendations || response.data.data.documents || [];
      setRecommendations(docs);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải gợi ý');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải gợi ý...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>
          {isAuthenticated ? '📚 Gợi ý dành cho bạn' : '🔥 Tài liệu phổ biến'}
        </h3>
        {isAuthenticated && (
          <small className="text-muted">Dựa trên sở thích và hoạt động của bạn</small>
        )}
      </div>

      {recommendations.length === 0 ? (
        <Alert variant="info">
          Chưa có gợi ý nào. {isAuthenticated ? 'Hãy tương tác với tài liệu để nhận gợi ý cá nhân hóa!' : 'Đăng nhập để nhận gợi ý cá nhân hóa!'}
        </Alert>
      ) : (
        <Row>
          {recommendations.map((doc) => (
            <Col md={6} lg={4} key={doc.document_id} className="mb-4">
              <Card className="h-100 shadow-sm hover-shadow">
                {doc.thumbnail_url && (
                  <Card.Img
                    variant="top"
                    src={doc.thumbnail_url}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                <Card.Body>
                  <Card.Title className="text-truncate">
                    <Link
                      to={`/documents/${doc.document_id}`}
                      className="text-decoration-none text-dark"
                    >
                      {doc.title}
                    </Link>
                  </Card.Title>

                  <Card.Text className="text-muted small" style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {doc.description}
                  </Card.Text>

                  <div className="d-flex gap-2 mb-2 flex-wrap">
                    {doc.university && (
                      <Badge bg="secondary" className="small">{doc.university}</Badge>
                    )}
                    {doc.subject && (
                      <Badge bg="info" className="small">{doc.subject}</Badge>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <div className="small">
                      <span className="text-warning">★</span>
                      <strong className="ms-1">{doc.average_rating?.toFixed(1) || '0.0'}</strong>
                      <span className="text-muted ms-2">
                        <i className="bi bi-download me-1"></i>
                        {doc.download_count}
                      </span>
                    </div>
                    
                    <div className="small text-muted">
                      <Link to={`/profile/${doc.username}`} className="text-decoration-none">
                        {doc.full_name}
                      </Link>
                      {doc.is_verified_author && (
                        <Badge bg="primary" className="ms-1">✓</Badge>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default RecommendedDocuments;
