const QRCodeStyling = require('qr-code-styling');
const fs = require('fs');

const qrData = JSON.stringify({
  title: "Megabonk R1",
  url: "https://mrghostguy.github.io/megabonk-r1/",
  description: "Megabonk - Roguelike survival game for Rabbit R1. 20 characters, 29 weapons, 70+ items, wave-based survival with boss fights.",
  iconUrl: "",
  themeColor: "#FE5000"
});

const qrCode = new QRCodeStyling({
  width: 300,
  height: 300,
  type: "canvas",
  data: qrData,
  margin: 10,
  qrOptions: {
    typeNumber: 0,
    mode: "Byte",
    errorCorrectionLevel: "L"
  },
  dotsOptions: {
    color: "#000000",
    type: "rounded"
  },
  backgroundOptions: {
    color: "#ffffff"
  },
  cornersSquareOptions: {
    color: "#000000",
    type: "extra-rounded"
  },
  cornersDotOptions: {
    color: "#000000",
    type: "dot"
  }
});

qrCode.getRawData('png').then(buffer => {
  // buffer is a Buffer in Node.js
  const outPath = 'C:\\Users\\kency\\.openclaw\\workspace\\megabonk-r1-qr-enhanced.png';
  
  // Create enhanced version with canvas
  const { createCanvas, loadImage } = require('canvas');
  const size = 300;
  const padding = 40;
  const borderWidth = 4;
  const totalW = size + padding * 2;
  const totalH = size + padding * 2 + 30;
  
  const canvas = createCanvas(totalW, totalH);
  const ctx = canvas.getContext('2d');
  
  // White bg
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);
  
  // Load QR image
  return loadImage(buffer).then(img => {
    // Draw QR
    ctx.drawImage(img, padding, padding, size, size);
    
    // Orange rounded border
    ctx.strokeStyle = '#FE5000';
    ctx.lineWidth = borderWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const r = 15;
    const bx = borderWidth / 2;
    const by = borderWidth / 2;
    const bw = totalW - borderWidth;
    const bh = totalH - 30 - borderWidth;
    
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.stroke();
    
    // "r1 creations" branding
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('r1 creations', totalW / 2, totalH - 10);
    
    const out = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, out);
    console.log('Enhanced QR code saved to:', outPath);
  });
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
