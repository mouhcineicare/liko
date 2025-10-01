import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";
import { transitionAppointment } from "./transition";

type Actor = { id: string; role: "patient" | "therapist" | "admin" };

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: string,
  actor: Actor,
  opts?: { reason?: string; meta?: any }
) {
  // Always use new transition system
  return await transitionAppointment(appointmentId, newStatus as any, actor, opts);
}
