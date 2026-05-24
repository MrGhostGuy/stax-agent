const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) { console.log('No script found!'); process.exit(1); }

let js = scriptMatch[1];

// The issue: top-level let/const declarations that are referenced by functions
// defined earlier in the file cause TDZ errors when the JS is inlined.
// 
// The specific problematic variables are:
// officeLogs, officeComms, agentPositions, subagentData
// 
// These are declared with let at the bottom of the file but referenced by
// storeAgentLog/storeAgentComm which are called from loadAll() at the top.
//
// Fix: Change ONLY these specific let declarations to var

const fixes = [
  { name: 'officeLogs', pattern: /let officeLogs=\{\};/ },
  { name: 'officeComms', pattern: /let officeComms=\{\};/ },
  { name: 'agentPositions', pattern: /let agentPositions=\{\};/ },
  { name: 'subagentData', pattern: /let subagentData=\[\];/ },
];

fixes.forEach(f => {
  const match = js.match(f.pattern);
  if (match) {
    js = js.replace(f.pattern, `var ${f.name}=${f.name === 'subagentData' ? '[]' : '{}';`);
    console.log(`Fixed: ${f.name} (was at position ${match.index})`);
  } else {
    console.log(`NOT FOUND: ${f.name}`);
  }
});

const newHtml = html.replace(scriptMatch[1], js);
fs.writeFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', newHtml, 'utf8');
console.log('Done!');
