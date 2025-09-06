const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('--- Starting restoration ---');

// Only run if marker file exists
if (!fs.existsSync(path.join(__dirname, '..', '.enable-obfuscation'))) {
  console.log('Restoration not enabled for this environment');
  process.exit(0);
}

const backupDir = path.join('.git', 'originals');
const originalFiles = glob.sync(path.join(backupDir, '**', '*.ts'));

if (originalFiles.length === 0) {
  console.log('No files to restore');
  process.exit(0);
}

let restoredCount = 0;

originalFiles.forEach(backupPath => {
  try {
    const targetPath = backupPath.replace(backupDir + path.sep, '');
    const content = fs.readFileSync(backupPath, 'utf8');
    
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
    restoredCount++;
    console.log(`✔ Restored ${targetPath}`);
  } catch (error) {
    console.error(`✖ Error restoring ${backupPath}:`, error.message);
  }
});

console.log(`--- Restoration complete: ${restoredCount} files restored ---`);