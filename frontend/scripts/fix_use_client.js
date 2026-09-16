const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'dist' && file !== '.git') {
        results = results.concat(walk(full));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk(__dirname + '/../');
let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('"use client"') || content.includes("'use client'")) {
    const lines = content.split('\n');
    const clientDirectiveIdx = lines.findIndex(l => l.trim() === '"use client";' || l.trim() === "'use client';" || l.trim() === '"use client"' || l.trim() === "'use client'");
    if (clientDirectiveIdx > 0) {
      // It's not at line 0!
      const directive = lines[clientDirectiveIdx];
      lines.splice(clientDirectiveIdx, 1);
      lines.unshift(directive);
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      console.log('Fixed "use client" position in:', path.relative(__dirname + '/../', file));
      fixedCount++;
    }
  }
});

console.log(`Finished checking. Fixed ${fixedCount} files.`);
