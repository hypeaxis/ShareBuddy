/**
 * Navbar Component for ShareBuddy
 */

import React from 'react';
import ShareBuddyLogo from '../common/ShareBuddyLogo';
import { Navbar as BSNavbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaCloudUploadAlt, FaCoins, FaUserPlus } from 'react-icons/fa';
import { BiLogIn } from 'react-icons/bi';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';
import NotificationDropdown from '../notifications/NotificationDropdown';
import VerifiedBadge from '../common/VerifiedBadge';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme, sidebarOpen } = useAppSelector((state) => state.ui);
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
        {/* Sidebar toggle button - hidden on lg+ screens, transforms to X when open */}
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => dispatch(toggleSidebar())}
          className="me-2 me-md-3 d-lg-none sidebar-toggle-btn"
        >
          <i className={`bi ${sidebarOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
        </Button>

        {/* Brand - centered when not authenticated on mobile */}
        <BSNavbar.Brand 
          as={Link} 
          to="/" 
          className={`fw-bold text-gradient-purple navbar-brand-responsive ${!isAuthenticated ? 'mx-auto mx-lg-0' : ''}`}
        >
            <span className="me-2" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
              {/* Reusable ShareBuddy SVG Logo */}
              <ShareBuddyLogo width={28} height={28} />
            </span>
            <span className="d-none d-sm-inline">ShareBuddy</span>
            <span className="d-inline d-sm-none">SB</span>
        </BSNavbar.Brand>

        {/* Mobile view - user controls */}
        {isAuthenticated ? (
          <div className="d-lg-none d-flex align-items-center gap-2">
            {/* Notification Dropdown - Mobile */}
            <NotificationDropdown />
            
            <NavDropdown
              title={
                <img
                  src={user?.avatarUrl || DEFAULT_AVATAR}
                  alt="Avatar"
                  className="user-avatar"
                  style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              }
              id="user-dropdown-mobile"
              align="end"
            >
              {user?.isVerifiedAuthor && <VerifiedBadge />}
            <NavDropdown.Item as={Link} to="/profile?tab=credits">
              <div className="d-flex align-items-center">
                <FaCoins className="me-2 text-warning" />
                <strong>{user?.credits || 0} Credits</strong>
              </div>
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item as={Link} to="/upload">
              <FaCloudUploadAlt className="me-2" />
              Tải lên
            </NavDropdown.Item>
            <NavDropdown.Item as={Link} to="/profile">
              <i className="bi bi-person me-2"></i>
              Tài khoản của tôi
            </NavDropdown.Item>
            <NavDropdown.Divider />
            <NavDropdown.Item onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-2"></i>
              Đăng xuất
            </NavDropdown.Item>
            </NavDropdown>
          </div>
        ) : (
          <div className="d-lg-none d-flex gap-2">
            <Button
              variant="outline-light"
              size="sm"
              title="Đăng nhập"
              onClick={() => navigate('/login')}
            >
              <BiLogIn size={20} />
            </Button>
            <Button
              variant="primary"
              size="sm"
              title="Đăng ký"
              onClick={() => navigate('/register')}
            >
              <FaUserPlus size={18} />
            </Button>
          </div>
        )}

        <BSNavbar.Toggle aria-controls="basic-navbar-nav" className="d-none" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-lg-center">
            {isAuthenticated ? (
              <>
                {/* Desktop view - show all items separately */}
                <Nav.Link as={Link} to="/upload" className="d-none d-lg-flex align-items-center me-2">
                  <FaCloudUploadAlt className="me-2" />
                  <span>Tải lên</span>
                </Nav.Link>
                
                <div 
                  className="d-none d-lg-flex align-items-center me-3 text-light" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/profile?tab=credits')}
                  role="button"
                >
                  <FaCoins className="me-2 text-warning" />
                  <span>{user?.credits || 0} Credits</span>
                </div>

                {/* Notification Dropdown - Desktop */}
                <div className="d-none d-lg-block me-2">
                  <NotificationDropdown />
                </div>

                <NavDropdown
                  title={
                    <div className="d-inline-flex align-items-center">
                      <img
                        src={user?.avatarUrl || DEFAULT_AVATAR}
                        alt="Avatar"
                        className="user-avatar"
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                      <span className="ms-2 text-light d-none d-lg-inline">
                        {user?.username}
                      </span>
                      {user?.isVerifiedAuthor && <VerifiedBadge />}
                    </div>
                  }
                  id="user-dropdown"
                  align="end"
                  className="d-none d-lg-block"
                >
                  <NavDropdown.Item as={Link} to="/profile">
                    <i className="bi bi-person me-2"></i>
                    Tài khoản của tôi
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Đăng xuất
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                {/* Desktop view only - full text buttons */}
                <Nav.Link as={Link} to="/login" className="mb-2 mb-lg-0">
                  Đăng nhập
                </Nav.Link>
                <Link
                  to="/register"
                  className="btn btn-gradient-purple btn-sm fw-bold px-3 py-1 d-flex align-items-center gap-2 shadow-sm"
                  style={{
                  borderRadius: '20px',
                  fontSize: '1rem',
                  letterSpacing: '0.5px',
                  transition: 'transform 0.1s',
                  }}
                  onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.96)')}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <FaUserPlus size={18} />
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
