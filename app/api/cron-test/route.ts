import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔧 Cron test route: Working!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron test route is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Cron test route failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to run cron test route' 
    }, { status: 500 });
  }
}

