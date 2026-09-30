import React, { useEffect, useState } from 'react';
import { Alert, Spinner, Button } from 'react-bootstrap';
import { previewService } from '../services/previewService';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentPreviewProps {
  documentId: string;
}

interface PreviewInfo {
  hasPreview: boolean;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  previewPages: number;
  fileType?: string; 
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentId }) => {
  const [info, setInfo] = useState<PreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await previewService.getPreviewInfo(documentId);
        if (res.success && res.data) {
          setInfo(res.data as any);
        }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetch();
  }, [documentId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };
  
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Return relative path - let nginx proxy handle it
    return url.startsWith('/') ? url : `/${url}`;
  };

  if (loading) return (
    <div className="text-center py-5 bg-light rounded" style={{minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Spinner animation="border" variant="secondary" />
    </div>
  );

  // 1. PDF RENDERER (Used for PDF, DOCX, PPTX converted previews)
  // Logic: If backend provides a previewUrl, it is a PDF. Render it.
  if (info?.previewUrl) {
    return (
      <div className="document-preview-container bg-secondary bg-opacity-10 rounded border" style={{minHeight: '500px'}}>
        <div className="d-flex justify-content-center p-3 overflow-hidden">
          <Document
            file={getFullUrl(info.previewUrl)}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="text-center py-5">
                <Spinner animation="border" size="sm" /> 
                <div className="mt-2 text-muted">Đang tải bản xem trước...</div>
              </div>
            }
            error={
              <Alert variant="warning" className="text-center m-3">
                Không thể tải file preview. <br/>
                <small>Vui lòng thử tải xuống tài liệu để xem.</small>
              </Alert>
            }
          >
            {/* Pagination Controls */}
            {numPages && (
              <div className="border-top p-2 d-flex justify-content-between align-items-center">
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  disabled={pageNumber <= 1} 
                  onClick={() => setPageNumber(p => p - 1)}
                >
                  <i className="bi bi-chevron-left" />
                </Button>
                
                <span className="small text-muted fw-bold">
                  Trang {pageNumber} / {numPages}
                </span>
                
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  disabled={pageNumber >= numPages} 
                  onClick={() => setPageNumber(p => p + 1)}
                >
                  <i className="bi bi-chevron-right" />
                </Button>
              </div>
            )}
            {/* Render current page */}
            <Page 
              pageNumber={pageNumber} 
              width={400} 
              renderTextLayer={false} 
              renderAnnotationLayer={false} 
              className="shadow-sm"
            />
          </Document>
        </div>
      </div>
    );
  }

  // 2. Fallback: Thumbnail
  if (info?.thumbnailUrl) {
    return (
      <div className="text-center bg-light p-4 rounded border d-flex flex-column align-items-center justify-content-center" style={{minHeight: '400px'}}>
        <img 
          src={getFullUrl(info.thumbnailUrl)} 
          alt="Document Thumbnail" 
          className="img-fluid shadow-sm mb-3 border"
          style={{ maxHeight: '350px', objectFit: 'contain' }}
        />
        <Alert variant="info" className="small mb-0 w-75">
          <i className="bi bi-info-circle me-2"></i>
          Bản xem trước PDF đang được tạo hoặc không khả dụng.
        </Alert>
      </div>
    );
  }

  // 3. Fallback: No Preview/Thumbnail
  return (
    <div className="text-center py-5 bg-light rounded border d-flex flex-column align-items-center justify-content-center" style={{minHeight: '300px'}}>
      <i className="bi bi-file-earmark-lock display-3 text-muted opacity-25 mb-3" />
      <h6 className="text-muted">Bản xem trước không khả dụng</h6>
      <p className="text-muted small mb-0 px-3">
        Vui lòng tải xuống để xem nội dung đầy đủ của tài liệu này.
      </p>
    </div>
  );
};

export default DocumentPreview;