/**
 * Payment History Page - View transaction history
 * Uses apiClient for authenticated API calls
 */

import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Spinner, Alert, Card, Pagination } from 'react-bootstrap';
import apiClient from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  payment_id: string;                    
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  credits_purchased: number;            
  payment_status: 'pending' | 'succeeded' | 'failed' | 'refunded';              
  error_message?: string;
  created_at: string;
}

const PaymentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchHistory();
  }, [isAuthenticated, currentPage]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiClient.get('/payment/history', {
        params: { page: currentPage, limit: 10 }
      });

      if (response.data?.success && Array.isArray(response.data.data)) {
        setTransactions(response.data.data);
      } else {
        setTransactions([]);
      }
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.error || 'Không thể tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge bg="success">Succeeded</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'failed':
        return <Badge bg="danger">Failed</Badge>;
      case 'refunded':
        return <Badge bg="secondary">Refunded</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'usd') {
      return `$${amount.toFixed(2)}`;
    }
    return `${amount.toLocaleString('vi-VN')} VND`;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading history...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '1200px' }}>
      <div className="d-flex align-items-center mb-4">
        <span style={{ marginRight: 12 }}>
          <i className="bi bi-cash-stack" style={{ color: '#198754', fontSize: '2rem' }}></i>
        </span>
        <h2 className="mb-0 fw-bold" style={{ letterSpacing: 1 }}>
          Đơn hàng Credits của bạn
        </h2>
      </div>

      {transactions.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <p className="text-muted mb-0">Chưa có giao dịch nào</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Date</th>
                <th>Credits</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.payment_id}>
                  <td>{formatDate(tx.created_at)}</td>
                  <td className="text-primary fw-bold">+{tx.credits_purchased} credits</td>
                  <td>{formatAmount(tx.amount, tx.currency)}</td>
                  <td>{getStatusBadge(tx.payment_status)}</td>
                  <td>
                    <code className="small">{tx.payment_id?.slice(0, 8)}...</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.Prev 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                />
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item
                    key={i + 1}
                    active={i + 1 === currentPage}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                />
              </Pagination>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default PaymentHistoryPage;
