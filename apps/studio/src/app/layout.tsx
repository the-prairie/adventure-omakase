import { tokensToCssVariables } from '@adventure-omakase/design-tokens';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './styles.css';

export const metadata: Metadata = {
  title: 'Adventure Omakase - Bootstrap Status',
  description: 'Technical repository bootstrap connectivity status.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" style={tokensToCssVariables()}>
      <body>{children}</body>
    </html>
  );
}
