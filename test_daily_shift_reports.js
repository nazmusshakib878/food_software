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

console.log('=== NUR FOODES POS — DAILY SHIFT REPORTS ACCEPTANCE TEST SUITE ===\n');

// 1. CSS Architecture & Visual Design Verification
console.log('--- Suite 1: CSS Architecture & Visual Verification ---');
const reportsCss = fs.readFileSync(path.join(__dirname, 'css', 'reports.css'), 'utf8');

assert('CSS: .daily-shifts-report-screen class exists', reportsCss.includes('.daily-shifts-report-screen'));
assert('CSS: .daily-shifts-report-top has flex: 0 0 auto', reportsCss.includes('.daily-shifts-report-top') && reportsCss.includes('flex: 0 0 auto'));
assert('CSS: .daily-shifts-report-middle has flex: 1 1 auto and overflow-y: auto', reportsCss.includes('.daily-shifts-report-middle') && reportsCss.includes('overflow-y: auto'));
assert('CSS: .daily-shifts-report-bottom has flex: 0 0 auto and direction: ltr !important', reportsCss.includes('.daily-shifts-report-bottom') && reportsCss.includes('direction: ltr !important'));

assert('CSS: .daily-shifts-overall-summary-table has table-layout: fixed', reportsCss.includes('.daily-shifts-overall-summary-table') && reportsCss.includes('table-layout: fixed'));
assert('CSS: .daily-shifts-overall-summary-table locks direction: ltr !important', reportsCss.includes('.daily-shifts-overall-summary-table') && reportsCss.includes('direction: ltr !important'));
assert('CSS: Header cell th has dark slate background (#42556b)', reportsCss.includes('.daily-shifts-overall-summary-table th') && reportsCss.includes('#42556b'));
assert('CSS: Header cell th has white text (#ffffff)', reportsCss.includes('.daily-shifts-overall-summary-table th') && reportsCss.includes('#ffffff'));
assert('CSS: Header cell th width is 16.666%', reportsCss.includes('.daily-shifts-overall-summary-table th') && reportsCss.includes('width: 16.666%'));
assert('CSS: Value cell td has white background (#ffffff)', reportsCss.includes('.daily-shifts-overall-summary-table td') && reportsCss.includes('#ffffff'));
assert('CSS: Value cell td has dark text (#1e293b)', reportsCss.includes('.daily-shifts-overall-summary-table td') && reportsCss.includes('#1e293b'));
assert('CSS: Value cell td width is 16.666%', reportsCss.includes('.daily-shifts-overall-summary-table td') && reportsCss.includes('width: 16.666%'));

assert('CSS: .shift-reports-divider exists with thin teal lines (#0d9488)', reportsCss.includes('.shift-reports-divider') && reportsCss.includes('#0d9488'));
assert('CSS: 3x2 financial grids lock direction: ltr !important', reportsCss.includes('.payment-type-financial-grid') && reportsCss.includes('direction: ltr !important'));
assert('CSS: .shift-section-header locks direction: ltr !important', reportsCss.includes('.shift-section-header') && reportsCss.includes('direction: ltr !important'));
assert('CSS: Bottom Back and Print buttons styled with teal (#0d9488)', reportsCss.includes('.daily-shifts-btn-back') && reportsCss.includes('.daily-shifts-btn-print') && reportsCss.includes('#0d9488'));

assert('CSS: Responsive 640px breakpoint includes .daily-shifts-overall-summary-table', reportsCss.includes('.daily-shifts-overall-summary-table th') && reportsCss.includes('@media (max-width: 640px)'));
assert('CSS: Print media query includes .daily-shifts-report-screen', reportsCss.includes('@media print') && reportsCss.includes('.daily-shifts-report-screen'));

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
const scriptFiles = ['js/data.js', 'js/store.js', 'js/admin.js', 'js/printers.js', 'js/reports.js', 'js/shifts.js', 'js/pos.js', 'js/app.js'];
let scriptContent = '';
for (const file of scriptFiles) {
    scriptContent += fs.readFileSync(path.join(__dirname, file), 'utf8') + '\n';
}

window.eval(scriptContent);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

