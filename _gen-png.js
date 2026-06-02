const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Background gradient
const grad = ctx.createLinearGradient(0, 0, size, size);
grad.addColorStop(0, '#6366f1');
grad.addColorStop(1, '#06b6d4');

// Rounded rectangle
const r = 96;
ctx.beginPath();
ctx.moveTo(r, 0);
ctx.lineTo(size - r, 0);
ctx.quadraticCurveTo(size, 0, size, r);
ctx.lineTo(size, size - r);
ctx.quadraticCurveTo(size, size, size - r, size);
ctx.lineTo(r, size);
ctx.quadraticCurveTo(0, size, 0, size - r);
ctx.lineTo(0, r);
ctx.quadraticCurveTo(0, 0, r, 0);
ctx.closePath();
ctx.fillStyle = grad;
ctx.fill();

// Text
ctx.fillStyle = 'white';
ctx.font = '800 180px Arial, sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('NGA', size / 2, size / 2 + 20);

// Save
const outPath = path.join('C:\\Users\\kency\\.openclaw\\workspace', 'niceguyapi-profile.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outPath, buffer);
console.log('PNG profile pic saved to:', outPath, '(' + buffer.length + ' bytes)');
