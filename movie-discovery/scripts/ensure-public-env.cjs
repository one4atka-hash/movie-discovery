'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dest = path.join(root, 'public', 'env.js');
const src = path.join(root, 'public', 'env.example.js');
if (!fs.existsSync(dest) && fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
}
