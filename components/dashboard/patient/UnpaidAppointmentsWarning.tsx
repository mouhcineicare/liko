'use client';
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@radix-ui/react-accordion";
import { Card, Button } from "antd";
import { formatDate } from "date-fns";
import { AlertCircle, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

interface Appointment {
  _id: string;
  date: string;
  status: string;
  paymentStatus: string;
  therapist: {
    _id: string;
    fullName: string;
    image: string;
  } | null;
  price: number;
  plan: string;
  meetingLink?: string;
  planType: string;
  completedSessions: number;
  totalSessions?: number;
  comment?: string;
  isDateUpdated?: boolean;
  isConfirmed?: boolean;
  hasPreferedDate: boolean;
  canReschedule: boolean;
  recurring: any[];
  therapyType: string;
  checkoutSessionId?: string;
  isStripeVerified: boolean;
}

export default function UnpaidAppointmentsWarning({ unpaidCompletedAppointments }: { unpaidCompletedAppointments: Appointment[] }) {
if(unpaidCompletedAppointments.length === 0) return null;

const router = useRouter();

  return (
     <div className="mb-6">
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          Unpaid Completed Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-yellow-700 mb-3">
          You have {unpaidCompletedAppointments.length} completed appointment(s) that haven't been paid.
          Please make the payment to avoid service interruptions. If you're sure you've already paid, 
          please contact us immediately.
        </p>
        
        <Accordion type="single" collapsible>
          <AccordionItem value="unpaid-appointments">
            <AccordionTrigger className="text-yellow-700 hover:no-underline py-2">
              View unpaid appointments ({unpaidCompletedAppointments.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 mt-3">
                {unpaidCompletedAppointments.map(appointment => (
                  <div key={appointment._id} className="flex justify-between items-center p-3 border border-yellow-200 rounded-md bg-white">
                    <div>
                      <p className="font-medium">{appointment.plan}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(appointment.date), 'PPPP')} - {appointment.therapyType}
                      </p>
                    </div>
                    <Button 
                      size="small"
                      onClick={() => router.push(`/payment?appointmentId=${appointment._id}`)}
                      className="gap-1 bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay Now
                    </Button>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  </div>
)

}