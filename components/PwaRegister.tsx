'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // 1. Registrasi Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed: ', err)
        })
      })
    } else if ('serviceWorker' in navigator) {
      // Izinkan registrasi di development untuk testing jika diinginkan
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // 2. Tangkap event beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showInstallBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 p-4 bg-white rounded-2xl shadow-2xl border border-indigo-100 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-200">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Pasang Aplikasi TodoList</p>
          <p className="text-[11px] text-slate-500">Akses cepat langsung dari layar utama / desktop</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          Install
        </button>
        <button
          type="button"
          onClick={() => setShowInstallBanner(false)}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

