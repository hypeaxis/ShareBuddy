import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

const VerifiedBadge: React.FC = () => {
  return (
    <FaCheckCircle
      className="verified-badge"
      color="rgb(29, 161, 242)"
      size={16}
      style={{ marginLeft: '4px' }}
    />
  );
};

export default VerifiedBadge;
