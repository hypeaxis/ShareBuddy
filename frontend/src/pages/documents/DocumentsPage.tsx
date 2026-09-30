/**
 * Documents Page - Trang duyệt tài liệu với tìm kiếm và lọc
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import DocumentList from '../../components/documents/DocumentList';
import '../../styles/DocumentsPage.css';

const DocumentsPage: React.FC = () => {
  return (
    <div className="documents-page">
      {/* Background Image */}
      <div className="documents-bg-container">
        <div className="documents-bg-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=3028&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Library with books"
          className="bg-image"
        />
      </div>

      {/* Content */}
      <div className="documents-page-content">
        <Container className="py-4" style={{ marginTop: '80px' }}>
          <DocumentList 
            title="Khám phá tài liệu"
            showFilters={true}
            showViewToggle={true}
          />
        </Container>
      </div>
    </div>
  );
};

export default DocumentsPage;