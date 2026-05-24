const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index2.html', 'utf8');
console.log('index2.html length:', html.length);
console.log('Has AUTO-INIT:', html.includes('AUTO-INIT'));
console.log('Has var officeLogs:', html.includes('var officeLogs'));
console.log('Has onReady:', html.includes('onReady'));
console.log('Has claw3d-proxy:', html.includes('claw3d-proxy'));
console.log('Has BOM:', html.charCodeAt(0) === 0xFEFF);

// Check for syntax errors by extracting JS
const m = html.match(/<script>([\s\S]+?)<\/script>/);
if (m) {
  console.log('JS length:', m[1].length);
  fs.writeFileSync('C:\\Users\\kency\\.openclaw\\workspace\\check-syntax.js', m[1], 'utf8');
  console.log('Extracted JS for syntax check');
}
