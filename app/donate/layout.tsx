import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Support Khalid Albaih',
  description: 'Support the artist by donating and receive exclusive digital content.',
};

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}