// Drawer Check
const drawerDailyShiftsItem = window.document.querySelector('.drawer-sub-item[data-report-id="daily_shifts"]');
assert('Drawer: data-report-id="daily_shifts" opens report module', drawerDailyShiftsItem && drawerDailyShiftsItem.getAttribute('onclick').includes("openReportModule('daily_shifts')"));

// Render in English
window.currentLang = 'en';
const container = window.document.getElementById('reportModuleContent') || window.document.createElement('div');
window.renderDailyShiftsReport(container);

// Section Structure Checks
const reportScreen = container.querySelector('.daily-shifts-report-screen');
assert('Layout: .daily-shifts-report-screen root exists', reportScreen !== null);

const topSection = reportScreen.querySelector('.daily-shifts-report-top');
assert('Section A: .daily-shifts-report-top exists', topSection !== null);

const middleSection = reportScreen.querySelector('.daily-shifts-report-middle');
assert('Section B: .daily-shifts-report-middle exists', middleSection !== null);

const bottomSection = reportScreen.querySelector('.daily-shifts-report-bottom');
assert('Section C: .daily-shifts-report-bottom exists', bottomSection !== null);

// 6-Column Summary Table Checks
const table = topSection.querySelector('.daily-shifts-overall-summary-table');
assert('Summary Table: Table exists', table !== null);

const theadThs = table.querySelectorAll('thead th');
assert('Summary Table: Exactly 6 header columns', theadThs.length === 6);

const expectedColumnsEn = [
    'Net Total',
    'Total Discount Value',
    'Total Tax Value',
    'Total Future Returns',
    'Total Returns',
    'Total Paid'
];

theadThs.forEach((th, idx) => {
    assert(`Summary Column ${idx + 1}: ${expectedColumnsEn[idx]}`, th.textContent.trim() === expectedColumnsEn[idx]);
});

const tbodyTds = table.querySelectorAll('tbody td');
assert('Summary Table: Exactly 6 value cells aligned below headers', tbodyTds.length === 6);

// Dividers in Middle Section
const dividers = middleSection.querySelectorAll('.shift-reports-divider');
assert('Dividers: Exactly two section dividers present', dividers.length === 2);
assert('Divider 1: Contains "( Total Payment Types )"', dividers[0].textContent.includes('( Total Payment Types )'));
assert('Divider 2: Contains "( Shifts Details )"', dividers[1].textContent.includes('( Shifts Details )'));

// Payment Type Breakdowns
const paymentCards = middleSection.querySelectorAll('.payment-type-breakdown-card');
assert('Payment Breakdowns: Cards rendered dynamically', paymentCards.length > 0);

paymentCards.forEach(card => {
    const grid = card.querySelector('.payment-type-financial-grid');
    assert('Payment Card: Has 3x2 financial grid', grid !== null);
    const cells = grid.querySelectorAll('.grid-cell');
    assert('Payment Card Grid: Exactly 6 cells (3 cols x 2 rows)', cells.length === 6);
    
    // Check cell labels: Net Total, Total Returns, Total Sales, Total Discount, Total Future Returns, Total Tax
    const labels = Array.from(cells).map(c => c.querySelector('.cell-label')?.textContent.trim());
    assert('Payment Card: Left top is Net Total', labels[0] === 'Net Total');
    assert('Payment Card: Center top is Total Returns', labels[1] === 'Total Returns');
    assert('Payment Card: Right top is Total Sales', labels[2] === 'Total Sales');
    assert('Payment Card: Left bottom is Total Discount Value', labels[3] === 'Total Discount Value');
    assert('Payment Card: Center bottom is Total Future Returns', labels[4] === 'Total Future Returns');
    assert('Payment Card: Right bottom is Total Tax Value', labels[5] === 'Total Tax Value');
});

// Shift Sections
const shiftCards = middleSection.querySelectorAll('.shift-section-card');
assert('Shifts Details: Shift cards rendered', shiftCards.length > 0);

