const fs = require('fs');
const path = 'C:\\Users\\kency\\.openclaw\\workspace\\index.html';
let content = fs.readFileSync(path, 'utf8');
const before = content;
content = content.replace(/https:\/\/mrghostguy\.github\.io\/niceguyapi\//g, 'https://bit.ly/NiceGuyAPI');
fs.writeFileSync(path, content, 'utf8');
const count = (before.match(/https:\/\/mrghostguy\.github\.io\/niceguyapi\//g) || []).length;
console.log(`Replaced ${count} occurrences`);
