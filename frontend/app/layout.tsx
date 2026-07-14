import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CityBrain OS',
  description: 'AI-powered predictive civic operations intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
