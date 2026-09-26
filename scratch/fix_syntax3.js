const fs = require('fs');
const lines = fs.readFileSync('js/pos.js', 'utf8').split('\n');

const out = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("} else if (catalogViewMode !== 'grid8') {") && i > 500 && i < 600) {
        i += 2;
        continue;
    }
    out.push(lines[i]);
}

fs.writeFileSync('js/pos.js', out.join('\n'), 'utf8');
