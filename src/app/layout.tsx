import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '../providers/AuthProvider'
import { ThemeProvider } from '../providers/ThemeProvider'
import { ToastProvider } from '../providers/ToastProvider'
import { DevToolsWarning } from '../components/security/DevToolsWarning'
import ErrorBoundary from '../components/ErrorBoundary'
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration'
import { TelemetryProvider } from '../components/TelemetryProvider'
import { TelegramMiniAppProvider } from '../components/telegram/TelegramMiniAppProvider'
import { AppCheckProvider } from '../providers/AppCheckProvider'
import { headers } from 'next/headers'
import { CspNonceProvider } from '../lib/cspHelpers'

export const metadata: Metadata = {
  title: 'Celora',
  description: 'Mobile-first wallet and notification hub for Celora users',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Celora'
  },
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the CSP nonce from headers (set by middleware)
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';
  
  return (
    <html lang="en" className="dark">
      <head>
        {/* Make nonce available to client components via meta tag */}
        <meta name="csp-nonce" content={nonce} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes" />
        {/* iOS: prevent phone/email auto-link styling and improve mobile experience */}
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        {/* Browser UI colors */}
        <meta name="theme-color" content="#0a0e17" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: light)" />
        {/* AGGRESSIVE mobile cache busting */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        {/* PWA icons for iOS/Android */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-128x128.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-96x96.png" />
      </head>
      <body className="min-h-screen bg-slate-900 antialiased">
        <ThemeProvider>
          <TelemetryProvider>
            <ErrorBoundary>
              <TelegramMiniAppProvider>
                <AuthProvider>
                  <AppCheckProvider>
                    {children}
                  </AppCheckProvider>
                </AuthProvider>
              </TelegramMiniAppProvider>
            </ErrorBoundary>
            <DevToolsWarning />
            <ToastProvider />
            <ServiceWorkerRegistration />
          </TelemetryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
