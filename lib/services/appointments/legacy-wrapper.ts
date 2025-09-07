import { APPOINTMENT_STATUSES, USE_NEW_TRANSITION_SYSTEM } from "@/lib/utils/statusMapping";
import { transitionAppointment } from "./transition";

type Actor = { id: string; role: "patient" | "therapist" | "admin" };

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: string,
  actor: Actor,
  opts?: { reason?: string; meta?: any }
) {
  // Feature flag: Use new system if enabled
  if (USE_NEW_TRANSITION_SYSTEM) {
    return await transitionAppointment(appointmentId, newStatus as any, actor, opts);
  }

  // Legacy system fallback
  const Appointment = (await import("@/lib/db/models/Appointment")).default;
  const appointment = await Appointment.findById(appointmentId);
  
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Legacy direct update
  appointment.status = newStatus;
  await appointment.save();

  // Legacy side effects (keep existing behavior)
  const { handleAppointmentStatusChange } = await import("@/lib/services/google");
  const { triggerAppointmentStatusEmail } = await import("@/lib/services/email-triggers");
  
  await handleAppointmentStatusChange(appointment, newStatus);
  await triggerAppointmentStatusEmail(appointment, newStatus);

  return appointment;
}
