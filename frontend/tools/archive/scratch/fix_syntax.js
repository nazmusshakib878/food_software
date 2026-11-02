const fs = require('fs');
const lines = fs.readFileSync('js/pos.js', 'utf8').split('\n');

const out = [];
for (let i = 0; i < lines.length; i++) {
    // If we reach line 527 with "} else if (catalogViewMode !== 'grid8') {"
    if (lines[i].includes('} else if (catalogViewMode !== \\'grid8\\') {') && i > 500 && i < 600) {
        // Skip this line and the next two lines (the inner content and the extra '}')
        i += 2;
        continue;
    }
    out.push(lines[i]);
}

fs.writeFileSync('js/pos.js', out.join('\n'), 'utf8');