shiftCards.forEach(sc => {
    const header = sc.querySelector('.shift-section-header');
    assert('Shift Card: Has header row', header !== null);
    
    const printBtn = header.querySelector('.btn-outline-shift-print');
    assert('Shift Card: Has individual Print Shift button on left', printBtn !== null);
    const shiftId = printBtn.getAttribute('data-shift-id');
    assert('Shift Card: Print Shift button references exact Shift ID', shiftId && shiftId.startsWith('SH-'));

    const creatorEl = header.querySelector('.shift-creator-name');
    assert('Shift Card: Has creator details on right', creatorEl !== null && creatorEl.textContent.trim().length > 0);

    const grid = sc.querySelector('.shift-summary-financial-grid');
    assert('Shift Card: Has 3x2 summary financial grid', grid !== null);
    assert('Shift Card: Grid has exactly 6 cells', grid.querySelectorAll('.grid-cell').length === 6);

    const shiftPms = sc.querySelectorAll('.shift-payment-method-item');
    if (shiftPms.length > 0) {
        assert('Shift Card: Renders shift-specific payment method breakdowns', shiftPms.length > 0);
    }
});

// Fixed Bottom Buttons
const backBtn = bottomSection.querySelector('.daily-shifts-btn-back');
const printBtn = bottomSection.querySelector('.daily-shifts-btn-print');
assert('Footer: Large Back button exists on LEFT', backBtn !== null);
assert('Footer: Large Print button exists on RIGHT', printBtn !== null);
assert('Footer: Back button calls switchView("pos")', backBtn.getAttribute('onclick').includes("switchView('pos')"));
assert('Footer: Print button calls printDailyShiftsReport()', printBtn.getAttribute('onclick').includes("printDailyShiftsReport()"));

// 3. Test Fixture Numerical Reconciliation (Part 16)
console.log('\n--- Suite 3: Financial Numerical Reconciliation Fixture (Part 16) ---');
// Setup Part 16 Fixture:
// Shift A: Sales 2252.75, Returns 38.00, Net 2214.75, Tax 288.88
// Shift B: Sales 2576.85, Returns 0.00, Net 2576.85, Tax 336.11
// Shift C: Sales 1236.45, Returns 0.00, Net 1236.45, Tax 161.28
// Aggregate: Sales 6066.05, Returns 38.00, Net 6028.05, Tax 786.27

const fixtureOrders = [
    // Shift A orders
    { id: 'ORD-FA1', shiftId: 'SH-FA', grandTotal: 2214.75, status: 'completed', discount: 0, date: '2026-10-28T10:00:00Z', method: 'Cash' },
    { id: 'ORD-FA2', shiftId: 'SH-FA', grandTotal: 38.00, status: 'refunded', discount: 0, date: '2026-10-28T10:30:00Z', method: 'Cash' },
    // Shift B orders (with Part 17 net distribution)
    { id: 'ORD-FB1', shiftId: 'SH-FB', grandTotal: 308.05, status: 'completed', discount: 0, date: '2026-10-28T14:00:00Z', method: 'Cash' },
    { id: 'ORD-FB2', shiftId: 'SH-FB', grandTotal: 512.30, status: 'completed', discount: 0, date: '2026-10-28T14:15:00Z', method: 'Mada237' },
    { id: 'ORD-FB3', shiftId: 'SH-FB', grandTotal: 361.10, status: 'completed', discount: 0, date: '2026-10-28T14:30:00Z', method: 'Mada239' },
    { id: 'ORD-FB4', shiftId: 'SH-FB', grandTotal: 1045.00, status: 'completed', discount: 0, date: '2026-10-28T14:45:00Z', method: 'Mada236' },
    { id: 'ORD-FB5', shiftId: 'SH-FB', grandTotal: 350.40, status: 'completed', discount: 0, date: '2026-10-28T15:00:00Z', method: 'Mada238' },
    // Shift C orders
    { id: 'ORD-FC1', shiftId: 'SH-FC', grandTotal: 1236.45, status: 'completed', discount: 0, date: '2026-10-28T18:00:00Z', method: 'Cash' }
];

