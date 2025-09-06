"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PayoutScheduleSettings } from "./PayoutScheduleSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BankDetails {
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  bankName: string;
}

interface PaymentDetails {
  bankDetails: BankDetails;
  cryptoWallet: {
    address: string;
    currency: 'USDT' | 'USDC';
    network: string;
  };
  paymentLink: string;
  payoutSettings?: {
    schedule: 'manual' | 'weekly' | 'biweekly' | 'monthly';
    minimumAmount: number;
  };
}

const initialBankDetails: BankDetails = {
  accountName: "",
  accountNumber: "",
  routingNumber: "",
  swiftCode: "",
  bankName: "",
};

const initialPaymentDetails: PaymentDetails = {
  bankDetails: initialBankDetails,
  cryptoWallet: {
    address: "",
    currency: 'USDT',
    network: "BSC"
  },
  paymentLink: "",
};

export default function PaymentSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(initialPaymentDetails);
  const router = useRouter();
  const [cryptoWalletError, setCryptoWalletError] = useState<string>("");

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch("/api/therapist/payment-details");
      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setPaymentDetails({
            bankDetails: {
              accountName: data.bankDetails?.accountName || "",
              accountNumber: data.bankDetails?.accountNumber || "",
              routingNumber: data.bankDetails?.routingNumber || "",
              swiftCode: data.bankDetails?.swiftCode || "",
              bankName: data.bankDetails?.bankName || "",
            },
            cryptoWallet: data.cryptoWallet || {
              address: "",
              currency: 'USDT'
            },
            paymentLink: data.paymentLink || "",
            payoutSettings: data.payoutSettings || {
              schedule: 'manual',
              minimumAmount: 0
            }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
      toast.error("Failed to load payment details");
    }
  };


  const handleBankDetailsChange = (field: keyof BankDetails, value: string) => {
    setPaymentDetails(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  function isValidBEP20Wallet(address: string) {
    return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  }

const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

  try {
    // Validate crypto wallet if address is provided
    if (paymentDetails.cryptoWallet.address && !isValidBEP20Wallet(paymentDetails.cryptoWallet.address)) {
      setCryptoWalletError("Please enter a valid BEP20/ERC20 wallet address (starts with 0x and 42 characters).");
      setIsLoading(false);
      return;
    }

    // Prepare the payload with correct structure
    const payload = {
      bankDetails: paymentDetails.bankDetails,
      cryptoWallet: {
        address: paymentDetails.cryptoWallet.address,
        currency: paymentDetails.cryptoWallet.currency,
        network: paymentDetails.cryptoWallet.network || "BSC",
      },
      paymentLink: paymentDetails.paymentLink,
      payoutSettings: paymentDetails.payoutSettings
    };

    const response = await fetch('/api/therapist/payment-details', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('Failed to update payment settings');
    
    toast.success("Payment settings updated successfully");
    router.refresh();
  } catch (error) {
    console.error("Error updating payment settings:", error);
    toast.error("Failed to update payment settings");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <Card className="p-6 bg-white">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">Payment Settings</h2>

      <form onSubmit={handleSaveAllSettings}>
        <Tabs defaultValue="methods" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="methods">Payment Methods</TabsTrigger>
            <TabsTrigger value="schedule">Payout Schedule</TabsTrigger>
          </TabsList>
          
          <TabsContent value="methods">
            {/* Traditional Payment Methods Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Bank Account Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="accountName" className="text-gray-900">Account Holder Name</Label>
                  <Input
                    id="accountName"
                    value={paymentDetails.bankDetails.accountName}
                    onChange={(e) => handleBankDetailsChange("accountName", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber" className="text-gray-900">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={paymentDetails.bankDetails.accountNumber}
                    onChange={(e) => handleBankDetailsChange("accountNumber", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routingNumber" className="text-gray-900">Routing Number</Label>
                  <Input
                    id="routingNumber"
                    value={paymentDetails.bankDetails.routingNumber}
                    onChange={(e) => handleBankDetailsChange("routingNumber", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swiftCode" className="text-gray-900">SWIFT Code</Label>
                  <Input
                    id="swiftCode"
                    value={paymentDetails.bankDetails.swiftCode}
                    onChange={(e) => handleBankDetailsChange("swiftCode", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankName" className="text-gray-900">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={paymentDetails.bankDetails.bankName}
                    onChange={(e) => handleBankDetailsChange("bankName", e.target.value)}
                    className="bg-white border-gray-200 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Crypto Wallet</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cryptoCurrency" className="text-gray-900">Currency</Label>
                  <Select
                    value={paymentDetails.cryptoWallet.network === "ERC20" ? "USDT-ERC20" : paymentDetails.cryptoWallet.currency}
                    onValueChange={(value: 'USDT' | 'USDC' | "USDT-ERC20") => {
                      setPaymentDetails(prev => ({
                        ...prev,
                        cryptoWallet: {
                          ...prev.cryptoWallet,
                          currency: value== "USDT-ERC20" ? "USDT" : value,
                          network: value== "USDT-ERC20" ? "ERC20" : "BSC"
                        }
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDT">USDT (BEP20)</SelectItem>
                      <SelectItem value="USDT-ERC20">USDT (ERC20)</SelectItem>
                      <SelectItem value="USDC">USDC (BEP20)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cryptoAddress" className="text-gray-900">Wallet Address</Label>
                  <Input
                    id="cryptoAddress"
                    value={paymentDetails.cryptoWallet.address}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPaymentDetails(prev => ({
                        ...prev,
                        cryptoWallet: {
                          ...prev.cryptoWallet,
                          address: value
                        }
                      }));
                      if (value && !isValidBEP20Wallet(value)) {
                        setCryptoWalletError("Please enter a valid BEP20 wallet address (starts with 0x and 42 characters).");
                      } else {
                        setCryptoWalletError("");
                      }
                    }}
                    placeholder="Enter your BEP20 wallet address (starts with 0x)..."
                    className="bg-white border-gray-200 text-gray-900"
                  />
                  {cryptoWalletError && (
                    <p className="text-sm text-red-600">{cryptoWalletError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Payment Link</h3>
              <div className="space-y-2">
                <Label htmlFor="paymentLink" className="text-gray-900">Payment Link (Optional)</Label>
                <Input
                  id="paymentLink"
                  value={paymentDetails.paymentLink}
                  onChange={(e) => setPaymentDetails(prev => ({
                    ...prev,
                    paymentLink: e.target.value
                  }))}
                  placeholder="https://..."
                  className="bg-white border-gray-200 text-gray-900"
                />
                <p className="text-sm text-gray-500">
                  If you have a payment link (e.g., PayPal.me), enter it here.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card className="p-6">
              <PayoutScheduleSettings
                initialSchedule={paymentDetails.payoutSettings?.schedule || 'manual'}
                initialMinimumAmount={paymentDetails.payoutSettings?.minimumAmount || 0}
                onSave={(schedule, minimumAmount) => {
                  setPaymentDetails(prev => ({
                    ...prev,
                    payoutSettings: {
                      schedule,
                      minimumAmount
                    }
                  }));
                }}
              />
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? "Saving..." : "Save All Settings"}
        </Button>
      </form>
    </Card>
  );
}