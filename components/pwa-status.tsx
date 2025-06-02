"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Download } from "lucide-react"

export function PWAStatus() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Mark as client-side rendered
    setIsClient(true)

    // Only run on client side
    if (typeof window === "undefined") return

    // Listen for service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        setUpdateAvailable(true)
      })
    }
  }, [])

  const handleUpdate = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  // Don't render anything during SSR
  if (!isClient) {
    return null
  }

  // Only show update notification when available
  if (!updateAvailable) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {/* Update Available */}
      <Badge variant="outline" className="gap-1 text-xs cursor-pointer hover:bg-accent" onClick={handleUpdate}>
        <Download className="h-3 w-3" />
        Update
      </Badge>
    </div>
  )
}
