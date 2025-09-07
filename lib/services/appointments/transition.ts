import Appointment from "@/lib/db/models/Appointment";
import { APPOINTMENT_STATUSES, AppointmentStatus, LEGACY_STATUS_MAPPING } from "@/lib/utils/statusMapping";
import { recordHistory } from "./history";
import { dispatchEvents } from "../events/dispatcher";

type Actor = { id: string; role: "patient" | "therapist" | "admin" };

// Transition rules based on current STATUS_FLOW
const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  [APPOINTMENT_STATUSES.UNPAID]: [APPOINTMENT_STATUSES.PENDING],
  [APPOINTMENT_STATUSES.PENDING]: [APPOINTMENT_STATUSES.PENDING_MATCH, APPOINTMENT_STATUSES.UNPAID],
  [APPOINTMENT_STATUSES.PENDING_MATCH]: [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE],
  [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE]: [APPOINTMENT_STATUSES.PENDING_SCHEDULING, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.PENDING_SCHEDULING]: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
  [APPOINTMENT_STATUSES.CONFIRMED]: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW],
  [APPOINTMENT_STATUSES.RESCHEDULED]: [APPOINTMENT_STATUSES.CONFIRMED],
  [APPOINTMENT_STATUSES.NO_SHOW]: [],
  [APPOINTMENT_STATUSES.CANCELLED]: [],
  [APPOINTMENT_STATUSES.COMPLETED]: []
};

export async function transitionAppointment(
  id: string,
  to: AppointmentStatus,
  actor: Actor,
  opts?: { reason?: string; meta?: any }
) {
  const appt = await Appointment.findById(id);
  if (!appt) throw new Error("Appointment not found");

  // Normalize legacy status to new status
  const from = LEGACY_STATUS_MAPPING[appt.status as keyof typeof LEGACY_STATUS_MAPPING] || appt.status as AppointmentStatus;
  const allowed = NEXT[from] || [];
  
  if (!allowed.includes(to)) {
    throw new Error(`Forbidden transition: ${from} ➜ ${to}. Allowed: ${allowed.join(', ')}`);
  }

  // Domain guards (business rules)
  if (to === APPOINTMENT_STATUSES.PENDING_SCHEDULING && !appt.therapist) {
    throw new Error("Cannot schedule without therapist assigned");
  }

  if (to === APPOINTMENT_STATUSES.CONFIRMED && !appt.date) {
    throw new Error("Cannot confirm without a scheduled date/time");
  }

  if (to === APPOINTMENT_STATUSES.PENDING_MATCH && appt.paymentStatus !== 'completed') {
    throw new Error("Cannot proceed to matching without completed payment");
  }

  // Update the appointment
  appt.status = to;
  await appt.save();

  // Record history + emit domain events
  await recordHistory({ 
    appointment: appt._id, 
    from, 
    to, 
    actor, 
    reason: opts?.reason, 
    meta: opts?.meta 
  });
  
  await dispatchEvents([
    { 
      type: "AppointmentStatusChanged", 
      id: appt._id.toString(), 
      from, 
      to, 
      actor, 
      ts: Date.now(),
      meta: opts?.meta
    }
  ]);

  return appt;
}

// Helper to check if transition is allowed
export function isTransitionAllowed(from: string, to: AppointmentStatus): boolean {
  const normalizedFrom = LEGACY_STATUS_MAPPING[from as keyof typeof LEGACY_STATUS_MAPPING] || from as AppointmentStatus;
  const allowed = NEXT[normalizedFrom] || [];
  return allowed.includes(to);
}

// Helper to get allowed transitions for a status
export function getAllowedTransitions(status: string): AppointmentStatus[] {
  const normalizedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status as AppointmentStatus;
  return NEXT[normalizedStatus] || [];
}
