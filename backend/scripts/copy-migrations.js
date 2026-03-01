const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'database', 'migrations');
const dest = path.join(__dirname, '..', 'dist', 'database', 'migrations');

fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(src).filter(f => f.endsWith('.sql'));
files.forEach(f => fs.copyFileSync(path.join(src, f), path.join(dest, f)));
console.log(`Copied ${files.length} migration file(s) to dist/database/migrations`);