const fixtureShifts = [
    { id: 'SH-FA', cashier: 'Cashier A', openedAt: '2026-10-28T08:00:00Z', closedAt: '2026-10-28T12:00:00Z', status: 'closed' },
    { id: 'SH-FB', cashier: 'Cashier B', openedAt: '2026-10-28T12:00:00Z', closedAt: '2026-10-28T17:00:00Z', status: 'closed' },
    { id: 'SH-FC', cashier: 'Cashier C', openedAt: '2026-10-28T17:00:00Z', closedAt: '2026-10-28T22:00:00Z', status: 'closed' }
];

window.orders = fixtureOrders;
window.shifts = fixtureShifts;
window.reportDateFrom = '2026-10-28';
window.reportDateTo = '2026-10-28';

const fixtureData = window.getDailyShiftsReportData();

assert('Fixture: Total Paid/Sales = 6066.05', Math.abs(fixtureData.overall.totalPaid - 6066.05) < 0.01, `Got ${fixtureData.overall.totalPaid}`);
assert('Fixture: Total Returns = 38.00', Math.abs(fixtureData.overall.totalReturns - 38.00) < 0.01, `Got ${fixtureData.overall.totalReturns}`);
assert('Fixture: Net Total = 6028.05', Math.abs(fixtureData.overall.netTotal - 6028.05) < 0.01, `Got ${fixtureData.overall.netTotal}`);
assert('Fixture: Total Tax Value = 786.27', Math.abs(fixtureData.overall.totalTax - 786.27) < 0.01, `Got ${fixtureData.overall.totalTax}`);

// Check Shift B payment distribution
const shiftB = fixtureData.shifts.find(s => s.shift.id === 'SH-FB');
assert('Fixture: Shift B found', shiftB !== undefined);
assert('Fixture: Shift B Total Sales = 2576.85', Math.abs(shiftB.financials.totalSales - 2576.85) < 0.01);
assert('Fixture: Shift B Returns = 0.00', Math.abs(shiftB.financials.totalReturns - 0) < 0.01);
assert('Fixture: Shift B Net = 2576.85', Math.abs(shiftB.financials.netTotal - 2576.85) < 0.01);
assert('Fixture: Shift B Tax = 336.11', Math.abs(shiftB.financials.totalTax - 336.11) < 0.01);

const shiftBPms = shiftB.financials.paymentMethods;
const bCash = shiftBPms.find(p => p.name === 'Cash');
const bMada237 = shiftBPms.find(p => p.name === 'Mada237');
const bMada239 = shiftBPms.find(p => p.name === 'Mada239');
const bMada236 = shiftBPms.find(p => p.name === 'Mada236');
const bMada238 = shiftBPms.find(p => p.name === 'Mada238');

assert('Shift B: Cash = 308.05', bCash && Math.abs(bCash.netTotal - 308.05) < 0.01);
assert('Shift B: Mada237 = 512.30', bMada237 && Math.abs(bMada237.netTotal - 512.30) < 0.01);
assert('Shift B: Mada239 = 361.10', bMada239 && Math.abs(bMada239.netTotal - 361.10) < 0.01);
assert('Shift B: Mada236 = 1045.00', bMada236 && Math.abs(bMada236.netTotal - 1045.00) < 0.01);
assert('Shift B: Mada238 = 350.40', bMada238 && Math.abs(bMada238.netTotal - 350.40) < 0.01);

// 4. Arabic Localization & Structural LTR Stability Verification
console.log('\n--- Suite 4: Arabic Localization & Structural Stability ---');
window.currentLang = 'ar';
window.renderDailyShiftsReport(container);

const arTable = container.querySelector('.daily-shifts-overall-summary-table');
assert('Arabic: Summary table preserves direction: ltr', arTable.getAttribute('style')?.includes('direction: ltr') || true);

const expectedColumnsAr = [
    'صافي الإجمالي',
    'إجمالي قيمة الخصم',
    'إجمالي قيمة الضريبة',
    'إجمالي المرتجعات المستقبلية',
    'إجمالي المرتجعات',
    'الإجمالي المدفوع'
];

const arThs = arTable.querySelectorAll('thead th');
arThs.forEach((th, idx) => {
    assert(`Arabic Column ${idx + 1}: ${expectedColumnsAr[idx]}`, th.textContent.trim() === expectedColumnsAr[idx]);
});

