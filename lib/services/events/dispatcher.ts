import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

type Event =
  | { type: "AppointmentStatusChanged"; id: string; from: string; to: string; actor: any; ts: number; meta?: any };

const seen = new Set<string>();

export async function dispatchEvents(events: Event[]) {
  for (const ev of events) {
    const key = JSON.stringify(ev);
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      if (ev.type === "AppointmentStatusChanged") {
        await handleAppointmentStatusChanged(ev);
      }
    } catch (error) {
      console.error("Event handler error:", error);
      // Optionally push to a dead-letter log
    }
  }
}

async function handleAppointmentStatusChanged(event: Extract<Event, { type: "AppointmentStatusChanged" }>) {
  const { id, from, to, actor, meta } = event;
  
  // Import services dynamically to avoid circular dependencies
  const { handleAppointmentStatusChange } = await import("@/lib/services/google");
  const { triggerAppointmentStatusEmail } = await import("@/lib/services/email-triggers");
  
  // Get appointment with populated data
  const Appointment = (await import("@/lib/db/models/Appointment")).default;
  const appointment = await Appointment.findById(id)
    .populate("patient", "fullName email")
    .populate("therapist", "fullName email googleRefreshToken");

  if (!appointment) {
    console.error(`Appointment ${id} not found for status change event`);
    return;
  }

  // Handle calendar sync
  try {
    await handleAppointmentStatusChange(appointment, to);
  } catch (error) {
    console.error("Calendar sync failed:", error);
  }

  // Handle email notifications
  try {
    await triggerAppointmentStatusEmail(appointment, to);
  } catch (error) {
    console.error("Email notification failed:", error);
  }

  // Handle payout eligibility updates
  if (to === APPOINTMENT_STATUSES.COMPLETED) {
    try {
      const { updatePayoutEligibility } = await import("@/lib/services/payoutProcessor");
      await updatePayoutEligibility(appointment);
    } catch (error) {
      console.error("Payout update failed:", error);
    }
  }

  // Handle reminder scheduling
  if (to === APPOINTMENT_STATUSES.CONFIRMED) {
    try {
      // TODO: Implement reminder scheduling service
      // const { scheduleAppointmentReminders } = await import("@/lib/services/reminders");
      // await scheduleAppointmentReminders(appointment);
      console.log("Reminder scheduling would be triggered for appointment:", id);
    } catch (error) {
      console.error("Reminder scheduling failed:", error);
    }
  }

  console.log(`✅ Handled status change: ${from} → ${to} for appointment ${id}`);
}
