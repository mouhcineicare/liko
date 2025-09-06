import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import EmailRule from '@/lib/db/models/EmailRule';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const rules = await EmailRule.find({}).sort({ priority: -1, createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      rules
    });

  } catch (error) {
    console.error('Error fetching email rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, conditions, actions, templateId, isActive, priority, triggerEvent } = body;

    if (!name || !conditions || !actions || !triggerEvent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const rule = new EmailRule({
      name,
      description,
      conditions,
      actions,
      templateId,
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0,
      triggerEvent
    });

    await rule.save();

    return NextResponse.json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating email rule:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}
