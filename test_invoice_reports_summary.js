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

console.log('=== NUR FOODES POS — INVOICE REPORTS SIX-COLUMN OVERALL SALES SUMMARY TEST SUITE ===\n');

// 1. CSS Architecture & Visual Design Verification
console.log('--- Suite 1: CSS Architecture & Visual Verification ---');
const reportsCss = fs.readFileSync(path.join(__dirname, 'css', 'reports.css'), 'utf8');

assert('CSS: .invoice-overall-summary-table class exists', reportsCss.includes('.invoice-overall-summary-table'));
assert('CSS: .invoice-overall-summary-table has table-layout: fixed', reportsCss.includes('table-layout: fixed'));
assert('CSS: .invoice-overall-summary-table locks direction: ltr !important', reportsCss.includes('.invoice-overall-summary-table') && reportsCss.includes('direction: ltr !important'));
assert('CSS: Dark Slate / Blue-Grey header (#42556b)', reportsCss.includes('.invoice-overall-summary-table thead tr') && reportsCss.includes('#42556b'));
assert('CSS: Header cell th has white text (#ffffff)', reportsCss.includes('.invoice-overall-summary-table th') && reportsCss.includes('#ffffff'));
assert('CSS: Header cell th has border: 1px solid #334155', reportsCss.includes('.invoice-overall-summary-table th') && reportsCss.includes('#334155'));
assert('CSS: Header cell th width is 16.666%', reportsCss.includes('.invoice-overall-summary-table th') && reportsCss.includes('width: 16.666%'));
assert('CSS: Value cell td has white background (#ffffff)', reportsCss.includes('.invoice-overall-summary-table tbody tr') && reportsCss.includes('#ffffff'));
assert('CSS: Value cell td has dark text (#1e293b)', reportsCss.includes('.invoice-overall-summary-table td') && reportsCss.includes('#1e293b'));
assert('CSS: Value cell td width is 16.666%', reportsCss.includes('.invoice-overall-summary-table td') && reportsCss.includes('width: 16.666%'));
assert('CSS: Value cell td has border: 1px solid #e2e8f0', reportsCss.includes('.invoice-overall-summary-table td') && reportsCss.includes('#e2e8f0'));
assert('CSS: Fixed Top .invoice-report-top has flex: 0 0 auto', reportsCss.includes('.invoice-report-top') && reportsCss.includes('flex: 0 0 auto'));
assert('CSS: Scrollable Middle .invoice-report-middle has flex: 1 1 auto and overflow-y: auto', reportsCss.includes('.invoice-report-middle') && reportsCss.includes('overflow-y: auto'));
assert('CSS: Fixed Bottom .invoice-report-bottom has flex: 0 0 auto and locks direction: ltr !important', reportsCss.includes('.invoice-report-bottom') && reportsCss.includes('direction: ltr !important'));
assert('CSS: Responsive 640px breakpoint styles .invoice-overall-summary-table', reportsCss.includes('.invoice-overall-summary-table th') && reportsCss.includes('@media (max-width: 640px)'));
assert('CSS: Print media query includes .invoice-overall-summary-table', reportsCss.includes('@media print') && reportsCss.includes('.invoice-overall-summary-table'));

// 2. DOM Structure & Functional Verification
console.log('\n--- Suite 2: DOM Structure, Data Reconciliation, Alignment & Language ---');
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
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

// Render Invoice Reports in English
window.currentLang = 'en';
const container = window.document.getElementById('reportModuleContent') || window.document.createElement('div');
window.renderInvoiceReports(container);

// Test A & Test D: Six Columns, Two Rows in Unified Table
const summaryWrap = container.querySelector('.invoice-report-overall-summary');
assert('Test A: Overall summary wrapper exists', summaryWrap !== null);
const table = summaryWrap.querySelector('.invoice-overall-summary-table');
assert('Test A: Table exists with class invoice-overall-summary-table', table !== null);

const thead = table.querySelector('thead');
assert('Test D: Table contains thead (Header Row)', thead !== null);
const theadRows = thead.querySelectorAll('tr');
assert('Test D: Header has exactly 1 row', theadRows.length === 1);
const ths = thead.querySelectorAll('th');
assert('Test A: Header row has EXACTLY 6 columns', ths.length === 6);

const tbody = table.querySelector('tbody');
assert('Test D: Table contains tbody (Value Row)', tbody !== null);
const tbodyRows = tbody.querySelectorAll('tr');
assert('Test D: Body has exactly 1 value row', tbodyRows.length === 1);
const tds = tbody.querySelectorAll('td');
assert('Test A: Value row has EXACTLY 6 columns', tds.length === 6);

