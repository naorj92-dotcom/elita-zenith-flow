import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isPreviewHost =
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("id-preview--");

if (isPreviewHost && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });

  if ("caches" in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
