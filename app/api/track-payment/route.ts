import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { paymentId, amount, currency, status } = await request.json();

    // Validate the payment data
    if (!paymentId || !amount || !currency || !status) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const trackingScripts = `
      <!-- Google Tag Manager (Payment Confirmation) -->
      <script>
        dataLayer.push({
          'event': 'payment_confirmed',
          'paymentId': '${paymentId}',
          'amount': ${amount},
          'currency': '${currency}',
          'status': '${status}'
        });
      </script>
      
      <!-- Google Analytics Ecommerce Tracking -->
      <script>
        gtag('event', 'purchase', {
          'transaction_id': '${paymentId}',
          'value': ${amount},
          'currency': '${currency}',
          'items': []
        });
      </script>
    `;

    return new NextResponse(trackingScripts, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error tracking payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}