import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Memora',
  description: 'Make personal memories and life admin instantly answerable—with verifiable evidence—while staying private by default.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
