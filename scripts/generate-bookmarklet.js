const fs = require('fs');
const path = require('path');

(function main() {
  const distPath = path.resolve(__dirname, '..', 'dist', 'bookmarklet.js');
  const outPath = path.resolve(__dirname, '..', 'dist', 'bookmarklet.txt');

  if (!fs.existsSync(distPath)) {
    console.error('dist/bookmarklet.js not found. Build first.');
    process.exit(1);
  }

  const code = fs.readFileSync(distPath, 'utf8')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const url = `javascript:(function(){${code.replace(/^[;(]*/,'')}})();`;
  fs.writeFileSync(outPath, url);
  console.log('Bookmarklet written to dist/bookmarklet.txt');
})();
