/**
 * BookmarkedDocuments Page - Display all documents bookmarked by user
 * Features: Search, filters, sorting, grid/list view from DocumentList
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Container, Row, Col, Card, Dropdown, Button, Spinner, Alert, Form, Offcanvas } from 'react-bootstrap';
import { FaFilter, FaBookmark } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBookmarkedDocuments } from '../store/slices/documentSlice';
import { DocumentSearchParams } from '../types';
import DocumentCard from '../components/documents/DocumentCard';
import SearchFilters from '../components/documents/SearchFilters';
import AuthorProfileModal from '../components/documents/AuthorProfileModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/BookmarkedDocumentsPage.css';

const BookmarkedDocumentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setUrlSearchParams] = useSearchParams();
  const { 
    bookmarkedDocuments, 
    isLoading, 
    error,
    pagination
  } = useAppSelector(state => state.documents);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Get filters from URL
  const getFiltersFromUrl = useCallback((): DocumentSearchParams => {
    const filters: DocumentSearchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: 12,
      sortBy: (searchParams.get('sortBy') as any) || 'newest',
    };

    const search = searchParams.get('search');
    if (search) filters.search = search;

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
    if (tags) filters.tags = tags.split(',');

    return filters;
  }, [searchParams]);

  // Load bookmarked documents when URL params change
  useEffect(() => {
    const filters = getFiltersFromUrl();
    dispatch(fetchBookmarkedDocuments(filters));
  }, [dispatch, getFiltersFromUrl]);
  
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

        // Handle boolean values
        if (key === 'isVerifiedAuthor') {
          if (value === true) newSearchParams.set(key, 'true');
          return;
        }
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

  // Handle page change
  const handlePageChange = (page: number) => {
    handleFilterChange({ page });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle document download
  const handleDocumentDownload = useCallback((documentId: string) => {
      // Refresh documents to update download count
    const filters = getFiltersFromUrl();
    dispatch(fetchBookmarkedDocuments(filters));
  }, [dispatch, getFiltersFromUrl]);

  // Handle author click
  const handleAuthorClick = (authorId: string) => {
    setSelectedAuthorId(authorId);
    setShowAuthorModal(true);
  };

  // Handle document unbookmark
  const handleDocumentUnbookmark = () => {
    const filters = getFiltersFromUrl();
    dispatch(fetchBookmarkedDocuments(filters));
  };

  if (isLoading && bookmarkedDocuments.length === 0) {
    return <LoadingSpinner message="Đang tải tài liệu đã lưu..." />;
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <i className="bi bi-exclamation-triangle me-2" />
          {error}
          <div className="mt-2">
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          </div>
        </Alert>
      </Container>
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
    <div className="bookmarked-documents-page">
      {/* Background Image */}
      <div className="bookmarked-bg-container">
        <div className="bookmarked-bg-overlay"></div>
        <img 
          src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=3028&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
          alt="Library with books"
          className="bg-image"
        />
      </div>

      {/* Content */}
      <div className="bookmarked-documents-page-content">
        <Container fluid className="py-4" style={{ paddingTop: '80px' }}>
      {/* Page Header */}
      <div className="mb-4">
        <h2 className="mb-1">
          <FaBookmark className="me-2 text-warning" />
          Tài liệu đã lưu
        </h2>
        <p className="text-muted">Quản lý các tài liệu bạn đã bookmark</p>
      </div>

      {/* Search Bar */}
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
                  className="w-100"
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
                       <strong>{pagination.totalItems}</strong> tài liệu đã lưu
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

      {/* Filter Panel */}
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
      {isLoading && bookmarkedDocuments.length > 0 && (
        <div className="text-center mb-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Đang tải thêm tài liệu...
        </div>
      )}

      {/* Documents Grid/List */}
      {bookmarkedDocuments.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <FaBookmark className="display-1 text-muted mb-3" />
            <h5 className="text-muted">Chưa có tài liệu nào được lưu</h5>
            <p className="text-muted">Bookmark các tài liệu bạn quan tâm để dễ dàng tìm lại sau này</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="document-grid">
              {bookmarkedDocuments.map((document) => (
                <DocumentCard 
                  key={document.id}
                  document={document}
                  onDownload={handleDocumentDownload}
                  onAuthorClick={handleAuthorClick}
                  onBookmark={handleDocumentUnbookmark}
                />
              ))}
            </div>
          ) : (
            <div className="document-list-view">
              {bookmarkedDocuments.map((document) => (
                <div key={document.id} className="mb-3">
                  <DocumentCard 
                    document={document}
                    compact
                    onDownload={handleDocumentDownload}
                    onAuthorClick={handleAuthorClick}
                    onBookmark={handleDocumentUnbookmark}
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
        </Container>
      </div>
    </div>
  );
};

export default BookmarkedDocumentsPage;
