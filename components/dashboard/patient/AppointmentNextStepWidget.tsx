'use client';

import React,{ useState } from "react";
import { Card } from "@/components/ui/card";
import { RotateCcw, UserX, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import FeedbackAlert from "./FeedbackAlert";
import { useRouter } from "next/navigation";


export function AppointmentNextStepWidget() {
    const [isRebooking, setIsRebooking] = useState(false);
    const [isChangingTherapist, setIsChangingTherapist] = useState(false);
    const [isLeavingFeedback, setIsLeavingFeedback] = useState(false);
    const session = useSession();
    const router = useRouter();

  return ( <>
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Options</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/dashboard/patient/sessions-rebooking')}
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
        >
          <RotateCcw className="w-6 h-6 text-blue-600 mb-2" />
          <h4 className="font-medium text-blue-900">Book More Sessions</h4>
          <p className="text-sm text-blue-700 mt-1">Schedule additional appointments</p>
        </button>
        
        <button
          onClick={() => router.push('/dashboard/patient/settings')}
          className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors text-left"
        >
          <UserX className="w-6 h-6 text-orange-600 mb-2" />
          <h4 className="font-medium text-orange-900">Change Therapist</h4>
          <p className="text-sm text-orange-700 mt-1">Find a different therapist</p>
        </button>
        
        <button
          onClick={() => setIsLeavingFeedback(!isLeavingFeedback)}
          className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
        >
          <MessageCircle className="w-6 h-6 text-purple-600 mb-2" />
          <h4 className="font-medium text-purple-900">Leave Feedback</h4>
          <p className="text-sm text-purple-700 mt-1">Share your experience</p>
        </button>
      </div>
    </Card>
    <br />
    {isLeavingFeedback && session?.data?.user.id && (
      <FeedbackAlert setIsLeavingFeedback={setIsLeavingFeedback} userId={session?.data?.user.id} fullName={session?.data?.user.name || ''} />
    )}
    </>
  );
}