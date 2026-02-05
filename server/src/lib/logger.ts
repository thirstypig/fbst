
/**
 * Simple structured logger following the requested pattern.
 */
export const logger = {
  info: (metadata: Record<string, unknown>, message: string) => {
    console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), ...metadata, message }));
  },
  error: (metadata: Record<string, unknown>, message: string) => {
    console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), ...metadata, message }));
  },
  warn: (metadata: Record<string, unknown>, message: string) => {
    console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), ...metadata, message }));
  },
  debug: (metadata: Record<string, unknown>, message: string) => {
    if (process.env.DEBUG) {
      console.log(JSON.stringify({ level: 'DEBUG', timestamp: new Date().toISOString(), ...metadata, message }));
    }
  }
};
