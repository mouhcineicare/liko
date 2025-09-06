import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import connectDB from '@/lib/db/connect';
import PromptModel from '@/lib/db/models/Prompt';
import { getSession } from 'next-auth/react';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const defaultPrompts = {
  general: "You are a helpful assistant that answers questions clearly and concisely.",
  patient: "You are a medical assistant helping patients with their health questions.",
  therapy: "You are a mental health professional providing therapeutic support."
};

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const session = await getSession();

    await connectDB();
    
    // Determine user type
    let userType = 'general';
    if (session?.user) {
      userType = session.user?.role === 'therapist' ? 'therapy' : 'patient';
    }

    // Get active prompts for the user type
    const prompts = await PromptModel.find({ 
      $or: [
        { type: userType },
        { type: 'general' }
      ],
      isActive: true
    }).sort({ order: 1, createdAt: -1 });

    // Combine prompts with default fallback
    let systemPrompt = defaultPrompts[userType as keyof typeof defaultPrompts];
    if (prompts.length > 0) {
      systemPrompt = prompts.map(p => p.content).join('\n\n');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    return NextResponse.json({ 
      response: completion.choices[0].message.content 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch response' }, 
      { status: 500 }
    );
  }
}