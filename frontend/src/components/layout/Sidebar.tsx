/**
 * Sidebar Component for ShareBuddy
 */

import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const location = useLocation();
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
            Trang chủ
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
            <hr className="my-2" />
            
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/profile"
                className={isActive('/profile') ? 'active' : ''}
              >
                <i className="bi bi-person me-2"></i>
                Hồ sơ cá nhân
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/upload"
                className={isActive('/upload') ? 'active' : ''}
              >
                <i className="bi bi-cloud-upload me-2"></i>
                Tải lên tài liệu
              </Nav.Link>
            </Nav.Item>

            {/* Admin Navigation */}
            {user?.role === 'admin' && (
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

            <hr className="my-2" />
            
            {/* Quick Stats */}
            <div className="px-3 py-2">
              <small className="text-muted d-block mb-1">Thống kê nhanh</small>
              <small className="d-block">
                <i className="bi bi-coin text-warning me-1"></i>
                Credits: {user?.credits || 0}
              </small>
            </div>
          </>
        )}

        {/* Categories */}
        <hr className="my-2" />
        <div className="px-3 py-2">
          <small className="text-muted d-block mb-2">Danh mục phổ biến</small>
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/documents?category=Toán học"
              className="py-1 small"
            >
              📐 Toán học
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/documents?category=Khoa học máy tính"
              className="py-1 small"
            >
              💻 Khoa học máy tính
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/documents?category=Vật lý"
              className="py-1 small"
            >
              ⚛️ Vật lý
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/documents?category=Hóa học"
              className="py-1 small"
            >
              🧪 Hóa học
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              as={Link}
              to="/documents?category=Ngôn ngữ"
              className="py-1 small"
            >
              🗣️ Ngôn ngữ
            </Nav.Link>
          </Nav.Item>
        </div>
      </Nav>
    </div>
  );
};

export default Sidebar;