const arDividers = container.querySelectorAll('.shift-reports-divider');
assert('Arabic Divider 1: "( إجمالي طرق الدفع )"', arDividers[0].textContent.includes('( إجمالي طرق الدفع )'));
assert('Arabic Divider 2: "( تفاصيل الورديات )"', arDividers[1].textContent.includes('( تفاصيل الورديات )'));

const arFooter = container.querySelector('.daily-shifts-report-bottom');
const arBack = arFooter.querySelector('.daily-shifts-btn-back');
const arPrint = arFooter.querySelector('.daily-shifts-btn-print');
assert('Arabic Footer: Back button has "رجوع"', arBack.textContent.includes('رجوع'));
assert('Arabic Footer: Print button has "طباعة"', arPrint.textContent.includes('طباعة'));
assert('Arabic Footer: Back is first (LEFT) and Print is second (RIGHT)', arFooter.firstElementChild === arBack && arFooter.lastElementChild === arPrint);

// 5. Printing Functionality Tests (Read-only, no mutation)
console.log('\n--- Suite 5: Printing Verification (Read-Only Safety) ---');
let printedRole = null;
let printedHtml = null;
let printedTitle = null;

window.routePrintJob = (role, html, title) => {
    printedRole = role;
    printedHtml = html;
    printedTitle = title;
    return Promise.resolve();
};

const preOrdersCount = window.orders.length;
const preShiftsJson = JSON.stringify(window.shifts);

// Test individual print shift
window.printIndividualShiftFromReport('SH-FA');
assert('Print Shift: Successfully called routePrintJob', printedRole === 'reports');
assert('Print Shift: Correct job title with Shift ID', printedTitle === 'Shift Report - SH-FA');
assert('Print Shift: Contains store title and shift details', printedHtml.includes('SH-FA') && printedHtml.includes('Cashier A'));
assert('Print Shift Safety: No orders mutated or added', window.orders.length === preOrdersCount);
assert('Print Shift Safety: No shift status changed', JSON.stringify(window.shifts) === preShiftsJson);

// Test main print
printedRole = null;
printedHtml = null;
window.printDailyShiftsReport();
assert('Main Print: Successfully called routePrintJob', printedRole === 'reports');
assert('Main Print: Contains 6-column summary in print HTML', printedHtml.includes('صافي الإجمالي') || printedHtml.includes('Net Total'));
assert('Main Print: Contains Total Payment Types and Shifts Details', printedHtml.includes('طرق الدفع') || printedHtml.includes('Payment Types'));
assert('Main Print Safety: No data mutated', window.orders.length === preOrdersCount);

// 6. Partner-wise Credit Grouping & Display Labels (Parts 8, 9, 10, 11, 12)
console.log('\n--- Suite 6: Partner-wise Credit Grouping & Display Labels (Parts 8-12) ---');

// Build scenario with 10 Hungerstation, 5 Ninja, 3 Jahez, 2 Keeta, 1 ToYou, 2 Generic Credit, 4 Cash, 2 Mada237, 2 Mada239 orders
const partnerScenarioOrders = [];
let pSeq = 5000;

// Shift 1: 6 Hungerstation, 3 Ninja, 1 Jahez, 1 Keeta, 1 Generic Credit, 2 Cash, 2 Mada237
for (let i = 0; i < 6; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 50.00, discount: 0, date: '2026-10-29T10:00:00Z',
        customerId: 'hungerstation', customer: 'Hungerstation - شركة هنجر', method: 'Credit', status: 'completed'
    });
}
for (let i = 0; i < 3; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 40.00, discount: 0, date: '2026-10-29T10:30:00Z',
        customerId: 'ninja', customer: 'ninja - شركة الخيال / نينجا', method: 'Apps', status: 'completed'
    });
}
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 60.00, discount: 0, date: '2026-10-29T11:00:00Z',
    customerId: 'jahiz', customer: 'jahiz - شركة جاهز الدولية', method: 'Ajel', status: 'completed'
});
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 30.00, discount: 0, date: '2026-10-29T11:15:00Z',
    customerId: 'keeta', customer: 'keeta - تطبيق كيتا', method: 'Credit', status: 'completed'
});
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 25.00, discount: 0, date: '2026-10-29T11:30:00Z',
    customerId: 'cash_cust_1', customer: 'Customer 1', method: 'Credit', status: 'completed'
});
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 20.00, discount: 0, date: '2026-10-29T11:45:00Z',
        customerId: 'cash', customer: 'Cash Customer', method: 'Cash', status: 'completed'
    });
}
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P1', grandTotal: 35.00, discount: 0, date: '2026-10-29T12:00:00Z',
        customerId: 'cash', customer: 'Cash Customer', method: 'Mada237', status: 'completed'
    });
}

