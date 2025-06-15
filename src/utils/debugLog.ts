/**
 * debugLog.ts
 * 
 * This simple logging tool lets us control all debug messages in one place.
 * When you run the game, it can output to console, but you can later save the log file for me to help debug.
 */

const debugLog = {
  // If true, logs show up in console. If false, they don't.
  enabled: true,

  // Save all log entries here.
  logs: [] as string[],

  // Main log function. Call this to log a message.
  log(message: string) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}`;
    this.logs.push(entry);
    if (this.enabled) {
      console.log(entry);
    }
  },

  // Turn logging on or off.
  setEnabled(value: boolean) {
    this.enabled = value;
  },

  // Get all logs at once (for saving later)
  getLogs() {
    return this.logs.join('\n');
  }
};

export default debugLog;
