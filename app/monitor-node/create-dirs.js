const fs = require('fs');
const path = require('path');

const dirs = [
  'src/monitor',
  'src/monitor/dto',
  'src/monitor/interfaces',
  'src/monitor/services',
  'src/monitor/controllers',
  'src/monitor/entities'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  fs.mkdirSync(fullPath, { recursive: true });
  console.log(`Created: ${fullPath}`);
});

console.log('All directories created successfully!');