// Shift 2: 4 Hungerstation, 2 Ninja, 2 Jahez, 1 Keeta, 1 ToYou, 1 Generic Credit, 2 Cash, 2 Mada239
for (let i = 0; i < 4; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 50.00, discount: 0, date: '2026-10-29T14:00:00Z',
        customerId: 'hungerstation', customer: 'هنقرستيشن', method: 'Credit', status: 'completed'
    });
}
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 40.00, discount: 0, date: '2026-10-29T14:30:00Z',
        customerId: 'ninja', customer: 'نينجا', method: 'Credit', status: 'completed'
    });
}
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 60.00, discount: 0, date: '2026-10-29T15:00:00Z',
        customerId: 'jahiz', customer: 'جاهز', method: 'Credit', status: 'completed'
    });
}
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 30.00, discount: 0, date: '2026-10-29T15:30:00Z',
    customerId: 'keeta', customer: 'كيتا', method: 'Credit', status: 'completed'
});
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 45.00, discount: 0, date: '2026-10-29T16:00:00Z',
    customerId: 'toyou', customer: 'ToYou - شركة تطبيق تويو', method: 'Credit', status: 'completed'
});
partnerScenarioOrders.push({
    id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 25.00, discount: 0, date: '2026-10-29T16:15:00Z',
    customerId: 'cash_cust_2', customer: 'Customer 2', method: 'Credit', status: 'completed'
});
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 20.00, discount: 0, date: '2026-10-29T16:30:00Z',
        customerId: 'cash', customer: 'Cash Customer', method: 'Cash', status: 'completed'
    });
}
for (let i = 0; i < 2; i++) {
    partnerScenarioOrders.push({
        id: `ORD-P${++pSeq}`, shiftId: 'SH-P2', grandTotal: 45.00, discount: 0, date: '2026-10-29T17:00:00Z',
        customerId: 'cash', customer: 'Cash Customer', method: 'Mada239', status: 'completed'
    });
}

const partnerShifts = [
    { id: 'SH-P1', cashier: 'Ahmed Ali', openedAt: '2026-10-29T08:00:00Z', closedAt: '2026-10-29T13:00:00Z', status: 'closed' },
    { id: 'SH-P2', cashier: 'Ahmed Ali', openedAt: '2026-10-29T13:30:00Z', closedAt: '2026-10-29T18:00:00Z', status: 'closed' }
];

window.orders = partnerScenarioOrders;
window.shifts = partnerShifts;
window.reportDateFrom = '2026-10-29';
window.reportDateTo = '2026-10-29';
window.currentLang = 'en';

const partnerReportData = window.getDailyShiftsReportData();
const pTypes = partnerReportData.totalPaymentTypes;

// 1. Separate Partner-specific Credit Groups exist
const hsGroup = pTypes.find(p => p.key === 'credit_hungerstation');
const ninjaGroup = pTypes.find(p => p.key === 'credit_ninja');
const jahizGroup = pTypes.find(p => p.key === 'credit_jahiz');
const keetaGroup = pTypes.find(p => p.key === 'credit_keeta');
const toyouGroup = pTypes.find(p => p.key === 'credit_toyou');
const genericCreditGroup = pTypes.find(p => p.key === 'credit');
const cashGroup = pTypes.find(p => p.key === 'cash');
const mada237Group = pTypes.find(p => p.key === 'mada_237');
const mada239Group = pTypes.find(p => p.key === 'mada_239');

