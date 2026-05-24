const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');
const jsMatch = html.match(/<script>([\s\S]+?)<\/script>/);
fs.writeFileSync('C:\\Users\kency\.openclaw\workspace\extracted.js', jsMatch[1], 'utf8');
console.log('Extracted JS: ' + jsMatch[1].length + ' chars');
