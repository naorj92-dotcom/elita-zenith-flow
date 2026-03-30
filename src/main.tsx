import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Guard: unregister service workers in preview/iframe contexts to prevent blank screens
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("id-preview--");

if ((isPreviewHost || isInIframe) && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

const rootEl = document.getElementById("root");

const showFatalFallback = (reason: string) => {
  if (!rootEl) return;

  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:hsl(var(--background));color:hsl(var(--foreground));font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="max-width:560px;width:100%;text-align:center;border:1px solid hsl(var(--border));border-radius:16px;padding:24px;background:hsl(var(--card));">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;">App failed to load</h1>
        <p style="margin:0 0 12px;font-size:14px;opacity:0.85;">A runtime error prevented the interface from rendering.</p>
        <p style="margin:0 0 18px;font-size:12px;opacity:0.75;word-break:break-word;">${reason || "Unknown runtime error"}</p>
        <button id="reload-app-btn" style="padding:10px 16px;border-radius:999px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:hsl(var(--foreground));cursor:pointer;">Reload</button>
      </div>
    </div>
  `;

  document.getElementById("reload-app-btn")?.addEventListener("click", () => {
    window.location.reload();
  });
};

window.addEventListener("error", (event) => {
  if (!event.error || !rootEl) return;
  if (rootEl.childElementCount > 0) return;
  const message = event.error instanceof Error ? event.error.message : String(event.message || "Runtime error");
  showFatalFallback(message);
});

window.addEventListener("unhandledrejection", (event) => {
  if (!rootEl) return;
  if (rootEl.childElementCount > 0) return;
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? "Unhandled promise rejection");
  showFatalFallback(reason);
});

if (!rootEl) {
  throw new Error("Root element #root was not found");
}

try {
  createRoot(rootEl).render(<App />);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Fatal app bootstrap error:", error);
  showFatalFallback(message);
}
