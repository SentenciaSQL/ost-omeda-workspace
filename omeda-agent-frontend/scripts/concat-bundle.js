// =============================================================
// FILE: scripts/concat-bundle.js
//
// Concatenates Angular's build output into a single
// `omeda-chatbot.js` file that can be loaded via <script>.
//
// Usage: node scripts/concat-bundle.js
// Called by: npm run build:elements
// =============================================================

const fs = require('fs');
const path = require('path');

// Angular 18 outputs to dist/<project-name>/browser/
const distDir = path.resolve(__dirname, '..', 'dist', 'omeda-agent-frontend', 'browser');
const outFile = path.resolve(__dirname, '..', 'dist', 'omeda-chatbot.js');

if (!fs.existsSync(distDir)) {
  console.error(`❌ Build output not found at: ${distDir}`);
  console.error('   Run "ng build --configuration production" first.');
  process.exit(1);
}

// Gather all JS files from the build output
const jsFiles = fs.readdirSync(distDir)
  .filter(f => f.endsWith('.js'))
  .sort((a, b) => {
    // Ensure polyfills load first, then main
    if (a.includes('polyfills')) return -1;
    if (b.includes('polyfills')) return 1;
    if (a.includes('main')) return 1;
    if (b.includes('main')) return -1;
    return 0;
  });

if (jsFiles.length === 0) {
  console.error('❌ No JS files found in build output.');
  process.exit(1);
}

console.log('📦 Concatenating build files:');
jsFiles.forEach(f => console.log(`   • ${f}`));

let bundle = '';

// Add a self-executing wrapper to avoid global scope pollution
bundle += '(function(){\n';

for (const file of jsFiles) {
  const filePath = path.join(distDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  bundle += `// --- ${file} ---\n`;
  bundle += content + '\n';
}

bundle += '})();\n';

// Write the single bundle
fs.writeFileSync(outFile, bundle, 'utf-8');

const sizeKb = (Buffer.byteLength(bundle, 'utf-8') / 1024).toFixed(1);
console.log(`\n✅ Bundle written to: ${outFile}`);
console.log(`   Size: ${sizeKb} KB`);
console.log(`\n💡 To test: serve dist/ and load <script src="omeda-chatbot.js"><\/script>`);
