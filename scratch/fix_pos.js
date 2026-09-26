const fs = require('fs');
let content = fs.readFileSync('js/pos.js', 'utf8');

// 1. Change the first column header and remove the Qty column header
content = content.replace(
    /<th class=\"col-num\">.*?<\/th>[\s\S]*?<th class=\"col-qty\">.*?<\/th>/,
    `<th class=\"col-num\">$\{currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th>$\{currentLang === 'ar' ? 'الصنف' : 'Name'}</th>`
);

// 2. Change idx + 1 to item.qty and remove the settings icon
content = content.replace(
    /<td class=\"cart-item-num\">.*?<\/td>[\s\S]*?<button type=\"button\" class=\"btn-item-customize\"[^>]*>[\s\S]*?<\/button>\s*<\/div>/,
    `<td class=\"cart-item-num\">$\{item.qty}</td>
                                <td class=\"cart-item-cell-name\">
                                    <div style=\"display: flex; align-items: center; justify-content: space-between;\">
                                        <span style=\"font-weight: 700;\">$\{escapeHtml(displayName)}</span>
                                    </div>`
);

// 3. Remove the entire col-qty td which contains the inline quantity controls
content = content.replace(
    /<\/td>\s*<td class=\"col-qty\">[\s\S]*?<\/td>\s*<td class=\"col-price\"/g,
    `</td>
                                <td class=\"col-price\"`
);

// 4. Update the floating widgets in pos.js to just not display
content = content.replace(
    /if \(floatWidget\) \{[\s\S]*?\}/,
    `if (floatWidget) {
        floatWidget.style.display = 'none';
    }`
);
content = content.replace(
    /if \(mobileFloaterEl\) \{[\s\S]*?\}/,
    `if (mobileFloaterEl) {
        mobileFloaterEl.style.display = 'none';
    }`
);

fs.writeFileSync('js/pos.js', content, 'utf8');
console.log('pos.js updated successfully.');
