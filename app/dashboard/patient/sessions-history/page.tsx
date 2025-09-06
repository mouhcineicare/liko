"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, CreditCard, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

type Payment = {
  id: string
  type: string
  amount: number
  currency: string
  created: number
  description: string
  receipt_url: string | null
  status: string
  date: string
  displayTitle: string
  plan: {
    title: string
    type: string
    sessions: number
    therapyType: string
  } | null
}

export default function SessionsHistoryPage() {
  const { data: session } = useSession()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.role === 'patient') {
      fetchPayments()
    }
  }, [session])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      console.log('Frontend: Fetching payments from API...');
      const response = await fetch('/api/patient/payments-history')
      const data = await response.json()
      
      console.log('Frontend: API Response status:', response.status);
      console.log('Frontend: API Response data:', data);
      
      if (!response.ok) {
        if (data.needsPayment) {
          setError('No payment history found. Please make a payment first to view your payment history.');
        } else {
          throw new Error(data.error || 'Failed to fetch payments');
        }
        return;
      }
      
      console.log('Frontend: Setting payments:', data.payments);
      console.log('Frontend: Number of payments:', data.payments?.length || 0);
      setPayments(data.payments || [])
    } catch (err) {
      console.error('Error fetching payments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'invoice':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'charge':
        return <CreditCard className="h-5 w-5 text-purple-500" />
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100)
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading payment history</h3>
              <p className="text-sm text-red-700 mt-2">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchPayments}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Sessions History</h1>
        <Button variant="outline" onClick={fetchPayments} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">No payment history found</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-500">
            You haven't made any payments yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">
                      {getPaymentIcon(payment.type)}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {payment.displayTitle}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(payment.date), 'MMM d, yyyy h:mm a')}
                      </p>
                      {payment.plan && (
                        <div className="flex items-center mt-2 text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          <span className="text-gray-600">
                            {payment.plan.sessions} session{payment.plan.sessions !== 1 ? 's' : ''}
                          </span>
                          {payment.plan.therapyType && (
                            <>
                              <span className="mx-2 text-gray-300">|</span>
                              <span className="text-gray-600 capitalize">
                                {payment.plan.therapyType.replace(/_/g, ' ')}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {payment.status.replace(/_/g, ' ')}
                    </p>
                    {payment.receipt_url && (
                      <a
                        href={payment.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}