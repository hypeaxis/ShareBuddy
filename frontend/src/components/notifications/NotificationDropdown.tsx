/**
 * NotificationDropdown Component
 * Displays user notifications in a dropdown with unread count badge
 */

import React, { useState, useEffect } from 'react';
import { Dropdown, Badge, ListGroup, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import apiClient from '../../services/api';
import '../../styles/NotificationDropdown.css';

interface Notification {
  notification_id: string;
  type: string;
  title: string;
  content: string;
  related_document_id: string | null;
  related_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

const NotificationDropdown: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Fetch notifications when dropdown opens
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/notifications', {
        params: { limit: 10 }
      });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.notification_id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Fetch unread count on mount and every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  const handleToggle = (isOpen: boolean) => {
    setShowDropdown(isOpen);
    if (isOpen) {
      fetchNotifications();
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_approved':
        return '✅';
      case 'document_rejected':
        return '❌';
      case 'new_comment':
        return '💬';
      case 'new_qa_answer':
        return '💡';
      case 'answer_accepted':
        return '⭐';
      case 'new_follower':
        return '👥';
      case 'payment_successful':
        return '💰';
      case 'verified_author_approved':
        return '🎖️';
      default:
        return '🔔';
    }
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Get link for notification
  const getNotificationLink = (notification: Notification) => {
    if (notification.related_document_id) {
      return `/documents/${notification.related_document_id}`;
    }
    if (notification.related_user_id) {
      return `/profile/${notification.related_user_id}`;
    }
    return '#';
  };

  return (
    <Dropdown show={showDropdown} onToggle={handleToggle} align="end" className="notification-dropdown">
      <Dropdown.Toggle 
        variant="link" 
        id="notification-dropdown"
        className="position-relative text-light p-2"
        style={{ textDecoration: 'none' }}
      >
        <i className="bi bi-bell fs-5"></i>
        {unreadCount > 0 && (
          <Badge 
            bg="danger" 
            pill 
            className="position-absolute top-0 start-100 translate-middle"
            style={{ fontSize: '0.7rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-menu shadow" style={{ minWidth: '350px', maxWidth: '400px' }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0">Thông báo</h6>
          {unreadCount > 0 && (
            <button 
              className="btn btn-sm btn-link text-primary p-0"
              onClick={markAllAsRead}
              style={{ fontSize: '0.85rem' }}
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-bell-slash fs-1"></i>
            <p className="mb-0 mt-2">Chưa có thông báo nào</p>
          </div>
        ) : (
          <>
            <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.map((notification) => (
                <ListGroup.Item 
                  key={notification.notification_id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  action
                  as={Link}
                  to={getNotificationLink(notification)}
                  onClick={() => !notification.is_read && markAsRead(notification.notification_id)}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="d-flex gap-2">
                    <div className="notification-icon" style={{ fontSize: '1.5rem' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <strong className="notification-title" style={{ fontSize: '0.9rem' }}>
                          {notification.title}
                        </strong>
                        {!notification.is_read && (
                          <Badge bg="primary" pill style={{ fontSize: '0.6rem' }}>NEW</Badge>
                        )}
                      </div>
                      <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                        {notification.content}
                      </p>
                      <small className="text-muted">
                        <i className="bi bi-clock me-1"></i>
                        {timeAgo(notification.created_at)}
                      </small>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <div className="text-center border-top py-2">
              <Link 
                to="/notifications" 
                className="btn btn-sm btn-link text-decoration-none"
                onClick={() => setShowDropdown(false)}
              >
                Xem tất cả thông báo
              </Link>
            </div>
          </>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationDropdown;
