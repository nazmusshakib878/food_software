// Automated POS System Test Suite (Simulating Browser DOM & Runtime)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== Starting POS Verification Test Suite ===");

// 1. Mock Browser Environment
const localStorageData = {};
global.localStorage = {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = String(v); },
    removeItem: (k) => { delete localStorageData[k]; }
};

const elements = {};
function createMockElement(id, tag = 'div') {
    return {
        id,
        tagName: tag.toUpperCase(),
        classList: {
            classes: new Set(),
            add: function(...cls) { cls.forEach(c => this.classes.add(c)); },
            remove: function(...cls) { cls.forEach(c => this.classes.delete(c)); },
            toggle: function(c, force) {
                if (force !== undefined) {
                    if (force) this.classes.add(c); else this.classes.delete(c);
                } else {
                    if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c);
                }
            },
            contains: function(c) { return this.classes.has(c); }
        },
        style: {},
        innerHTML: '',
        innerText: '',
        value: '',
        checked: false,
        type: 'text',
        focus: () => {},
        setAttribute: (k, v) => {},
        getAttribute: (k) => null,
        querySelectorAll: () => [],
        querySelector: () => null,
        appendChild: () => {},
        remove: () => {}
    };
}

global.document = {
    documentElement: {
        setAttribute: (k, v) => {},
        getAttribute: (k) => 'light'
    },
    getElementById: (id) => {
        if (!elements[id]) elements[id] = createMockElement(id);
        return elements[id];
    },
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    createElement: (tag) => createMockElement('el_' + Math.random(), tag),
    body: { appendChild: () => {} },
    addEventListener: () => {}
};

global.window = {
    print: () => console.log("[Mock Window] window.print() called"),
    open: () => ({ document: { write: () => {}, close: () => {} }, print: () => {}, close: () => {} })
};

global.confirm = () => true;
global.prompt = (msg, def) => def || "test";

// 2. Load Source Files into Context
const basePath = path.join(__dirname, 'js');
const files = ['data.js', 'store.js', 'printers.js', 'reports.js', 'pos.js', 'payment.js', 'receipt.js', 'app.js'];

files.forEach(f => {
    const code = fs.readFileSync(path.join(basePath, f), 'utf8');
    vm.runInThisContext(code);
});

console.log("-> Scripts loaded successfully into global execution context.");

// 3. Test Assertions
let passed = 0;
let failed = 0;
function assert(desc, condition) {
    if (condition) {
        console.log(`  [PASS] ${desc}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${desc}`);
        failed++;
    }
}

// TEST 1: Categories & Items Initialized
assert("DEFAULT_CATEGORIES exists with 4 categories", categories.length >= 4);
assert("DEFAULT_ITEMS loaded properly", items.length >= 20);
assert("DEFAULT_CUSTOMERS loaded with 10 sources", customers.length >= 10);
assert("DEFAULT_ORDER_TYPES loaded with 5 types", orderTypes.length >= 5);
assert("DEFAULT_PRINTERS loaded with Cashier, Kitchen, Reports", printers.length === 3);

// TEST 2: Add Products to Cart & Cart Table Calculations
currentCart = [];
const itm1 = items[0]; // Tikka sauce - 2.00 SAR
const itm2 = items[1]; // Burger /FF Meal - 18.50 SAR
addToCart(itm1.id);
addToCart(itm1.id); // Quantity becomes 2
addToCart(itm2.id);
assert("Cart has 2 distinct items", currentCart.length === 2);
assert("Item 1 quantity is 2", currentCart[0].qty === 2);

let totals = calculateCartTotals();
const expSubtotal = (itm1.price * 2) + itm2.price; // (2.00 * 2) + 18.50 = 22.50 SAR
const expTax = Math.round(expSubtotal * 0.15 * 100) / 100; // 3.38 SAR
const expGrand = Math.round((expSubtotal + expTax) * 100) / 100; // 25.88 SAR
assert("Subtotal is 22.50", totals.subtotal === expSubtotal);
assert("Tax is 15% of 22.50 = 3.38", totals.tax === expTax);
assert("Grand total is 25.88", totals.grandTotal === expGrand);

