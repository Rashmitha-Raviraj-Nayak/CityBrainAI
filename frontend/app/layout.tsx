import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'CityBrain OS',
  description: 'AI-powered predictive civic operations intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AuthShell>{children}</AuthShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
