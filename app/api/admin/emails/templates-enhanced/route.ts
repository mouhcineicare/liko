import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailTemplateEnhanced from '@/lib/db/models/EmailTemplateEnhanced';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const templates = await EmailTemplateEnhanced.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Error fetching enhanced email templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 400 });
    }

    const body = await request.json();
    const { _id, name, type, subject, content, buttonLink, buttonText, variables, recipients, isActive } = body;

    if (!name || !type || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    let template;

    if (_id) {
      // Update existing template
      template = await EmailTemplateEnhanced.findByIdAndUpdate(
        _id,
        {
          name,
          type,
          subject,
          content,
          buttonLink,
          buttonText,
          variables: variables || [],
          recipients: recipients || {
            patient: true,
            therapist: false,
            admin: false,
            custom: []
          },
          isActive: isActive !== undefined ? isActive : true
        },
        { new: true }
      );

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
    } else {
      // Check if template with this type already exists
      const existingTemplate = await EmailTemplateEnhanced.findOne({ type });
      if (existingTemplate) {
        return NextResponse.json({ error: 'Template with this type already exists' }, { status: 400 });
      }

      // Create new template
      template = new EmailTemplateEnhanced({
        name,
        type,
        subject,
        content,
        buttonLink,
        buttonText,
        variables: variables || [],
        recipients: recipients || {
          patient: true,
          therapist: false,
          admin: false,
          custom: []
        },
        isActive: isActive !== undefined ? isActive : false // New templates are inactive by default
      });

      await template.save();
    }

    return NextResponse.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('Error creating/updating enhanced email template:', error);
    return NextResponse.json({ error: 'Failed to create/update template' }, { status: 500 });
  }
}
