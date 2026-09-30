/**
 * SearchFilters Component - Bộ lọc tìm kiếm nâng cao
 * Features: subject, rating, credit cost filters, and interactive Tag input
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Row, Col, Form, Button, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { DocumentSearchParams } from '../../types';
import debounce from 'lodash/debounce';

interface SearchFiltersProps {
  onFilterChange: (filters: Partial<DocumentSearchParams>) => void;
  initialFilters?: DocumentSearchParams;
  compact?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  initialFilters = {},
  compact = false
}) => {
  // Main Filter State
  const [filters, setFilters] = useState<DocumentSearchParams>(initialFilters);
  const [localSubject, setLocalSubject] = useState(initialFilters.subject || '');

  // Tag Input Specific State
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isTagLoading, setIsTagLoading] = useState(false);
  const tagWrapperRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // 1. General Filter Logic (Debounce & Handlers)
  // --------------------------------------------------------------------------

  const debouncedFilterChange = useMemo(
    () =>
      debounce((key: keyof DocumentSearchParams, value: any) => {
        setFilters((prevFilters) => {
          const newFilters = { ...prevFilters, [key]: value };
          onFilterChange({ [key]: value });
          return newFilters;
        });
      }, 500),
    [onFilterChange]
  );

  const handleFilterChange = (key: keyof DocumentSearchParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(prev => ({ ...prev, [key]: value }));
    onFilterChange({ [key]: value });
  };

  const handleTextInputChange = (key: keyof DocumentSearchParams, value: string) => {
    if (key === 'subject') setLocalSubject(value);
    debouncedFilterChange(key, value || undefined);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: filters.search,
      page: 1,
      limit: filters.limit
    };
    setFilters(clearedFilters);
    setLocalSubject('');
    setTagInput('');
    onFilterChange({
      subject: undefined,
      minRating: undefined,
      maxCreditCost: undefined,
      isVerifiedAuthor: undefined,
      year: undefined,
      tags: undefined,
      page: 1
    });
  };

  const hasActiveFilters = () => {
    return !!(filters.subject || filters.minRating || filters.maxCreditCost || filters.isVerifiedAuthor || filters.year || (filters.tags && filters.tags.length > 0));
  };

  // --------------------------------------------------------------------------
  // 2. Tag Input Logic (Suggestions, Comma, Enter)
  // --------------------------------------------------------------------------

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagWrapperRef.current && !tagWrapperRef.current.contains(event.target as Node)) {
        setShowTagSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced API call for suggestions
  const fetchTagSuggestions = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query.trim()) {
          setTagSuggestions([]);
          return;
        }
        try {
          setIsTagLoading(true);
          // Assuming your backend route is /api/documents/suggest-tags?q=...
          const response = await fetch(`/api/documents/suggest-tags?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setTagSuggestions(data.data);
            setShowTagSuggestions(true);
          }
        } catch (error) {
          console.error("Failed to fetch tags", error);
        } finally {
          setIsTagLoading(false);
        }
      }, 300),
    []
  );

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Check for comma
    if (val.endsWith(',')) {
      const newTag = val.slice(0, -1).trim();
      addTag(newTag);
    } else {
      setTagInput(val);
      fetchTagSuggestions(val);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && filters.tags && filters.tags.length > 0) {
      // Remove last tag on backspace if input is empty
      const newTags = [...filters.tags];
      newTags.pop();
      handleFilterChange('tags', newTags.length ? newTags : undefined);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    const currentTags = filters.tags || [];
    // Prevent duplicates
    if (!currentTags.includes(trimmed)) {
      const newTags = [...currentTags, trimmed];
      handleFilterChange('tags', newTags);
    }
    setTagInput('');
    setTagSuggestions([]);
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = (filters.tags || []).filter(t => t !== tagToRemove);
    handleFilterChange('tags', newTags.length ? newTags : undefined);
  };

  const handleSuggestionClick = (tag: string) => {
    addTag(tag);
    // Keep focus on input
    const inputEl = document.getElementById('tag-input-field');
    if (inputEl) inputEl.focus();
  };

  // --------------------------------------------------------------------------
  // 3. Render
  // --------------------------------------------------------------------------

  return (
    <div className="search-filters">
      <Row className="g-3">
        {/* Subject Filter */}
        <Col xs={12}>
          <Form.Label>Môn học</Form.Label>
          <Form.Control
            type="text"
            placeholder="Nhập môn học..."
            value={localSubject}
            onChange={(e) => handleTextInputChange('subject', e.target.value)}
          />
        </Col>

        {/* Star Rating Filter */}
        <Col xs={12}>
          <Form.Label>Đánh giá tối thiểu</Form.Label>
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex gap-1" style={{ fontSize: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  onClick={() => handleFilterChange('minRating', filters.minRating === star ? undefined : star)}
                  style={{ cursor: 'pointer' }}
                  title={`${star} sao`}
                >
                  {filters.minRating && star <= filters.minRating ? (
                    <FaStar className="text-warning" />
                  ) : (
                    <FaRegStar className="text-muted" />
                  )}
                </div>
              ))}
            </div>
            {filters.minRating && (
              <Button
                variant="link"
                size="sm"
                className="p-0 text-muted"
                style={{ fontSize: '0.875rem' }}
                onClick={() => handleFilterChange('minRating', undefined)}
              >
                Xóa
              </Button>
            )}
          </div>
        </Col>

        {/* Credit Cost Filter */}
        <Col xs={12}>
          <Form.Label>Chi phí tải xuống</Form.Label>
          <Form.Control
            type="number"
            min="0"
            placeholder="Nhập số credits tối đa..."
            value={filters.maxCreditCost || ''}
            onChange={(e) => handleFilterChange('maxCreditCost', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </Col>

        {/* Verified Author Checkbox */}
        <Col xs={12}>
          <Form.Check
            type="checkbox"
            label="Từ Verified Author"
            checked={filters.isVerifiedAuthor || false}
            onChange={(e) =>
              handleFilterChange('isVerifiedAuthor', e.target.checked ? true : undefined)
            }
          />
        </Col>

        {/* Upload Year Filter */}
        <Col xs={12}>
          <Form.Label>Thời gian đăng tải</Form.Label>
          <Form.Select
            value={filters.year || ''}
            onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">Tất cả</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
            <option value="2018">2018</option>
          </Form.Select>
        </Col>

          {/* Tag Filter - INTERACTIVE */}
          <Col md={12} className="mb-3">
            <Form.Label>Tags</Form.Label>
            <div className="position-relative" ref={tagWrapperRef}>
              {/* Fake Input Container */}
              <div 
                className="form-control d-flex flex-wrap align-items-center gap-1"
                style={{ minHeight: '38px', padding: '0.375rem 0.75rem' }}
                onClick={() => document.getElementById('tag-input-field')?.focus()}
              >
                {/* Render Selected Tags */}
                {filters.tags?.map((tag, index) => (
                  <Badge key={index} bg="secondary" className="d-flex align-items-center p-1 px-2">
                    {tag}
                    <span 
                      role="button"
                      className="ms-2 text-white"
                      style={{ cursor: 'pointer', fontWeight: 'bold' }}
                      onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                    >
                      &times;
                    </span>
                  </Badge>
                ))}

                {/* Actual Input */}
                <Form.Control
                  id="tag-input-field"
                  type="text"
                  className="border-0 p-0 shadow-none bg-transparent"
                  style={{ width: 'auto', flexGrow: 1, minWidth: '150px' }}
                  placeholder={!filters.tags?.length ? "Nhập tags... (VD: JAVA, gõ dấu phẩy để thêm)" : ""}
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  autoComplete="off"
                />

                {isTagLoading && <Spinner animation="border" size="sm" variant="secondary" />}
              </div>

              {/* Suggestions Dropdown */}
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <ListGroup 
                  className="position-absolute w-100 shadow-sm" 
                  style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto', top: '100%' }}
                >
                  {tagSuggestions.map((tag, idx) => (
                    <ListGroup.Item 
                      key={idx} 
                      action 
                      onClick={() => handleSuggestionClick(tag)}
                    >
                      {tag}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
            <Form.Text className="text-muted">
              Gõ ký tự để xem gợi ý, nhấn Enter hoặc dấu phẩy (,) để thêm tag.
            </Form.Text>
          </Col>
        </Row>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Row className="mt-3">
          <Col>
            <div className="d-flex flex-wrap align-items-center">
              <small className="text-muted me-2">Bộ lọc đang áp dụng:</small>
              
              {filters.subject && (
                <Badge bg="info" className="me-1 mb-1">
                  Môn học: {filters.subject}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('subject', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.minRating && (
                <Badge bg="warning" className="me-1 mb-1">
                  Min {filters.minRating}⭐
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-dark"
                    onClick={() => handleFilterChange('minRating', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.maxCreditCost && (
                <Badge bg="success" className="me-1 mb-1">
                  Max {filters.maxCreditCost} credits
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('maxCreditCost', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.isVerifiedAuthor && (
                <Badge bg="primary" className="me-1 mb-1">
                  Verified Author
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('isVerifiedAuthor', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.year && (
                <Badge bg="dark" className="me-1 mb-1">
                  Năm {filters.year}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('year', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.tags?.map((tag, index) => (
                <Badge key={index} bg="secondary" className="me-1 mb-1">
                  Tag: {tag}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => removeTag(tag)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              ))}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default SearchFilters;