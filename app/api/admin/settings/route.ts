import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Settings from "@/lib/db/models/Settings";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const settings = await Settings.find().sort({ type: 1 });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error fetching settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await connectDB();

    let setting = await Settings.findOne({ type: data.type });
    if (setting) {
      setting.title = data.title;
      setting.content = data.content;
      setting.lastUpdated = new Date();
      await setting.save();
    } else {
      setting = new Settings({
        type: data.type,
        title: data.title,
        content: data.content,
      });
      await setting.save();
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Error saving settings" },
      { status: 500 }
    );
  }
}