import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/modules/kernel/auth/session';

/** Used at the top of a protected layout/page: redirects to /login if there's no valid
 * session, otherwise returns the current user. */
export async function requireUser() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect('/login');
  }
  return user;
}
