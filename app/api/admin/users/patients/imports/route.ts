import { authOptions } from "@/lib/auth/config";
import { User } from "@/lib/db/models";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await User.find({ role: "patient" }, {
      fullName: 1,
      telephone: 1,
      _id: 0
    })
      .sort({ createdAt: -1 })
      .limit(200);

    const vcf = users.map((u, i) => {
      const name = u.fullName?.replace(/[^\w\s]/g, '') || `Patient ${i + 1}`;
      const phone = u.telephone?.replace(/[^\d+]/g, '') || '';
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${name}`,
        `TEL;TYPE=CELL:${phone}`,
        "CATEGORIES:BDL",
        "END:VCARD"
      ].join("\n");
    }).join("\n");

    return new NextResponse(vcf, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': 'attachment; filename="icare-patients.vcf"'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}