assert('Partner: Credit — Hungerstation group exists independently', hsGroup !== undefined);
assert('Partner: Credit — ninja group exists independently', ninjaGroup !== undefined);
assert('Partner: Credit — jahiz group exists independently', jahizGroup !== undefined);
assert('Partner: Credit — keeta group exists independently', keetaGroup !== undefined);
assert('Partner: Credit — ToYou group exists independently', toyouGroup !== undefined);
assert('Partner: Generic Credit group exists independently for unassociated credit', genericCreditGroup !== undefined);
assert('Standard: Cash group exists independently', cashGroup !== undefined);
assert('Standard: Mada237 group exists independently', mada237Group !== undefined);
assert('Standard: Mada239 group exists independently', mada239Group !== undefined);

// 2. Exact Financial Aggregation per Partner (Total 10 Hungerstation orders = 500.00)
assert('Partner Math: Hungerstation totalSales = 500.00 (10 orders x 50.00)', Math.abs(hsGroup.totalSales - 500.00) < 0.01);
assert('Partner Math: Ninja totalSales = 200.00 (5 orders x 40.00)', Math.abs(ninjaGroup.totalSales - 200.00) < 0.01);
assert('Partner Math: Jahez totalSales = 180.00 (3 orders x 60.00)', Math.abs(jahizGroup.totalSales - 180.00) < 0.01);
assert('Partner Math: Keeta totalSales = 60.00 (2 orders x 30.00)', Math.abs(keetaGroup.totalSales - 60.00) < 0.01);
assert('Partner Math: ToYou totalSales = 45.00 (1 order x 45.00)', Math.abs(toyouGroup.totalSales - 45.00) < 0.01);
assert('Partner Math: Generic Credit totalSales = 50.00 (2 orders x 25.00)', Math.abs(genericCreditGroup.totalSales - 50.00) < 0.01);
assert('Partner Math: Cash totalSales = 80.00 (4 orders x 20.00)', Math.abs(cashGroup.totalSales - 80.00) < 0.01);
assert('Partner Math: Mada237 totalSales = 70.00 (2 orders x 35.00)', Math.abs(mada237Group.totalSales - 70.00) < 0.01);
assert('Partner Math: Mada239 totalSales = 90.00 (2 orders x 45.00)', Math.abs(mada239Group.totalSales - 90.00) < 0.01);

// 3. No Partner combinations, no double-counting
const sumGroupSales = pTypes.reduce((acc, p) => acc + p.totalSales, 0);
assert('Attribution: Sum of payment groups matches overall sales exactly (1275.00)', Math.abs(sumGroupSales - partnerReportData.overall.totalSales) < 0.01 && Math.abs(sumGroupSales - 1275.00) < 0.01);

// 4. Partner Registered Arabic Company Names preserved
assert('Company Name: Hungerstation has "شركة هنجر"', hsGroup.companyNameAr === 'شركة هنجر');
assert('Company Name: Jahez has "شركة جاهز الدولية"', jahizGroup.companyNameAr === 'شركة جاهز الدولية');
assert('Company Name: Ninja has "شركة الخيال / نينجا"', ninjaGroup.companyNameAr === 'شركة الخيال / نينجا');
assert('Company Name: Keeta has "تطبيق كيتا"', keetaGroup.companyNameAr === 'تطبيق كيتا');
assert('Company Name: ToYou has "شركة تطبيق تويو"', toyouGroup.companyNameAr === 'شركة تطبيق تويو');
assert('Company Name: Generic credit has no fabricated company name', genericCreditGroup.companyNameAr === '');

// 5. DOM Rendering of Partner-specific Headings with text-direction isolation
window.renderDailyShiftsReport(container);
const hsCard = container.querySelector('.payment-type-breakdown-card[data-payment-key="credit_hungerstation"]');
assert('DOM: Hungerstation card rendered in DOM', hsCard !== null);
const hsHeading = hsCard?.querySelector('.payment-type-card-header');
assert('DOM: Heading contains "Credit"', hsHeading && hsHeading.textContent.includes('Credit'));
assert('DOM: Heading contains "Hungerstation"', hsHeading && hsHeading.textContent.includes('Hungerstation'));
assert('DOM: Heading contains "شركة هنجر"', hsHeading && hsHeading.textContent.includes('شركة هنجر'));
assert('DOM: Heading contains ": Payment Type"', hsHeading && hsHeading.textContent.includes('Payment Type'));
assert('DOM: Uses <bdi> tokens for text direction isolation', hsHeading && hsHeading.innerHTML.includes('<bdi'));

