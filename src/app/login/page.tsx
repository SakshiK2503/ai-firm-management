import { redirect } from 'next/navigation';
import { getCurrentUserFromCookies } from '@/modules/kernel/auth/session';
import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  const user = await getCurrentUserFromCookies();
  if (user) {
    redirect('/');
  }

  return <LoginForm />;
}
