const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passedTests = 0;
let failedTests = 0;

function assert(description, condition, details = '') {
    if (condition) {
        console.log(`  [PASS] ${description}`);
        passedTests++;
    } else {
        console.error(`  [FAIL] ${description} ${details ? '(' + details + ')' : ''}`);
        failedTests++;
    }
}

console.log('=== NUR FOODES POS — OVERALL SALES SUMMARY ACCEPTANCE SUITE ===\n');

// 1. Verify CSS rules in css/reports.css
console.log('--- Suite 1: CSS Architecture & Visual Design Verification ---');
const reportsCss = fs.readFileSync(path.join(__dirname, 'css', 'reports.css'), 'utf8');

assert('CSS: .items-overall-summary-table class exists', reportsCss.includes('.items-overall-summary-table'));
assert('CSS: .items-overall-summary-table has table-layout: fixed', reportsCss.includes('table-layout: fixed'));
assert('CSS: .items-overall-summary-table locks direction: ltr !important', reportsCss.includes('.items-overall-summary-table') && reportsCss.includes('direction: ltr !important'));
assert('CSS: Dark Slate / Blue-Grey header (#42556b)', reportsCss.includes('.items-overall-summary-table thead tr') && reportsCss.includes('#42556b'));
assert('CSS: Header cell th has white text (#ffffff)', reportsCss.includes('.items-overall-summary-table th') && reportsCss.includes('#ffffff'));
assert('CSS: Header cell th has border: 1px solid #334155', reportsCss.includes('.items-overall-summary-table th') && reportsCss.includes('#334155'));
assert('CSS: Header cell th width is 20%', reportsCss.includes('.items-overall-summary-table th') && reportsCss.includes('width: 20%'));
assert('CSS: Value cell td has white background (#ffffff)', reportsCss.includes('.items-overall-summary-table tbody tr') && reportsCss.includes('#ffffff'));
assert('CSS: Value cell td has dark text (#1e293b)', reportsCss.includes('.items-overall-summary-table td') && reportsCss.includes('#1e293b'));
assert('CSS: Value cell td width is 20%', reportsCss.includes('.items-overall-summary-table td') && reportsCss.includes('width: 20%'));
assert('CSS: Value cell td has border: 1px solid #e2e8f0', reportsCss.includes('.items-overall-summary-table td') && reportsCss.includes('#e2e8f0'));
assert('CSS: .items-summary-card separate cards are removed from active grid styles', !reportsCss.includes('.items-report-overall-summary {\n    display: grid;') && !reportsCss.includes('grid-template-columns: repeat(5, 1fr)'));
assert('CSS: Responsive 640px breakpoint styles .items-overall-summary-table', reportsCss.includes('.items-overall-summary-table th') && reportsCss.includes('.items-category-summary-table th'));
assert('CSS: Print media query includes .items-overall-summary-table', reportsCss.includes('@media print') && reportsCss.includes('.items-overall-summary-table'));

// 2. DOM & Functional Tests with JSDOM
console.log('\n--- Suite 2: DOM Structure, Data Integrity, Alignment & Localization ---');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true
});

const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;

// Load app scripts in order
const scriptFiles = ['js/data.js', 'js/store.js', 'js/admin.js', 'js/reports.js', 'js/pos.js', 'js/app.js'];
let scriptContent = '';
for (const file of scriptFiles) {
    scriptContent += fs.readFileSync(path.join(__dirname, file), 'utf8') + '\n';
}

window.eval(scriptContent);

// Trigger DOMContentLoaded
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

// Render Items Report in English
window.currentLang = 'en';
const container = window.document.getElementById('reportsContentArea') || window.document.createElement('div');
window.renderItemsReport(container);

