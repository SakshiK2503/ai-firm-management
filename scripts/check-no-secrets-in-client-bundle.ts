import 'dotenv/config';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Verifies the actual build output, not just source code: scans .next/static (the client
 * bundle - what genuinely ships to the browser) for the real DATABASE_URL/SHADOW_DATABASE_URL
 * values. Run after `npm run build`. This is the automated check for Day 16's acceptance
 * criterion ("no secrets exposed client-side") - the `server-only` guards on db.ts/session.ts/
 * password.ts are the prevention, this is the verification.
 */

const CLIENT_BUNDLE_DIR = join(process.cwd(), '.next', 'static');

function collectJsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return collectJsFiles(fullPath);
    return fullPath.endsWith('.js') ? [fullPath] : [];
  });
}

const secretsToCheck = [process.env.DATABASE_URL, process.env.SHADOW_DATABASE_URL].filter(
  (value): value is string => Boolean(value),
);

if (secretsToCheck.length === 0) {
  console.error('No DATABASE_URL/SHADOW_DATABASE_URL in env - nothing to check against.');
  process.exit(1);
}

let files: string[];
try {
  files = collectJsFiles(CLIENT_BUNDLE_DIR);
} catch {
  console.error(`${CLIENT_BUNDLE_DIR} doesn't exist - run "npm run build" first.`);
  process.exit(1);
}

let foundSecret = false;
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const secret of secretsToCheck) {
    if (content.includes(secret)) {
      console.error(`Found a secret value in client bundle: ${file}`);
      foundSecret = true;
    }
  }
}

if (foundSecret) {
  process.exit(1);
}

console.log(`Checked ${files.length} client bundle files - no secrets found.`);
