// Chép file WASM giải mã mã vạch vào public/ để bản web không phụ thuộc CDN (jsDelivr)
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm');
const dst = path.join(__dirname, '..', 'public', 'zxing_reader.wasm');
if (fs.existsSync(src)) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); console.log('✔ zxing_reader.wasm → public/'); }
