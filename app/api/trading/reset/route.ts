import { NextResponse } from 'next/server';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

export const dynamic = 'force-dynamic';

const PID_FILE = join(process.cwd(), '.trading.pid');

export async function POST() {
  try {
    // Check if trading is running
    if (existsSync(PID_FILE)) {
      return NextResponse.json(
        { error: 'Stop trading before resetting database' },
        { status: 400 }
      );
    }
    
    // Delete all database files
    const dataDir = join(process.cwd(), 'data');
    const dbFiles = [
      join(dataDir, 'trades.db'),
      join(dataDir, 'trades.db-journal'),
      join(dataDir, 'trades.db-shm'),
      join(dataDir, 'trades.db-wal'),
    ];
    
    let deletedCount = 0;
    for (const file of dbFiles) {
      if (existsSync(file)) {
        unlinkSync(file);
        deletedCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Database reset successfully. Deleted ${deletedCount} file(s).`,
    });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
