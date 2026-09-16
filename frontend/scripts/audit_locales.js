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
let numericCalls = [];
let dateCalls = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('.toLocaleString(')) {
      if (line.includes('new Date(') || line.includes('date.') || line.includes('Date(') || line.includes('{ month:') || line.includes('timestamp') || line.includes('connectedAt')) {
        dateCalls.push({ file: path.relative(__dirname + '/../', file), line: idx + 1, content: line.trim() });
      } else {
        numericCalls.push({ file: path.relative(__dirname + '/../', file), line: idx + 1, content: line.trim() });
      }
    }
  });
});

console.log('Total numeric .toLocaleString occurrences:', numericCalls.length);
console.log('Total date .toLocaleString occurrences:', dateCalls.length);
numericCalls.forEach(c => console.log(`${c.file}:${c.line} -> ${c.content}`));
