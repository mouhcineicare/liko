import { TherapyProfile } from "@/lib/db/models";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Find all therapy profiles
    const profiles = await TherapyProfile.find({});

    let migratedCount = 0;
    let alreadyConvertedCount = 0;
    let invalidEntriesCount = 0;

    // Process each profile
    for (const profile of profiles) {
      if (!profile.availability || !Array.isArray(profile.availability)) {
        continue;
      }

      // Check if availability is already in new format
      const isAlreadyNewFormat = profile.availability.every(
        (slot: any) => slot.hours && Array.isArray(slot.hours)
      );

      if (isAlreadyNewFormat) {
        alreadyConvertedCount++;
        continue;
      }

      const newAvailability = profile.availability.map((slot: any) => {
        // If already in new format, keep as-is
        if (slot.hours && Array.isArray(slot.hours)) {
          return slot;
        }

        // Skip invalid entries in old format
        if (!slot.day || !slot.startTime || !slot.endTime) {
          invalidEntriesCount++;
          return slot;
        }

        // Convert old format (startTime/endTime) to new format (hours array)
        const hours = [];
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = parseInt(slot.endTime.split(':')[0]);

        // Handle overnight slots (e.g., 22:00 to 02:00)
        if (startHour < endHour) {
          // Normal daytime slot
          for (let hour = startHour; hour < endHour; hour++) {
            hours.push(`${hour.toString().padStart(2, '0')}:00`);
          }
        } else {
          // Overnight slot - split into two ranges
          // First part: from startHour to midnight
          for (let hour = startHour; hour < 24; hour++) {
            hours.push(`${hour.toString().padStart(2, '0')}:00`);
          }
          // Second part: from midnight to endHour
          for (let hour = 0; hour < endHour; hour++) {
            hours.push(`${hour.toString().padStart(2, '0')}:00`);
          }
        }

        return {
          day: slot.day,
          hours
        };
      });

      // Only update if the new format is different
      if (JSON.stringify(profile.availability) !== JSON.stringify(newAvailability)) {
        profile.availability = newAvailability;
        await profile.save();
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed`,
      stats: {
        totalProfiles: profiles.length,
        migratedCount,
        alreadyConvertedCount,
        invalidEntriesCount
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}