import connectDB from "@/lib/db/connect";
import { verifyStripePayment } from '@/lib/stripe/verification';
import { Types } from "mongoose";
import { Appointment} from '@/lib/db/models';

export async function getPatientAppointments(patientId: string) {
  await connectDB();

  // Get counts for all statuses
  const statusCounts = {
    all: await Appointment.countDocuments({ patient: patientId }),
    pending_match: await Appointment.countDocuments({ 
      patient: patientId,
      therapist: null
    }),
    matched_pending_therapist_acceptance: await Appointment.countDocuments({ 
      patient: patientId,
      therapist: { $ne: null },
      isAccepted: false
    }),
    pending_scheduling: await Appointment.countDocuments({ 
      patient: patientId,
      isAccepted: true,
      status: 'pending_scheduling'
    }),
    confirmed: await Appointment.countDocuments({
      patient: patientId,
      $or: [
        { 
          isAccepted: true, 
          isConfirmed: true,
          status: { $in: ['confirmed', 'rescheduled'] }
        },
        {
          status: 'rescheduled',
          isConfirmed: true
        }
      ]
    }),
    completed: await Appointment.countDocuments({ 
      patient: patientId,
      status: 'completed'
    }),
    cancelled: await Appointment.countDocuments({ 
      patient: patientId,
      status: 'cancelled'
    }),
    upcoming: await Appointment.countDocuments({ 
      patient: patientId,
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    }),
    past: await Appointment.countDocuments({ 
      patient: patientId,
      date: { $lt: new Date() }
    })
  };

  // Get all appointments
  const appointments = await Appointment.find({ patient: patientId })
    .populate("therapist", "fullName image _id profile googleCalendarId googleRefreshToken")
    .sort({ date: -1 });

  // Verify payments and map statuses
  const verifiedAppointments = await Promise.all(
    appointments.map(async (appointment) => {
      const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
      
      let customStatus = 'all';

      // Determine date flags once
      const now = new Date();
      const appointmentDate = new Date(appointment.date);
      const isUpcoming = appointmentDate >= now;

      // Prioritize explicit logic first, then fallback to date-based
      if (appointment.status === 'cancelled') {
        customStatus = 'cancelled';
      } else if (appointment.status === 'completed') {
        customStatus = 'completed';
      } else if (!appointment.therapist) {
        customStatus = 'pending_match';
      } else if (appointment.therapist && appointment.isAccepted === false) {
        customStatus = 'matched_pending_therapist_acceptance';
      } else if (appointment.isAccepted === true && appointment.status === 'pending_scheduling') {
        customStatus = 'pending_scheduling';
      } else if (appointment.status === 'confirmed' || appointment.status === 'rescheduled') {
        customStatus = 'confirmed';
      } else {
        customStatus = isUpcoming && appointment.status !== 'cancelled' ? 'upcoming' : 'past';
      }

      return {
        ...appointment.toObject(),
        status: customStatus,
        isStripeVerified: verification.paymentStatus === 'paid',
        paymentStatus: verification.paymentStatus,
        subscriptionStatus: verification.subscriptionStatus,
        isSubscriptionActive: verification.paymentStatus === 'paid'
      };
    })
  );

  return {
    appointments: JSON.parse(JSON.stringify(verifiedAppointments)),
    counts: statusCounts
  };
}

export async function getTherapistAppointments(therapistId: string) {
  await connectDB();

  const appointments = await Appointment.find({ therapist: therapistId })
    .populate("patient", "fullName email")
    .sort({ date: -1 }); // Sort by date in descending order (newest first)

  return JSON.parse(JSON.stringify(appointments));
}

interface SessionObject {
  date: string;
  status: 'in_progress' | 'completed';
  payment: 'unpaid' | 'paid';
}

interface CreateAppointmentData {
  patient: string;
  therapist?: Types.ObjectId | string;
  date: Date;
  plan: string;
  planType?: string;
  price: number;
  therapyType: string;
  status?: string;
  paymentStatus?: string;
  totalSessions?: number;
  isConfirmed: boolean;
  isAccepted?: boolean | null;
  hasPreferedDate: boolean;
  localTimeZone?: string;
  reason?: string;
  recurring: any[];
  discountPercentage?: number;
  discount?: number;
}

