'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AppShell.module.css';

const NAV_PLACEHOLDERS = ['Tasks', 'Documents'];

export function AppShell({
  children,
  userName,
  canViewDepartments,
  canViewEmployees,
  canViewSkills,
  canViewClients,
  canViewServices,
}: {
  children: ReactNode;
  userName: string;
  canViewDepartments: boolean;
  canViewEmployees: boolean;
  canViewSkills: boolean;
  canViewClients: boolean;
  canViewServices: boolean;
}) {
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    ...(canViewDepartments ? [{ href: '/departments', label: 'Departments' }] : []),
    ...(canViewEmployees ? [{ href: '/employees', label: 'Employees' }] : []),
    ...(canViewSkills ? [{ href: '/skills', label: 'Skills' }] : []),
    ...(canViewClients ? [{ href: '/clients', label: 'Clients' }] : []),
    ...(canViewServices ? [{ href: '/services', label: 'Services' }] : []),
  ];

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
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
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Log out ({userName})
        </button>
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
            {navLinks.map((link) => (
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
