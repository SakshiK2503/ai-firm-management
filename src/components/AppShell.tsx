'use client';

import { useState, type ReactNode } from 'react';
import styles from './AppShell.module.css';

const NAV_LINKS = [{ href: '/', label: 'Dashboard' }];

const NAV_PLACEHOLDERS = ['Clients', 'Tasks', 'Documents'];

export function AppShell({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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