export async function createAppointment(appointmentData: CreateAppointmentData) {
  console.log('=== lib/api/appointments.ts - createAppointment START ===');
  console.log('lib/api/appointments.ts - Input appointmentData:', JSON.stringify(appointmentData, null, 2));
  
  await connectDB();

  // Calculate total sessions based on plan type
  let totalSessions = 1; // Default to 1
  switch (appointmentData.planType) {
    case 'x2_sessions': totalSessions = 2; break;
    case 'x3_sessions': totalSessions = 3; break;
    case 'x4_sessions': totalSessions = 4; break;
    case 'x5_sessions': totalSessions = 5; break;
    case 'x6_sessions': totalSessions = 6; break;
    case 'x7_sessions': totalSessions = 7; break;
    case 'x8_sessions': totalSessions = 8; break;
    case 'x9_sessions': totalSessions = 9; break;
    case 'x10_sessions': totalSessions = 10; break;
    case 'x12_sessions': totalSessions = 12; break;
    default: totalSessions = 1;
  }

  if(!appointmentData.planType && appointmentData.recurring){
    totalSessions = (appointmentData?.totalSessions) || ((appointmentData.recurring.length || 0) + 1);
  }

  console.log('lib/api/appointments.ts - Calculated totalSessions:', totalSessions);

  // Build recurring sessions array (including main date as first session)
  const allSessionDates = Array.isArray(appointmentData.recurring) ? [...appointmentData.recurring] : [];
  const recurringSessions: SessionObject[] = allSessionDates.map((entry: any) => {
    const date = typeof entry === 'string' ? entry : entry?.date;
    return {
      date,
      status: (typeof entry === 'object' && entry?.status) ? entry.status : 'in_progress',
      payment: (typeof entry === 'object' && entry?.payment) ? entry.payment : 'unpaid',
    } as SessionObject;
  });

  console.log('lib/api/appointments.ts - Built recurringSessions:', JSON.stringify(recurringSessions, null, 2));

  console.log('appointmentData in func', appointmentData)

  console.log('appointmentData.therapist', appointmentData.therapist)

  const appointmentObject = {
    ...appointmentData,
    patient: appointmentData.patient,
    therapist: appointmentData.therapist || null,
    date: appointmentData.date,
    plan: appointmentData.plan,
    planType: appointmentData.planType,
    price: appointmentData.price,
    therapyType: appointmentData.therapyType,
    status: appointmentData.status || (appointmentData.therapist ? "confirmed" : "pending_match"),
    paymentStatus: appointmentData.paymentStatus || "pending",
    totalSessions,
    completedSessions: 0,
    isConfirmed: appointmentData?.isConfirmed || false,
    hasPreferedDate: appointmentData.therapist ? false : true,
    recurring: recurringSessions,
    patientTimezone: appointmentData.localTimeZone || 'Asia/Dubai',
    reason: appointmentData.reason || '',
    isAccepted: appointmentData?.isAccepted !== undefined ? appointmentData.isAccepted : (appointmentData.therapist ? true : null),
    discountPercentage: appointmentData?.discountPercentage || 0,
    discount: appointmentData?.discount || 0,
  };

  console.log('lib/api/appointments.ts - Appointment object before save:', JSON.stringify(appointmentObject, null, 2));
  console.log('lib/api/appointments.ts - Status logic debug:', {
    providedStatus: appointmentData.status,
    hasTherapist: !!appointmentData.therapist,
    finalStatus: appointmentObject.status
  });

  const appointment = new Appointment(appointmentObject);

  console.log('lib/api/appointments.ts - About to save appointment to database...');
  await appointment.save();
  console.log('lib/api/appointments.ts - Appointment saved successfully');
  console.log('lib/api/appointments.ts - Saved appointment data:', JSON.stringify(appointment.toObject(), null, 2));
  console.log('=== lib/api/appointments.ts - createAppointment END ===');
  
  return appointment;
}

export async function updateAppointment(
  appointmentId: string,
  updateData: Partial<CreateAppointmentData>
) {
  console.log('=== lib/api/appointments.ts - updateAppointment START ===');
  console.log('lib/api/appointments.ts - Input appointmentId:', appointmentId);
  console.log('lib/api/appointments.ts - Input updateData:', JSON.stringify(updateData, null, 2));
  
  await connectDB();

  // Calculate total sessions if planType is being updated
  let totalSessions = updateData.totalSessions;
  if (updateData.planType) {
    console.log('lib/api/appointments.ts - Calculating totalSessions for planType:', updateData.planType);
    switch (updateData.planType) {
      case 'x2_sessions': totalSessions = 2; break;
      case 'x3_sessions': totalSessions = 3; break;
      case 'x4_sessions': totalSessions = 4; break;
      case 'x5_sessions': totalSessions = 5; break;
      case 'x6_sessions': totalSessions = 6; break;
      case 'x7_sessions': totalSessions = 7; break;
      case 'x8_sessions': totalSessions = 8; break;
      case 'x9_sessions': totalSessions = 9; break;
      case 'x10_sessions': totalSessions = 10; break;
      case 'x12_sessions': totalSessions = 12; break;
      default: totalSessions = 1;
    }
    console.log('lib/api/appointments.ts - Calculated totalSessions:', totalSessions);
  }

  const updateObject = {
    ...updateData,
    ...(totalSessions ? { totalSessions } : {}),
    updatedAt: new Date()
  };

  console.log('lib/api/appointments.ts - Update object before database update:', JSON.stringify(updateObject, null, 2));

  const updatedAppointment = await Appointment.findByIdAndUpdate(
    appointmentId,
    updateObject,
    { new: true }
  );

  if (!updatedAppointment) {
    console.log('lib/api/appointments.ts - Error: Appointment not found for update, ID:', appointmentId);
    console.log('=== lib/api/appointments.ts - updateAppointment END WITH ERROR ===');
    return null;
  }

  console.log('lib/api/appointments.ts - Appointment updated successfully');
  console.log('lib/api/appointments.ts - Updated appointment data:', JSON.stringify(updatedAppointment.toObject(), null, 2));
  console.log('=== lib/api/appointments.ts - updateAppointment END ===');
  
  return updatedAppointment;
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string
) {
  await connectDB();

  const appointment = await Appointment.findByIdAndUpdate(
    appointmentId,
    { status, updatedAt: new Date() },
    { new: true }
  );

  return appointment;
}