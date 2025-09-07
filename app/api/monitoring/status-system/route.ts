import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { statusMonitor } from "@/lib/services/monitoring/status-monitor";

export async function GET() {
  try {
    // Only allow admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await statusMonitor.getMetrics();
    const detailedReport = await statusMonitor.getDetailedStatusReport();

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        report: detailedReport
      }
    });
  } catch (error) {
    console.error("Error fetching status system metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
