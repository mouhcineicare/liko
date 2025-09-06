// app/api/therapist/stripe/countries/route.ts
import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';

export async function GET() {
  try {
    const countrySpecs = await stripe.countrySpecs.list({
      limit: 200
    });

    // Format the response to just include the country codes
    const countries = countrySpecs.data.map(spec => ({
      id: spec.id,
      supported_payment_currencies: spec.supported_payment_currencies,
      supported_payment_methods: spec.supported_payment_methods,
      supported_transfer_countries: spec.supported_transfer_countries,
      verification_fields: spec.verification_fields
    }));

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available countries' },
      { status: 500 }
    );
  }
}