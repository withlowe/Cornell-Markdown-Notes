"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download, X, Smartphone, Monitor } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    // Check if already dismissed this session
    if (sessionStorage.getItem("pwa-prompt-dismissed")) {
      return
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after a delay to not be intrusive
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === "accepted") {
        console.log("User accepted the install prompt")
      } else {
        console.log("User dismissed the install prompt")
      }
    } catch (error) {
      console.error("Error during installation:", error)
    } finally {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for this session - only access sessionStorage on client
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa-prompt-dismissed", "true")
    }
  }

  // Don't show if already installed or dismissed this session
  // Check sessionStorage safely
  const isDismissed = typeof window !== "undefined" ? sessionStorage.getItem("pwa-prompt-dismissed") : false
  if (isInstalled || isDismissed) {
    return null
  }

  // iOS install instructions
  if (isIOS && showPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Smartphone className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install Cornell Notes</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Tap the share button{" "}
                <span className="inline-block w-4 h-4 bg-primary/10 rounded text-center text-xs">↗</span> and select
                "Add to Home Screen"
              </p>
              <Button variant="outline" size="sm" onClick={handleDismiss} className="w-full">
                Got it
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="p-1 h-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Standard install prompt
  if (showPrompt && deferredPrompt) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Monitor className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Install Cornell Notes</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Install this app for a better experience with offline access and fullscreen mode.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleInstallClick} size="sm" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Install
                </Button>
                <Button variant="outline" size="sm" onClick={handleDismiss}>
                  Later
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="p-1 h-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
