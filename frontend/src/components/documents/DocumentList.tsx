/**
 * DocumentList Component - Hiển thị danh sách tài liệu với pagination
 * Features: Grid/List view, sorting, filtering, infinite scroll, Filter Panel
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Dropdown, Button, Spinner, Alert, Form, Offcanvas } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { FaBookmark, FaFilter } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDocuments, setSearchParams } from '../../store/slices/documentSlice';
import { Document, DocumentSearchParams } from '../../types';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';
import AuthorProfileModal from './AuthorProfileModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface DocumentListProps {
  title?: string;
  showFilters?: boolean;
  showViewToggle?: boolean;
  defaultView?: 'grid' | 'list';
  documentsOverride?: Document[];
  compact?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  title = 'Tài liệu',
  showFilters = true,
  showViewToggle = true,
  defaultView = 'grid',
  documentsOverride,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const [searchParams, setUrlSearchParams] = useSearchParams();
  const { 
    documents, 
    searchResults, 
    isLoading, 
    error, 
    pagination 
  } = useAppSelector(state => state.documents);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultView);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Determine which documents to display
  // Always use documents array since fetchDocuments handles all filters including search
  const displayDocuments = documentsOverride || documents;

  // Parse search params to filters
  const getFiltersFromUrl = useCallback((): DocumentSearchParams => {
    const filters: DocumentSearchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: 12,
      sortBy: searchParams.get('sortBy') as any || 'newest'
    };
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const category = searchParams.get('category');
    if (category) filters.category = category;
    
    const subject = searchParams.get('subject');
    if (subject) filters.subject = subject;
    
    const minRating = searchParams.get('minRating');
    if (minRating) filters.minRating = parseInt(minRating);
    
    const maxCreditCost = searchParams.get('maxCreditCost');
    if (maxCreditCost) filters.maxCreditCost = parseInt(maxCreditCost);

    const isVerifiedAuthor = searchParams.get('isVerifiedAuthor');
    if (isVerifiedAuthor === 'true') filters.isVerifiedAuthor = true;

    const year = searchParams.get('year');
    if (year) filters.year = parseInt(year);
    
    const tags = searchParams.get('tags');
    if (tags) {
      // Parse comma-separated tags from URL
      filters.tags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    
    return filters;
  }, [searchParams]);

  // Load documents when filters change
  useEffect(() => {
    if (!documentsOverride) {
      const filters = getFiltersFromUrl();
      dispatch(setSearchParams(filters));
      dispatch(fetchDocuments(filters));
    }
  }, [dispatch, searchParams, documentsOverride, getFiltersFromUrl]);

  // Debounced search effect - triggers 500ms after user stops typing
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    
    // If searchInput differs from URL, debounce the update
    if (searchInput !== urlSearch) {
      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        handleFilterChange({ search: searchInput || undefined });
      }, 500);

      return () => {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }
      };
    }
  }, [searchInput]); // Only depend on searchInput

  // Handle immediate search on Enter key
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear debounce timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    // Trigger search immediately
    handleFilterChange({ search: searchInput || undefined });
    // Maintain focus
    searchInputRef.current?.focus();
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<DocumentSearchParams>) => {
    const currentFilters = getFiltersFromUrl();
    // Only reset to page 1 if we're changing filters other than page
    const shouldResetPage = !('page' in newFilters) && Object.keys(newFilters).length > 0;
    const updatedFilters = { 
      ...currentFilters, 
      ...newFilters,
      ...(shouldResetPage ? { page: 1 } : {})
    };
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Handle array values (like tags)
        if (Array.isArray(value)) {
          if (value.length > 0) {
            newSearchParams.set(key, value.join(','));
          }
        } else {
          newSearchParams.set(key, value.toString());
        }
      }
    });
    setUrlSearchParams(newSearchParams);
  };

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    handleFilterChange({ sortBy: newSortBy as any });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle document download
  const handleDocumentDownload = useCallback((documentId: string) => {
    // Refresh documents to update download count
    const filters = getFiltersFromUrl();
    dispatch(fetchDocuments(filters));
  }, [dispatch, getFiltersFromUrl]);

  // Handle author click
  const handleAuthorClick = (authorId: string) => {
    setSelectedAuthorId(authorId);
    setShowAuthorModal(true);
  };

  if (isLoading && displayDocuments.length === 0) {
    return <LoadingSpinner message="Đang tải tài liệu..." />;
  }

  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <i className="bi bi-exclamation-triangle me-2" />
        {error}
        <div className="mt-2">
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </Alert>
    );
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === pagination.currentPage ? 'primary' : 'outline-primary'}
          size="sm"
          className="me-1"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    return (

      <div className="d-flex justify-content-center align-items-center mt-4">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-2"
          disabled={!pagination.hasPrev}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
        >
          <i className="bi bi-chevron-left" />
        </Button>
        
        {pages}
        
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-2"
          disabled={!pagination.hasNext}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
        >
          <i className="bi bi-chevron-right" />
        </Button>
      </div>
    );
  };

  return (
    <Container fluid className="pt-0 pb-4 document-list-container">
      <div className="mb-4">
        <h2 className="mb-1">
        📚 Toàn bộ tài liệu
        </h2>
        <p className="text-muted">Tìm kiếm toàn bộ tài liệu trên ShareBuddy tại đây</p>
      </div>

      <div className="document-list">
        {/* Search Bar - Always Visible */}
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Form onSubmit={handleSearchSubmit}>
              <Row className="align-items-center g-2">
                <Col xs={12} md={10}>
                  <Form.Control
                    ref={searchInputRef}
                    type="text"
                    placeholder="🔍 Tìm kiếm tài liệu..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    size="lg"
                  />
                </Col>
                <Col xs={12} md={2} className="d-flex gap-2">
                  <Button
                    variant="outline-secondary"
                    className="flex-grow-1"
                    onClick={() => setShowFilterPanel(true)}
                  >
                    <FaFilter className="me-2" />
                    Bộ lọc
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>

        {/* Header with Results Count */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <div className="text-muted">
                  <strong></strong>{pagination.totalItems || displayDocuments.length} tài liệu
                </div>
                <div className="d-flex align-items-center gap-2">
                  {/* Sort Dropdown */}
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      <i className="bi bi-sort-down me-1" />
                      Sắp xếp
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => handleSortChange('newest')}>
                        Mới nhất
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleSortChange('oldest')}>
                        Cũ nhất
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleSortChange('popular')}>
                        Phổ biến nhất
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleSortChange('rating')}>
                        Đánh giá cao nhất
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleSortChange('downloads')}>
                        Tải nhiều nhất
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
        
                  {/* View Toggle */}
                  <div className="btn-group" role="group">
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <i className="bi bi-grid" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <i className="bi bi-list" />
                    </Button>
                  </div>
                </div>
              </div>
      

        {/* Filter Panel - Offcanvas from Right */}
        <Offcanvas
          show={showFilterPanel}
          onHide={() => setShowFilterPanel(false)}
          placement="end"
          style={{ width: '400px' }}
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>
              <FaFilter className="me-2" />
              Bộ lọc nâng cao
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <SearchFilters 
              onFilterChange={handleFilterChange}
              initialFilters={getFiltersFromUrl()}
            />
          </Offcanvas.Body>
        </Offcanvas>

        {/* Loading State */}
        {isLoading && displayDocuments.length > 0 && (
          <div className="text-center mb-3">
            <Spinner animation="border" size="sm" className="me-2" />
            Đang tải thêm tài liệu...
          </div>
        )}

        {/* Documents Grid/List */}
        {displayDocuments.length === 0 ? (
          <Card className="text-center py-5">
            <Card.Body>
              <i className="bi bi-files display-1 text-muted mb-3 d-block" />
              <h5 className="text-muted">Không tìm thấy tài liệu nào</h5>
              <p className="text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </Card.Body>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="document-grid">
                {displayDocuments.map((document) => (
                  <DocumentCard 
                    key={document.id}
                    document={document} 
                    compact={compact}
                    onDownload={handleDocumentDownload}
                    onAuthorClick={handleAuthorClick}
                  />
                ))}
              </div>
            ) : (
              <div className="document-list-view">
                {displayDocuments.map((document) => (
                  <div key={document.id} className="mb-3">
                    <DocumentCard 
                      document={document} 
                      compact
                      onDownload={handleDocumentDownload}
                      onAuthorClick={handleAuthorClick}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {renderPagination()}
          </>
        )}

        {/* Author Profile Modal */}
        <AuthorProfileModal
          show={showAuthorModal}
          onHide={() => setShowAuthorModal(false)}
          authorId={selectedAuthorId}
        />
      </div>
    </Container>
  );
};

export default DocumentList;