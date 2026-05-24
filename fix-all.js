const fs = require('fs');
const path = require('path');

const htmlPath = 'C:\\Users\\kency\\perfect-dashboard\\public\\index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Remove BOM if present
if (html.charCodeAt(0) === 0xFEFF) {
  html = html.substring(1);
  console.log('Removed BOM character');
}

// Extract JS from inline script
const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (!scriptMatch) {
  console.log('ERROR: No script tag found');
  process.exit(1);
}

let js = scriptMatch[1];
console.log('Extracted JS: ' + js.length + ' chars');

// === FIX 1: Convert ALL top-level let/const to var to eliminate TDZ issues ===
// We need to track brace depth to only convert top-level declarations
const lines = js.split('\n');
let braceDepth = 0;
let converted = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Track brace depth (approximate - doesn't handle strings/comments perfectly but good enough)
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') braceDepth++;
    if (line[j] === '}') braceDepth--;
  }
  
  // Only convert at the top level of the script (braceDepth === 0)
  // Match lines that start with let or const (with optional leading whitespace)
  if (braceDepth === 0) {
    if (/^\s*let\s+/.test(trimmed)) {
      lines[i] = line.replace(/\blet\s+/, 'var ');
      converted++;
    } else if (/^\s*const\s+/.test(trimmed)) {
      // Don't convert 'const' in destructuring assignments like 'const[ar,tr,...]'
      // Only convert simple declarations like 'const x = ...'
      if (/^\s*const\s+\w+\s*=/.test(trimmed)) {
        lines[i] = line.replace(/\bconst\s+/, 'var ');
        converted++;
      }
    }
  }
}

js = lines.join('\n');
console.log('Converted ' + converted + ' top-level let/const to var');

// === FIX 2: Ensure onReady is called at the very end ===
// Remove any existing onReady call to avoid double-calling
js = js.replace(/\n\/\/ Initialize on DOM ready[\s\S]*?$/, '');

// Add a clean onReady call at the very end
js += `
\n// === AUTO-INIT ===
(function(){
  function onReady(){
    if(typeof init==='function')init();
    var frame=document.getElementById('claw3d-frame');
    var ld=document.getElementById('claw3d-loading');
    if(frame&&ld){
      frame.addEventListener('load',function(){setTimeout(function(){ld.style.display='none';},500);});
      setTimeout(function(){ld.style.display='none';},8000);
    }
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',onReady);}
  else{onReady();}
})();
`;

console.log('Added clean onReady auto-init');

// === FIX 3: Fix the lrn variable name collision ===
// The destructuring uses 'lrnr' but line 55 references 'lrn'
// With var this won't be a TDZ issue, but let's make it consistent
js = js.replace(/const\[ar,tr,sr,sysr,lr,cr,lrnr,fr,dr\]/, 'var[ar,tr,sr,sysr,lr,cr,lrnr,fr,dr]');
console.log('Fixed lrn/lrnr destructuring');

// Write the fixed JS back
const newHtml = html.replace(scriptMatch[1], js);
fs.writeFileSync(htmlPath, newHtml, 'utf8');
console.log('Wrote updated HTML: ' + newHtml.length + ' chars');

// Verify
const verifyHtml = fs.readFileSync(htmlPath, 'utf8');
const verifyMatch = verifyHtml.match(/<script>([\s\S]+?)<\/script>/);
const verifyJs = verifyMatch[1];
const hasOnReady = verifyJs.includes('AUTO-INIT');
const hasVarOfficeLogs = verifyJs.includes('var officeLogs');
const hasVarAgentPositions = verifyJs.includes('var agentPositions');
console.log('\nVerification:');
console.log('Has AUTO-INIT:', hasOnReady);
console.log('Has var officeLogs:', hasVarOfficeLogs);
console.log('Has var agentPositions:', hasVarAgentPositions);
console.log('No BOM:', verifyHtml.charCodeAt(0) !== 0xFEFF);
