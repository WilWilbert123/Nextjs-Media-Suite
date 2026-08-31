const fs = require('fs');
const { execSync } = require('child_process');

execSync('ffmpeg -y -i output_frame.jpg -pix_fmt rgb24 output_frame.rgb 2>/dev/null');

const data = fs.readFileSync('output_frame.rgb');
const width = 2560;
const height = 1600;

let minX = width, maxX = 0, minY = height, maxY = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 3;
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    // Background is red. Watermark has black (transparent in rgba -> black? wait, png to rgb might make transparent black)
    // Blue is 0,0,255
    if (r < 200 || b > 50) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

console.log(`Watermark bounds: X=${minX}-${maxX}, Y=${minY}-${maxY}`);
console.log(`Watermark width: ${maxX - minX + 1}, height: ${maxY - minY + 1}`);

