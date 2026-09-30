/**
 * Similar Documents Component - Shows related documents
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface SimilarDocument {
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
  similarity_score?: number;
}

interface SimilarDocumentsProps {
  documentId: string;
  limit?: number;
}

const SimilarDocuments: React.FC<SimilarDocumentsProps> = ({ documentId, limit = 4 }) => {
  const [similar, setSimilar] = useState<SimilarDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (documentId) {
      fetchSimilar();
    }
  }, [documentId]);

  const fetchSimilar = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/recommendations/similar/${documentId}?limit=${limit}`);
      setSimilar(response.data.data.similar || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải tài liệu liên quan');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-3">
        <Spinner animation="border" size="sm" variant="primary" />
        <p className="small text-muted mt-2">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="warning" className="small">{error}</Alert>;
  }

  if (similar.length === 0) {
    return <p className="text-muted text-center small">Chưa có tài liệu liên quan</p>;
  }

  return (
    <Row>
      {similar.map((doc) => (
        <Col md={12} key={doc.document_id} className="mb-3">
          <Card className="border-0 bg-light">
            <Card.Body className="p-3">
              <Card.Title className="h6 mb-2">
                <Link
                  to={`/documents/${doc.document_id}`}
                  className="text-decoration-none text-dark"
                >
                  {doc.title}
                </Link>
              </Card.Title>

              <div className="d-flex gap-1 mb-2 flex-wrap">
                {doc.subject && (
                  <Badge bg="info" className="small">{doc.subject}</Badge>
                )}
                {doc.university && (
                  <Badge bg="secondary" className="small">{doc.university}</Badge>
                )}
              </div>

              <div className="d-flex justify-content-between align-items-center small">
                <span>
                  <span className="text-warning">★</span>
                  <strong className="ms-1">{doc.average_rating?.toFixed(1) || '0.0'}</strong>
                </span>
                <span className="text-muted">
                  <i className="bi bi-download me-1"></i>
                  {doc.download_count}
                </span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default SimilarDocuments;
