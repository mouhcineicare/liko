import { NextResponse } from 'next/server';
import EmailTemplate, { EmailTemplateType, IEmailTemplate } from '@/lib/db/models/EmailTemplate';
import connectDB from '@/lib/db/connect';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// Helper function to handle errors
const handleError = (error: any, message: string) => {
  console.error(message, error);
  return NextResponse.json({ error: message }, { status: 500 });
};

// GET all templates
export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await EmailTemplate.find().sort({ createdAt: -1 });
    return NextResponse.json(templates);
  } catch (error) {
    return handleError(error, 'Failed to fetch email templates');
  }
}

// POST create new template
export async function POST(req: Request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const newTemplate = new EmailTemplate(body);
    await newTemplate.save();

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return handleError(error, 'Failed to create email template');
  }
}

// PUT update template
export async function PUT(req: Request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { _id, ...updateData } = await req.json();
    const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    return handleError(error, 'Failed to update email template');
  }
}

// DELETE template
export async function DELETE(req: Request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { _id } = await req.json();
    const deletedTemplate = await EmailTemplate.findByIdAndDelete(_id);

    if (!deletedTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    return handleError(error, 'Failed to delete email template');
  }
}