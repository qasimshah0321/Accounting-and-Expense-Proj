const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', '..', 'nextjs-accounting-app', 'out');
const dest = path.join(__dirname, '..', 'dist', 'public');

if (!fs.existsSync(src)) {
  console.error(`Frontend build not found at: ${src}`);
  console.error('Run "npm run build" in nextjs-accounting-app first.');
  process.exit(1);
}

function copyDirSync(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirSync(src, dest);
console.log(`Frontend copied from ${src} → ${dest}`);
