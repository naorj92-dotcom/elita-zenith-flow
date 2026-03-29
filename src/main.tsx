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

createRoot(document.getElementById("root")!).render(<App />);
