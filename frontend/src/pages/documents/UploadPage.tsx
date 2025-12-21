/**
 * Upload Page for ShareBuddy - Document upload functionality
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { FaUpload, FaFileAlt, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { documentService } from '../../services/documentService';
import { useNavigate } from 'react-router-dom';
import ModerationStatusBadge from '../../components/ModerationStatusBadge';

interface UploadFormData {
  title: string;
  description: string;
  university: string;
  subject: string;
  creditCost: number;
  isPublic: boolean;
  isPremium: boolean;
  tags: string;
  file: File | null;
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    university: '',
    subject: '',
    creditCost: 1,
    isPublic: true,
    isPremium: false,
    tags: '',
    file: null
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'pending' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [moderationInfo, setModerationInfo] = useState<{ jobId: string; status: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề tài liệu');
      return false;
    }
    if (!formData.description.trim()) {
      setErrorMessage('Vui lòng nhập mô tả tài liệu');
      return false;
    }
    if (!formData.file) {
      setErrorMessage('Vui lòng chọn file để tải lên');
      return false;
    }
    if (formData.file.size > 10 * 1024 * 1024) { // 10MB limit
      setErrorMessage('Kích thước file không được vượt quá 10MB');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!validateForm()) {
      setUploadStatus('error');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    
    try {
      const response = await documentService.uploadDocument(
        {
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          university: formData.university,
          creditCost: formData.creditCost,
          isPublic: formData.isPublic,
          isPremium: formData.isPremium,
          tags: formData.tags
        },
        formData.file!,
        (progress) => setUploadProgress(progress)
      );
      
      // Check if document is pending moderation
      const documentStatus = response.data?.document?.status || 'pending';
      const moderation = response.data?.moderation;
      
      if (documentStatus === 'pending') {
        setUploadStatus('pending');
        setModerationInfo(moderation || null);
      } else {
        setUploadStatus('success');
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        university: '',
        subject: '',
        creditCost: 1,
        isPublic: true,
        isPremium: false,
        tags: '',
        file: null
      });
      
      // Redirect to my documents after 3 seconds
      setTimeout(() => {
        navigate('/profile?tab=documents');
      }, 3000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrorMessage(error?.error || error?.message || 'Có lỗi xảy ra khi tải lên tài liệu');
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      <Row>
        <Col lg={8} className="mx-auto">
          <div className="d-flex align-items-center mb-4">
            <FaUpload className="me-2 text-primary" size={24} />
            <h2 className="mb-0">Tải lên tài liệu mới</h2>
          </div>

          <Card className="shadow-sm">
            <Card.Body className="p-4">
              {uploadStatus === 'success' && (
                <Alert variant="success" className="d-flex align-items-center">
                  <FaCheckCircle className="me-2" />
                  Tài liệu đã được tải lên thành công và đã có sẵn để tải xuống!
                </Alert>
              )}

              {uploadStatus === 'pending' && (
                <Alert variant="warning" className="mb-3">
                  <div className="d-flex align-items-start">
                    <FaClock className="me-2 mt-1" size={20} />
                    <div className="flex-grow-1">
                      <h6 className="mb-2">
                        <ModerationStatusBadge status="pending" size="md" />
                      </h6>
                      <p className="mb-2">
                        Tài liệu của bạn đã được tải lên thành công và đang được hệ thống AI kiểm duyệt tự động. 
                        Quá trình này thường mất 2-5 giây.
                      </p>
                      <p className="mb-0 small text-muted">
                        💡 Bạn sẽ nhận được thông báo ngay khi tài liệu được phê duyệt và có thể tải xuống.
                        {moderationInfo && (
                          <span className="d-block mt-1">Job ID: {moderationInfo.jobId}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </Alert>
              )}

              {uploadStatus === 'error' && errorMessage && (
                <Alert variant="danger" className="d-flex align-items-center">
                  <FaExclamationTriangle className="me-2" />
                  {errorMessage}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                {/* File Upload Area */}
                <div 
                  className={`rounded p-4 mb-4 text-center position-relative ${
                  dragActive ? 'border-primary' : 'border-secondary'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                  minHeight: '150px',
                  cursor: 'pointer',
                  borderWidth: '2px',
                  borderStyle: 'dashed dotted',
                  borderColor: dragActive ? '#0d6efd' : '#ced4da',
                  transition: 'border-color 0.2s'
                  }}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  {formData.file ? (
                  <div className="d-flex align-items-center justify-content-center">
                    <FaFileAlt className="me-2 text-primary" size={24} />
                    <div>
                    <strong>{formData.file.name}</strong>
                    <br />
                    <small className="text-muted">{formatFileSize(formData.file.size)}</small>
                    </div>
                  </div>
                  ) : (
                  <>
                    <FaUpload size={48} className="text-muted mb-2" />
                    <p className="mb-2">Kéo thả file vào đây hoặc nhấn để chọn</p>
                    <p className="text-muted small">Hỗ trợ: PDF, DOC, DOCX, PPT, PPTX (tối đa 10MB)</p>
                  </>
                  )}
                  <input
                  id="fileInput"
                  type="file"
                  className="d-none"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  />
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Đang tải lên...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <ProgressBar now={uploadProgress} />
                  </div>
                )}

                {/* Basic Information */}
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tiêu đề tài liệu *</Form.Label>
                      <Form.Control
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="VD: Giáo trình Toán cao cấp A1"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Môn học</Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder="VD: Toán cao cấp"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Trường đại học</Form.Label>
                      <Form.Control
                        type="text"
                        name="university"
                        value={formData.university}
                        onChange={handleInputChange}
                        placeholder="VD: Đại học Bách Khoa Hà Nội"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Chi phí tải xuống</Form.Label>
                      <Form.Select
                        name="creditCost"
                        value={formData.creditCost}
                        onChange={handleInputChange}
                      >
                        <option value={0}>0 credits (Miễn phí)</option>
                        <option value={1}>1 credit</option>
                        <option value={2}>2 credits</option>
                        <option value={3}>3 credits</option>
                        <option value={5}>5 credits</option>
                        <option value={10}>10 credits</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Credit Reward Notification */}
                <Alert variant="success" className="d-flex align-items-center mb-3">
                  <span>💰 Bạn sẽ nhận được 1 credit với mỗi tài liệu tải lên!</span>
                </Alert>

                <Form.Group className="mb-3">
                  <Form.Label>Mô tả *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Mô tả chi tiết về nội dung tài liệu, phạm vi kiến thức, đối tượng sử dụng..."
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Tags (phân cách bằng dấu phẩy)</Form.Label>
                  <Form.Control
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="VD: toán học, giáo trình, đại học"
                  />
                </Form.Group>

                {/* Submit Button */}
                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    type="submit" 
                    disabled={uploading || !formData.file}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Đang tải lên...
                      </>
                    ) : (
                      <>
                        <FaUpload className="me-2" />
                        Tải lên tài liệu
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    Bằng cách tải lên, bạn đồng ý với{' '}
                    <a href="/terms" className="text-decoration-none">Điều khoản sử dụng</a> và{' '}
                    <a href="/privacy" className="text-decoration-none">Chính sách bảo mật</a>
                  </small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UploadPage;