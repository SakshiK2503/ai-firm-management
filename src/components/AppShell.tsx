'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styles from './AppShell.module.css';

const NAV_LINKS = [{ href: '/', label: 'Dashboard' }];

const NAV_PLACEHOLDERS = ['Clients', 'Tasks', 'Documents'];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // AppShell lives in the root layout, so it doesn't remount on client-side navigation (e.g.
  // /login -> / after signing in) - re-check auth state on every route change, not just once.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: { name: string } } | null) => {
        if (!cancelled) setCurrentUserName(data?.user?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentUserName(null);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setCurrentUserName(null);
    router.push('/login');
    router.refresh();
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isSidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {isSidebarOpen ? '✕' : '☰'}
        </button>
        <span className={styles.title}>AI Operations OS</span>
        {currentUserName && (
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Log out ({currentUserName})
          </button>
        )}
      </header>

      <div className={styles.body}>
        <div
          className={isSidebarOpen ? styles.backdropVisible : styles.backdrop}
          onClick={() => setSidebarOpen(false)}
        />
        <nav
          className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}
          aria-label="Primary"
        >
          <ul className={styles.navList}>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.navLink}
                  onClick={() => setSidebarOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            {NAV_PLACEHOLDERS.map((label) => (
              <li key={label}>
                <span className={styles.navPlaceholder}>{label} (coming soon)</span>
              </li>
            ))}
          </ul>
        </nav>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
