import Balance from '../lib/db/models/Balance';

export async function fixNegativeRemainingBalances() {

  const balances = await Balance.find({});

  let fixed = 0;

  for (const balance of balances) {
    const remaining = balance.totalSessions - balance.spentSessions;
    if (remaining < 0) {
      balance.spentSessions = balance.totalSessions;
      await balance.save();
      fixed++;
    }
  }

  console.log(`✅ ${fixed} balance(s) updated to prevent negative remaining sessions.`);
}