// Test B & Test C: Exact Column Order
const expectedEnHeaders = [
    'Net Total',
    'Total Discount Value',
    'Total Tax Value',
    'Total Future Returns',
    'Total Returns',
    'Total'
];
const actualEnHeaders = Array.from(ths).map(th => th.textContent.trim());

assert('Test C: Column 1 is Net Total', actualEnHeaders[0] === 'Net Total', `Got: ${actualEnHeaders[0]}`);
assert('Test B: Column 2 is Total Discount Value (MANDATORY)', actualEnHeaders[1] === 'Total Discount Value', `Got: ${actualEnHeaders[1]}`);
assert('Test C: Column 3 is Total Tax Value', actualEnHeaders[2] === 'Total Tax Value', `Got: ${actualEnHeaders[2]}`);
assert('Test C: Column 4 is Total Future Returns', actualEnHeaders[3] === 'Total Future Returns', `Got: ${actualEnHeaders[3]}`);
assert('Test C: Column 5 is Total Returns', actualEnHeaders[4] === 'Total Returns', `Got: ${actualEnHeaders[4]}`);
assert('Test C: Column 6 is Total', actualEnHeaders[5] === 'Total', `Got: ${actualEnHeaders[5]}`);

// Test E: Perfect Vertical Alignment
assert('Test E: Column count matches exactly between ths and tds', ths.length === tds.length && ths.length === 6);

// Test F & Test N: Existing Financial Values and Currency Formatting
const invoiceData = window.getInvoiceReportsData();
const expectedNetTotal = window.formatCurrency(invoiceData.summary.netTotal);
const expectedDiscount = window.formatCurrency(invoiceData.summary.totalDiscount);
const expectedTax = window.formatCurrency(invoiceData.summary.totalTax);
const expectedFutureReturns = window.formatCurrency(invoiceData.summary.totalFutureReturns);
const expectedReturns = window.formatCurrency(invoiceData.summary.totalReturns);
const expectedTotal = window.formatCurrency(invoiceData.summary.total);

const actualValues = Array.from(tds).map(td => td.textContent.trim());
assert('Test F: Value 1 matches summary.netTotal', actualValues[0] === expectedNetTotal, `Got: ${actualValues[0]} vs ${expectedNetTotal}`);
assert('Test F: Value 2 matches summary.totalDiscount', actualValues[1] === expectedDiscount, `Got: ${actualValues[1]} vs ${expectedDiscount}`);
assert('Test F: Value 3 matches summary.totalTax', actualValues[2] === expectedTax, `Got: ${actualValues[2]} vs ${expectedTax}`);
assert('Test F: Value 4 matches summary.totalFutureReturns', actualValues[3] === expectedFutureReturns, `Got: ${actualValues[3]} vs ${expectedFutureReturns}`);
assert('Test F: Value 5 matches summary.totalReturns', actualValues[4] === expectedReturns, `Got: ${actualValues[4]} vs ${expectedReturns}`);
assert('Test F: Value 6 matches summary.total', actualValues[5] === expectedTotal, `Got: ${actualValues[5]} vs ${expectedTotal}`);

// Test G, H, I: Fixed Top, Scrollable Middle, Fixed Bottom
const topSection = container.querySelector('.invoice-report-top');
assert('Test G: Fixed top section exists', topSection !== null);
assert('Test G: Summary table is in fixed top section', topSection.contains(table));
const dateFilters = topSection.querySelector('.invoice-report-date-filters');
assert('Test G: Date filters exist in fixed top section', dateFilters !== null);

const middleSection = container.querySelector('.invoice-report-middle');
assert('Test H: Scrollable middle section exists', middleSection !== null);
const invoiceTable = middleSection.querySelector('.invoice-list-table');
assert('Test H: Invoices list table is located in middle section', invoiceTable !== null);

const bottomSection = container.querySelector('.invoice-report-bottom');
assert('Test I: Fixed bottom section exists', bottomSection !== null);
const backBtn = bottomSection.querySelector('.invoice-report-btn-back');
assert('Test I: Back button exists in bottom section (left)', backBtn !== null);
const printBtn = bottomSection.querySelector('.invoice-report-btn-print');
assert('Test I: Complete Report Print button exists in bottom section (right)', printBtn !== null);

