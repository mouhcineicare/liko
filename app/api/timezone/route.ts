import { authOptions } from "@/lib/auth/config";
import User from "@/lib/db/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT (request:  Request) {
    const { timeZone } = await request.json();
    try{
      const session = await getServerSession(authOptions);
        if (!session) {
            return  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
       if(!timeZone){
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }
        const user = await User.findById(session.user.id);

        if(!user){
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        user.timeZone = timeZone;
        await user.save();
        return NextResponse.json({ message: "User timezone updated successfully" }, { status: 200 });
    }catch(error: any){
        console.error("Error updating user timezone:", error);
        return new Response("Internal Server Error", { status: 500 });
    }

}