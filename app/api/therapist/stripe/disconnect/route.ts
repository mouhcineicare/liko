import { authOptions } from "@/lib/auth/config";
import User from "@/lib/db/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(){
    const session = await getServerSession(authOptions);

    try{
        if(session?.user.role !== "therapist"){
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }
    
        const therapy  = await User.findById(session.user.id);
    
        therapy.stripeCustomerId = null;
        therapy.stripeAccountStatus = 'not_connected';
        therapy.stripeAccountId = null;
    
        await therapy.save();
    
    
        return NextResponse.json({message: "Stripe account disconnected successfully"}, {status: 200});
    }catch(error){
        console.error("Error disconnecting Stripe account:", error);
        return NextResponse.json({error: "Failed to disconnect Stripe account"}, {status: 500});
    }
}