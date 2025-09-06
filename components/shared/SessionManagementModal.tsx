import React, { useState, useEffect } from 'react';
import { format, formatDate } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Check, X, Wallet, Banknote, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useMediaQuery } from '@/hooks/use-media-query';
import TextArea from 'antd/es/input/TextArea';
import { LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Divider, Empty, List, Modal, Spin, Tag, Timeline, Tooltip } from 'antd';
import { IAppointment } from '@/lib/db/models/Appointment';

export interface AppointmentSession {
  _id: string;
  appointmentId: string;
  date: string;
  price: number;
  status: 'in_progress' | 'completed';
  paymentStatus: 'not_paid' | 'paid';
  index: number;
  patientName: string;
  patientId?: string;
  appointmentType?: string;
  therapistLevel?: number;
  isMain: boolean;
}

interface SessionManagementModalProps {
  id: string;
  mainDate: string;
  sessions: AppointmentSession[];
  appointmentPrice: number;
  therapistId?: string;
  show: boolean;
  onClose: () => void;
  selectedSessions: AppointmentSession[];
  setSelectedSessions: (sessions: AppointmentSession[]) => void;
  isAdmin?: boolean;
  isTherapist?: boolean;
  onSessionStatusChange?: (sessionId: string, status: 'in_progress' | 'completed') => void;
  onSessionDateChange?: (sessionId: string, date: string) => void;
  onPaymentComplete?: () => void;
  onRefresh: ()=> Promise<void>;
  patientName: string;
  appointmentType?: string;
  therapistLevel?: number;
  patientId: string;
}

