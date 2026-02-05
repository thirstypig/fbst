import os from 'os';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'server', 'logs', 'system_monitor.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function getCpuLoad() {
  const cpus = os.cpus();
  const load = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;
  return (load * 100).toFixed(2);
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usage = (used / total) * 100;
  return {
    total: (total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    free: (free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
    usage: usage.toFixed(2) + '%'
  };
}

function logSystemStats() {
  const timestamp = new Date().toISOString();
  const cpuLoad = getCpuLoad();
  const mem = getMemoryUsage();
  const uptime = (os.uptime() / 3600).toFixed(2) + ' hours';

  const logEntry = `[${timestamp}] CPU: ${cpuLoad}% | Mem: ${mem.usage} (${mem.free} free / ${mem.total}) | Uptime: ${uptime}\n`;
  
  // Also log to console for immediate feedback
  console.log(logEntry.trim());

  fs.appendFile(LOG_FILE, logEntry, (err) => {
    if (err) console.error('Error writing to log file:', err);
  });
}

// Run once immediately
logSystemStats();
