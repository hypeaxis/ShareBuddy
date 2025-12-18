/**
 * Purchase Credits Page - Buy credit packages with Stripe
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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

const CheckoutForm: React.FC<{ selectedPackage: CreditPackage | null; onSuccess: () => void }> = ({ 
  selectedPackage, 
  onSuccess 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [currency] = useState('usd'); // Can be toggled between usd/vnd

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !selectedPackage) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await axios.post(
        '/api/payment/create-intent',
        {
          packageId: selectedPackage.package_id,
          currency
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { clientSecret } = response.data.data;

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <div className="mb-3">
        <label className="form-label">Card Details</label>
        <div className="border rounded p-3 bg-light">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        variant="primary" 
        className="w-100" 
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Processing...
          </>
        ) : (
          `Pay $${selectedPackage?.price_usd.toFixed(2)}`
        )}
      </Button>

      <small className="text-muted d-block mt-2 text-center">
        Secure payment powered by Stripe
      </small>
    </form>
  );
};

const PurchaseCreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchPackages();
  }, [isAuthenticated]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/payment/packages');
      
      setPackages(response.data.data.packages);
      
      // Initialize Stripe with publishable key
      if (!stripePromise && response.data.data.publishableKey) {
        stripePromise = loadStripe(response.data.data.publishableKey);
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load packages');
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setSelectedPackage(null);
    alert('Payment successful! Your credits have been added.');
    navigate('/profile');
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
        <Alert variant="danger">{error}</Alert>
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
      </div>

      {!showCheckout ? (
        <Row>
          {packages.map((pkg) => (
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

                  <div className="my-4">
                    <h3 className="text-dark">${pkg.price_usd.toFixed(2)}</h3>
                    <small className="text-muted">
                      ≈ {pkg.price_vnd.toLocaleString('vi-VN')} VND
                    </small>
                  </div>

                  <Button 
                    variant={pkg.is_popular ? 'primary' : 'outline-primary'}
                    className="w-100"
                    onClick={() => handleSelectPackage(pkg)}
                  >
                    Select Package
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Complete Payment</h5>
              </Card.Header>
              <Card.Body>
                {selectedPackage && (
                  <>
                    <div className="mb-4 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">
                            {selectedPackage.credits + selectedPackage.bonus_credits} Credits
                          </h6>
                          <small className="text-muted">
                            {selectedPackage.credits} base + {selectedPackage.bonus_credits} bonus
                          </small>
                        </div>
                        <div className="text-end">
                          <h5 className="mb-0">${selectedPackage.price_usd.toFixed(2)}</h5>
                          <small className="text-muted">
                            {selectedPackage.price_vnd.toLocaleString('vi-VN')} VND
                          </small>
                        </div>
                      </div>
                    </div>

                    {stripePromise && (
                      <Elements stripe={stripePromise}>
                        <CheckoutForm 
                          selectedPackage={selectedPackage}
                          onSuccess={handlePaymentSuccess}
                        />
                      </Elements>
                    )}

                    <Button
                      variant="link"
                      className="w-100 mt-3"
                      onClick={() => setShowCheckout(false)}
                    >
                      ← Back to packages
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default PurchaseCreditsPage;
