import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ============= FORENSIC DEBUG: REMOUNT DETECTION =============
const MOUNT_ID = `main_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
console.log(`%c[FORENSIC] main.tsx EXECUTED - ID: ${MOUNT_ID}`, 'background: #ff0000; color: white; font-size: 16px; padding: 4px;');
console.log(`[FORENSIC] main.tsx - timestamp: ${new Date().toISOString()}`);
console.log(`[FORENSIC] main.tsx - document.visibilityState: ${document.visibilityState}`);
console.log(`[FORENSIC] main.tsx - window.location: ${window.location.href}`);

// Track visibility changes that might trigger issues
document.addEventListener('visibilitychange', () => {
  console.log(`%c[FORENSIC] VISIBILITY CHANGED: ${document.visibilityState}`, 'background: #ff6600; color: white; padding: 2px;');
  console.log(`[FORENSIC] visibility - timestamp: ${new Date().toISOString()}`);
});

// Track if the page was unloaded/reloaded
window.addEventListener('beforeunload', () => {
  console.log(`%c[FORENSIC] BEFOREUNLOAD FIRED`, 'background: #ff0000; color: white; padding: 2px;');
});

// Track focus events
window.addEventListener('focus', () => {
  console.log(`%c[FORENSIC] WINDOW FOCUS`, 'background: #00ff00; color: black; padding: 2px;');
});

window.addEventListener('blur', () => {
  console.log(`%c[FORENSIC] WINDOW BLUR`, 'background: #ffff00; color: black; padding: 2px;');
});

// Main entry point
createRoot(document.getElementById("root")!).render(<App />);
