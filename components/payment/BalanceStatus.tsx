"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function BalanceStatus() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/patient/sessions');
        
        if (!response.ok) {
          throw new Error("Failed to fetch balance");
        }

        const data = await response.json();
        setBalance(data.balance.balanceAmount);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError(err instanceof Error ? err.message : "Failed to load balance");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm text-center py-2">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
      <h4 className="text-sm font-medium text-blue-800 mb-1">
        Current Session Balance
      </h4>
      <div className="text-xl font-bold text-blue-900">
        {balance !== null ? balance : '--'} session{balance !== 1 ? 's' : ''}
      </div>
    </div>
  );
}