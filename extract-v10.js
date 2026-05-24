const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\kency\\perfect-dashboard\\public\\index.html', 'utf8');
const m = html.match(/<script>([\s\S]+?)<\/script>/);
if (m) {
  fs.writeFileSync('C:\\Users\\kency\\.openclaw\\workspace\\extracted-v10.js', m[1], 'utf8');
  console.log('Extracted: ' + m[1].length + ' chars');
} else {
  console.log('No script found');
}
