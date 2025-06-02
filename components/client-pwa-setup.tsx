"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/pwa-utils"

export function ClientPWASetup() {
  useEffect(() => {
    // Register service worker only on client side
    registerServiceWorker()
  }, [])

  // This component doesn't render anything
  return null
}
