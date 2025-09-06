import { handlePayoutRequest } from '@/lib/services/payoutProcessor';

export async function GET() {
  return handlePayoutRequest();
}