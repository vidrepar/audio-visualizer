/**
 * Copies the site into dist/, which is what gets deployed to Cloudflare Pages.
 *
 * There is nothing to compile: the app is plain ES modules and CSS that the
 * browser loads directly, so the build only picks the files that belong in a
 * deployment.
 */

import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

// Source path -> path inside dist/.
const entries = [
    ['index.html', 'index.html'],
    ['_headers', '_headers'],
    ['css', 'css'],
    ['js', 'js'],
    ['assets/audio', 'assets/audio'],
    ['assets/fonts/icomoon.eot', 'assets/fonts/icomoon.eot'],
    ['assets/fonts/icomoon.svg', 'assets/fonts/icomoon.svg'],
    ['assets/fonts/icomoon.ttf', 'assets/fonts/icomoon.ttf'],
    ['assets/fonts/icomoon.woff', 'assets/fonts/icomoon.woff']
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const [from, to] of entries) {
    const target = join(dist, to);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(root, from), target, { recursive: true });
}

let bytes = 0;
let files = 0;

async function measure(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) await measure(path);
        else {
            bytes += (await stat(path)).size;
            files++;
        }
    }
}

await measure(dist);
console.log(`Built dist/ - ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
