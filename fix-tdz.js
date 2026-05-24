const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) { console.log('No script found!'); process.exit(1); }

let js = scriptMatch[1];

// Replace top-level let/const with var to avoid TDZ issues
// We need to be careful to only replace declarations at the top level of the script,
// not inside function bodies.

const lines = js.split('\n');
const newLines = [];
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Count braces to track if we're inside a function/block
  for (const ch of line) {
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
  }
  
  // Only replace at top level (braceDepth === 0)
  // Match lines that start with let or const (possibly with leading whitespace)
  if (braceDepth === 0) {
    const trimmed = line.trim();
    if (trimmed.startsWith('let ') || trimmed.startsWith('const ')) {
      // Replace let/const with var
      const newLine = line.replace(/\blet\b/, 'var').replace(/\bconst\b/, 'var');
      newLines.push(newLine);
    } else {
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
}

const newJs = newLines.join('\n');

// Verify the change
const letCount = (newJs.match(/^var /gm) || []).length;
console.log(`Converted ${letCount} top-level let/const declarations to var`);

const newHtml = html.replace(scriptMatch[1], newJs);
fs.writeFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', newHtml, 'utf8');
console.log('Done!');
