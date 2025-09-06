import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Plan from "@/lib/db/models/Plan";
import mongoose from "mongoose";

// Define the expected request body structure
interface ReorderRequestBody {
  plans: {
    id: string;
    order: number;
  }[];
  therapyType: string;
}

export async function PUT(req: NextRequest) {
    try {
      // Check authentication
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
  
      // Parse request body
      const body = (await req.json()) as ReorderRequestBody;
  
      // Validate request body
      if (!body.plans || !Array.isArray(body.plans)) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
  
  
      // Process each plan update individually
      const updatePromises = body.plans.map(async ({ id, order }) => {
        try {
          // Convert string ID to MongoDB ObjectId
          const planId = new mongoose.Types.ObjectId(id);
  
          // Check if the plan exists
          const planExists = await Plan.exists({ _id: planId });
          if (!planExists) {
            console.error(`Plan not found: ${id}`);
            return { id, success: false, error: "Plan not found" };
          }
  
          // Force the order to be a number (not -1)
          const newOrder = order >= 0 ? order : 0;
  
          // Log the plan before update
          const planBeforeUpdate = await Plan.findById(planId).select("order");
  
          // Use updateOne with explicit conditions
          const updateResult = await Plan.updateOne(
            { _id: planId },
            { $set: { order: newOrder } },
          );
  
          // Verify the update was successful
          if (updateResult.modifiedCount === 0) {
            console.error(`Plan ${id} was found but order was not updated`);
  
            // Try a direct update as a fallback
            const directUpdate = await Plan.findByIdAndUpdate(
              planId,
              { order: newOrder },
              { new: true },
            );
  
            if (!directUpdate) {
              return { id, success: false, error: "Plan not updated" };
            }
  
            console.log(`Plan ${id} updated via fallback to order ${newOrder}`);
            return { id, success: true, newOrder, method: "fallback" };
          }
  
          // Get the updated plan to confirm changes
          const updatedPlan = await Plan.findById(planId).select("order");
          console.log(`Plan after update - ID: ${id}, New order: ${updatedPlan?.order}`);
  
          return {
            id,
            success: true,
            oldOrder: planBeforeUpdate?.order,
            newOrder: updatedPlan?.order,
            method: "primary",
          };
        } catch (error) {
          console.error(`Error updating plan ${id}:`, error);
          return { id, success: false, error: String(error) };
        }
      });
  
      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
  
      // Check if any updates failed
      const failedUpdates = results.filter((result) => !result.success);
      if (failedUpdates.length > 0) {
        console.error("Some plan updates failed:", failedUpdates);
        return NextResponse.json(
          {
            success: false,
            message: "Some plans failed to update",
            failedUpdates,
            results,
          },
          { status: 207 },
        );
      }
  
      return NextResponse.json({
        success: true,
        message: "Plans reordered successfully",
        results,
      });
    } catch (error) {
      console.error("Error reordering plans:", error);
      return NextResponse.json(
        {
          error: "Failed to reorder plans",
          details: String(error),
        },
        { status: 500 },
      );
    }
  }