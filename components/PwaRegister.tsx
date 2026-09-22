'use client'

import { useEffect, useState } from 'react'
import { Download, X, HelpCircle, CheckCircle, Share } from 'lucide-react'

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 1. Cek jika aplikasi sudah terpasang (Standalone Mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) {
      return
    }

    // 2. Deteksi iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIosDevice)

    // 3. Registrasi Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registered with scope:', registration.scope)
        })
        .catch((err) => {
          console.warn('ServiceWorker registration warning:', err)
        })
    }

    // 4. Tangkap event beforeinstallprompt (Chrome / Edge / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Tampilkan banner setelah jeda singkat jika belum pernah ditutup sesi ini
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed')
    if (!dismissed) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true)
      }, 1200)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallBanner(false)
      }
      setDeferredPrompt(null)
    } else {
      // Jika browser tidak mendukung direct prompt API (misal Safari iOS atau Desktop manual)
      setShowInstructions(true)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  if (!showInstallBanner) return null

  return (
    <>
      {/* Banner Notifikasi Install di Bawah */}
      <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-indigo-100 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
            <Download className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Pasang Aplikasi TodoList</span>
              <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              Install untuk akses offline & ikon di layar utama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-200 transition"
          >
            Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Panduan jika browser belum memicu prompt otomatis */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-slate-800">Cara Memasang Aplikasi</h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-600">
                <p>Untuk pengguna iPhone / iPad (Safari):</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Tap tombol <strong className="text-indigo-600">Bagikan (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1" /> di bagian bawah layar Safari.
                  </li>
                  <li>
                    Gulir ke bawah dan pilih <strong className="text-slate-800">&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-indigo-600">Tambah</strong> di pojok kanan atas.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600">
                <p>Untuk pengguna Chrome / Edge di Desktop atau Android:</p>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>
                    Klik ikon <strong className="text-indigo-600">Install (+)</strong> atau ikon komputer di sebelah kanan bilah alamat (address bar) browser Anda.
                  </li>
                  <li>
                    Atau klik menu titik tiga browser di pojok kanan atas &gt; pilih <strong className="text-slate-800">&quot;Install Aplikasi&quot;</strong> atau <strong className="text-slate-800">&quot;Tambahkan ke Layar Utama&quot;</strong>.
                  </li>
                </ol>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
