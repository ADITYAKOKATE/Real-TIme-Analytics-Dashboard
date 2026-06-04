import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'PulseMetrics — Real-Time Analytics Dashboard',
  description: 'Monitor your application metrics in real-time with Kafka-powered event streaming, beautiful D3.js charts, and configurable intelligent alerts.',
  keywords: 'analytics, real-time, dashboard, metrics, kafka, monitoring',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
