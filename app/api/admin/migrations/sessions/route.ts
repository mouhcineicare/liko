import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  await connectDB();
  const url = new URL(req.url || "");
  const isRollback = url.searchParams.get("rollback") === "1";

  try {
    // Find all appointments with non-empty recurring arrays
    const appointments = await Appointment.find({
      recurring: { $exists: true, $not: { $size: 0 } }
    });

    let updated = 0;
    let found = appointments.length;
    let skippedInvalid = 0;
    let convertedToObjects = 0;

    for (const appointment of appointments) {
      if (!Array.isArray(appointment.recurring)) continue;

      // MIGRATION: convert to object format
      if (!isRollback) {
        let changed = false;
        const validRecurringEntries = [];
        
        // Determine default status and payment based on appointment status
        const defaultStatus = appointment.status === 'completed' ? 'completed' : 'in_progress';
        const defaultPayment = (appointment.therapistPaid || appointment.isPaid) ? 'paid' : 'not_paid';

        for (const item of appointment.recurring) {
          let dateStr = '';
          let status = defaultStatus;
          let payment = defaultPayment;
          let _id = new mongoose.Types.ObjectId();

          // CASE 1: Already in correct object format
          if (typeof item === 'object' && item.date) {
            dateStr = item.date;
            // Only preserve existing status if it's 'completed' (don't downgrade status)
            status = item.status === 'completed' ? 'completed' : defaultStatus;
            // Only preserve existing payment if it's 'paid' (don't downgrade payment)
            payment = item.payment === 'paid' ? 'paid' : defaultPayment;
            _id = item._id || _id;
            if (item.status !== status || item.payment !== payment) {
              changed = true;
            }
          } 
          // CASE 2: It's a string date (original format)
          else if (typeof item === 'string') {
            dateStr = item;
            changed = true;
            convertedToObjects++;
          }
          // CASE 3: Mongoose's string-as-object representation
          else if (typeof item === 'object') {
            // Reconstruct the date string from numeric keys
            const keys = Object.keys(item)
              .filter(k => !isNaN(Number(k)))
              .map(k => Number(k))
              .sort((a, b) => a - b);
            
            dateStr = keys.map(k => item[k]).join('');
            changed = true;
            convertedToObjects++;
            
            // Preserve existing status if it's 'completed'
            if (item.status === 'completed') status = item.status;
            // Preserve existing payment if it's 'paid'
            if (item.payment === 'paid') payment = item.payment;
            if (item._id) _id = item._id;
          }

          // Validate and normalize the date string
          const normalizedDate = normalizeDate(dateStr);
          if (normalizedDate) {
            validRecurringEntries.push({
              date: normalizedDate,
              status,
              payment,
              _id
            });
          } else {
            console.warn('[MIGRATION] Skipping invalid date:', dateStr);
            skippedInvalid++;
            changed = true;
          }
        }

        if (changed || validRecurringEntries.length !== appointment.recurring.length) {
          appointment.recurring = validRecurringEntries;
          await appointment.save();
          updated++;
          console.log(`Updated appointment ${appointment._id}:`, appointment.recurring);
        }
      }
      // ROLLBACK: convert back to string array
      else if (isRollback) {
        if (appointment.recurring.every(item => typeof item === 'object' && item.date)) {
          appointment.recurring = appointment.recurring.map(item => item.date);
          await appointment.save();
          updated++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      found, 
      updated, 
      skippedInvalid,
      convertedToObjects,
      message: `Updated ${updated}/${found} appointments (converted ${convertedToObjects} entries to objects, skipped ${skippedInvalid} invalid entries)`
    });
  } catch (e) {
    console.error('Migration failed:', e);
    return NextResponse.json({ 
      error: 'Migration failed',
      details: e.message 
    }, { status: 500 });
  }
}

// Normalizes date strings to ISO format with Z timezone
function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  try {
    // Handle +00:00 timezone
    if (dateStr.endsWith('+00:00')) {
      dateStr = dateStr.replace('+00:00', 'Z');
    }
    // Handle missing timezone
    else if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      dateStr += 'Z';
    }

    // Validate by parsing
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    
    // Return in consistent format
    return date.toISOString();
  } catch {
    return null;
  }
}