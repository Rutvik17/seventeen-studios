'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Sends the visitor on to `to`, replacing this page in the history. */
export function SendOn({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return null;
}
