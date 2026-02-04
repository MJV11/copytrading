import { NextResponse } from 'next/server';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const PID_FILE = join(process.cwd(), '.trading.pid');
const CONFIG_FILE = join(process.cwd(), 'trading-config.json');

export async function POST() {
  try {
    if (!existsSync(PID_FILE)) {
      return NextResponse.json(
        { error: 'Trading is not running' },
        { status: 400 }
      );
    }
    
    // Read PID
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8'));
    
    // Kill process
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      // Process might already be dead
      console.warn('Process might already be stopped:', error);
    }
    
    // Remove PID file
    unlinkSync(PID_FILE);
    
    // Update config
    if (existsSync(CONFIG_FILE)) {
      const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      config.isRunning = false;
      writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
    
    return NextResponse.json({
      success: true,
      message: 'Trading stopped successfully',
    });
  } catch (error: any) {
    console.error('Error stopping trading:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
