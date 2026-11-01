// Centralized Logger for Reelix Error Reporting & Telemetry
export interface LogItem {
  id: string;
  time: string;
  stepName: string;
  message: string;
  details?: string;
}

const LOG_KEY = 'reelix_error_logs_v1';

export const Logger = {
  logError: (stepName: string, error: unknown, details?: string) => {
    try {
      const logs = Logger.getLogs();
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      const newItem: LogItem = {
        id: Math.random().toString(36).slice(2, 9),
        time: new Date().toISOString(),
        stepName,
        message,
        details: details || stack,
      };
      const updated = [newItem, ...logs].slice(0, 200);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOG_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore storage write errors
    }
  },

  getLogs: (): LogItem[] => {
    try {
      if (typeof window === 'undefined') return [];
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  clearLogs: () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LOG_KEY);
      }
    } catch {}
  },
};