// TEST 3: Applying Discounts (% and Fixed)
discountType = 'fixed';
discountValue = 5.00;
totals = calculateCartTotals();
assert("Fixed discount deducted: 22.50 - 5.00 = 17.50 taxable", totals.taxableAmount === 17.50);

discountType = 'percent';
discountValue = 10; // 10%
totals = calculateCartTotals();
assert("10% discount: 2.25 deducted", totals.discount === 2.25);

// TEST 4: Notes and Phone validation
currentOrderNotes = "Extra spicy, no onions";
currentClientPhone = "+966501234567";
assert("Order notes saved correctly", currentOrderNotes.includes("Extra spicy"));
assert("Client phone saved correctly", currentClientPhone === "+966501234567");

// TEST 5: Order Type and Customer Selection
onPosCustomerChange("hungerstation");
assert("Current customer updated to hungerstation", currentCustomerId === "hungerstation");
assert("Hungerstation automatically suggested delivery", currentOrderTypeId === "delivery");

onPosOrderTypeChange("local");
assert("Current order type updated to local", currentOrderTypeId === "local");

// TEST 6: Preferences (Orders view & Stay at category)
setOrdersViewPreference("briefly");
assert("Orders view saved as briefly", posPreferences.ordersView === "briefly");
setOrdersViewPreference("detailed");
assert("Orders view saved as detailed", posPreferences.ordersView === "detailed");

setStayAtCategoryPreference("stay");
assert("Stay at category preference set to stay", posPreferences.stayAtCategory === "stay");

// TEST 7: PassCode & Security
let accessGranted = false;
openPassCodeModal({
    onSuccess: () => { accessGranted = true; }
});
const pInput = document.getElementById('passcodeInput');
pInput.value = "1234";
console.log("DEBUG: passcodeInput value before submit:", pInput.value, "validPin:", storeSettings.adminPin);
submitPassCode();
assert("Passcode 1234 verified successfully", accessGranted === true);

// TEST 8: Printer Devices Management & Test Print
const cashierPrinter = printers.find(p => p.role === 'cashier');
assert("Cashier printer found", !!cashierPrinter);
testPrinterDevice(cashierPrinter.id);
assert("Printer test triggered online status", cashierPrinter.status === 'online');

// TEST 9: Reports Rendering
const repContainer = createMockElement('reportModuleContent');
elements['reportModuleContent'] = repContainer;

const reportModules = [
    'invoice_reports',
    'items_report',
    'daily_shifts',
    'damaged_items',
    'application_reports',
    'service_durations',
    'totals_report',
    'active_meals',
    'meals_reports',
    'payment_type_report',
    'balancing_payments',
    'applications_review',
    'internal_orders',
    'inventory_auditing',
    'daily_inventory',
    'daily_stock_calculator'
];

reportModules.forEach(mod => {
    openReportModule(mod);
    assert(`Report module "${mod}" renders HTML without crash`, repContainer.innerHTML.length > 50);
});

// TEST 10: Live Balancing Difference Calculation
// System total = 850.00, user enters 900.00 -> Diff = +50.00
onBalancingInputChange('cash', 850.00, '900.00');
assert("Balancing input records 900", balancingInputs['cash'] === 900);
saveBalancingRecord();
assert("Balancing record persisted", balancingRecords.length > 0);

// TEST 11: Inventory Auditing & Stock Calculator
onAuditInputChange('inv_1', 126, '120');
assert("Audit input recorded difference: -6", auditInputs['inv_1'] === 120);
saveInventoryAudit();
assert("Inventory updated from audit", inventoryRecords.find(i => i.id === 'inv_1').remaining === 120);

// TEST 12: Bottom Navigation
onBottomNavClick('main');
assert("Bottom nav returns to main POS", document.getElementById('posView').classList.contains('active'));