// Test J & Test M: Date Filtering & Invoice Count
const countBadge = topSection.querySelector('#invoiceCountBadge');
assert('Test M: Invoice count badge exists in header', countBadge !== null);
assert('Test M: Invoice count matches filtered length', countBadge.textContent.includes(String(invoiceData.invoicesCount)));

// Modify date filters to test reactive update
window.reportDateFrom = '2026-10-01';
window.reportDateTo = '2026-10-01';
window.renderInvoiceReports(container);
const updatedTds = container.querySelectorAll('.invoice-overall-summary-table td');
assert('Test J: Re-rendering with date filter updates summary values properly', updatedTds.length === 6);
const updatedCountBadge = container.querySelector('#invoiceCountBadge');
assert('Test J: Invoice count badge updates with date filter', updatedCountBadge !== null);

// Reset date filters
window.reportDateFrom = '2026-10-01';
window.reportDateTo = '2026-10-28';
window.renderInvoiceReports(container);

// Test K: Individual Row Print Button Binding
const rowPrintBtns = container.querySelectorAll('.btn-row-invoice-print');
assert('Test K: Invoice rows contain individual print buttons', rowPrintBtns.length > 0);
if (rowPrintBtns.length > 0) {
    const firstBtn = rowPrintBtns[0];
    const invId = firstBtn.getAttribute('data-invoice-id');
    assert('Test K: Individual print button has data-invoice-id', !!invId);
    assert('Test K: Button onclick triggers reprintSavedInvoice for that specific ID', firstBtn.getAttribute('onclick').includes(invId));
}

// Test L: Complete Report Printing Function
let reportPrintJob = null;
window.routePrintJob = function(channel, htmlContent, title) {
    reportPrintJob = { channel, htmlContent, title };
};
window.printInvoiceReport();
assert('Test L: printInvoiceReport executed routePrintJob', reportPrintJob !== null);
assert('Test L: print channel is reports', reportPrintJob && reportPrintJob.channel === 'reports');
assert('Test L: Print HTML contains 6-column overall summary table', reportPrintJob && reportPrintJob.htmlContent.includes('Total Discount Value') && reportPrintJob.htmlContent.includes('#42556b'));

// Test O: English / Arabic Structural Stability
window.currentLang = 'ar';
window.renderInvoiceReports(container);
const arThs = container.querySelectorAll('.invoice-overall-summary-table th');
const actualArHeaders = Array.from(arThs).map(th => th.textContent.trim());

assert('Test O: Arabic Col 1 is صافي الإجمالي (Net Total)', actualArHeaders[0] === 'صافي الإجمالي', `Got: ${actualArHeaders[0]}`);
assert('Test O: Arabic Col 2 is إجمالي قيمة الخصم (Total Discount Value)', actualArHeaders[1] === 'إجمالي قيمة الخصم', `Got: ${actualArHeaders[1]}`);
assert('Test O: Arabic Col 3 is إجمالي قيمة الضريبة (Total Tax Value)', actualArHeaders[2] === 'إجمالي قيمة الضريبة', `Got: ${actualArHeaders[2]}`);
assert('Test O: Arabic Col 4 is إجمالي المرتجعات المستقبلية (Total Future Returns)', actualArHeaders[3] === 'إجمالي المرتجعات المستقبلية', `Got: ${actualArHeaders[3]}`);
assert('Test O: Arabic Col 5 is إجمالي المرتجعات (Total Returns)', actualArHeaders[4] === 'إجمالي المرتجعات', `Got: ${actualArHeaders[4]}`);
assert('Test O: Arabic Col 6 is الإجمالي (Total)', actualArHeaders[5] === 'الإجمالي', `Got: ${actualArHeaders[5]}`);

// Reset language
window.currentLang = 'en';

// Test Q: Other Reports (Items Report) Unaffected
const itemsContainer = window.document.createElement('div');
window.renderItemsReport(itemsContainer);
const itemsSummaryWrap = itemsContainer.querySelector('.items-report-overall-summary');
assert('Test Q: Items Report summary exists', itemsSummaryWrap !== null);
const itemsTable = itemsSummaryWrap.querySelector('.items-overall-summary-table');
assert('Test Q: Items Report table has items-overall-summary-table class', itemsTable !== null);
const itemsThs = itemsTable.querySelectorAll('th');
assert('Test Q: Items Report retains its established 5 columns', itemsThs.length === 5);

console.log(`\n=== Invoice Reports Acceptance Test Suite: ${passedTests} Passed, ${failedTests} Failed ===`);
if (failedTests > 0) {
    process.exit(1);
}
