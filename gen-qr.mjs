import QRCodeStyling from 'qr-code-styling';
import fs from 'fs';

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
  qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "L" },
  dotsOptions: { color: "#000000", type: "rounded" },
  backgroundOptions: { color: "#ffffff" },
  cornersSquareOptions: { color: "#000000", type: "extra-rounded" },
  cornersDotOptions: { color: "#000000", type: "dot" }
});

// getRawData returns a Buffer in Node.js
const buf = await qrCode.getRawData('png');
const out = Buffer.isBuffer(buf) ? buf : Buffer.from(await buf.arrayBuffer());
fs.writeFileSync('C:\\Users\\kency\\.openclaw\\workspace\\megabonk-r1-qr-enhanced.png', out);
console.log('Saved enhanced QR code! Size:', out.length);
