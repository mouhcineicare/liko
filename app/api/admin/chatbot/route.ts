import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import PromptModel from '@/lib/db/models/Prompt';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const prompts = await PromptModel.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(prompts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to retrieve prompts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, type, isActive, order } = await req.json();
    
    if (!title || !content || !type) {
      return NextResponse.json(
        { error: 'Title, content and type are required' }, 
        { status: 400 }
      );
    }

    await connectDB();

    const newPrompt = new PromptModel({ 
      title,
      content,
      type,
      isActive: isActive !== false,
      order: order || 0
    });
    await newPrompt.save();

    const prompts = await PromptModel.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(prompts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, title, content, type, isActive, order } = await req.json();
    
    if (!id || !title || !content || !type) {
      return NextResponse.json(
        { error: 'ID, title, content and type are required' }, 
        { status: 400 }
      );
    }

    await connectDB();

    await PromptModel.findByIdAndUpdate(id, { 
      title,
      content,
      type,
      isActive,
      order
    });

    const prompts = await PromptModel.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(prompts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' }, 
        { status: 400 }
      );
    }

    await connectDB();
    await PromptModel.findByIdAndDelete(id);

    const prompts = await PromptModel.find().sort({ order: 1, createdAt: -1 });
    return NextResponse.json(prompts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
  }
}