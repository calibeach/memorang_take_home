/**
 * Enhanced logging utility for showing agent thought processes
 */

import chalk from "chalk";

/**
 * Type for loggable data - JSON-serializable values
 */
type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null;

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  THINK = "THINK",
  DECISION = "DECISION",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

interface LogEntry {
  agent: string;
  level: LogLevel;
  message: string;
  data?: LogData;
  timestamp?: Date;
}

class AgentLogger {
  private enableColors: boolean = true;
  private showTimestamp: boolean = true;
  private indentLevel: number = 0;

  constructor() {
    // Check if colors are supported
    this.enableColors = process.stdout.isTTY ?? false;
  }

  private formatTimestamp(): string {
    if (!this.showTimestamp) return "";
    return chalk.gray(`[${new Date().toISOString().slice(11, 23)}]`);
  }

  private formatLevel(level: LogLevel): string {
    const levelStr = `[${level}]`.padEnd(10);

    switch (level) {
      case LogLevel.DEBUG:
        return chalk.gray(levelStr);
      case LogLevel.INFO:
        return chalk.blue(levelStr);
      case LogLevel.THINK:
        return chalk.cyan(levelStr);
      case LogLevel.DECISION:
        return chalk.magenta(levelStr);
      case LogLevel.SUCCESS:
        return chalk.green(levelStr);
      case LogLevel.WARNING:
        return chalk.yellow(levelStr);
      case LogLevel.ERROR:
        return chalk.red(levelStr);
      default:
        return levelStr;
    }
  }

  private formatAgent(agent: string): string {
    return chalk.bold(`[${agent}]`);
  }

  private formatMessage(message: string, level: LogLevel): string {
    const indent = "  ".repeat(this.indentLevel);

    switch (level) {
      case LogLevel.THINK:
        return chalk.cyan(`${indent}💭 ${message}`);
      case LogLevel.DECISION:
        return chalk.magenta(`${indent}🎯 ${message}`);
      case LogLevel.SUCCESS:
        return chalk.green(`${indent}✅ ${message}`);
      case LogLevel.WARNING:
        return chalk.yellow(`${indent}⚠️  ${message}`);
      case LogLevel.ERROR:
        return chalk.red(`${indent}❌ ${message}`);
      default:
        return `${indent}${message}`;
    }
  }

  private formatData(data: LogData): string {
    if (!data) return "";

    const indent = "  ".repeat(this.indentLevel + 1);
    const formatted = JSON.stringify(data, null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : indent + line))
      .join("\n");

    return chalk.gray(`\n${indent}${formatted}`);
  }

  log(entry: LogEntry): void {
    const parts = [
      this.formatTimestamp(),
      this.formatLevel(entry.level),
      this.formatAgent(entry.agent),
      this.formatMessage(entry.message, entry.level),
    ].filter(Boolean);

    console.log(parts.join(" "));

    if (entry.data) {
      console.log(this.formatData(entry.data));
    }
  }

  startSection(title: string): void {
    console.log("\n" + chalk.bold.underline("=".repeat(60)));
    console.log(chalk.bold.white(title.toUpperCase()));
    console.log(chalk.bold.underline("=".repeat(60)) + "\n");
  }

  endSection(): void {
    console.log("\n" + chalk.gray("-".repeat(60)) + "\n");
  }

  indent(): void {
    this.indentLevel++;
  }

  outdent(): void {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
  }

  // Convenience methods for different log levels
  debug(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.DEBUG, message, data });
  }

  info(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.INFO, message, data });
  }

  think(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.THINK, message, data });
  }

  decision(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.DECISION, message, data });
  }

  success(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.SUCCESS, message, data });
  }

  warning(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.WARNING, message, data });
  }

  error(agent: string, message: string, data?: LogData): void {
    this.log({ agent, level: LogLevel.ERROR, message, data });
  }
}

// Export singleton instance
export const logger = new AgentLogger();

// Export convenience functions
export function logAgentThinking(agent: string, thought: string, details?: LogData): void {
  logger.think(agent, thought, details);
}

export function logAgentDecision(agent: string, decision: string, reasoning?: LogData): void {
  logger.decision(agent, decision, reasoning);
}

export function logAgentSuccess(agent: string, achievement: string, result?: LogData): void {
  logger.success(agent, achievement, result);
}

export function logAgentError(agent: string, error: string, details?: LogData): void {
  logger.error(agent, error, details);
}

export function startWorkflowSection(title: string): void {
  logger.startSection(title);
}

export function endWorkflowSection(): void {
  logger.endSection();
}
