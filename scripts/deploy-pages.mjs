// Builds all three portals and stages them for GitHub Pages:
//
//   dist/
//     index.html          ← kiosk (site root)
//     admin/              ← admin portal
//     member/             ← member portal
//
// Usage:
//   node scripts/deploy-pages.mjs
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

console.log('Building all portals…');
execSync('pnpm build', { cwd: root, stdio: 'inherit' });

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Kiosk at the site root.
cpSync(join(root, 'apps', 'kiosk', 'dist'), join(dist, 'kiosk'), { recursive: true });
// Member + admin into their subpaths.
cpSync(join(root, 'apps', 'member', 'dist'), join(dist, 'member'), { recursive: true });
cpSync(join(root, 'apps', 'admin', 'dist'), join(dist, 'admin'), { recursive: true });

// GitHub Pages serves index.html at the root; redirect / → /kiosk/.
writeFileSync(
  join(dist, 'index.html'),
  `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/kiosk/">`
);

console.log(`Staged deploy in ${dist}`);