// TEST 13: Image 1 Receipt & Image 2 24 Items Catalog Alignment
console.log("\n--- Checking Image 2 Products Catalog ---");
assert("Exact 24 items in catalog", items.length === 24);
assert("Item 1 is Tikka sauce (code 0, price 2.00)", items[0].enName === 'Tikka sauce' && String(items[0].code) === '0' && items[0].price === 2.00);
assert("Item 2 is Burger /FF Meal (code 0, price 18.50)", items[1].enName === 'Burger /FF Meal' && String(items[1].code) === '0' && items[1].price === 18.50);
assert("Item 3 is Meat Burger Meal (code -165, price 19.50)", items[2].enName === 'Meat Burger Meal' && String(items[2].code) === '-165' && items[2].price === 19.50);
assert("Item 4 is Chicken Strips Meal (code -670, price 18.50)", items[3].enName === 'Chicken Strips Meal' && String(items[3].code) === '-670' && items[3].price === 18.50);
assert("Item 14 is Meat Burger (code -3156, price 13.50)", items[13].enName === 'Meat Burger' && String(items[13].code) === '-3156' && items[13].price === 13.50);
assert("Item 24 is Arabic Coffee (code 202, price 6.00)", items[23].enName === 'Arabic Coffee' && String(items[23].code) === '202' && items[23].price === 6.00);

console.log("\n--- Checking Image 1 Exact Bill & Receipt ---");
currentCart = [];
discountType = 'none';
discountValue = 0;
customDiscount = 0;
for (let i = 0; i < 5; i++) addToCart(items.find(x => x.enName === 'Meat Burger').id);
addToCart(items.find(x => x.enName === 'Chicken Strips Meal').id);
addToCart(items.find(x => x.enName === 'Tandoori').id);
addToCart(items.find(x => x.enName === 'Fish sandwich').id);
for (let i = 0; i < 5; i++) addToCart(items.find(x => x.enName === 'Shish Tawooq').id);
addToCart(items.find(x => x.enName === 'Chicken Strips Burger').id);
addToCart(items.find(x => x.enName === 'Mineral Water').id);
for (let i = 0; i < 2; i++) addToCart(items.find(x => x.enName === 'Large Fries').id);

const img1Totals = calculateCartTotals();
assert("Image 1 Subtotal is exactly 179.50", img1Totals.subtotal === 179.50);
assert("Image 1 VAT 15% is exactly 26.93", img1Totals.tax === 26.93);
assert("Image 1 Grand total is exactly 206.43", img1Totals.grandTotal === 206.43);

nextOrderSeq = 1013;
currentOrderType = 'dine_in';
currentOrderTypeId = 'local';
selectedPayMethod = 'Cash';
paymentInput = '206.43';
currentUser.name = 'Nawaf Saeed';

completeOrderAndShowReceipt();
renderReceipt(lastCompletedOrder);

assert("Receipt store name is NUR FOODES", elements['recStoreName'].innerText === 'NUR FOODES');
assert("Receipt company name is شركة صح للتجارة", elements['recCompanyName'].innerText === 'شركة صح للتجارة');
assert("Receipt VAT is VAT: 300987654300003", elements['recVatNumber'].innerText === 'VAT: 300987654300003');
assert("Receipt Order No is ORD-1013", elements['recOrderNum'].innerText === 'ORD-1013');
assert("Receipt Order Type is DINE-IN (Table 1)", elements['recOrderType'].innerText === 'DINE-IN (Table 1)');
assert("Receipt Cashier is Nawaf Saeed", elements['recCashier'].innerText === 'Nawaf Saeed');
assert("Receipt Subtotal is 179.50", elements['recSubtotal'].innerText === '179.50');
assert("Receipt VAT is 26.93", elements['recTax'].innerText === '26.93');
assert("Receipt Grand Total is SAR 206.43", elements['recGrandTotal'].innerText === 'SAR 206.43');
assert("Receipt Paid is 206.43", elements['recPaid'].innerText === '206.43');
assert("Receipt Change is 0.00", elements['recChange'].innerText === '0.00');

const recHtml = elements['recItemsTbody'].innerHTML;
assert("Bilingual Meat Burger present in receipt", recHtml.includes('Meat Burger') && recHtml.includes('برجر لحم'));
assert("Bilingual Shish Tawooq present in receipt", recHtml.includes('Shish Tawooq') && recHtml.includes('شيش طاووق'));
assert("Bilingual Large Fries present in receipt", recHtml.includes('Large Fries') && recHtml.includes('بطاطس كبير'));

console.log(`\n=== Verification Finished: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) process.exit(1);
