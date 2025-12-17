export type LogLevel = 'INFO' | 'WARN' | 'CRIT' | 'SYS';

export interface LogMessage {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  system: string; // e.g., "NAV", "ENG", "GIFT"
}

export interface SystemStatus {
  cheerLevel: number;
  speed: number;
  cookieBuffer: number;
  reindeerSync: number;
}
