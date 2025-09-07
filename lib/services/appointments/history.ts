import { Schema, model, models } from "mongoose";

// Appointment History Schema - Diary of moves
const AppointmentHistorySchema = new Schema({
  appointment: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  actorId: { type: String, required: true },
  actorRole: { type: String, required: true },
  reason: { type: String },
  meta: { type: Schema.Types.Mixed },
  ts: { type: Date, default: Date.now }
}, { timestamps: true });

export const AppointmentHistory = models.AppointmentHistory || model("AppointmentHistory", AppointmentHistorySchema);

export async function recordHistory({
  appointment,
  from,
  to,
  actor,
  reason,
  meta
}: {
  appointment: any;
  from: string;
  to: string;
  actor: { id: string; role: string };
  reason?: string;
  meta?: any;
}) {
  try {
    await AppointmentHistory.create({
      appointment,
      from,
      to,
      actorId: actor.id,
      actorRole: actor.role,
      reason,
      meta,
      ts: new Date()
    });
  } catch (error) {
    console.error("Failed to record appointment history:", error);
    // Don't throw - history is important but shouldn't break the main flow
  }
}

export async function getAppointmentHistory(appointmentId: string) {
  return await AppointmentHistory.find({ appointment: appointmentId })
    .sort({ ts: -1 })
    .limit(50);
}
