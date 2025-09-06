import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

export async function GET(req: NextRequest) {
  // TODO: Replace with your real admin auth logic
  const isAdmin = true;
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const logFilePath = process.env.PM2_LOGS || '/home/ubntu/.pm2/logs/app-out.log';
    const errorLogFilePath = process.env.PM2_ERROR_LOGS || '/home/ubntu/.pm2/logs/app-error.log';
    
    const logs = execSync(`tail -n 10000 ${logFilePath}`).toString();
    const errorLogs = execSync(`tail -n 10000 ${errorLogFilePath}`).toString();
    
    return NextResponse.json({ 
      regularLogs: logs,
      errorLogs: errorLogs 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Could not read log files' }, { status: 500 });
  }
}