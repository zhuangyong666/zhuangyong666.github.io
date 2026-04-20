const fs = require('fs');
[192, 512].forEach(size => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size*0.2}" fill="#6366f1"/><text x="50%" y="55%" text-anchor="middle" dy=".05em" font-size="${size*0.5}" font-family="sans-serif">📔</text></svg>`;
  fs.writeFileSync(`icon-${size}.svg`, svg);
});
console.log('Icons created');
