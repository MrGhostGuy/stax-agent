const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) { console.log('No script found!'); process.exit(1); }

let js = scriptMatch[1];

// Remove the specific problematic declarations from their current locations
// These are declared at the bottom but referenced by functions at the top
const varsToMove = ['officeLogs', 'officeComms', 'agentPositions', 'subagentData'];

let extracted = [];
let newJs = js;

varsToMove.forEach(varName => {
  // Find and remove the declaration
  const regex = new RegExp(`let\\s+${varName}\\s*=\\s*[^;]+;`);
  const match = newJs.match(regex);
  if (match) {
    extracted.push(match[0]);
    newJs = newJs.replace(match[0], `// ${varName} moved to top`);
    console.log(`Extracted: ${match[0]}`);
  } else {
    console.log(`NOT FOUND: ${varName}`);
  }
});

// Insert the declarations right after the first line (console.log + const API)
// Find the end of the first meaningful line
const firstLineMatch = newJs.match(/^.*$/m);
if (firstLineMatch) {
  const insertPos = firstLineMatch[0].length + 1;
  const declBlock = extracted.join('\n');
  newJs = newJs.substring(0, insertPos) + declBlock + '\n' + newJs.substring(insertPos);
}

const newHtml = html.replace(scriptMatch[1], newJs);
fs.writeFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', newHtml, 'utf8');
console.log('\nDone! Moved declarations to top.');
