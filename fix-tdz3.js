const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) { console.log('No script found!'); process.exit(1); }

let js = scriptMatch[1];

// Fix TDZ: change specific let declarations to var
// These variables are declared at the bottom but referenced by functions at the top
js = js.replace(/let officeLogs=\{\}/, 'var officeLogs={}');
js = js.replace(/let officeComms=\{\}/, 'var officeComms={}');
js = js.replace(/let agentPositions=\{\}/, 'var agentPositions={}');
js = js.replace(/let subagentData=\[\]/, 'var subagentData=[]');

// Also fix the ones that were already moved to top (the // comment replacements)
js = js.replace(/\/\/ officeLogs moved to top/, '');
js = js.replace(/\/\/ officeComms moved to top/, '');
js = js.replace(/\/\/ agentPositions moved to top/, '');
js = js.replace(/\/\/ subagentData moved to top/, '');

const newHtml = html.replace(scriptMatch[1], js);
fs.writeFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', newHtml, 'utf8');
console.log('Done! Fixed TDZ issues.');
