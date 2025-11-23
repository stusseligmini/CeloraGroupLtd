/**
 * Telegram Mini App Layout
 */

'use client';

import { useEffect } from 'react';
import { initTelegramWebApp, getTelegramTheme } from '@/lib/telegram/webapp';
import { AuthProvider } from '@/providers/AuthProvider';
import '../globals.css';

export default function TelegramLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize Telegram WebApp
    initTelegramWebApp();
    
    // Apply Telegram theme
    const theme = getTelegramTheme();
    if (theme) {
      document.documentElement.classList.add(theme.colorScheme);
      
      // Apply Telegram color variables
      if (theme.colors.bg_color) {
        document.documentElement.style.setProperty('--tg-bg', theme.colors.bg_color);
      }
      if (theme.colors.text_color) {
        document.documentElement.style.setProperty('--tg-text', theme.colors.text_color);
      }
      if (theme.colors.button_color) {
        document.documentElement.style.setProperty('--tg-button', theme.colors.button_color);
      }
    }
  }, []);
  
  return (
    <html lang="en">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body className="telegram-mini-app">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

















