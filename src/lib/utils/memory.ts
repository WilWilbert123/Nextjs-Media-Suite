/**
 * Utility functions for memory management and cleanup,
 * especially important for mobile browsers running heavy WASM tasks.
 */

export function getWasmConcurrency(): number {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return 1; // Default for server or unknown environments
  }

  const hardwareConcurrency = navigator.hardwareConcurrency || 2;

  // Mobile viewport guardrail
  if (window.innerWidth < 768) {
    return Math.min(hardwareConcurrency, 2);
  }

  // Desktop viewport guardrail
  return Math.min(hardwareConcurrency, 8); // Cap desktop to 8 threads to prevent OOM
}

export function revokeObjectURLs(urls: (string | null | undefined)[]) {
  urls.forEach((url) => {
    if (url && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Error revoking object URL:", e);
      }
    }
  });
}
