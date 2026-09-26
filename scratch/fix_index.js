const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// Remove catalog floating cart
content = content.replace(
    /<!-- Floating Cart Pill for 8-Column Catalog Mode -->[\s\S]*?<\/button>\s*<\/div>/,
    ''
);

// Remove mobile cart floater
content = content.replace(
    /<!-- Floating Mobile Cart Bar -->[\s\S]*?<\/div>\s*<\/div>/,
    ''
);

fs.writeFileSync('index.html', content, 'utf8');
console.log('index.html updated successfully.');
