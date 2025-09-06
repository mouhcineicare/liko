// app/api/admin/backup/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Backup from "@/lib/db/models/Backup";
import connectDB from "@/lib/db/connect";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const modelNames = [
  "AdminSettings", "Appointment", "Balance", "ChatMessage",
  "Coupon", "EmailTemplate", "FeedBack", "ImpersonationLog",
  "Notification", "PatientOnboarding", "PaymentDetails", "Plan",
  "Prompt", "Settings", "Subscription", "TherapistApplication",
  "TherapistPayment", "Therapy-profile", "TherapyChangeRequest", "User"
];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const action = body?.action || "start";

    // Stop logic
    if (action === "stop") {
      const existingBackup = await Backup.findOne({ isStarted: true, isCompleted: false });
      if (!existingBackup) {
        return NextResponse.json({ error: "No active backup" }, { status: 404 });
      }
      await Backup.findByIdAndUpdate(existingBackup._id, {
        isCancelled: true,
        $push: { logs: `Backup cancelled by ${session.user.id} at ${new Date().toISOString()}` }
      });
      return NextResponse.json({ success: true, message: "Backup cancellation requested." });
    }

    if (action !== "start") {
      return NextResponse.json(
        { error: "Only manual backup is implemented" },
        { status: 400 }
      );
    }

    const existingBackup = await Backup.findOne({ isStarted: true, isCompleted: false });
    if (existingBackup) {
      return NextResponse.json({ error: "A backup is already in progress", backupId: existingBackup._id }, { status: 409 });
    }

    const backup = new Backup({
      startDate: new Date(),
      isStarted: true,
      isScheduled: false,
      isCancelled: false,
      initiatedBy: session.user.id,
      logs: [`Manual backup started by ${session.user.id} at ${new Date().toISOString()}`]
    });
    await backup.save();

    const backupConnection = await mongoose.createConnection(process.env.MONGODB_URI_BACKUP!).asPromise();
    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const name of modelNames) {
      const checkCancel = await Backup.findById(backup._id).select("isCancelled");
      if (checkCancel?.isCancelled) {
        await Backup.findByIdAndUpdate(backup._id, {
          isCompleted: true,
          status: 'cancelled',
          endDate: new Date(),
          $push: { logs: `Backup was cancelled.` }
        });
        return NextResponse.json({ success: false, message: "Backup was cancelled", backupId: backup._id });
      }

      try {
        const sourceModel = mongoose.models[name] || require(`@/lib/db/models/${name}`).default;
        const schema = sourceModel.schema;

        const backupSchema = new mongoose.Schema(schema.obj, {
          timestamps: schema.options.timestamps,
          toJSON: schema.options.toJSON,
          toObject: schema.options.toObject
        });

        backupSchema.add({
          originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
          backupId: { type: String, required: true },
          backupDate: { type: Date, default: Date.now }
        });

        const BackupModel = backupConnection.model(name, backupSchema, name);
        const docs = await sourceModel.find().lean();
        if (docs.length === 0) continue;

        const ops = docs.map(doc => ({
          insertOne: {
            document: {
              ...doc,
              originalId: doc._id,
              backupId: backup._id.toString(),
              backupDate: new Date()
            }
          }
        }));

        try {
          const result = await BackupModel.bulkWrite(ops, { ordered: false });
          totalProcessed += result.insertedCount;
        } catch (err) {
          totalSkipped += docs.length;
        }
      } catch (err) {
        await Backup.findByIdAndUpdate(backup._id, {
          $push: { logs: `Failed to backup model ${name}: ${err.message}` }
        });
      }
    }

    const status = totalProcessed > 0 ? 'completed' : 'failed';
    await Backup.findByIdAndUpdate(backup._id, {
      isCompleted: true,
      status,
      endDate: new Date(),
      itemsProcessed: totalProcessed,
      itemsSkipped: totalSkipped,
      $push: { logs: `Backup finished: ${totalProcessed} processed, ${totalSkipped} skipped.` }
    });

    return NextResponse.json({
      success: status === 'completed',
      message: status === 'completed' ? 'Backup completed successfully' : 'Backup failed',
      backupId: backup._id
    });
  } catch (error: any) {
    console.error("[BACKUP_ERROR]", error);
    return NextResponse.json({ error: error.message || "Backup failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [currentBackup, backups, lastScheduledBackup] = await Promise.all([
      Backup.findOne({ isStarted: true, isCompleted: false }).sort({ startDate: -1 }).lean(),
      Backup.find().sort({ createdAt: -1 }).limit(10).lean(),
      Backup.findOne({ isScheduled: true }).sort({ startDate: -1 }).lean()
    ]);

    return NextResponse.json({
      backups,
      currentBackup,
      cronStatus: {
        isRunning: false,
        lastScheduledBackup
      }
    });
  } catch (error: any) {
    console.error("[BACKUP_STATUS_ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch status" }, { status: 500 });
  }
}
