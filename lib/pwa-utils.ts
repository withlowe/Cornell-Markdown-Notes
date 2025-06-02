// PWA utility functions

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        })

        console.log("Service Worker registered successfully:", registration.scope)

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available
                console.log("New content available, please refresh")

                // You could show a notification here
                if (window.confirm("New version available! Refresh to update?")) {
                  window.location.reload()
                }
              }
            })
          }
        })
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    })
  }
}

export function unregisterServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister()
    })
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
}

export function canInstall(): boolean {
  if (typeof window === "undefined") return false

  // Check if already installed
  if (isStandalone()) return false

  // Check if browser supports PWA installation
  return "serviceWorker" in navigator && "PushManager" in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }

  if (Notification.permission === "default") {
    return await Notification.requestPermission()
  }

  return Notification.permission
}

export function showNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return
  }

  if (Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icon-192x192.png",
      badge: "/icon-72x72.png",
      ...options,
    })
  }
}

// Background sync for offline actions
export function scheduleBackgroundSync(tag: string) {
  if ("serviceWorker" in navigator && "sync" in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return (registration as any).sync.register(tag)
      })
      .catch((error) => {
        console.error("Background sync registration failed:", error)
      })
  }
}

// Check for app updates
export async function checkForUpdates(): Promise<boolean> {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      return registration.waiting !== null
    }
  }
  return false
}

// Force update
export function forceUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" })
      }
    })
  }
}
