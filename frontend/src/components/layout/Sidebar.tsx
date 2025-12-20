/**
 * Sidebar Component for ShareBuddy
 */

import React, { useEffect } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';
import { toggleSidebar } from '../../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { isAuthenticated, user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <Nav className="flex-column p-3">
        {/* Public Navigation */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/"
            className={isActive('/') ? 'active' : ''}
          >
            <i className="bi bi-house me-2"></i>
            My Feed
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/documents"
            className={isActive('/documents') ? 'active' : ''}
          >
            <i className="bi bi-file-text me-2"></i>
            Tài liệu
          </Nav.Link>
        </Nav.Item>

        {/* Authenticated Navigation */}
        {isAuthenticated && (
          <>
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/bookmarked"
                className={isActive('/bookmarked') ? 'active' : ''}
              >
                <i className="bi bi-bookmark-fill me-2"></i>
                Đã lưu
              </Nav.Link>
            </Nav.Item>

            {!user?.isVerifiedAuthor && (
              <Nav.Item>
                <Nav.Link
                  as={Link}
                  to="/verified-author-progress"
                  className={isActive('/verified-author-progress') ? 'active' : ''}
                >
                  <i className="bi bi-award me-2"></i>
                  Verified Author
                </Nav.Link>
              </Nav.Item>
            )}
          </>
        )}

        {/* Admin Navigation */}
        {isAuthenticated && user?.role === 'admin' && (
          <>
            <hr className="my-2" />
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/admin"
                className={isActive('/admin') ? 'active' : ''}
              >
                <i className="bi bi-gear me-2"></i>
                Quản trị
              </Nav.Link>
            </Nav.Item>
          </>
        )}

        {/* Purchase Credits - Prominent CTA at bottom */}
        {isAuthenticated && (
          <div className="mt-auto pt-3">
            <hr className="my-2" />
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/payment-history"
                className={isActive('/payment-history') ? 'active' : ''}
              >
                <i className="bi bi-receipt me-2"></i>
                Đơn hàng của tôi
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/purchase-credits"
                className={`purchase-credits-link ${isActive('/purchase-credits') ? 'active' : ''}`}
              >
                <div className="d-flex align-items-left justify-content-left py-1 px-1">
                  <i className="bi bi-coin fs-6 me-2" style={{ color: '#271504ff' }}></i>
                  <span className="fw-bold" style={{ fontSize: '0.9rem' }}>Mua Credits</span>
                </div>
              </Nav.Link>
            </Nav.Item>
          </div>
        )}
      </Nav>
    </div>
  );
};

export default Sidebar;