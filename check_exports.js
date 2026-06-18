const fs = require('fs');

// Read the file
const content = fs.readFileSync('./frontend/src/pages/WelcomeScreen.jsx', 'utf8');

// Count export default statements
const exportDefaultMatches = content.match(/export\s+default/g) || [];
console.log(`Found ${exportDefaultMatches.length} export default statements`);

// Show the actual lines
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('export default')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

// Check for any duplicate component names
const functionMatches = content.match(/function\s+(\w+)/g) || [];
const componentNameMatches = functionMatches.map(match => match.replace('function ', ''));
console.log(`Component names found: ${componentNameMatches.join(', ')}`);