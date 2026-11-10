const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(
  path.join(__dirname, '../../src/controllers/dataController.js'),
  'utf8'
);
const lines = content.split('\n');
console.log('LINE 343 RAW: [' + lines[342] + ']');
