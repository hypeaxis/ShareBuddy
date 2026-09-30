/**
 * CommentSection - Hiển thị và quản lý bình luận tài liệu
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Modal, Dropdown, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { commentService } from '../../services/commentService';
import { Comment, PaginatedResponse } from '../../types'; // Using your requested imports
import { toast } from 'react-toastify';
import VerifiedBadge from '../common/VerifiedBadge';

interface CommentSectionProps {
  documentId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ documentId }) => {
  const { isAuthenticated, user } = useAuth();
  
  
  // State using standard types
  const [comments, setComments] = useState<Comment[]>([]);
  
  const [pagination, setPagination] = useState<Partial<PaginatedResponse<Comment>>>({
    page: 1, 
    totalPages: 1, 
    totalItems: 0 
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Input states
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');

  const loadComments = useCallback(async () => {
    try {
      const response = await commentService.getDocumentComments(
        documentId, 
        pagination.page || 1, 
        10,
        sortOrder
      );
      
      if (response.success && response.data) {
        setComments(response.data.items || []);
        
        setPagination({
          page: response.data.page,
          totalPages: response.data.totalPages,
          totalItems: response.data.totalItems
        });
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, pagination.page, sortOrder]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bình luận');
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await commentService.createComment(documentId, newComment);
      if (res.success) {
        setNewComment('');
        toast.success('Bình luận thành công!');
        loadComments(); // Refresh list
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyComment = async (parentId: string) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập');
      return;
    }
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await commentService.replyToComment(documentId, parentId, replyText);
      setReplyText('');
      setReplyingTo(null);
      toast.success('Trả lời thành công!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi gửi trả lời');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    setIsSubmitting(true);
    try {
      await commentService.updateComment(commentId, editText);
      setEditText('');
      setEditingComment(null);
      toast.success('Cập nhật thành công');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi cập nhật');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      setShowDeleteModal(null);
      toast.success('Đã xóa bình luận');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi xóa bình luận');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) return toast.error('Vui lòng đăng nhập');
    try {
      await commentService.toggleCommentLike(commentId);
      loadComments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // ... Render helpers remain similar ...
  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <Card key={comment.id} className={`mb-3 ${isReply ? 'ms-4 border-start border-3' : 'border-0 shadow-sm'}`}>
      <Card.Body className="p-3">
        <div className="d-flex align-items-start">
          <img
            src={comment.user.avatarUrl || 'https://via.placeholder.com/40'}
            alt="User"
            className="rounded-circle me-3"
            width="40" height="40"
            style={{objectFit: 'cover'}}
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=U'; }}
          />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-1">
              <div>
                <h6 className="mb-0 fw-bold d-inline-block me-2">
                  {comment.user.fullName || comment.user.username}
                </h6>
                {comment.user.isVerifiedAuthor && (
                  <VerifiedBadge />
                )}
                <small className="text-muted">{formatDate(comment.createdAt)}</small>
              </div>
              
              {isAuthenticated && (user?.id === comment.user.id || user?.role === 'admin') && (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="link" size="sm" className="text-muted p-0 border-0 no-arrow">
                    <i className="bi bi-three-dots-vertical" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => { setEditingComment(comment.id); setEditText(comment.content); }}>
                      <i className="bi bi-pencil me-2" /> Sửa
                    </Dropdown.Item>
                    <Dropdown.Item className="text-danger" onClick={() => setShowDeleteModal(comment.id)}>
                      <i className="bi bi-trash me-2" /> Xóa
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
            
            {editingComment === comment.id ? (
              <div className="mt-2">
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="mb-2"
                />
                <div className="d-flex gap-2 justify-content-end">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingComment(null); setEditText(''); }}>Hủy</Button>
                  <Button size="sm" variant="primary" onClick={() => handleEditComment(comment.id)} disabled={isSubmitting}>Lưu</Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-dark" style={{whiteSpace: 'pre-wrap'}}>{comment.content}</p>
                <div className="d-flex align-items-center gap-3">
                  <Button variant="link" size="sm" className="p-0 text-decoration-none text-muted" onClick={() => handleLikeComment(comment.id)}>
                    <i className={`bi bi-hand-thumbs-up${comment.isLiked ? '-fill text-primary' : ''} me-1`} />
                    {comment.likeCount || 0}
                  </Button>
                  
                  {!isReply && (
                    <Button variant="link" size="sm" className="p-0 text-decoration-none text-muted"
                      onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyText(''); }}
                    >
                      Trả lời
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            {replyingTo === comment.id && (
              <div className="mt-3 ps-3 border-start">
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder={`Trả lời ${comment.user.fullName}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="mb-2"
                  autoFocus
                />
                <div className="d-flex gap-2 justify-content-end">
                  <Button size="sm" variant="secondary" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Hủy</Button>
                  <Button size="sm" variant="primary" onClick={() => handleReplyComment(comment.id)} disabled={isSubmitting}>Gửi</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
      
      {/* Recursively render replies if they exist in the comment object */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ps-0 border-top bg-light bg-opacity-25">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="comment-section">
      {isAuthenticated ? (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body>
            <Form>
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Viết bình luận của bạn..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{resize: 'none'}}
                />
              </Form.Group>
              <div className="d-flex justify-content-end">
                <Button variant="primary" onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()}>
                  {isSubmitting ? <Spinner size="sm" animation="border" /> : 'Gửi bình luận'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info" className="mb-4">
          <i className="bi bi-info-circle me-2" /> <a href="/login" className="alert-link">Đăng nhập</a> để tham gia thảo luận.
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0 fw-bold">Bình luận ({pagination.totalItems})</h6>
        <Dropdown align="end">
          <Dropdown.Toggle variant="light" size="sm" className="border text-muted">
            {sortOrder === 'newest' ? 'Mới nhất' : sortOrder === 'oldest' ? 'Cũ nhất' : 'Phổ biến'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setSortOrder('newest')}>Mới nhất</Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder('oldest')}>Cũ nhất</Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder('popular')}>Phổ biến</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {isLoading ? (
        <div className="text-center py-4"><Spinner animation="border" variant="primary" /></div>
      ) : comments.length === 0 ? (
        <div className="text-center py-5 text-muted bg-light rounded">
          <p className="mb-0">Chưa có bình luận nào.</p>
        </div>
      ) : (
        <div>
          {comments.map(comment => renderComment(comment))}
          
          {pagination.totalPages && pagination.page && pagination.totalPages > pagination.page && (
            <div className="text-center mt-3">
              <Button variant="outline-primary" size="sm" onClick={() => setPagination(prev => ({...prev, page: (prev.page || 1) + 1}))}>
                Xem thêm
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Modal show={showDeleteModal !== null} onHide={() => setShowDeleteModal(null)} centered size="sm">
        <Modal.Body className="text-center pt-4">
          <p className="fw-bold">Xóa bình luận?</p>
          <div className="d-flex justify-content-center gap-2 mt-4">
            <Button variant="light" onClick={() => setShowDeleteModal(null)}>Hủy</Button>
            <Button variant="danger" onClick={() => showDeleteModal && handleDeleteComment(showDeleteModal)}>Xóa</Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default CommentSection;
