/**
 * Unified Logger for claude-mem
 *
 * Provides structured logging with component-based filtering and context support.
 * Used across the worker, hooks, and CLI to ensure consistent output formatting.
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import pc from 'picocolors';

// ---------------------------------------------------------------------------
// Types and Constants
// ---------------------------------------------------------------------------

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'TIMING' | 'DATA_IN' | 'DATA_OUT' | 'SUCCESS' | 'FAILURE';

/**
 * Components of the claude-mem system for categorical logging.
 */
export type Component =
  | 'HOOK'
  | 'WORKER'
  | 'SDK'
  | 'PARSER'
  | 'DB'
  | 'SYSTEM'
  | 'HTTP'
  | 'SESSION'
  | 'CHROMA'
  | 'CHROMA_MCP'
  | 'CHROMA_SYNC'
  | 'FOLDER_INDEX'
  | 'CLAUDE_MD'
  | 'QUEUE'
  | 'CURSOR'
  | 'OPENCLAW'
  | 'OPENCODE'
  | 'WINDSURF'
  | 'PROJECT_NAME'
  | 'AGENTS_MD'
  | 'CONFIG';

export interface LogContext {
  requestId?: string;
  sessionId?: string;
  projectId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: Component;
  message: string;
  context?: LogContext;
  data?: any;
  durationMs?: number;
}

const LOG_DIRECTORY = join(homedir(), '.claude-mem', 'logs');

// ---------------------------------------------------------------------------
// Logger Implementation
// ---------------------------------------------------------------------------

class Logger {
  private logFilePath: string;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    const date = new Date().toISOString().split('T')[0];
    this.logFilePath = join(LOG_DIRECTORY, `worker-${date}.log`);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!existsSync(LOG_DIRECTORY)) {
      mkdirSync(LOG_DIRECTORY, { recursive: true });
    }
  }

  /**
   * Main log dispatcher. Writes to file and optionally to console.
   */
  private log(
    level: LogLevel,
    component: Component,
    message: string,
    context?: LogContext,
    data?: any,
    durationMs?: number
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      context,
      data,
      durationMs,
    };

    // 1. Write to file
    try {
      appendFileSync(this.logFilePath, JSON.stringify(entry) + '\n');
    } catch (e) {
      // If we can't write to file, fallback to stderr
      console.error(`Failed to write to log file: ${this.logFilePath}`);
    }

    // 2. Console output (formatted for humans)
    const color = this.getLevelColor(level);
    const timeStr = pc.gray(entry.timestamp.split('T')[1].split('.')[0]);
    const compStr = pc.cyan(component.padEnd(12));
    const levelStr = color(level.padEnd(8));

    console.log(`${timeStr} ${compStr} ${levelStr} ${message}`);

    if (data && this.isDevelopment) {
      console.log(pc.gray(JSON.stringify(data, null, 2)));
    }
  }

  private getLevelColor(level: LogLevel): (text: string) => string {
    switch (level) {
      case 'DEBUG': return pc.gray;
      case 'INFO': return pc.blue;
      case 'WARN': return pc.yellow;
      case 'ERROR': return pc.red;
      case 'SUCCESS': return pc.green;
      case 'FAILURE': return pc.red;
      case 'TIMING': return pc.magenta;
      case 'DATA_IN': return pc.cyan;
      case 'DATA_OUT': return pc.cyan;
      default: return pc.white;
    }
  }

  // Helper methods
  debug(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('DEBUG', component, message, context, data);
  }

  info(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('INFO', component, message, context, data);
  }

  warn(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('WARN', component, message, context, data);
  }

  error(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('ERROR', component, message, context, data);
  }

  dataIn(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('DATA_IN', component, message, context, data);
  }

  dataOut(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('DATA_OUT', component, message, context, data);
  }

  success(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('SUCCESS', component, message, context, data);
  }

  failure(component: Component, message: string, context?: LogContext, data?: any): void {
    this.log('FAILURE', component, message, context, data);
  }

  timing(component: Component, message: string, durationMs: number, context?: LogContext): void {
    this.log('TIMING', component, message, context, undefined, durationMs);
  }

  /**
   * Handle unexpected errors by logging and formatting.
   * @param component - Component where error occurred
   * @param error - The error object or message
   */
  handleError(
    component: Component,
    message: string,
    error: any,
    context?: LogContext
  ): void {
    const errorData = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error;

    this.error(component, `${message}: ${error instanceof Error ? error.message : error}`, context, errorData);
  }
}

export const logger = new Logger();
