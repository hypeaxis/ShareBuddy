/**
 * Navbar Component for ShareBuddy
 */

import React from 'react';
import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const { user, isAuthenticated, logout } = useAuth();

  // Default avatar as data URL to prevent infinite requests
  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%236c757d"/%3E%3Ctext x="20" y="26" font-size="20" fill="white" text-anchor="middle" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow-sm">
      <Container fluid className="px-3 px-md-4">
        {/* Sidebar toggle button - only on desktop */}
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => dispatch(toggleSidebar())}
          className="me-2 me-md-3 d-none d-lg-block"
        >
          <i className="bi bi-list"></i>
        </Button>

        {/* Brand */}
        <BSNavbar.Brand as={Link} to="/" className="fw-bold text-gradient-purple">
          <span className="d-none d-sm-inline">📚 ShareBuddy</span>
          <span className="d-inline d-sm-none">📚 SB</span>
        </BSNavbar.Brand>

        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
            <Nav.Link as={Link} to="/documents">Tài liệu</Nav.Link>
          </Nav>

          <Nav className="align-items-lg-center">
            {/* Theme toggle */}
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => dispatch(toggleTheme())}
              className="me-2 mb-2 mb-lg-0"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>

            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/upload" className="mb-2 mb-lg-0">
                  Tải lên
                </Nav.Link>
                <Nav.Link as={Link} to="/profile" className="mb-2 mb-lg-0">
                  Hồ sơ
                </Nav.Link>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="d-flex align-items-center">
                    <img
                      src={user?.avatarUrl || DEFAULT_AVATAR}
                      alt="Avatar"
                      className="user-avatar me-2"
                      style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_AVATAR;
                      }}
                    />
                    <span className="me-2 text-light">
                      {user?.username}
                    </span>
                  </div>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="mb-2 mb-lg-0">
                  Đăng nhập
                </Nav.Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;