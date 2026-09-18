import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { requireUser } from '@/modules/kernel/auth/require-user';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return <AppShell userName={user.name}>{children}</AppShell>;
}
