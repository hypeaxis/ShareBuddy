/**
 * Upload Page for ShareBuddy - Document upload functionality
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { FaUpload, FaFileAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
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
    
    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // TODO: Implement actual file upload to backend
      console.log('Upload form data:', formData);
      
      setUploadStatus('success');
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
    } catch (error) {
      setErrorMessage('Có lỗi xảy ra khi tải lên tài liệu');
      setUploadStatus('error');
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('idle');
      }, 2000);
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
                  Tài liệu đã được tải lên thành công! Đang chờ phê duyệt.
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
                  className={`border-2 border-dashed rounded p-4 mb-4 text-center position-relative ${
                    dragActive ? 'border-primary bg-light' : 'border-secondary'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{ minHeight: '150px', cursor: 'pointer' }}
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
                      <Form.Label>Chi phí credits</Form.Label>
                      <Form.Select
                        name="creditCost"
                        value={formData.creditCost}
                        onChange={handleInputChange}
                      >
                        <option value={1}>1 credit (Miễn phí)</option>
                        <option value={2}>2 credits</option>
                        <option value={3}>3 credits</option>
                        <option value={5}>5 credits</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

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

                {/* Settings */}
                <Card className="border-light mb-4">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0">Cài đặt tài liệu</h6>
                  </Card.Header>
                  <Card.Body>
                    <Form.Check
                      type="switch"
                      id="isPublic"
                      name="isPublic"
                      label="Công khai (hiển thị với mọi người)"
                      checked={formData.isPublic}
                      onChange={handleInputChange}
                      className="mb-2"
                    />
                    <Form.Check
                      type="switch"
                      id="isPremium"
                      name="isPremium"
                      label="Tài liệu premium (chất lượng cao)"
                      checked={formData.isPremium}
                      onChange={handleInputChange}
                    />
                    <small className="text-muted">
                      Tài liệu premium sẽ được ưu tiên hiển thị và có badge đặc biệt
                    </small>
                  </Card.Body>
                </Card>

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