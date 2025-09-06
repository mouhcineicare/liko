import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import FeedBack from "@/lib/db/models/FeedBack";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Add to app/api/admin/feedbacks/route.ts
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  
    await connectDB();
  
    try {
      const deletedFeedback = await FeedBack.findByIdAndDelete(params.id);
      
      if (!deletedFeedback) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      }
      
      return NextResponse.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }