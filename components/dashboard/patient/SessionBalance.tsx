"use client"

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MoreVertical, Repeat, UserX, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionHistoryDialog } from './SessionHistoryDialog';
import { Modal } from 'antd';
import { useRouter } from 'next/navigation';

// Safe data validation functions
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeString = (value: any, defaultValue: string = ''): string => {
  return typeof value === 'string' ? value : defaultValue;
};

const safeArray = (value: any): any[] => {
  return Array.isArray(value) ? value : [];
};

const safeDate = (value: any): Date | null => {
  if (!value) return null;
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

interface SessionData {
  balance: {
    balanceAmount: number;
    history: Array<{
      _id: string;
      action: string;
      sessions: number;
      plan: string;
      reason: string;
      createdAt: string;
    }>;
  };
  patient: {
    _id: string;
    fullName: string;
    email: string;
  };
}

interface Subscription {
  _id: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date;
  plan: string;
  price: number;
  cancelAtPeriodEnd: boolean;
  productName?: string;
}

export default function SessionBalance() {
  const router = useRouter();
  const { data: session } = useSession();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [sessionsRes, subscriptionsRes] = await Promise.all([
          fetch('/api/patient/sessions'),
          fetch('/api/patient/subscriptions')
        ]);

        if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');
        if (!subscriptionsRes.ok) throw new Error('Failed to fetch subscriptions');

        const sessionsData = await sessionsRes.json();
        const subscriptionsData = await subscriptionsRes.json();

        // Safely validate session data
        const validatedSessionData: SessionData = {
          balance: {
            balanceAmount: safeNumber(sessionsData?.balance?.balanceAmount, 0),
            history: safeArray(sessionsData?.balance?.history).map(item => ({
              _id: safeString(item._id, ''),
              action: safeString(item.action, ''),
              sessions: safeNumber(item.sessions, 0),
              plan: safeString(item.plan, ''),
              reason: safeString(item.reason, ''),
              createdAt: safeString(item.createdAt, '')
            }))
          },
          patient: {
            _id: safeString(sessionsData?.patient?._id, ''),
            fullName: safeString(sessionsData?.patient?.fullName, ''),
            email: safeString(sessionsData?.patient?.email, '')
          }
        };

        setSessionData(validatedSessionData);
        
        // Safely validate subscriptions data
        const validatedSubscriptions = safeArray(subscriptionsData.subscriptions).map(sub => ({
          _id: safeString(sub._id, ''),
          stripeSubscriptionId: safeString(sub.stripeSubscriptionId, ''),
          status: safeString(sub.status, ''),
          currentPeriodEnd: safeDate(sub.currentPeriodEnd) || new Date(),
          plan: safeString(sub.plan, ''),
          price: safeNumber(sub.price, 0),
          cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
          productName: safeString(sub.productName, '')
        }));
        
        setAllSubscriptions(validatedSubscriptions);
        
        // Get the most recent active subscription
        const activeSub = validatedSubscriptions[0];
        if (activeSub) {
          setSubscription(activeSub);
        }
      } catch (error) {
        toast.error('Failed to load session data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  const handleRenewSubscription = async () => {
    if (!subscription?.stripeSubscriptionId) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/patient/subscriptions/${subscription.stripeSubscriptionId}/renew`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Subscription renewed successfully');
        setSubscription(prev => prev ? {
          ...prev,
          status: safeString(data.subscription?.status, prev.status),
          cancelAtPeriodEnd: Boolean(data.subscription?.cancelAtPeriodEnd),
          currentPeriodEnd: safeDate(data.subscription?.currentPeriodEnd) || prev.currentPeriodEnd
        } : null);
      } else {
        throw new Error(safeString(data.error, 'Failed to renew subscription'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error renewing subscription');
      console.error(error);
    } finally {
      setActionLoading(false);
      setShowOptionsMenu(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripeSubscriptionId) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/patient/subscriptions/${subscription.stripeSubscriptionId}/cancel`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Subscription will cancel at period end');
        setSubscription(prev => prev ? {
          ...prev,
          status: safeString(data.subscription?.status, prev.status),
          cancelAtPeriodEnd: Boolean(data.subscription?.cancelAtPeriodEnd)
        } : null);
      } else {
        throw new Error(safeString(data.error, 'Failed to cancel subscription'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error cancelling subscription');
      console.error(error);
    } finally {
      setActionLoading(false);
      setShowOptionsMenu(false);
    }
  };

  const handleRenewNow = async () => {
    if (!subscription?.stripeSubscriptionId) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/patient/subscriptions/${subscription.stripeSubscriptionId}/renew-now`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.checkoutUrl) {
          // Redirect to Stripe checkout for payment
          window.location.href = data.checkoutUrl;
        } else {
          toast.success(data.message || 'Subscription renewed successfully! Sessions credited immediately.');
          
          // Update subscription data
          setSubscription(prev => prev ? {
            ...prev,
            status: safeString(data.subscription?.status, prev.status),
            currentPeriodStart: safeDate(data.subscription?.currentPeriodStart) || prev.currentPeriodStart,
            currentPeriodEnd: safeDate(data.subscription?.currentPeriodEnd) || prev.currentPeriodEnd,
            cancelAtPeriodEnd: Boolean(data.subscription?.cancelAtPeriodEnd)
          } : null);
          
          // Refresh balance data
          const [sessionsRes, subscriptionsRes] = await Promise.all([
            fetch('/api/patient/sessions'),
            fetch('/api/patient/subscriptions')
          ]);
          
          if (sessionsRes.ok) {
            const sessionsData = await sessionsRes.json();
            setSessions(sessionsData.sessions || 0);
          }
          
          if (subscriptionsRes.ok) {
            const subscriptionsData = await subscriptionsRes.json();
            const validatedSubscriptions = subscriptionsData.subscriptions?.map((sub: any) => ({
              id: safeString(sub.id, ''),
              stripeSubscriptionId: safeString(sub.stripeSubscriptionId, ''),
              status: safeString(sub.status, ''),
              currentPeriodStart: safeDate(sub.currentPeriodStart),
              currentPeriodEnd: safeDate(sub.currentPeriodEnd),
              cancelAtPeriodEnd: safeBoolean(sub.cancelAtPeriodEnd, false),
              price: safeNumber(sub.price, 0),
              productName: safeString(sub.productName, '')
            }));
            
            setAllSubscriptions(validatedSubscriptions);
            const activeSub = validatedSubscriptions[0];
            if (activeSub) {
              setSubscription(activeSub);
            }
          }
        }
      } else {
        throw new Error(safeString(data.error, 'Failed to renew subscription'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error renewing subscription');
      console.error(error);
    } finally {
      setActionLoading(false);
      setShowOptionsMenu(false);
    }
  };

  const handleManualRenewNow = async () => {
    if (!subscription?.stripeSubscriptionId) return;
    
    try {
      // Get the checkout session ID from the URL or ask user to provide it
      const checkoutSessionId = prompt('Please enter your checkout session ID (from the payment confirmation email):');
      
      if (!checkoutSessionId) {
        toast.error('Checkout session ID is required');
        return;
      }

      setActionLoading(true);
      const response = await fetch('/api/patient/manual-renew-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checkoutSessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh the data
        window.location.reload();
      } else {
        throw new Error(safeString(data.error, 'Failed to process renew now payment'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error processing renew now payment');
      console.error(error);
    } finally {
      setActionLoading(false);
      setShowOptionsMenu(false);
    }
  };

  const confirmCancel = () => {
    Modal.confirm({
      title: 'Confirm Subscription Cancellation',
      content: 'Are you sure you want to cancel your subscription?',
      okText: 'Yes, Cancel',
      cancelText: 'No',
      onOk: handleCancelSubscription
    });
  };

  const isActive = !!subscription && ['active', 'past_due'].includes(subscription.status);
  const isCancelling = isActive && subscription.cancelAtPeriodEnd;

  if (loading) {
    return (
      <Card className="p-6 mt-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-100 rounded-lg"></div>
        </div>
      </Card>
    );
  }

  const sessionBalance = safeNumber(sessionData?.balance?.balanceAmount, 0);

  return (
    <>
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Your Session Balance</h3>
            {allSubscriptions.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {allSubscriptions.length} {allSubscriptions.length === 1 ? 'subscription' : 'subscriptions'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistoryDialog(true)}
            >
              View History
            </Button>
                        {allSubscriptions.length > 0 && (
              <div className="relative" ref={optionsMenuRef}>
                <button
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={actionLoading}
                >
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
                
                {showOptionsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => router.push('/dashboard/patient/settings?tab=subscriptions')}
                        className="w-full px-4 py-2 text-left text-sm flex items-center text-blue-600 hover:bg-blue-50"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Subscriptions
                      </button>
                      {isActive && !isCancelling && (
                        <>
                          <button
                            onClick={handleRenewNow}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 text-left text-sm flex items-center text-orange-600 hover:bg-orange-50"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Renew Now & Credit Sessions
                          </button>
                          <button
                            onClick={handleManualRenewNow}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 text-left text-sm flex items-center text-blue-600 hover:bg-blue-50"
                          >
                            <Repeat className="w-4 h-4 mr-2" />
                            Manual Renew Now (If Payment Failed)
                          </button>
                          <button
                            onClick={confirmCancel}
                            disabled={actionLoading}
                            className="w-full px-4 py-2 text-left text-sm flex items-center text-red-600 hover:bg-red-50"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Cancel Subscription
                          </button>
                        </>
                      )}
                      {isCancelling && (
                        <button
                          onClick={handleRenewSubscription}
                          disabled={actionLoading}
                          className="w-full px-4 py-2 text-left text-sm flex items-center text-green-600 hover:bg-green-50"
                        >
                          <Repeat className="w-4 h-4 mr-2" />
                          Renew Subscription
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="font-medium text-green-900">
                {isActive ? 'Monthly Subscription' : 'Session Package'}
              </p>
              <p className="text-sm text-green-700">
                {sessionBalance.toFixed(2)} AED remaining
              </p>
              {subscription?.currentPeriodEnd && (
                <p className="text-xs text-green-600 mt-1">
                  {isCancelling ? 'Ends on ' : 'Renews on '}
                  {subscription.currentPeriodEnd.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-900">{sessionBalance.toFixed(2)} AED</p>
            <p className="text-sm text-green-700">Amount left</p>
          </div>
        </div>
      </Card>

      <SessionHistoryDialog 
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        history={sessionData?.balance?.history || []}
      />
    </>
  );
}