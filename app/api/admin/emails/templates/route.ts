import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailTemplate from '@/lib/db/models/EmailTemplate';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const templates = await EmailTemplate.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, subject, content, buttonLink, buttonText, variables } = body;

    if (!name || !type || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Check if template with this type already exists
    const existingTemplate = await EmailTemplate.findOne({ type });
    if (existingTemplate) {
      return NextResponse.json({ error: 'Template with this type already exists' }, { status: 400 });
    }

    const template = new EmailTemplate({
      name,
      type,
      subject,
      content,
      buttonLink,
      buttonText,
      variables: variables || [],
      isActive: false // New templates are inactive by default
    });

    await template.save();

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error creating email template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
