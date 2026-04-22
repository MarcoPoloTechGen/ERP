import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function renderFatalError(message: string, details?: string) {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeDetails = (details ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#fff7f7 0%,#f4eeee 100%);color:#0f172a;font-family:system-ui,sans-serif;">
      <div style="width:100%;max-width:720px;border:1px solid #fecdd3;border-radius:28px;background:rgba(255,255,255,0.96);padding:32px;box-shadow:0 20px 60px rgba(136,19,55,0.08);">
        <div style="display:inline-flex;background:#ffe4e6;color:#9f1239;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Critical error</div>
        <h1 style="margin:20px 0 0;font-size:32px;line-height:1.15;">The application could not start.</h1>
        <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#475569;">${safeMessage}</p>
        ${safeDetails ? `<pre style="margin:20px 0 0;padding:16px;background:#fff1f2;border:1px solid #fecdd3;border-radius:18px;white-space:pre-wrap;font-size:13px;line-height:1.55;color:#881337;">${safeDetails}</pre>` : ""}
        <button id="app-reload-button" style="margin-top:24px;border:0;border-radius:14px;background:#0f172a;color:white;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;">Reload page</button>
      </div>
    </div>
  `;

  document.getElementById("app-reload-button")?.addEventListener("click", () => {
    window.location.reload();
  });
}

window.addEventListener("error", (event) => {
  renderFatalError(
    "A JavaScript error blocked rendering. Reload the page. If the problem continues, verify the Supabase configuration and open the browser console.",
    event.error instanceof Error ? event.error.message : undefined,
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : typeof event.reason === "string"
        ? event.reason
        : "Unhandled promise rejection.";

  renderFatalError(
    "An async error blocked the full application startup.",
    reason,
  );
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Missing #root element.");
  }

  createRoot(rootElement).render(<App />);
} catch (error) {
  renderFatalError(
    "The initial render failed before the application could display.",
    error instanceof Error ? error.message : String(error),
  );
}
