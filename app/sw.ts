/// <reference lib="webworker" />

const CACHE_NAME = "cornell-notes-v1"
const STATIC_CACHE_NAME = "cornell-notes-static-v1"

// Assets to cache immediately
const STATIC_ASSETS = [
  "/",
  "/editor",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/fonts/HelveticaNeue-Regular.ttf",
  "/fonts/HelveticaNeue-Bold.ttf",
  "/fonts/Charter-Regular.ttf",
  "/fonts/Charter-Bold.ttf",
]

// Runtime cache patterns
const RUNTIME_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:js|css)$/,
]

declare const self: ServiceWorkerGlobalScope

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches
        .open(STATIC_CACHE_NAME)
        .then((cache) => {
          console.log("Caching static assets")
          return cache.addAll(STATIC_ASSETS.map((url) => new Request(url, { cache: "reload" })))
        }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ]),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((cacheName) => cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME)
              .map((cacheName) => {
                console.log("Deleting old cache:", cacheName)
                return caches.delete(cacheName)
              }),
          )
        }),
      // Take control of all clients
      self.clients.claim(),
    ]),
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return
  }

  event.respondWith(handleFetch(request))
})

async function handleFetch(request: Request): Promise<Response> {
  const url = new URL(request.url)

  try {
    // For navigation requests (HTML pages)
    if (request.mode === "navigate") {
      return await handleNavigationRequest(request)
    }

    // For static assets
    if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
      return await handleStaticAsset(request)
    }

    // For runtime cacheable resources
    if (RUNTIME_CACHE_PATTERNS.some((pattern) => pattern.test(request.url))) {
      return await handleRuntimeCache(request)
    }

    // For everything else, try network first
    return await fetch(request)
  } catch (error) {
    console.error("Fetch failed:", error)

    // Return offline fallback for navigation requests
    if (request.mode === "navigate") {
      const cache = await caches.open(STATIC_CACHE_NAME)
      const fallback = await cache.match("/")
      return fallback || new Response("Offline", { status: 503 })
    }

    throw error
  }
}

async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request)

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // Ultimate fallback to home page
    const homeResponse = await cache.match("/")
    return homeResponse || new Response("Offline", { status: 503 })
  }
}

async function handleStaticAsset(request: Request): Promise<Response> {
  // Cache first for static assets
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  // Fallback to network
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    throw error
  }
}

async function handleRuntimeCache(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)

  try {
    // Try network first
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag)

  if (event.tag === "sync-notes") {
    event.waitUntil(syncNotes())
  }
})

async function syncNotes() {
  try {
    // Get pending sync data from IndexedDB
    // This would sync any offline changes when connection is restored
    console.log("Syncing notes...")

    // Implementation would depend on your sync strategy
    // For now, just log that sync was attempted
  } catch (error) {
    console.error("Sync failed:", error)
  }
}

// Push notifications (optional)
self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    tag: data.tag || "cornell-notes",
    data: data.data || {},
    actions: [
      {
        action: "open",
        title: "Open App",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title || "Cornell Notes", options))
})

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "open" || !event.action) {
    event.waitUntil(self.clients.openWindow("/"))
  }
})
