/**
 * Documents Page - Trang duyệt tài liệu với tìm kiếm và lọc
 */

import React from 'react';
import { Container } from 'react-bootstrap';
import DocumentList from '../../components/documents/DocumentList';

const DocumentsPage: React.FC = () => {
  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      <DocumentList 
        title="Khám phá tài liệu"
        showFilters={true}
        showViewToggle={true}
      />
    </Container>
  );
};

export default DocumentsPage;