/**
 * Question Detail Modal Component
 * Displays question details, answers, and voting/answering functionality in an overlay modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Card, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { questionService } from '../../services/questionService';
import { toast } from 'react-toastify';
import { useAppDispatch } from '../../store/hooks';
import { getCurrentUser } from '../../store/slices/authSlice';
import VerifiedBadge from '../common/VerifiedBadge';

interface QuestionDetailModalProps {
  show: boolean;
  onHide: () => void;
  questionId: string;
}

interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  voteCount: number;
  author: {
    username: string;
    name: string;
    avatar: string | null;
    isVerifiedAuthor: boolean;
  };
  createdAt: string;
}

interface QuestionDetail {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId: string | null;
  voteCount: number;
  viewCount: number;
  documentId: string;
  documentTitle: string;
  author: {
    username: string;
    name: string;
    avatar: string | null;
    isVerifiedAuthor: boolean;
  };
  createdAt: string;
}

const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({ show, onHide, questionId }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestion = useCallback(async () => {
    if (!questionId) return;
    try {
      setLoading(true);
      setError('');
      const res = await questionService.getQuestionById(questionId);
      if (res.success && res.data) {
        setQuestion(res.data.question);
        setAnswers(res.data.answers);
      }
    } catch (err: any) {
      setError(err.error || 'Không thể tải câu hỏi');
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => {
    if (show && questionId) {
      fetchQuestion();
    }
  }, [show, questionId, fetchQuestion]);

  const handleVoteQuestion = async (voteType: 1 | -1) => {
    if (!isAuthenticated || !questionId) {
      toast.error('Vui lòng đăng nhập để vote');
      return;
    }
    try {
      await questionService.voteQuestion(questionId, voteType);
      fetchQuestion();
    } catch (err: any) {
      toast.error(err.error || 'Không thể vote');
    }
  };

  const handleVoteAnswer = async (answerId: string, voteType: 1 | -1) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để vote');
      return;
    }
    try {
      await questionService.voteAnswer(answerId, voteType);
      fetchQuestion();
    } catch (err: any) {
      toast.error(err.error || 'Không thể vote');
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !questionId) {
      toast.error('Vui lòng đăng nhập để trả lời');
      return;
    }

    try {
      setSubmitting(true);
      await questionService.createAnswer(questionId, newAnswer);
      toast.success('Gửi câu trả lời thành công');
      setNewAnswer('');
      fetchQuestion();
    } catch (err: any) {
      toast.error(err.error || 'Không thể gửi câu trả lời');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập');
      return;
    }
    try {
      await questionService.acceptAnswer(answerId);
      toast.success('Đã chấp nhận câu trả lời');
      fetchQuestion();
      dispatch(getCurrentUser());
    } catch (err: any) {
      toast.error(err.error || 'Không thể chấp nhận câu trả lời');
    }
  };

  const isQuestionAuthor = user?.id === question?.author.username || user?.username === question?.author.username;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title>Chi tiết câu hỏi</Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Đang tải câu hỏi...</p>
          </div>
        ) : error || !question ? (
          <Alert variant="danger">
            <i className="bi bi-exclamation-triangle me-2" />
            {error || 'Không tìm thấy câu hỏi'}
          </Alert>
        ) : (
          <>
            {/* Document Reference */}
            {question.documentId && question.documentTitle && (
              <Alert variant="info" className="mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-file-earmark-text fs-4"></i>
                <div className="flex-grow-1">
                  <small className="text-muted d-block">Câu hỏi về tài liệu:</small>
                  <Link 
                    to={`/documents/${question.documentId}`} 
                    className="text-decoration-none fw-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      onHide();
                    }}
                  >
                    {question.documentTitle}
                  </Link>
                </div>
                <Link 
                  to={`/documents/${question.documentId}`}
                  className="btn btn-sm btn-outline-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHide();
                  }}
                >
                  Xem tài liệu
                </Link>
              </Alert>
            )}

            {/* Question */}
            <Card className="mb-4 border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex">
                  <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: '50px' }}>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 text-secondary" 
                      onClick={() => handleVoteQuestion(1)}
                    >
                      ▲
                    </Button>
                    <span className="fw-bold fs-4">{question.voteCount}</span>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 text-secondary" 
                      onClick={() => handleVoteQuestion(-1)}
                    >
                      ▼
                    </Button>
                  </div>

                  <div className="flex-grow-1">
                    <h4>{question.title}</h4>
                    <div className="d-flex gap-2 mb-3">
                      {question.isAnswered && <Badge bg="success">✓ Đã trả lời</Badge>}
                      <Badge bg="info">{question.viewCount} lượt xem</Badge>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{question.content}</p>
                    <div className="d-flex justify-content-between align-items-center text-muted small mt-3 border-top pt-2">
                      <div>
                        Hỏi bởi <strong>{question.author.name}</strong> 
                        {question.author.isVerifiedAuthor && <VerifiedBadge />}
                      </div>
                      <span>{new Date(question.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Answers */}
            <h5 className="mb-3">{answers.length} Câu trả lời</h5>
            {answers.length === 0 ? (
              <Alert variant="info">Chưa có câu trả lời nào. Hãy là người đầu tiên trả lời!</Alert>
            ) : (
              answers.map((answer) => (
                <Card 
                  key={answer.id} 
                  className={`mb-3 ${answer.isAccepted ? 'border-success' : 'border-0 shadow-sm'}`}
                >
                  <Card.Body>
                    <div className="d-flex">
                      <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: '50px' }}>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-secondary" 
                          onClick={() => handleVoteAnswer(answer.id, 1)}
                        >
                          ▲
                        </Button>
                        <span className="fw-bold">{answer.voteCount}</span>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-secondary" 
                          onClick={() => handleVoteAnswer(answer.id, -1)}
                        >
                          ▼
                        </Button>
                        {isQuestionAuthor && !answer.isAccepted && !question.isAnswered && (
                          <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="mt-2" 
                            onClick={() => handleAcceptAnswer(answer.id)}
                            title="Chấp nhận câu trả lời"
                          >
                            ✓
                          </Button>
                        )}
                      </div>

                      <div className="flex-grow-1">
                        {answer.isAccepted && (
                          <Badge bg="success" className="mb-2">✓ Câu trả lời được chấp nhận</Badge>
                        )}
                        <p style={{ whiteSpace: 'pre-wrap' }}>{answer.content}</p>
                        <div className="d-flex justify-content-between align-items-center text-muted small">
                          <div>
                            Trả lời bởi <strong>{answer.author.name}</strong>
                            {answer.author.isVerifiedAuthor && <VerifiedBadge />}
                          </div>
                          <span>{new Date(answer.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))
            )}

            {/* Answer Form */}
            <Card className="mt-4 shadow-sm border-0">
              <Card.Header>
                <h6 className="mb-0">Câu trả lời của bạn</h6>
              </Card.Header>
              <Card.Body>
                {isAuthenticated ? (
                  <Form onSubmit={handleSubmitAnswer}>
                    <Form.Group className="mb-3">
                      <Form.Control
                        as="textarea"
                        rows={5}
                        placeholder="Nhập câu trả lời của bạn (ít nhất 20 ký tự)"
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        required
                        minLength={20}
                      />
                    </Form.Group>
                    <Alert variant="info" className="small mb-3">
                      Bạn sẽ nhận được <strong>2 credits</strong> khi trả lời câu hỏi.
                      Nếu câu trả lời được chấp nhận, bạn sẽ nhận thêm <strong>5 credits</strong>!
                    </Alert>
                    <Button variant="primary" type="submit" disabled={submitting} size="sm">
                      {submitting ? (
                        <>
                          <Spinner size="sm" animation="border" className="me-2" />
                          Đang gửi...
                        </>
                      ) : (
                        'Gửi câu trả lời'
                      )}
                    </Button>
                  </Form>
                ) : (
                  <Alert variant="warning" className="mb-0">
                    Vui lòng <strong>đăng nhập</strong> để trả lời câu hỏi.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default QuestionDetailModal;
