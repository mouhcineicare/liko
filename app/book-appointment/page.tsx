"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import Onboarding from "@/components/onboarding";
import { Loader2 } from "lucide-react";
import DateTimeSelection from "@/components/booking/DateTimeSelection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Therapy types with icons and descriptions
const THERAPY_TYPES = [
  {
    id: "individual",
    title: "Individual Therapy",
    description: "One-on-one sessions focused on personal growth and mental wellbeing",
    icon: "👤",
  },
  {
    id: "couples",
    title: "Couples Therapy",
    description: "Professional support for relationships and marriages",
    icon: "👥",
  },
  {
    id: "kids",
    title: "Kids Therapy",
    description: "Specialized care for children and adolescents",
    icon: "�",
  },
  {
    id: "psychiatry",
    title: "Psychiatry",
    description: "Medical treatment for mental health conditions",
    icon: "🏥",
  },
];

type Props = {
  onSuccess: () => void;
  therapyId: string | null;
  isPayWithBalance?: boolean;
}

export default function BookAppointment({ onSuccess, therapyId, isPayWithBalance }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [selectedTherapyType, setSelectedTherapyType] = useState<string>("");
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedRecurringDates, setSelectedRecurringDates] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState<number | undefined>(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const params = useSearchParams();
  const planId = params.get("planId") || null;
  const [redirectPlan, setRedirectedPlan] = useState<string | null>(null)



useEffect(() => {
  const handlePlansLoaded = async () => {
    try {
      await fetchBalanceAndPlans();
      console.log('plans loaded');
      
      if (status === "authenticated") {
        setStep(1); // Skip first step if logged in
      }

      console.log('check plans cond ', planId, plans);
      
      if (planId && plans.length > 0) {
        const foundPlan = plans.find(plan => plan._id === planId);
        if (foundPlan) {
          handlePlanSelect(foundPlan);
        } else {
          console.warn(`Plan with ID ${planId} not found`);
          // Optionally show a toast message to the user
          toast.warning('The requested plan was not found');
        }
      }
    } catch (error) {
      console.error('Error in plan loading:', error);
    }
  };

  handlePlansLoaded();
}, [status, isPayWithBalance, planId, plans.length]);

  const fetchBalanceAndPlans = async () => {
    try {
      setIsLoadingPlans(true);
      let historyBalance: []= []
      
      // First fetch balance history if needed
      if (isPayWithBalance) {
        const balanceResponse = await fetch(`/api/patient/sessions`);
        if (!balanceResponse.ok) throw new Error("Failed to fetch balance history");
        const balanceData = await balanceResponse.json();
        setHistory(balanceData.balance.history);
        historyBalance = balanceData.balance.history;
      }

  
      // Then fetch all plans
      const plansResponse = await fetch("/api/plans");
      if (!plansResponse.ok) throw new Error("Failed to fetch plans");
      const plansData = await plansResponse.json();
      setPlans(plansData);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleApplyCoupon = async (planId: string) => {
    if (!couponCode) return;
    
    setIsApplyingCoupon(true);
    try {
      const plan = plans.find(p => p._id === planId);
      if (!plan) return;
  
      // Call the validation API endpoint
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: couponCode,
          amount: plan.price,
          therapistId: therapyId || undefined
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate coupon');
      }
  
      if (data.valid) {
        setAppliedCoupon({
          ...data.coupon,
          planId // Associate coupon with specific plan
        });
        setDiscount(data.discount);
        toast.success(`Coupon applied! Discount: ${<img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5" />} ${data.discount.toFixed(2)}`);
      } else {
        toast.error(data.error || 'Coupon invalid');
      }
    } catch (error: any) {
      console.error("Coupon validation error:", error);
      toast.error(error.message || 'Failed to apply coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = (planId: string) => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode("");
    toast.success('Coupon removed');
  };

const handlePlanSelect = (plan: any) => {
  console.log('handle selected called')
    const finalPrice = appliedCoupon?.planId === plan._id 
      ? plan.price - (discount || 0)
      : plan.price;
  
    setSelectedPlan({...plan, price: finalPrice});
    const newAppointmentData = {
      id: plan._id,
      plan: plan.title,
      planType: plan.type,
      price: finalPrice, // Use discounted price if coupon applied
      originalPrice: plan.price, // Keep original price for reference
      therapyType: selectedTherapyType,
      status: "unpaid",
      localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      coupon: appliedCoupon?.planId === plan._id ? appliedCoupon : null,
    };
    setAppointmentData(newAppointmentData);
    setStep(3);
  };
  

  const handleNewCustomer = () => setStep(1);
  const handleExistingCustomer = () => router.push("/auth/signin?callbackUrl=/book-appointment");

  const handleTherapyTypeSelect = (type: string) => {
    setSelectedTherapyType(type);
    setStep(2);
  };

  const handleDateTimeSelect = async (dateTime: string, recurring: string[]) => {
    setSelectedDateTime(dateTime);
    setSelectedRecurringDates(recurring);
    
    const updatedAppointmentData = {
      ...appointmentData,
      date: dateTime,
      recurring: recurring,
    };
    setAppointmentData(updatedAppointmentData);

    if (status === "authenticated") {
      // Handle authenticated user flow - create appointment immediately
      try {
        setIsLoading(true);
        const response = await fetch("/api/appointments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: dateTime,
            plan: selectedPlan.title,
            planType: selectedPlan.type,
            price: selectedPlan.price,
            therapyType: selectedTherapyType || selectedPlan.therapyType,
            status: "unpaid",
            recurring: recurring,
            isConfirmed: true,
            hasPreferedDate: false,
            localTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!response.ok) throw new Error("Failed to create appointment");
        
        const data = await response.json();
        if (data.appointmentId) {
          router.push(`/payment?appointmentId=${data.appointmentId}`);
        }
      } catch (error) {
        console.error("Error creating appointment:", error);
        toast.error("Failed to create appointment");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle unauthenticated user flow - proceed to onboarding
      setStep(4);
    }
  };

  // Dynamic steps based on auth status
  const steps = status === "authenticated" ? [
    "Therapy Type",
    "Services",
    "Schedule",
  ] : [
    "Start",
    "Therapy Type",
    "Services",
    "Schedule",
    "Mental Health Form",
  ];

  if(isLoading){
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    ); 
  }

  return (
    <div className="min-h-screen flex bg-onbording flex-col sm:flex-row bg-gray-50 font-sans-serif">
      {/* Mobile Steps */}
      <div className="sm:hidden w-full bg-white shadow-md p-4 overflow-x-auto">
        <div className="flex space-x-4 min-w-max">
          {steps.map((stepLabel, index) => (
            <div
              key={index}
              className={`py-1 px-3 text-xs rounded-lg whitespace-nowrap ${
                step > index ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-600"
              }`}
            >
              {index + 1}. {stepLabel}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Steps */}
      <div className="hidden sm:block w-[100px] bg-white shadow-md p-4">
        <div className="flex flex-col space-y-2">
          {steps.map((stepLabel, index) => (
            <div
              key={index}
              className={`py-2 px-3 text-xs rounded-lg text-center ${
                step > index ? "bg-blue-100 text-blue-900" : "bg-gray-200 text-gray-600"
              }`}
            >
              <div className="font-bold mb-1">{index + 1}</div>
              <div className="text-[10px] leading-tight">{stepLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8">
        {step === 0 && status !== "authenticated" && (
          <div className="text-center space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-black">Select Customer Type</h2>
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:space-x-4">
              <Button onClick={handleNewCustomer} className="bg-green-600 text-white hover:bg-green-700">
                I am a New Customer
              </Button>
              <Button onClick={handleExistingCustomer} className="bg-blue-600 text-white hover:bg-blue-700">
                I am an Existing Customer
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Select Therapy Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THERAPY_TYPES.map((type) => (
                <Card 
                  key={type.id}
                  className={`p-6 bg-white shadow-sm border cursor-pointer transition-all duration-200 ${
                    selectedTherapyType === type.id 
                      ? "border-blue-600 ring-2 ring-blue-200" 
                      : "hover:border-blue-200"
                  }`}
                  onClick={() => handleTherapyTypeSelect(type.id)}
                >
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{type.icon}</span>
                    <div>
                      <h3 className="text-xl font-semibold text-black">{type.title}</h3>
                      <p className="mt-2 text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {status !== "authenticated" && (
              <Button onClick={() => setStep(0)} className="mt-6 bg-gray-600 text-white hover:bg-gray-700">
                Back
              </Button>
            )}
          </div>
        )}

{step === 2 && (
  <div>
    <h2 className="text-2xl font-bold mb-6">Select Therapy Plan</h2>
    {isLoadingPlans ? (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-600">Loading available plans...</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans
          .filter((p) => p.therapyType === selectedTherapyType)
          .sort((a, b) => a.order - b.order)
          .map((plan) => {
            const isCouponApplied = appliedCoupon?.planId === plan._id;
            const finalPrice = isCouponApplied ? plan.price - (discount || 0) : plan.price;

            return (
              <Card
                key={plan._id}
                className={`p-6 bg-white shadow-sm border cursor-pointer transition-all duration-200 flex flex-col ${
                  selectedPlan?._id === plan._id
                    ? "border-blue-600 ring-2 ring-blue-200"
                    : "hover:border-blue-200"
                }`}
                onClick={() => handlePlanSelect(plan)}
              >
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold text-black">{plan.title}</h3>
                  <p className="mt-2 text-gray-500">{plan.description}</p>
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      {isCouponApplied && (
                        <span className="text-sm line-through text-gray-500 mr-2">
                          <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5" />{plan.price.toFixed(2)}
                        </span>
                      )}
                      <div className="text-2xl font-bold text-black mb-1">
                        <img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5" />{finalPrice.toFixed(2)}
                        <span className="text-sm font-normal text-gray-600 ml-2">/session</span>
                      </div>
                    </div>

                    {isCouponApplied && (
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {appliedCoupon.discountValue}
                          {appliedCoupon.discountType === "percentage" ? "% OFF" : <><img src="/assets/icons/AED.png" alt="AED" className="inline-block h-4 w-4 -mt-0.5" /> OFF</>}
                        </span>
                      </div>
                    )}

                    <ul className="space-y-2 mt-3">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center text-gray-700">
                          <svg
                            className="h-5 w-5 text-blue-500 mr-2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Coupon section fixed at bottom */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Coupon code"
                      value={isCouponApplied ? appliedCoupon.code : couponCode}
                      onChange={(e) => {
                        if (!isCouponApplied) {
                          setCouponCode(e.target.value);
                        }
                      }}
                      className="h-9 text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isCouponApplied ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCoupon(plan._id);
                        }}
                        className="h-9"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyCoupon(plan._id);
                        }}
                        disabled={!couponCode}
                        className="h-9"
                      >
                        {isApplyingCoupon ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    )}
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-400 text-white mt-4"  onClick={() => handlePlanSelect(plan)}>
                    Select Plan
                  </Button>
                </div>
              </Card>
            );
          })}
      </div>
    )}
    <Button onClick={() => setStep(1)} className="mt-6 bg-gray-600 text-white hover:bg-gray-700">
      Back
    </Button>
  </div>
)}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Select Appointment Time</h2>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800">
                Please note: The selected date and time is your preferred schedule. The final session time will be confirmed once approved by your therapist. Your therapist may suggest alternative times if needed.
              </p>
            </div>
            
            <DateTimeSelection
              planType={selectedPlan.type} 
              therapistId={therapyId} 
              onSelect={handleDateTimeSelect}
              plan={selectedPlan} 
              isPayWithBalance={isPayWithBalance}
            />
            <Button onClick={() => setStep(2)} className="mt-6 bg-gray-600 text-white hover:bg-gray-700">
              Back
            </Button>
          </div>
        )}

        {step === 4 && status !== "authenticated" && (
          <div>
            <Onboarding onSuccess={onSuccess} appointmentData={appointmentData} />
            <Button onClick={() => setStep(3)} className="mt-6 bg-gray-600 text-white hover:bg-gray-700">
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}