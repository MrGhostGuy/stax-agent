const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');
const jsMatch = code.match(/<script>([\s\S]+?)<\/script>/);
const js = jsMatch[1];
const lines = js.split('\n');

// Find all let/const declarations
const declarations = [];
lines.forEach((l, i) => {
  const m = l.match(/(?:let|const)\s+(\w+)/);
  if (m) declarations.push({ name: m[1], line: i+1, text: l.trim().substring(0, 80) });
});

// Find all function declarations
const functions = [];
lines.forEach((l, i) => {
  const m = l.match(/function\s+(\w+)\s*\(/);
  if (m) functions.push({ name: m[1], line: i+1 });
});

console.log('=== Declarations ===');
declarations.forEach(d => console.log(`L${d.line}: ${d.name} = ${d.text}`));
console.log('\n=== Functions ===');
functions.forEach(f => console.log(`L${f.line}: ${f.name}()`));
