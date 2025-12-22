/**
 * Purchase Credits Page - Buy credit packages with Stripe
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, CardNumberElement, CardExpiryElement, CardCvcElement  } from '@stripe/react-stripe-js';
import apiClient from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { getCurrentUser } from '../store/slices/authSlice';

interface CreditPackage {
  package_id: string;
  credits: number;
  price_usd: number;
  price_vnd: number;
  bonus_credits: number;
  is_popular: boolean;
}

// Stripe promise (will be initialized with publishable key)
let stripePromise: Promise<any> | null = null;

// Helper to format currency
const formatCurrency = (value: number, currency: 'usd' | 'vnd') => {
  if (currency === 'usd') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value);
};

const StripeLogo: React.FC<{ height?: number; opacity?: number }> = ({ height = 20, opacity = 0.6 }) => (
  <svg height={height} viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" style={{ opacity }}>
    <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" fill="#6772e5"/>
  </svg>
);

const CreditSummary: React.FC<{ creditPackage: CreditPackage; currency: 'usd' | 'vnd' }> = ({ creditPackage, currency }) => {
  const price = currency === 'usd' ? creditPackage.price_usd : creditPackage.price_vnd;
  return (
    <div className="mb-4 p-3 rounded border">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-0">{creditPackage.credits + creditPackage.bonus_credits} Credits</h6>
          <small className="text-muted">{creditPackage.credits} base + {creditPackage.bonus_credits} bonus</small>
        </div>
        <div className="text-end">
          <h5 className="mb-0">{formatCurrency(price, currency)}</h5>
        </div>
      </div>
    </div>
  );
};

const CARD_OPTIONS = {
  style: {
    base: {
      color: "#495057", // Màu chữ khớp với Bootstrap
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#adb5bd"
      }
    },
    invalid: {
      color: "#dc3545",
      iconColor: "#dc3545"
    }
  }
};

// Helper component để bọc Stripe Element trông giống Bootstrap Input
const StripeInputWrapper: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <Form.Group className="mb-3">
    <Form.Label className="small text-muted mb-1 fw-bold text-uppercase" style={{ fontSize: '0.75rem' }}>{label}</Form.Label>
    <div className="form-control d-flex align-items-center" style={{ height: '45px', backgroundColor: '#fff' }}>
      <div className="w-100">
        {children}
      </div>
    </div>
  </Form.Group>
);

const CheckoutForm: React.FC<{ selectedPackage: CreditPackage | null; onSuccess: (paymentIntentId: string) => void; currency: 'usd' | 'vnd' }> = ({ 
  selectedPackage, 
  onSuccess,
  currency
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !selectedPackage) {
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) return; 

    setProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await apiClient.post(
        '/payment/create-intent',
        {
          packageId: selectedPackage.package_id,
          currency
        }
      );

      const { clientSecret } = response.data.data;

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardNumberElement }
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess(result.paymentIntent.id);
      } else {
        setError('Payment not completed. Please try again.');
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!selectedPackage) return null;

  const price =
    currency === 'usd'
      ? selectedPackage.price_usd
      : selectedPackage.price_vnd;

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <StripeInputWrapper label="Card Number">
        <CardNumberElement options={{...CARD_OPTIONS, showIcon: true}} />
      </StripeInputWrapper>

      <Row>
        <Col xs={6}>
          <StripeInputWrapper label="Expiration">
            <CardExpiryElement options={CARD_OPTIONS} />
          </StripeInputWrapper>
        </Col>
        <Col xs={6}>
          <StripeInputWrapper label="CVC / CWW">
            <CardCvcElement options={CARD_OPTIONS} />
          </StripeInputWrapper>
        </Col>
      </Row>

      <Button 
        type="submit"
        variant="primary"
        className="w-100"
        disabled={!stripe || processing || !selectedPackage}
      >
        {processing ? <Spinner animation="border" size="sm" className="me-2" /> : `Pay ${formatCurrency(price, currency)}`}
      </Button>

      <div className="text-center mt-3">
        <small className="text-muted d-block mb-2">Secure payment powered by</small>
        <StripeLogo/>
      </div>
    </form>
  );
};

const PurchaseCreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [currency, setCurrency] = useState<'usd' | 'vnd'>('usd');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    } else fetchPackages();
  }, [isAuthenticated]);

  const fetchPackages = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/payment/packages-with-config');
      const { packages: pkgs, publishableKey } = response.data.data;
      setPackages(pkgs || []);

      if (!stripePromise && publishableKey) stripePromise = loadStripe(publishableKey);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load packages';
      setError(`Không thể tải gói credits: ${errorMessage}. Vui lòng thử lại sau hoặc liên hệ quản trị viên.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Hiển thị loading nhẹ hoặc thông báo đang đồng bộ
      
      // GỌI API VERIFY NGAY LẬP TỨC
      // API này sẽ kích hoạt logic "Force Sync" ở backend nếu webhook chưa tới kịp
      await apiClient.get(`/payment/verify/${paymentIntentId}`);
      
      setShowCheckout(false);
      setSelectedPackage(null);
      
      // Sau khi verify xong, chắc chắn DB đã update, lúc này mới fetch user
      await dispatch(getCurrentUser());
      
      navigate('/profile', { 
        state: { 
          paymentSuccess: true,
          addedCredits: selectedPackage ? selectedPackage.credits + selectedPackage.bonus_credits : 0
        } 
      });
      
    } catch (err) {
      console.error('Verify failed but payment likely succeeded', err);
      // Vẫn navigate về profile vì tiền đã trừ, user có thể refresh sau
      navigate('/profile');
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading packages...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">
          <Alert.Heading>Lỗi tải trang</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <Button variant="outline-danger" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={fetchPackages}>
              Thử lại
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '1200px' }}>
      <div className="text-center mb-5">
        <h2>💳 Purchase Credits</h2>
        <p className="text-muted">
          Current Balance: <strong className="text-primary">{user?.credits || 0} credits</strong>
        </p>
        <Form.Select className="w-auto mx-auto mt-2" value={currency} onChange={(e) => setCurrency(e.target.value as 'usd' | 'vnd')}>
          <option value="usd">USD</option>
          <option value="vnd">VND</option>
        </Form.Select>
      </div>

      {!showCheckout ? (
        <Row>
          {packages.map((pkg) => {
            const price =
              currency === 'usd'
                ? pkg.price_usd
                : pkg.price_vnd;

            return (
            <Col md={6} lg={4} key={pkg.package_id} className="mb-4">
              <Card className={`h-100 ${pkg.is_popular ? 'border-primary' : ''}`}>
                {pkg.is_popular && (
                  <Badge bg="primary" className="position-absolute top-0 end-0 m-2">
                    Popular
                  </Badge>
                )}
                <Card.Body className="text-center">
                  <div className="display-4 text-primary mb-3">
                    {pkg.credits + pkg.bonus_credits}
                  </div>
                  <h5>Credits</h5>
                  
                  {pkg.bonus_credits > 0 && (
                    <Badge bg="success" className="mb-3">
                      +{pkg.bonus_credits} Bonus
                    </Badge>
                  )}

                  <p className="mt-3">
                      {formatCurrency(price, currency)}
                  </p>

                  <Button 
                    variant={pkg.is_popular ? 'primary' : 'outline-primary'}
                    className="w-100"
                    onClick={() => {
                        setSelectedPackage(pkg);
                        setShowCheckout(true);
                      }}
                  >
                    Select Package
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      ) : ( selectedPackage && stripePromise && (
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Complete Payment</h5>
              </Card.Header>
              <Card.Body>
                <CreditSummary creditPackage={selectedPackage} currency={currency} />
                <Elements stripe={stripePromise}>
                  <CheckoutForm selectedPackage={selectedPackage} onSuccess={handlePaymentSuccess} currency={currency} />
                </Elements>
                <Button variant="link" className="w-100 mt-3" onClick={() => setShowCheckout(false)}>← Back to packages</Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        )
      )}
    </Container>
  );
};

export default PurchaseCreditsPage;