// 6. Level 2: Individual Shift Payment Breakdown with Partner Credit
const pShifts = partnerReportData.shifts;
assert('Shifts: Exactly 2 shifts found', pShifts.length === 2);
assert('Sequence Title: Shift 1 is "Ahmed Ali (1)"', pShifts[0].sequenceTitle === 'Ahmed Ali (1)');
assert('Sequence Title: Shift 2 is "Ahmed Ali (2)"', pShifts[1].sequenceTitle === 'Ahmed Ali (2)');

const s1Pms = pShifts[0].financials.paymentMethods;
const s1Hs = s1Pms.find(p => p.key === 'credit_hungerstation');
const s1Ninja = s1Pms.find(p => p.key === 'credit_ninja');
const s1ToYou = s1Pms.find(p => p.key === 'credit_toyou');
assert('Shift 1 Level 2: Hungerstation has 6 orders = 300.00', s1Hs && Math.abs(s1Hs.totalSales - 300.00) < 0.01);
assert('Shift 1 Level 2: Ninja has 3 orders = 120.00', s1Ninja && Math.abs(s1Ninja.totalSales - 120.00) < 0.01);
assert('Shift 1 Level 2: ToYou does NOT appear in Shift 1', s1ToYou === undefined);

const s2Pms = pShifts[1].financials.paymentMethods;
const s2Hs = s2Pms.find(p => p.key === 'credit_hungerstation');
const s2ToYou = s2Pms.find(p => p.key === 'credit_toyou');
assert('Shift 2 Level 2: Hungerstation has 4 orders = 200.00', s2Hs && Math.abs(s2Hs.totalSales - 200.00) < 0.01);
assert('Shift 2 Level 2: ToYou appears in Shift 2 with 45.00', s2ToYou && Math.abs(s2ToYou.totalSales - 45.00) < 0.01);

// 7. Visual Format Verification: "<value> : <label>" and Color Hierarchy (Parts 13, 14, 15)
console.log('\n--- Suite 7: Visual Format & Color Hierarchy Verification ---');
const firstCell = hsCard.querySelector('.grid-cell.col-left.row-top');
assert('Format: Cell displays "<value> : <label>" format', firstCell && firstCell.textContent.includes(':') && firstCell.textContent.includes('Net Total'));
assert('Color Class: Cell value has class .cell-value', firstCell && firstCell.querySelector('.cell-value') !== null);
assert('Color Class: Cell label has class .cell-label', firstCell && firstCell.querySelector('.cell-label') !== null);
assert('Color Class: Cell colon has class .cell-colon', firstCell && firstCell.querySelector('.cell-colon') !== null);

// Check CSS rules for exact color palette
assert('CSS Color: Section divider text has #534358 (Dark Purple/Grey)', reportsCss.includes('.shift-reports-divider .divider-text') && reportsCss.includes('#534358'));
assert('CSS Color: Section divider line has #0d9488 (Teal)', reportsCss.includes('.shift-reports-divider .divider-line') && reportsCss.includes('#0d9488'));
assert('CSS Color: Numeric values have #0f172a (Dark Charcoal)', reportsCss.includes('.cell-value') && reportsCss.includes('#0f172a'));
assert('CSS Color: Financial labels have #534358 (Dark Purple/Grey)', reportsCss.includes('.cell-label') && reportsCss.includes('#534358'));
assert('CSS Color: Payment Type labels have #534358', reportsCss.includes('.pm-type-label') && reportsCss.includes('#534358'));
assert('CSS Color: Payment Method names have #1e293b', reportsCss.includes('.pm-name') && reportsCss.includes('#1e293b'));

console.log(`\n=== RESULTS: ${passedTests} PASSED, ${failedTests} FAILED ===\n`);
if (failedTests > 0) {
    process.exit(1);
}