export const SessionManagementModal: React.FC<SessionManagementModalProps> = ({
  id,
  mainDate,
  sessions,
  appointmentPrice,
  therapistId,
  show,
  onClose,
  selectedSessions,
  setSelectedSessions,
  isAdmin = false,
  isTherapist = false,
  onSessionStatusChange,
  onSessionDateChange,
  onPaymentComplete,
  patientName,
  appointmentType,
  onRefresh,
  therapistLevel,
  patientId
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [wallet, setWallet] = useState('');
  const [network, setNetwork] = useState('BSC');
  const [payoutPercentage, setPayoutPercentage] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(3.67);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [manualRate, setManualRate] = useState<string>('3.67');
  const [usingManualRate, setUsingManualRate] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'usdc' | 'manual'>('usdt');
  const [manualNote, setManualNote] = useState('');
  const [customPrice, setCustomPrice] = useState<{[key: string]: number}>({});
  // state for verified appointments between therapist and patient
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  const [verifiedAppointments, setVerifiedAppointments] = useState<IAppointment[]>([]);
  const [AllUnverifiedAppointments, setAllUnverifiedAppointments] = useState<IAppointment[]>([]);
  const [allCountAppointments, setAllCountAppointments] = useState<number>(0);
  const [isSessionCompletedLoading, setIsSessionCompletedLoading] = useState(false);
  const [showVerifiedSessions, setShowVerifiedSessions] = useState(false);
  const [showAllUnverifiedSessions, setShowAllUnverifiedSessions] = useState(false);


  const countCompletedSessions = async() => {
    setIsSessionCompletedLoading(true);
    const response = await fetch(`/api/admin/payments/payout-percent?patientId=${patientId}&therapistId=${therapistId}`);
    if (!response.ok) {
      setIsSessionCompletedLoading(false);
      console.error('Failed to fetch completed sessions:', response.statusText);
      return 0;
    }
    const data = await response.json();
    setIsSessionCompletedLoading(false);
    setAllUnverifiedAppointments(data.AllUnverifiedSessions || []);
    setVerifiedAppointments(data.allVerifiedSessions || []);
    setAllCountAppointments(data.countAll || []);
    return data.count || 0;
  };
  // Create current session object with all required data
  const currentSession: AppointmentSession = {
  _id: `${id}-main`, // Use '-main' suffix for main session
  appointmentId: id,
  date: mainDate,
  price: sessions.length === 1 ? appointmentPrice : sessions[0].price,
  status: 'completed',
  paymentStatus: 'not_paid',
  index: 1000, // Special index for main session
  patientName,
  appointmentType,
  isMain: true // Add isMain flag
};

  const correctedSessionsWithIndex = () => {
  return sessions.map((s, idx) => {
    // For existing sessions, keep their original IDs if they have them
    const sessionId = s._id ? s._id : `${s.appointmentId}-${s.index ?? idx}`;
    
    return {
      ...s,
      _id: sessionId,
      index: s.index ?? idx,
      price: customPrice[sessionId] ?? s.price,
      patientName: s.patientName || patientName,
      appointmentType: s.appointmentType || appointmentType
    }
  });
};

  // Combine all sessions with current session at the end
  const allSessions = sessions.length === 1 ? [currentSession] : [...correctedSessionsWithIndex(), {
    ...currentSession,
    price: customPrice[currentSession._id] ?? currentSession.price
  }];
  
  const allNonCurrentSessionsPaid = sessions.every(
    session => session.paymentStatus === 'paid'
  );

  const isCurrentSessionDisabled = !allNonCurrentSessionsPaid && sessions.length > 1;

  useEffect(() => {
  if (show) {
    fetchExchangeRate();
    countCompletedSessions().then(count => {
      setSessionsCompleted(count);
    });
    if (therapistId) {
      fetch(`/api/therapist/payment-details?therapistId=${therapistId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.cryptoWallet) {
            setWallet(data.cryptoWallet.address.trim());
            setPaymentMethod(data.cryptoWallet.currency === 'USDC' ? 'usdc' : 'usdt');
            setNetwork(data.cryptoWallet.network || "BSC")
          }
        });
    }

    const therapistLevel = sessions[0]?.therapistLevel || 1;
    setPayoutPercentage(therapistLevel === 2 ? 57 : 50);
  }
}, [show, therapistId, sessions]);

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    setUsingManualRate(false);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch exchange rate');
      const data = await response.json();
      if (data.result === 'success' && data.rates?.AED) {
        const rate = data.rates.AED;
        setExchangeRate(rate);
        setManualRate(rate.toFixed(4));
        toast.success('Exchange rate updated');
      }
    } catch (error: unknown) {
      console.error('Error fetching exchange rate:', error);
      toast.error('Failed to load exchange rate. Using default rate (3.75 AED/USDT).');
      setExchangeRate(3.75);
      setManualRate('3.75');
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleManualRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setManualRate(value);
    if (value && !isNaN(Number(value))) {
      setExchangeRate(Number(value));
      setUsingManualRate(true);
    }
  };

  const applyManualRate = () => {
    if (manualRate && !isNaN(Number(manualRate))) {
      setExchangeRate(Number(manualRate));
      setUsingManualRate(true);
      toast.success('Manual exchange rate applied');
    } else {
      toast.error('Please enter a valid exchange rate');
    }
  };

  const resetToAutoRate = () => {
    fetchExchangeRate();
    toast.success('Using live exchange rate');
  };

  const handleVerifyPayment = async (appointmentId: string) => {

  }

  const isSessionSelected = (session: AppointmentSession) =>
    selectedSessions.some(s => s._id === session._id);

  const handleSelectSession = (session: AppointmentSession) => {
    // Disable selection for paid sessions
    if (session.paymentStatus === 'paid') {
      toast.error('This session is already paid');
      return;
    }
    
    // Check if session is completed
    if (session.status !== 'completed') {
      toast.error('Only completed sessions can be selected for payment');
      return;
    }
    
    // Disable current session if other sessions are unpaid
    if (session.index === 1000 && isCurrentSessionDisabled) {
      const unpaidSessions = sessions.filter((s: AppointmentSession) => 
        s.paymentStatus !== 'paid' && s.index !== 1000 && s.status === 'completed'
      );
      
      if (unpaidSessions.length > 0) {
        toast.error(`Please pay ${unpaidSessions.length} unpaid completed session(s) first`);
        return;
      }
    }

    setSelectedSessions((prev: AppointmentSession[]) => 
      prev.some((s: AppointmentSession) => s._id === session._id)
        ? prev.filter((s: AppointmentSession) => s._id !== session._id)
        : [...prev, {
            ...session,
            price: customPrice[session._id] ?? session.price,
            appointmentId: session.appointmentId
          }]
    );
  };

  const handleRemoveSession = (sessionId: string) => {
    setSelectedSessions((prev: AppointmentSession[]) => prev.filter((s: AppointmentSession) => s._id !== sessionId));
  };

  const handleClearAllSessions = () => {
    setSelectedSessions([] as AppointmentSession[]);
  };

  const handlePriceChange = (sessionId: string, newPrice: number) => {
    setCustomPrice((prev: Record<string, number>) => ({
      ...prev,
      [sessionId]: newPrice
    }));
    
    setSelectedSessions((prev: AppointmentSession[]) => 
      prev.map((session: AppointmentSession) => 
        session._id === sessionId 
          ? {...session, price: newPrice} 
          : session
      )
    );
  };

  const handleSelectedSessionPriceChange = (sessionId: string, newPrice: number) => {
    setSelectedSessions((prev: AppointmentSession[]) => 
      prev.map((session: AppointmentSession) => 
        session._id === sessionId 
          ? {...session, price: newPrice} 
          : session
      )
    );
    
    setCustomPrice((prev: Record<string, number>) => ({
      ...prev,
      [sessionId]: newPrice
    }));
  };

 const handlePaySessions = async () => {
  if (selectedSessions.length === 0) {
    toast.error('Please select at least one session');
    return;
  }

  if ((paymentMethod === 'usdt' || paymentMethod === 'usdc') && !wallet) {
    toast.error(`Please enter ${paymentMethod.toUpperCase()} wallet address`);
    return;
  }

  if (paymentMethod === 'manual' && !manualNote.trim()) {
    toast.error('Please enter payment details');
    return;
  }

  if (!therapistId) {
    toast.error('Therapist ID is missing');
    return;
  }

  setIsLoading(true);
  try {
    const totalAmountAED = selectedSessions.reduce(
      (sum, session) => sum + (session.price * (payoutPercentage / 100)), 
      0
    );

    const sessionWithPrice = selectedSessions.map(s => ({
      id: s.appointmentId ? `${s.appointmentId}-${s.index}` : `${id}-${s.index}`,
      price: s.price
    }));
    
    const paymentData = {
      therapistId,
      amount: (paymentMethod === 'usdt' || paymentMethod === 'usdc') 
        ? (totalAmountAED / exchangeRate) 
        : totalAmountAED,
      paymentMethod,
      currency: paymentMethod === 'usdt' ? 'USDT' : 
               paymentMethod === 'usdc' ? 'USDC' : 'AED',
      sessions: sessionWithPrice,
      payoutPercentage,
      exchangeRate,
      therapistLevel: therapistLevel ?? 1,
      ...((paymentMethod === 'usdt' || paymentMethod === 'usdc') && { 
        walletAddress: wallet,
        network: network,
      }),
      ...(paymentMethod === 'manual' && { 
        manualNote,
        patientName: selectedSessions[0]?.patientName || patientName
      })
    };

    const endpoint = (paymentMethod === 'usdt' || paymentMethod === 'usdc') 
      ? '/api/admin/payments/binance' 
      : '/api/admin/payments';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment failed');
    }

    handleClearAllSessions();
    toast.success('Payment processed successfully');
    onPaymentComplete?.();
    setSelectedSessions([]); // Clear selected sessions after payment
    await onRefresh();
    onClose();
  } catch (error: any) {
    console.error('Payment error:', error);
    toast.error(error.message || 'Failed to process payment');
  } finally {
    setIsLoading(false);
  }
};

  const calculateTotals = () => {
    const originalTotal = selectedSessions.reduce((sum, s) => sum + s.price, 0);
    const payoutTotal = selectedSessions.reduce(
      (sum, session) => sum + (session.price * (payoutPercentage / 100)), 
      0
    );
    
    return {
      original: originalTotal.toFixed(2),
      payout: payoutTotal.toFixed(2),
      usdt: (payoutTotal / exchangeRate).toFixed(6),
      rate: exchangeRate.toFixed(4)
    };
  };

  const totals = calculateTotals();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <Card>
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-bold">Session Management</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Banknote className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Exchange Rate</span>
                  </div>
                  {isLoadingRate ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <span className="text-sm font-mono">
                      1 USDT = {totals.rate} AED
                      {usingManualRate && ' (manual)'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={manualRate}
                    onChange={handleManualRateChange}
                    placeholder="Enter custom rate"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={applyManualRate}
                      disabled={!manualRate || isNaN(Number(manualRate))}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetToAutoRate}
                      disabled={isLoadingRate}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {usingManualRate 
                    ? "Using manual exchange rate" 
                    : "Live rates provided by ExchangeRate-API"}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="font-medium">Current Appointment Sessions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Select</th>}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Session</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount (AED)</th>
                      {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount (USDT)</th>}
                      {(isTherapist || isAdmin) && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allSessions.map((session) => {
                      const isCurrent = session.index === 1000;
                      const isDisabled = (isCurrent && isCurrentSessionDisabled) || 
                                       session.paymentStatus === 'paid';
                      const isPaid = session.paymentStatus === 'paid';
                      
                      return (
                        <tr 
                          key={session._id} 
                          className={`${isPaid ? 'bg-gray-50' : ''} ${isDisabled ? 'opacity-70' : 'hover:bg-gray-50'}`}
                        >
                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSessionSelected(session)}
                                  onChange={() => handleSelectSession(session)}
                                  disabled={isDisabled}
                                  className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                    isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                                  }`}
                                />
                              </div>
                            </td>
                          )}
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isCurrent ? (
                              <Badge variant="default" className="mr-2">Current</Badge>
                            ) : (
                              <span className="text-sm font-mono">#{session.index}</span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isTherapist ? (
                              <Input
                                type="datetime-local"
                                value={format(new Date(session.date), "yyyy-MM-dd'T'HH:mm")}
                                onChange={(e) => onSessionDateChange?.(session._id, e.target.value)}
                                disabled={isPaid || isCurrent}
                                className="w-full max-w-[180px]"
                              />
                            ) : (
                              <span className="text-sm">
                                {format(new Date(session.date), 'PPpp')}
                              </span>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isTherapist ? (
                              <Select
                                value={session.status}
                                onValueChange={(val) => onSessionStatusChange?.(
                                  session._id, 
                                  val as 'in_progress' | 'completed'
                                )}
                                disabled={isPaid || isCurrent || session.status === 'in_progress'}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge 
                                variant={session.status === 'completed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {session.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge 
                              variant={isPaid ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {isPaid ? (
                                <div className="flex items-center">
                                  <Check className="h-3 w-3 mr-1" />
                                  Paid
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <X className="h-3 w-3 mr-1" />
                                  Not Paid
                                </div>
                              )}
                            </Badge>
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <Input
                              type="number"
                              value={session.price}
                              onChange={(e) => handlePriceChange(session._id, Number(e.target.value))}
                              disabled={isPaid}
                              className="w-24 h-8"
                            />
                          </td>
                          
                          {isAdmin && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                              {(session.price / exchangeRate).toFixed(6)} USDT
                            </td>
                          )}
                          
                          {(isTherapist || isAdmin) && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isTherapist && !isPaid && !isCurrent && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onSessionStatusChange?.(
                                    session._id, 
                                    'completed'
                                  )}
                                  disabled={session.status === 'completed'}
                                >
                                  Complete
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedSessions.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Selected Sessions ({selectedSessions.length})</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearAllSessions}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Appointment</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Session</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Amount (AED)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Payout (AED)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedSessions.map((session) => (
                        <tr key={session._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {session.appointmentType || appointmentType || 'Session'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {session.patientName || patientName || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {session.index === 1000 ? (
                              <Badge variant="default">Current</Badge>
                            ) : (
                              <span className="text-sm font-mono">#{session.index}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {format(new Date(session.date), 'PPpp')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <Input
                              type="number"
                              value={session.price}
                              onChange={(e) => handleSelectedSessionPriceChange(session._id, Number(e.target.value))}
                              className="w-24 h-8"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            د.إ{(session.price * (payoutPercentage / 100)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSession(session._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Payment Method</label>
                      <Select
  value={paymentMethod}
  onValueChange={(value: 'usdt' | 'usdc' | 'manual') => setPaymentMethod(value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Select payment method" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="usdt">USDT (Binance Pay)</SelectItem>
    <SelectItem value="usdc">USDC (Binance Pay)</SelectItem>
    <SelectItem value="manual">Manual Transfer</SelectItem>
  </SelectContent>
</Select>
                    </div>

                    {paymentMethod === 'usdt' && (
                      <div>
    <label className="block text-sm font-medium mb-2">Therapist USDT Wallet Address</label>
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-gray-500" />
      <Input
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        placeholder="Enter USDT wallet address"
        className="flex-1"
      />
    </div>
  </div>
                    )}

                    {paymentMethod === 'usdc' && (
  <div>
    <label className="block text-sm font-medium mb-2">Therapist USDC Wallet Address</label>
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-gray-500" />
      <Input
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        placeholder="Enter USDC wallet address"
        className="flex-1"
      />
    </div>
  </div>
)}

                    {paymentMethod === 'manual' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Payment Details</label>
                        <TextArea
                          value={manualNote}
                          onChange={(e) => setManualNote(e.target.value)}
                          placeholder="Enter payment reference/details"
                          rows={3}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium mb-2">Sessions Completed</label>
                         { isSessionCompletedLoading ? <Spin size="small" /> : <p>{sessionsCompleted}</p>}
                         <Button
                         className='mt-2 bg-green-500 text-white text-sm p-1'
                         onClick={() => setShowVerifiedSessions(!showVerifiedSessions)}>
                           {showVerifiedSessions ? null : 'Verified'}
                         </Button>
                         <Button
                         className='mt-2 bg-red-500 text-white text-sm p-1 ml-1'
                         onClick={() => setShowAllUnverifiedSessions(!showAllUnverifiedSessions)}>
                           {showAllUnverifiedSessions ? null : 'Unverified'}
                         </Button>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Therapist Level</label>
                        <Select
                          value={payoutPercentage === 57 ? '2' : '1'}
                          onValueChange={(value) => setPayoutPercentage(value === '2' ? 57 : 50)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Level 1 (50%)</SelectItem>
                            <SelectItem value="2">Level 2 (57%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Custom Payout %</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={1000}
                            value={payoutPercentage}
                            onChange={(e) => setPayoutPercentage(Number(e.target.value))}
                            className="w-full"
                          />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Payment Summary</span>
                      <span className="text-sm text-gray-500">
                        {selectedSessions.length} session{selectedSessions.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Original Amount</span>
                          <span className="text-lg font-bold">د.إ{totals.original}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Payout Amount</span>
                          <span className="text-lg font-bold">د.إ{totals.payout}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {payoutPercentage}% of original
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-md">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">
      {paymentMethod === 'usdt' ? 'USDT' : 
       paymentMethod === 'usdc' ? 'USDC' : 'AED'} Amount
    </span>
    <span className="text-lg font-bold font-mono">
      {paymentMethod === 'usdt' || paymentMethod === 'usdc' 
        ? totals.usdt 
        : totals.payout} {paymentMethod === 'usdt' ? 'USDT' : 
                         paymentMethod === 'usdc' ? 'USDC' : 'AED'}
    </span>
  </div>
</div>
                    </div>
                  </CardContent>
                </Card>

               <Button
  className="w-full"
  onClick={handlePaySessions}
  disabled={
    selectedSessions.length === 0 || 
    ((paymentMethod === 'usdt' || paymentMethod === 'usdc') && !wallet) ||
    (paymentMethod === 'manual' && !manualNote)
  }
  loading={isLoading}
>
  {isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin mr-2" />
  ) : (
    <Banknote className="h-4 w-4 mr-2" />
  )}
  {paymentMethod === 'usdt' 
    ? `Pay ${totals.usdt} USDT` 
    : paymentMethod === 'usdc'
    ? `Pay ${totals.usdt} USDC`
    : `Confirm د.إ${totals.payout} Payment`}
</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Verified Sessions Modal */}
      <Modal
        open={showVerifiedSessions}
        title={`Verified Sessions (${verifiedAppointments.length})`}
        onCancel={() => setShowVerifiedSessions(false)}
        footer={null}
        width={800}
        className="verified-sessions-modal"
      >
        {verifiedAppointments.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <List
              itemLayout="vertical"
              dataSource={verifiedAppointments}
              renderItem={(appointment) => (
                <List.Item key={appointment.id} className="!px-0">
                  <Card 
                    size="small" 
                    title={
                      <div className="flex justify-between items-center">
                        <Tag color="green" className="font-semibold">
                          {appointment.plan}
                        </Tag>
                        <span className="text-gray-500 text-sm">
                          Total Sessions: {1 + (appointment.recurring?.length || 0)}
                        </span>
                      </div>
                    }
                  >
                    <Divider orientation="left" plain>All Sessions</Divider>
                    <Timeline>
                      {/* Main Appointment Session */}
                      <Timeline.Item color="green">
                        <div className="flex justify-between">
                          <span className="font-medium">Main Session ({appointment.plan})</span>
                          <span className="text-gray-500">
                            {formatDate(appointment.date, "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      </Timeline.Item>
                      
                      {/* Recurring Sessions */}
                      {appointment.recurring?.map((session: any, index: number) => (
                        typeof session === "object" && session.date && (
                          <Timeline.Item key={index}>
                            <div className="flex justify-between">
                              <span>Recurring Session {index + 1}</span>
                              <span className="text-gray-500">
                                {formatDate(session.date, "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                          </Timeline.Item>
                        )
                      ))}
                    </Timeline>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No verified sessions found"
          />
        )}
        <div className="mt-4 text-right">
          <Button onClick={() => setShowVerifiedSessions(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Unverified Sessions Modal */}
      <Modal
        open={showAllUnverifiedSessions}
        title={`Unverified Sessions (${AllUnverifiedAppointments.length})`}
        onCancel={() => setShowAllUnverifiedSessions(false)}
        footer={null}
        width={800}
        className="unverified-sessions-modal"
      >
        {AllUnverifiedAppointments.length > 0 ? (
          <div className="max-h-[60vh] overflow-y-auto">
            <List
              itemLayout="vertical"
              dataSource={AllUnverifiedAppointments}
              renderItem={(appointment) => (
                <List.Item key={appointment.id} className="!px-0">
                  <Card 
                    size="small" 
                    title={
                      <div className="flex justify-between items-center">
                        <Tag color="orange" className="font-semibold">
                          {appointment.plan}
                        </Tag>
                        <span className="text-gray-500 text-sm">
                          Total Sessions: {1 + (appointment.recurring?.length || 0)}
                        </span>
                      </div>
                    }
                  >
                    <Divider orientation="left" plain>All Sessions</Divider>
                    <Timeline>
                      {/* Main Appointment Session */}
                      <Timeline.Item color="orange">
                        <div className="flex justify-between">
                          <span className="font-medium">Main Session ({appointment.plan})</span>
                          <span className="text-gray-500">
                            {formatDate(appointment.date, "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                      </Timeline.Item>
                      
                      {/* Recurring Sessions */}
                      {appointment.recurring?.map((session: any, index: number) => (
                        typeof session === "object" && session.date && (
                          <Timeline.Item key={index} color="red">
                            <div className="flex justify-between">
                              <span>Recurring Session {index + 1}</span>
                              <span className="text-gray-500">
                                {formatDate(session.date, "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                          </Timeline.Item>
                        )
                      ))}
                    </Timeline>
                    <div className="mt-3 text-right">
                      <Tooltip title="Verify payment status">
                        <Button 
                          icon={<ReloadOutlined />}
                          onClick={() => handleVerifyPayment(appointment.id)}
                        >
                          Re-check Payment
                        </Button>
                      </Tooltip>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No unverified sessions found"
          />
        )}
        <div className="mt-4 text-right">
          <Button onClick={() => setShowAllUnverifiedSessions(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};