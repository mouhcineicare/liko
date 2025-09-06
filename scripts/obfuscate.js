const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { transformSync } = require('@babel/core');
const JavaScriptObfuscator = require('javascript-obfuscator');

console.log('🚀 Starting Next.js Route Obfuscation');

// Safety check
if (!fs.existsSync(path.join(__dirname, '..', '.enable-obfuscation'))) {
  console.log('⏩ Obfuscation disabled - missing .enable-obfuscation file');
  process.exit(0);
}

const ROUTE_DIRS = [
  'app/api/admin/**/route.ts',
  'app/api/appointments/**/route.ts',
  'app/api/therapist/**/route.ts'
];

const OBFUSCATION_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  reservedNames: [
    '^GET$', '^POST$', '^PUT$', '^DELETE$', '^PATCH$', '^OPTIONS$',
    '^req$', '^res$', '^next$', '^request$', '^response$',
    '^params$', '^searchParams$'
  ],
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
};

const BACKUP_DIR = path.join('.git', 'originals');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let successCount = 0;
let errorCount = 0;

ROUTE_DIRS.forEach(pattern => {
  const files = glob.sync(pattern, { nodir: true });
  console.log(`📂 Processing ${files.length} routes in ${pattern}`);

  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Backup original
      const backupPath = path.join(BACKUP_DIR, filePath);
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.writeFileSync(backupPath, content);
      }

      // Transform TypeScript to plain JavaScript
      const transformed = transformTypeScript(content);

      // Obfuscate the transformed content
      const obfuscated = JavaScriptObfuscator.obfuscate(
        transformed,
        OBFUSCATION_OPTIONS
      ).getObfuscatedCode();

      fs.writeFileSync(filePath, obfuscated);
      successCount++;
      console.log(`✅ Obfuscated ${path.basename(filePath)}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed ${path.basename(filePath)}: ${error.message.split('\n')[0]}`);
    }
  });
});

console.log(`\n📊 Results:`);
console.log(`✔ Success: ${successCount} routes`);
console.log(`✖ Errors: ${errorCount} routes`);
console.log(`💾 Backups stored in: ${BACKUP_DIR}`);

if (errorCount > 0) {
  console.log('\n💡 Tip: Check the error messages above. Some routes may need manual adjustments.');
  process.exit(1);
}

function transformTypeScript(code) {
  // First, use Babel to strip TypeScript types while preserving async/await
  const babelResult = transformSync(code, {
    presets: [
      ['@babel/preset-typescript', { onlyRemoveTypeImports: true }],
      ['@babel/preset-env', { targets: { node: 'current' }}]
    ],
    plugins: [
      '@babel/plugin-transform-typescript',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-transform-modules-commonjs'
    ],
    retainLines: true
  });

  let transformed = babelResult.code;

  // Additional manual transformations for Next.js-specific patterns
  transformed = transformed
    // Preserve route exports
    .replace(/export (async )?function (GET|POST|PUT|DELETE|PATCH|OPTIONS)/g, 'export function $2')
    // Handle route parameters
    .replace(/\(req: Request, \{ params \}: \{ params: [^}]+ \}\)/g, '(req, { params })')
    // Handle searchParams
    .replace(/\(req: Request, \{ searchParams \}: \{ searchParams: [^}]+ \}\)/g, '(req, { searchParams })')
    // Remove remaining type annotations
    .replace(/: [a-zA-Z0-9_$<>[\]]+/g, '');

  return transformed;
}