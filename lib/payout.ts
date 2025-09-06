export function calculateNextPayoutDate(frequency: 'manual' | 'weekly' | 'biweekly' | 'monthly' = 'weekly'): Date | null {
  if (frequency === 'manual') return null;
  
  const now = new Date();
  const result = new Date(now);
  
  switch (frequency) {
    case 'weekly':
      // Next Friday at 12 PM
      result.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
      result.setHours(12, 0, 0, 0);
      break;
    case 'biweekly':
      // Next Friday in two weeks at 12 PM
      result.setDate(now.getDate() + ((5 - now.getDay() + 14) % 14));
      result.setHours(12, 0, 0, 0);
      break;
    case 'monthly':
      // 1st of next month at 12 PM
      result.setMonth(now.getMonth() + 1, 1);
      result.setHours(12, 0, 0, 0);
      break;
  }
  
  return result;
}