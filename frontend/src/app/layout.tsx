'use client';

import './globals.css';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/components/ui/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>DataIQ — Intelligent Dataset Analytics</title>
        <meta name="description" content="AI-powered dataset intelligence platform" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="bg-dark-bg min-h-screen font-sans">
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111122',
                color: '#e2e8f0',
                border: '1px solid #1e293b',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#111122' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#111122' } },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
