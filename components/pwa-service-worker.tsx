"use client"

import { useEffect } from "react"

export function PwaServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" })
    }
  }, [])
  return null
}
