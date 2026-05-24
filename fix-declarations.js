const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');

// Extract the JS from the inline script tag
const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) { console.log('No script found!'); process.exit(1); }

let js = scriptMatch[1];

// Find all let/const declarations that are NOT inside a function body
// We need to find declarations at the top level of the script
const lines = js.split('\n');

// Collect top-level let/const declarations and their lines
const topLevelDeclarations = [];
const declarationLines = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  // Match let/const declarations at the start of a line (not inside a block)
  const match = line.match(/^(?:let|const)\s+(.+?)(?:;|$)/);
  if (match) {
    topLevelDeclarations.push({ line: i, text: match[0] });
    declarationLines.add(i);
  }
}

console.log(`Found ${topLevelDeclarations.length} top-level declarations`);
topLevelDeclarations.forEach(d => console.log(`L${d.line + 1}: ${d.text.substring(0, 60)}`));

// Remove the declaration lines from their current positions
// (but keep the initialization part for non-trivial cases)
const newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (declarationLines.has(i)) {
    // Replace with empty line to preserve line numbers
    newLines.push('');
  } else {
    newLines.push(lines[i]);
  }
}

// Build the declaration block
const declBlock = topLevelDeclarations.map(d => d.text).join('\n');

// Find the position right after the first line (console.log + const API line)
const firstLineEnd = newLines[0].length + 1; // +1 for newline
const newJs = newLines[0] + '\n' + declBlock + '\n' + newLines.slice(1).join('\n');

// Replace the script content
const newHtml = html.replace(scriptMatch[1], newJs);

fs.writeFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', newHtml, 'utf8');
console.log('\nDone! All declarations moved to top of script.');