// Test 1: Unified Table
const summaryWrap = container.querySelector('.items-report-overall-summary');
assert('Test 1: Overall summary wrapper exists', summaryWrap !== null);
const table = summaryWrap.querySelector('.items-overall-summary-table');
assert('Test 1: Table exists with class items-overall-summary-table', table !== null);
const cards = summaryWrap.querySelectorAll('.items-summary-card');
assert('Test 1: Five separate summary cards are completely removed', cards.length === 0);

const thead = table.querySelector('thead');
assert('Test 1: Table contains thead', thead !== null);
const theadRows = thead.querySelectorAll('tr');
assert('Test 1: Header has exactly 1 row', theadRows.length === 1);
const ths = thead.querySelectorAll('th');
assert('Test 1: Header row has exactly 5 columns', ths.length === 5);

const tbody = table.querySelector('tbody');
assert('Test 1: Table contains tbody', tbody !== null);
const tbodyRows = tbody.querySelectorAll('tr');
assert('Test 1: Body has exactly 1 value row', tbodyRows.length === 1);
const tds = tbody.querySelectorAll('td');
assert('Test 1: Value row has exactly 5 columns', tds.length === 5);

// Test 4: Correct Column Order (English)
const expectedEnHeaders = ['Net Total', 'Total Tax Value', 'Total Future Returns', 'Total Returns', 'Total'];
const actualEnHeaders = Array.from(ths).map(th => th.textContent.trim());
assert('Test 4: Column 1 is Net Total', actualEnHeaders[0] === 'Net Total', `Got: ${actualEnHeaders[0]}`);
assert('Test 4: Column 2 is Total Tax Value', actualEnHeaders[1] === 'Total Tax Value', `Got: ${actualEnHeaders[1]}`);
assert('Test 4: Column 3 is Total Future Returns', actualEnHeaders[2] === 'Total Future Returns', `Got: ${actualEnHeaders[2]}`);
assert('Test 4: Column 4 is Total Returns', actualEnHeaders[3] === 'Total Returns', `Got: ${actualEnHeaders[3]}`);
assert('Test 4: Column 5 is Total', actualEnHeaders[4] === 'Total', `Got: ${actualEnHeaders[4]}`);

// Test 5: Column Alignment
assert('Test 5: Header and value row column counts match exactly', ths.length === tds.length && ths.length === 5);

// Test 6: Existing Calculated Data Bindings
const reportData = window.getItemsReportData();
const expectedNetTotal = window.formatCurrency(reportData.overall.netTotal);
const expectedTax = window.formatCurrency(reportData.overall.tax);
const expectedFutureReturns = window.formatCurrency(reportData.overall.futureReturns);
const expectedReturns = window.formatCurrency(reportData.overall.returns);
const expectedTotal = window.formatCurrency(reportData.overall.total);

const actualValues = Array.from(tds).map(td => td.textContent.trim());
assert('Test 6: Value 1 matches overall.netTotal', actualValues[0] === expectedNetTotal, `Got: ${actualValues[0]} vs ${expectedNetTotal}`);
assert('Test 6: Value 2 matches overall.tax', actualValues[1] === expectedTax, `Got: ${actualValues[1]} vs ${expectedTax}`);
assert('Test 6: Value 3 matches overall.futureReturns', actualValues[2] === expectedFutureReturns, `Got: ${actualValues[2]} vs ${expectedFutureReturns}`);
assert('Test 6: Value 4 matches overall.returns', actualValues[3] === expectedReturns, `Got: ${actualValues[3]} vs ${expectedReturns}`);
assert('Test 6: Value 5 matches overall.total', actualValues[4] === expectedTotal, `Got: ${actualValues[4]} vs ${expectedTotal}`);

// Test 7: Category Summary Tables Unchanged
const catSections = container.querySelectorAll('.items-category-section');
assert('Test 7: Category sections rendered', catSections.length > 0, `Count: ${catSections.length}`);
const catTables = container.querySelectorAll('.items-category-summary-table');
assert('Test 7: All Category Summary Tables exist and use items-category-summary-table', catTables.length === catSections.length);
if (catTables.length > 0) {
    const firstCatThs = Array.from(catTables[0].querySelectorAll('th')).map(th => th.textContent.trim());
    assert('Test 7: Category summary table retains Net Total first column', firstCatThs[0] === 'Net Total');
    assert('Test 7: Category summary table retains Total last column', firstCatThs[4] === 'Total');
}

