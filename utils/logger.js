import fs from "fs";
import path from "path";

// Simple file + console logger (no external deps)
const logDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "app.log");

function write(level, message) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp} ${level.toUpperCase()} ${message}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (err) {
    // If file write fails, still log to console
    console.error("Failed to write log:", err);
  }
  // Keep usable output on console as well
  if (level === "error") console.error(line.trim());
  else console.log(line.trim());
}

export default {
  info: (msg) =>
    write("info", typeof msg === "string" ? msg : JSON.stringify(msg)),
  warn: (msg) =>
    write("warn", typeof msg === "string" ? msg : JSON.stringify(msg)),
  error: (msg) =>
    write("error", typeof msg === "string" ? msg : JSON.stringify(msg)),
  debug: (msg) =>
    write("debug", typeof msg === "string" ? msg : JSON.stringify(msg)),
};
