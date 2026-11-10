const fs = require('fs');
const content = fs.readFileSync('backend/src/controllers/dataController.js', 'utf8');
const lines = content.split('\n');
console.log('LINE 343 RAW: [' + lines[342] + ']');