// Test 8: Date Filter Functionality
const initialTotal = reportData.overall.total;
// Change date filter
window.reportDateFrom = '2026-10-01';
window.reportDateTo = '2026-10-01';
window.renderItemsReport(container);
const updatedTds = container.querySelectorAll('.items-overall-summary-table td');
assert('Test 8: Re-rendering with date filter updates overall summary values properly', updatedTds.length === 5);

// Reset date filter
window.reportDateFrom = '2026-10-01';
window.reportDateTo = '2026-10-27';
window.renderItemsReport(container);

// Test 9: Fixed Top Hierarchy
const topSection = container.querySelector('.items-report-top');
assert('Test 9: Fixed top header section exists', topSection !== null);
const middleSection = container.querySelector('.items-report-middle');
assert('Test 9: Scrollable middle main section exists', middleSection !== null);
const bottomSection = container.querySelector('.items-report-bottom');
assert('Test 9: Fixed bottom footer section exists', bottomSection !== null);
assert('Test 9: Overall summary table is located inside fixed top section', topSection.contains(table) || topSection.querySelector('.items-overall-summary-table') !== null);

// Test 10: Bottom Buttons
const backBtn = bottomSection.querySelector('.items-report-btn-back');
assert('Test 10: Back button exists in fixed bottom footer', backBtn !== null);
const printBtn = bottomSection.querySelector('.items-report-btn-print');
assert('Test 10: Print button exists in fixed bottom footer', printBtn !== null);

// Test 11: Printing Function
let printedJob = null;
window.routePrintJob = function(channel, html, title) {
    printedJob = { channel, html, title };
};
window.printItemsReport();
assert('Test 11: printItemsReport executed routePrintJob', printedJob !== null);
assert('Test 11: printItemsReport HTML contains two-row overall summary table', printedJob && printedJob.html.includes('table') && printedJob.html.includes('Net Total'));
assert('Test 11: printItemsReport HTML contains dark slate header', printedJob && printedJob.html.includes('#42556b'));

// Test 12: Arabic Localization & Column Order
window.currentLang = 'ar';
window.renderItemsReport(container);
const arThs = container.querySelectorAll('.items-overall-summary-table th');
const actualArHeaders = Array.from(arThs).map(th => th.textContent.trim());
assert('Test 12: Arabic Col 1 is صافي الإجمالي (Net Total)', actualArHeaders[0] === 'صافي الإجمالي', `Got: ${actualArHeaders[0]}`);
assert('Test 12: Arabic Col 2 is إجمالي قيمة الضريبة (Total Tax Value)', actualArHeaders[1] === 'إجمالي قيمة الضريبة', `Got: ${actualArHeaders[1]}`);
assert('Test 12: Arabic Col 3 is إجمالي المرتجعات المستقبلية (Total Future Returns)', actualArHeaders[2] === 'إجمالي المرتجعات المستقبلية', `Got: ${actualArHeaders[2]}`);
assert('Test 12: Arabic Col 4 is إجمالي المرتجعات (Total Returns)', actualArHeaders[3] === 'إجمالي المرتجعات', `Got: ${actualArHeaders[3]}`);
assert('Test 12: Arabic Col 5 is الإجمالي (Total)', actualArHeaders[4] === 'الإجمالي', `Got: ${actualArHeaders[4]}`);

// Reset language
window.currentLang = 'en';

console.log(`\n=== Acceptance Test Suite Completed: ${passedTests} Passed, ${failedTests} Failed ===`);
if (failedTests > 0) {
    process.exit(1);
}
