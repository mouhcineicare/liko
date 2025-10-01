import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import Balance from '@/lib/db/models/Balance';
import Subscription from '@/lib/db/models/Subscription';

// Removed DEFAULT_BALANCE_RATE - now using direct AED amounts

export async function GET(request: NextRequest) {
  try {
    // Get therapist session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Get therapist ID
    const therapistId = session.user.id;

    // Get all appointments for this therapist with valid statuses
    const appointments = await Appointment.find({ 
      therapist: therapistId,
      status: { $in: ['unpaid', 'confirmed', 'completed', 'no-show', 'rescheduled'] }
    })
    .populate('patient', 'fullName email telephone image timeZone')
    .sort({ date: 1 })
    .lean();

    // Group appointments by patient
    const patientsMap = new Map();
    
    appointments.forEach((apt: any) => {
      const patientId = apt.patient._id;
      
      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          _id: patientId,
          fullName: apt.patient.fullName,
          email: apt.patient.email,
          telephone: apt.patient.telephone,
          image: apt.patient.image,
          timeZone: apt.patient.timeZone,
          appointments: [],
          hasMonthlyPackage: false,
          hasSingleSessions: false,
          nextAppointment: null,
          lastAppointment: null,
          totalSessions: 0,
          hasActivePackage: false
        });
      }
      
      const patient = patientsMap.get(patientId);
      patient.appointments.push(apt);
      patient.totalSessions++;
      
      // Check if has monthly package
      if (apt.therapyType === 'monthly' || apt.subscriptionId) {
        patient.hasMonthlyPackage = true;
      } else {
        patient.hasSingleSessions = true;
      }
      
      // Track next and last appointments
      const appointmentDate = new Date(apt.date);
      const now = new Date();
      
      if (apt.status === 'unpaid' || apt.status === 'confirmed' || apt.status === 'rescheduled') {
        // Only consider future appointments as "next appointment"
        if (appointmentDate > now) {
          if (!patient.nextAppointment || appointmentDate < new Date(patient.nextAppointment)) {
            patient.nextAppointment = apt.date;
          }
          // If patient has upcoming appointment, they have an active package
          patient.hasActivePackage = true;
        }
      }
      
      if (apt.status === 'completed') {
        if (!patient.lastAppointment || new Date(apt.date) > new Date(patient.lastAppointment)) {
          patient.lastAppointment = apt.date;
        }
      }
    });

    // Convert to array and enhance with subscription/balance data
    const allPatients = Array.from(patientsMap.values());
    
    // Enhance each patient with subscription and balance information
    const enhancedPatients = await Promise.all(
      allPatients.map(async (patient) => {
        const patientId = patient._id;
        
        // Check for active subscriptions
        const activeSubscriptions = await Subscription.find({
          user: patientId,
          status: { $in: ["active", "past_due"] }
        });
        
        // Check for positive balance
        const balance = await Balance.findOne({ user: patientId });
        let hasPositiveBalance = false;
        
        if (balance) {
          // Use direct AED amount from the new balance system
          hasPositiveBalance = balance.balanceAmount > 0;
        }
        
        return {
          ...patient,
          hasActiveSubscriptions: activeSubscriptions.length > 0,
          hasPositiveBalance,
          hasUpcomingSession: !!patient.nextAppointment
        };
      })
    );
    
    // New classification logic:
    // Active: Has subscription OR balance OR upcoming session
    const activePatients = enhancedPatients.filter(p => 
      p.hasActiveSubscriptions || p.hasPositiveBalance || p.hasUpcomingSession
    );
    
    // Inactive: No subscription AND no balance AND no upcoming session
    const inactivePatients = enhancedPatients.filter(p => 
      !p.hasActiveSubscriptions && !p.hasPositiveBalance && !p.hasUpcomingSession
    );

    // Sort active patients by next appointment date (if available)
    activePatients.sort((a, b) => {
      if (a.nextAppointment && b.nextAppointment) {
        return new Date(a.nextAppointment).getTime() - new Date(b.nextAppointment).getTime();
      }
      if (a.nextAppointment) return -1;
      if (b.nextAppointment) return 1;
      return 0;
    });

    return NextResponse.json({
      allPatients: enhancedPatients,
      activePatients,
      inactivePatients
    });

  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    return NextResponse.json({ error: 'Failed to fetch patient data' }, { status: 500 });
  }
}
