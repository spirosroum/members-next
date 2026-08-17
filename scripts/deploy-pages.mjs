// Builds all three portals and stages them for GitHub Pages (project site):
//
//   dist/
//     index.html   ← kiosk (Vite base /members-next/)
//     admin/       ← admin portal (base /members-next/admin/)
//     member/      ← member portal (base /members-next/member/)
//
// Usage:
//   node scripts/deploy-pages.mjs
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

console.log('Building all portals…');
execSync('pnpm build', { cwd: root, stdio: 'inherit' });

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Kiosk at the site root; admin + member in subpaths.
cpSync(join(root, 'apps', 'kiosk', 'dist'), dist, { recursive: true });
cpSync(join(root, 'apps', 'member', 'dist'), join(dist, 'member'), { recursive: true });
cpSync(join(root, 'apps', 'admin', 'dist'), join(dist, 'admin'), { recursive: true });

console.log(`Staged deploy in ${dist}`);
