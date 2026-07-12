import fs from 'fs';
const data = fs.readFileSync('./public/log-icon.png');
const b64 = data.toString('base64');

// Original image is 714x376 (wide rectangle)
// To show center portion zoomed in: shift image left & up so center fills the circle
// We want roughly the middle 376x376 square of the 714x376 image
// In SVG 100x100 space: scale factor = 100/376 ≈ 0.266
// x offset to center: -(714-376)/2 * 0.266 = -169 * 0.266 ≈ -45
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="50" cy="50" r="50"/>
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${b64}" x="-45" y="0" width="190" height="100" clip-path="url(#circle-clip)" preserveAspectRatio="none"/>
</svg>`;
fs.writeFileSync('./public/log-icon.svg', svg);
console.log('Done! SVG size:', (svg.length / 1024).toFixed(1), 'KB');
