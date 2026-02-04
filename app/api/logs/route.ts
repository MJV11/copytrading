import { NextResponse } from 'next/server';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const LOGS_DIR = join(process.cwd(), 'logs');
const TRADING_LOG = join(LOGS_DIR, 'trading.log');
const SIMULATOR_OUT = join(LOGS_DIR, 'simulator-out.log');
const SIMULATOR_ERR = join(LOGS_DIR, 'simulator-err.log');
const COMBINED_LOG = join(LOGS_DIR, 'combined.log');

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

function parseLogLines(content: string, defaultLevel: string = 'info'): LogEntry[] {
  const lines = content.trim().split('\n').filter(Boolean);
  const entries: LogEntry[] = [];
  let currentEntry: LogEntry | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try parsing as JSON (winston format) - complete entry on one line
    try {
      const parsed = JSON.parse(line);
      // If we had a previous entry being built, save it
      if (currentEntry) {
        entries.push(currentEntry);
      }
      
      // Extract metadata (everything except timestamp, level, message)
      const { timestamp: ts, level: lvl, message: msg, ...metadata } = parsed;
      
      currentEntry = {
        timestamp: ts || new Date().toISOString(),
        level: (lvl || defaultLevel).toLowerCase(),
        message: msg || line,
        data: Object.keys(metadata).length > 0 ? metadata : undefined,
      };
      continue;
    } catch {
      // Not JSON, continue with text parsing
    }

    // Try parsing winston text format: [timestamp] level: message
    // Match with optional ANSI color codes
    const winstonMatch = line.match(/\[([^\]]+)\]\s+(?:\x1b\[[0-9;]*m)?(\w+)(?:\x1b\[[0-9;]*m)?:\s+(.+)/);
    if (winstonMatch) {
      // This is a new log entry
      if (currentEntry) {
        entries.push(currentEntry);
      }
      
      currentEntry = {
        timestamp: winstonMatch[1],
        level: winstonMatch[2].toLowerCase(),
        message: winstonMatch[3],
      };
      continue;
    }

    // Check if this line starts with a timestamp (new entry)
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
    if (timestampMatch) {
      // New entry
      if (currentEntry) {
        entries.push(currentEntry);
      }
      
      currentEntry = {
        timestamp: timestampMatch[1],
        level: defaultLevel,
        message: line.substring(timestampMatch[0].length).trim() || line,
      };
      continue;
    }

    // Line doesn't start with timestamp - it's a continuation of previous entry
    if (currentEntry) {
      currentEntry.message += '\n' + line;
    } else {
      // No current entry, create one with current timestamp
      currentEntry = {
        timestamp: new Date().toISOString(),
        level: defaultLevel,
        message: line,
      };
    }
  }

  // Don't forget the last entry
  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200');

    const allLogs: LogEntry[] = [];

    // Read from all log sources and parse them
    if (existsSync(TRADING_LOG)) {
      const content = readFileSync(TRADING_LOG, 'utf-8');
      allLogs.push(...parseLogLines(content, 'info'));
    }

    if (existsSync(COMBINED_LOG)) {
      const content = readFileSync(COMBINED_LOG, 'utf-8');
      allLogs.push(...parseLogLines(content, 'info'));
    }

    if (existsSync(SIMULATOR_OUT)) {
      const content = readFileSync(SIMULATOR_OUT, 'utf-8');
      allLogs.push(...parseLogLines(content, 'info'));
    }

    if (existsSync(SIMULATOR_ERR)) {
      const content = readFileSync(SIMULATOR_ERR, 'utf-8');
      allLogs.push(...parseLogLines(content, 'error'));
    }

    // Sort by timestamp and take last N
    allLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const recentLogs = allLogs.slice(-limit);

    return NextResponse.json({ logs: recentLogs });
  } catch (error: any) {
    console.error('Error reading logs:', error);
    return NextResponse.json({ logs: [] });
  }
}

export async function DELETE() {
  try {
    const logFiles = [TRADING_LOG, COMBINED_LOG, SIMULATOR_OUT, SIMULATOR_ERR];
    
    for (const file of logFiles) {
      if (existsSync(file)) {
        writeFileSync(file, '');
      }
    }
    
    return NextResponse.json({ success: true, message: 'Logs cleared' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
