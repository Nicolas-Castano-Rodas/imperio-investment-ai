import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'Investment Intelligence AI | EL IMPERIO — Los Reyes del Software', authors: [{ name: 'EL IMPERIO — Los Reyes del Software' }], creator: 'EL IMPERIO — Los Reyes del Software', description: 'Laboratorio de inversión y seguimiento de mercados' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body>{children}</body></html>;
}
