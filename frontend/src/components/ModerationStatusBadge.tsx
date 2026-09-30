/**
 * Moderation Status Badge Component
 * Displays the moderation status of a document with appropriate styling
 */

import React from 'react';
import { Badge } from 'react-bootstrap';
import { FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface ModerationStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
  moderationScore?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ModerationStatusBadge: React.FC<ModerationStatusBadgeProps> = ({ 
  status, 
  moderationScore,
  showScore = false,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          variant: 'warning',
          icon: <FaClock className="me-1" />,
          text: 'Đang kiểm duyệt',
          tooltip: 'Tài liệu đang được hệ thống AI kiểm duyệt'
        };
      case 'approved':
        return {
          variant: 'success',
          icon: <FaCheckCircle className="me-1" />,
          text: 'Đã duyệt',
          tooltip: moderationScore ? `Điểm kiểm duyệt: ${(moderationScore * 100).toFixed(0)}%` : 'Tài liệu đã được phê duyệt'
        };
      case 'rejected':
        return {
          variant: 'danger',
          icon: <FaTimesCircle className="me-1" />,
          text: 'Bị từ chối',
          tooltip: moderationScore ? `Điểm kiểm duyệt: ${(moderationScore * 100).toFixed(0)}%` : 'Tài liệu không đáp ứng tiêu chuẩn'
        };
      default:
        return {
          variant: 'secondary',
          icon: null,
          text: 'Không xác định',
          tooltip: ''
        };
    }
  };

  const config = getStatusConfig();
  const fontSize = size === 'sm' ? '0.75rem' : size === 'lg' ? '1rem' : '0.875rem';

  return (
    <Badge 
      bg={config.variant} 
      title={config.tooltip}
      style={{ fontSize }}
      className="d-inline-flex align-items-center"
    >
      {config.icon}
      {config.text}
      {showScore && moderationScore !== undefined && (
        <span className="ms-1">({(moderationScore * 100).toFixed(0)}%)</span>
      )}
    </Badge>
  );
};

export default ModerationStatusBadge;
