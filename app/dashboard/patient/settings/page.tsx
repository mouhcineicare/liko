"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Modal } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, InfoCircleFilled, QuestionCircleFilled } from "@ant-design/icons";
import { useSearchParams } from "next/navigation";


interface Subscription {
  _id: string;
  plan: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  price: number;
  productName: string;
  productDescription: string;
}

export default function PatientSettingsPage() {
  const searchParams = useSearchParams();
  const [activeComponent, setActiveComponent] = useState(() => {
    // Auto-show subscriptions tab if coming from SessionBalance
    return searchParams.get('tab') === 'subscriptions' ? 'subscriptions' : 'change-therapy';
  });
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [cancellingSubscriptionId, setCancellingSubscriptionId] = useState<string | null>(null);

   useEffect(() => {
    if (activeComponent === "subscriptions") {
      fetchSubscriptions();
    }
  }, [activeComponent]);

  const fetchSubscriptions = async () => {
    setIsLoadingSubscriptions(true);
    try {
      const response = await fetch("/api/patient/subscriptions");
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setIsLoadingSubscriptions(false);
    }
  };

const handleCancelSubscription = async (subscriptionId: string, currentPeriodEnd: Date) => {
  Modal.confirm({
    title: <div className="text-xl font-semibold text-gray-800">Confirm Subscription Cancellation</div>,
    icon: <ExclamationCircleFilled className="text-yellow-500" />,
    content: (
      <div className="space-y-4 py-2">
        <div className="flex items-start">
          <InfoCircleFilled className="text-blue-500 mt-1 mr-2" />
          <p className="text-gray-700">
            We appreciate you being part of our community. Your feedback helps us improve.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-2">What happens if you cancel:</h4>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <CloseCircleFilled className="text-red-400 mr-2 mt-0.5" />
              <span>Automatic renewals will stop after current period</span>
            </li>
            <li className="flex items-start">
              <CloseCircleFilled className="text-red-400 mr-2 mt-0.5" />
              <span>Access to your therapist will end on {format(new Date(currentPeriodEnd), 'MMMM d, yyyy')}</span>
            </li>
            <li className="flex items-start">
              <CheckCircleFilled className="text-green-400 mr-2 mt-0.5" />
              <span>Unused sessions remain available until period ends</span>
            </li>
          </ul>
        </div>

        <div className="flex items-start">
          <QuestionCircleFilled className="text-blue-500 mt-1 mr-2" />
          <p className="text-gray-700">
            Having issues? Our <a href="/contact" className="text-blue-600 hover:underline">support team</a> can help resolve them.
          </p>
        </div>
      </div>
    ),
    okText: <span className="font-medium">Confirm Cancellation</span>,
    cancelText: <span className="font-medium">Keep Subscription</span>,
    okButtonProps: { 
      className: "!bg-red-500 !border-red-500 hover:!bg-red-600 h-10 px-6",
      danger: true 
    },
    cancelButtonProps: {
      className: "!border-gray-300 hover:!bg-gray-50 h-10 px-6"
    },
    width: 520,
    centered: true,
    closable: true,
    maskClosable: true,
    className: "!max-w-[95vw]",
    onOk: async () => {
      setCancellingSubscriptionId(subscriptionId);
      try {
        const response = await fetch(`/api/patient/subscriptions/${subscriptionId}/cancel`, {
          method: "POST",
        });

        if (!response.ok) throw new Error("Failed to cancel subscription");

        toast.success(
          <div className="space-y-1">
            <div>Your subscription will end on {format(currentPeriodEnd, 'MMMM d, yyyy')}</div>
            <div className="text-sm text-gray-600">
              You can resubscribe anytime before this date to maintain uninterrupted access.
            </div>
          </div>
        );
        fetchSubscriptions();
      } catch (error) {
        toast.error(
          <div>
            <div>Failed to cancel subscription</div>
            <div className="text-sm text-gray-600">Please try again or contact support</div>
          </div>
        );
      } finally {
        setCancellingSubscriptionId(null);
      }
    }
  });
};

  // Handle therapy change request
  const handleTherapyChangeRequest = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the change request");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/patient/therapy/change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit therapy change request");
      }

      toast.success("Therapy change request submitted successfully");
      setShowChangeDialog(false);
      setReason("");
    } catch (error: any) {
      console.error("Error submitting therapy change request:", error);
      toast.error(error.message || "Failed to submit therapy change request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
   <div className="flex flex-col md:flex-row min-h-screen">
      {/* Left Side Menu */}
      <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <nav className="space-y-2">
          <Button
            variant={activeComponent === "change-therapy" ? "secondary" : "ghost"}
            onClick={() => setActiveComponent("change-therapy")}
            className="w-full justify-start"
          >
            Change Therapy
          </Button>
          <Button
            variant={activeComponent === "subscriptions" ? "secondary" : "ghost"}
            onClick={() => setActiveComponent("subscriptions")}
            className="w-full justify-start"
          >
            My Subscriptions
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeComponent === "change-therapy" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Change Therapy</h1>
            <p className="text-gray-600">
              If you would like to change your therapist, please provide a reason below. We will review your request and
              assist you in finding a new therapist.
            </p>
            <Button
              onClick={() => setShowChangeDialog(true)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Request Therapy Change
            </Button>
          </div>
        )}

        {activeComponent === "subscriptions" && (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold">My Subscriptions</h1>
    <p className="text-gray-600">
      Manage your active therapy subscriptions. You can cancel subscriptions here.
    </p>

    {isLoadingSubscriptions ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading subscriptions...</span>
      </div>
    ) : subscriptions.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
        You don't have any active subscriptions
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 font-medium text-sm pb-2 border-b">
          <div>Plan</div>
          <div>Details</div>
          <div>Price</div>
          <div>Status</div>
          <div>Renewal Date</div>
          <div>Actions</div>
        </div>
        {subscriptions.map((subscription) => (
          <div key={subscription._id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center py-4 border-b">
            <div>
              <div className="font-medium">{subscription.productName}</div>
              <div className="text-sm text-gray-500">{subscription.plan.substring(0,10)+'...'}</div>
            </div>
            <div className="text-sm text-gray-600">
              {subscription.productDescription || 'No description available'}
            </div>
            <div>AED {(subscription.price / 100).toFixed(2)}</div>
            <div className="capitalize">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {subscription.status}
              </span>
            </div>
            <div>
              {format(new Date(subscription.currentPeriodEnd), 'PP')}
              <div className="text-xs text-gray-500">
                {subscription.cancelAtPeriodEnd ? 'Will not renew' : 'Auto-renews'}
              </div>
            </div>
            <div>
              {subscription.status === 'active' && !subscription.cancelAtPeriodEnd ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelSubscription(subscription.stripeSubscriptionId, subscription.currentPeriodEnd)}
                  disabled={cancellingSubscriptionId === subscription.stripeSubscriptionId}
                >
                  {cancellingSubscriptionId === subscription.stripeSubscriptionId ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Subscription"
                  )}
                </Button>
              ) : subscription.cancelAtPeriodEnd ? (
                <span className="text-sm text-gray-500">Will cancel at period end</span>
              ) : (
                <span className="text-sm text-gray-500 capitalize">{subscription.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
      </div>


      {/* Therapy Change Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Therapy Change</DialogTitle>
            <DialogDescription>
              Please provide a reason for requesting a change in therapy. This will help us better assist you in finding
              a new therapist.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you would like to change therapists..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleTherapyChangeRequest}
              disabled={isSubmitting || !reason.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}