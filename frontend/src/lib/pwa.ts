/** Single guarded service-worker registrar. Never registers in dev, preview or iframes. */
export async function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refused) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/sw.js"))
        .map((r) => r.unregister()),
    );
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    /* offline mode unavailable; app still works online */
  }
}
