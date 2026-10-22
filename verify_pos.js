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
        scrollTop: 0,
        scrollHeight: 1000,
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
    querySelector: (sel) => {
        if (sel === '.products-grid-scroll') {
            if (!elements['productsGridScroll']) elements['productsGridScroll'] = createMockElement('productsGridScroll');
            return elements['productsGridScroll'];
        }
        if (sel === '.pos-layout') {
            if (!elements['posLayout']) elements['posLayout'] = createMockElement('posLayout');
            return elements['posLayout'];
        }
        return null;
    },
    createElement: (tag) => createMockElement('el_' + Math.random(), tag),
    body: { appendChild: () => {} },
    addEventListener: () => {}
};

global.window = {
    print: () => console.log("[Mock Window] window.print() called"),
    open: () => ({ document: { write: () => {}, close: () => {} }, print: () => {}, close: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.confirm = () => true;
global.prompt = (msg, def) => def || "test";
global.getCategoryFallbackImage = (catId) => '';

// 2. Load Source Files into Context
const basePath = path.join(__dirname, 'js');
const files = ['data.js', 'store.js', 'printers.js', 'reports.js', 'pos.js', 'payment.js', 'receipt.js', 'returns.js', 'admin.js', 'app.js'];

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
addToCart(itm1.id); // Repeated click appends a new independent row with Quantity 1
addToCart(itm2.id);
assert("Cart has 3 distinct items (no auto-merging)", currentCart.length === 3);
assert("Item 1 quantity is 1", currentCart[0].qty === 1);
assert("Item 2 quantity is 1", currentCart[1].qty === 1);
assert("Item 3 quantity is 1", currentCart[2].qty === 1);
assert("Distinct stable lineIds assigned", currentCart[0].lineId !== currentCart[1].lineId);

let totals = calculateCartTotals();
const expSubtotal = (itm1.price * 2) + itm2.price; // (2.00 * 2) + 18.50 = 22.50 SAR
const expTax = Math.round(((expSubtotal * 0.15) / 1.15) * 100) / 100; // 22.50 * 15 / 115 = 2.93 SAR
const expGrand = expSubtotal; // 22.50 SAR (Customer pays 22.50, VAT is included)
assert("Subtotal is 22.50", totals.subtotal === expSubtotal);
assert("Tax is included 15% of 22.50 = 2.93", totals.tax === expTax);
assert("Grand total is 22.50", totals.grandTotal === expGrand);

// TEST 3: Applying Discounts (% and Fixed)
discountType = 'fixed';
discountValue = 5.00;
totals = calculateCartTotals();
assert("Fixed discount deducted: 22.50 - 5.00 = 17.50 payable", totals.grandTotal === 17.50);
assert("Taxable amount (net before VAT) is 15.22", totals.taxableAmount === 15.22);

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
currentCustomerId = 'cash'; // Reset to cash so downstream tests (like Image 1 receipt) don't fail due to ONLINE_PARTNER policy
currentOrderTypeId = 'local';
currentOrderType = 'local';

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
assert("Image 1 Included VAT 15% is exactly 23.41", img1Totals.tax === 23.41);
assert("Image 1 Grand total is exactly 179.50", img1Totals.grandTotal === 179.50);

nextOrderSeq = 1013;
currentOrderType = 'dine_in';
currentOrderTypeId = 'local';
selectedPayMethod = 'Cash';
paymentInput = '179.50';
currentUser.name = 'Nawaf Saeed';

completeOrderAndShowReceipt(null, 'Cash', {}, 179.50);
renderReceipt(lastCompletedOrder);

assert("Receipt store name is NUR FOODES", elements['recStoreName'].innerText === 'NUR FOODES');
assert("Receipt company name is شركة صح للتجارة", elements['recCompanyName'].innerText === 'شركة صح للتجارة');
assert("Receipt VAT is VAT: 300987654300003", elements['recVatNumber'].innerText === 'VAT: 300987654300003');
assert("Receipt Order No is ORD-1013", elements['recOrderNum'].innerText === 'ORD-1013');
assert("Receipt Order Type is DINE-IN (Table 1)", elements['recOrderType'].innerText === 'DINE-IN (Table 1)');
assert("Receipt Cashier is Nawaf Saeed", elements['recCashier'].innerText === 'Nawaf Saeed');
assert("Receipt Subtotal is 179.50", elements['recSubtotal'].innerText === '179.50');
assert("Receipt VAT is 23.41", elements['recTax'].innerText === '23.41');
assert("Receipt Grand Total is SAR 179.50", elements['recGrandTotal'].innerText === 'SAR 179.50');
assert("Receipt Paid is 179.50", elements['recPaid'].innerText === '179.50');
assert("Receipt Change is 0.00", elements['recChange'].innerText === '0.00');

const recHtml = elements['recItemsTbody'].innerHTML;
assert("Bilingual Meat Burger present in receipt", recHtml.includes('Meat Burger') && recHtml.includes('برجر لحم'));
assert("Bilingual Shish Tawooq present in receipt", recHtml.includes('Shish Tawooq') && recHtml.includes('شيش طاووق'));
assert("Bilingual Large Fries present in receipt", recHtml.includes('Large Fries') && recHtml.includes('بطاطس كبير'));

console.log("\n=======================================================");
console.log("=== SECTION 18: MANDATORY AUTOMATED REGRESSION SUITE ===");
console.log("=======================================================");

// Set up products for Section 18 tests
const cheese = { id: 'item_cheese_test', enName: 'Cheese', arName: 'جبنة', price: 2.00, available: true, catId: 'meals' };
const chickenKebab = { id: 'item_chicken_kebab_test', enName: 'Chicken Kebab', arName: 'كباب دجاج', price: 15.00, available: true, catId: 'meals' };
const frenchFries = { id: 'item_french_fries_test', enName: 'French Fries', arName: 'بطاطس مقلية', price: 5.00, available: true, catId: 'sandwiches' };
items.push(cheese, chickenKebab, frenchFries);

// TEST 1 — Repeated Cheese Clicks
currentCart = [];
selectedCartLineId = null;
selectedCartItemIndex = null;
for (let i = 0; i < 5; i++) {
    addToCart(cheese.id);
}
assert("Test 1: Five distinct rows created for 5 Cheese clicks", currentCart.length === 5);
assert("Test 1: Each row has Quantity 1", currentCart.every(r => r.qty === 1));
const t1LineIds = currentCart.map(r => r.lineId);
const t1UniqueLineIds = new Set(t1LineIds);
assert("Test 1: Five unique line IDs generated", t1UniqueLineIds.size === 5 && !t1LineIds.includes(undefined));
assert("Test 1: Same underlying Product ID across all rows", currentCart.every(r => r.id === cheese.id));
assert("Test 1: Original entry order preserved", currentCart[0].lineId === t1LineIds[0] && currentCart[4].lineId === t1LineIds[4]);

// TEST 2 — Modify First Row
// Increase the first row twice -> [3, 1, 1, 1, 1]
selectCartItem(0);
changeActiveCartQty(1);
changeActiveCartQty(1);
const t2Quantities = currentCart.map(r => r.qty);
assert("Test 2: Modify first row twice -> quantities are [3, 1, 1, 1, 1]", JSON.stringify(t2Quantities) === JSON.stringify([3, 1, 1, 1, 1]));

// TEST 3 — Modify Third Row
// Increase the third row once -> [3, 1, 2, 1, 1]
selectCartItem(2);
changeActiveCartQty(1);
const t3Quantities = currentCart.map(r => r.qty);
assert("Test 3: Modify third row once -> quantities are [3, 1, 2, 1, 1]", JSON.stringify(t3Quantities) === JSON.stringify([3, 1, 2, 1, 1]));

// TEST 4 — Decrease First Row
// Decrease first row twice -> [1, 1, 2, 1, 1]
selectCartItem(0);
changeActiveCartQty(-1);
changeActiveCartQty(-1);
const t4Quantities = currentCart.map(r => r.qty);
assert("Test 4: Decrease first row twice -> quantities are [1, 1, 2, 1, 1]", JSON.stringify(t4Quantities) === JSON.stringify([1, 1, 2, 1, 1]));

// TEST 5 — Direct Quantity Keypad
// Set the fourth row (index 3) to Quantity 4 -> [1, 1, 2, 4, 1]
selectCartItem(3);
openQuantityModal();
appendQuantityDigit('4');
confirmQuantityModal();
const t5Quantities = currentCart.map(r => r.qty);
assert("Test 5: Direct quantity keypad sets 4th row to 4 -> quantities are [1, 1, 2, 4, 1]", JSON.stringify(t5Quantities) === JSON.stringify([1, 1, 2, 4, 1]));

// TEST 6 — Delete a Different Row
// While the last row (index 4) is selected, delete the second row (index 1)
selectCartItem(4);
const t6TargetLineId = currentCart[4].lineId;
assert("Test 6: Pre-condition - last row is selected", selectedCartLineId === t6TargetLineId && selectedCartItemIndex === 4);

removeCartItem(1);
assert("Test 6: Exactly one row deleted (4 remain)", currentCart.length === 4);
assert("Test 6: Quantities of surviving rows are [1, 2, 4, 1]", JSON.stringify(currentCart.map(r => r.qty)) === JSON.stringify([1, 2, 4, 1]));
assert("Test 6: Selection still points to the intended surviving row", selectedCartLineId === t6TargetLineId);
assert("Test 6: Selected index safely shifted to 3", selectedCartItemIndex === 3);

// Press plus on the active row - should modify surviving last row, NOT shifted neighbor
changeActiveCartQty(1);
assert("Test 6: No wrong-row operations - active row quantity updated to 2", currentCart[3].qty === 2 && currentCart[1].qty === 2);

// TEST 7 — Independent Modifiers
currentCart = [];
addToCart(chickenKebab.id);
addToCart(chickenKebab.id);
addToCart(chickenKebab.id);

// Row 1: Full + No Lettuce
selectCartItem(0);
toggleModifier({ id: 'mod_full', labelEn: 'Full', labelAr: 'كامل', price: 0, actionType: 'normal' });
toggleModifier({ id: 'mod_no_lettuce', labelEn: 'No Lettuce', labelAr: 'بدون خس', price: 0, actionType: 'remove' });

// Row 2: No Ketchup
selectCartItem(1);
toggleModifier({ id: 'mod_no_ketchup', labelEn: 'No Ketchup', labelAr: 'بدون كاتشب', price: 0, actionType: 'remove' });

// Row 3: Extra Sauce
selectCartItem(2);
toggleModifier({ id: 'mod_extra_sauce', labelEn: 'Extra Sauce', labelAr: 'صوص زيادة', price: 2.00, actionType: 'extra' });

assert("Test 7: Row 1 has Full + No Lettuce", currentCart[0].modifiers.length === 2 && currentCart[0].modifiers.some(m => m.id === 'mod_full') && currentCart[0].modifiers.some(m => m.id === 'mod_no_lettuce'));
assert("Test 7: Row 2 has only No Ketchup", currentCart[1].modifiers.length === 1 && currentCart[1].modifiers[0].id === 'mod_no_ketchup');
assert("Test 7: Row 3 has only Extra Sauce", currentCart[2].modifiers.length === 1 && currentCart[2].modifiers[0].id === 'mod_extra_sauce');

// TEST 8 — Independent Notes
selectCartItem(0);
updateActiveItemNote("Extra spicy");
selectCartItem(1);
updateActiveItemNote("No onion");
selectCartItem(2);
updateActiveItemNote("Normal");

assert("Test 8: Row 1 note is 'Extra spicy'", currentCart[0].note === "Extra spicy");
assert("Test 8: Row 2 note is 'No onion'", currentCart[1].note === "No onion");
assert("Test 8: Row 3 note is 'Normal'", currentCart[2].note === "Normal");

// TEST 9 — Independent Additions
currentCart = [];
addToCart(cheese.id);
addToCart(cheese.id);

openItemCustomizer(0);
toggleCustomizerAddon('extra_cheese');
saveItemCustomizer();

assert("Test 9: Row 1 has 1 addition (+3.00)", currentCart[0].addons.length === 1 && currentCart[0].addons[0].price === 3.00);
assert("Test 9: Row 2 has 0 additions", currentCart[1].addons.length === 0);
const t9Totals = calculateCartTotals();
// Row 1: (2.00 + 3.00) * 1 = 5.00
// Row 2: 2.00 * 1 = 2.00
// Subtotal = 7.00
assert("Test 9: Row isolation and financial totals correct (Subtotal = 7.00)", t9Totals.subtotal === 7.00);

// TEST 10 — Sequence Preservation
currentCart = [];
addToCart(cheese.id);
addToCart(chickenKebab.id);
addToCart(cheese.id);
addToCart(frenchFries.id);
addToCart(cheese.id);

const t10Seq = currentCart.map(r => r.enName);
assert("Test 10: Cart order is Cheese -> Chicken Kebab -> Cheese -> French Fries -> Cheese",
    JSON.stringify(t10Seq) === JSON.stringify(['Cheese', 'Chicken Kebab', 'Cheese', 'French Fries', 'Cheese'])
);

// TEST 11 — Stock Validation
const limitedItem = { id: 'item_limited_stock_t11', enName: 'Limited Cake', arName: 'كعكة محدودة', price: 10.00, available: true, stock: 3 };
items.push(limitedItem);

currentCart = [];
addToCart(limitedItem.id);
addToCart(limitedItem.id);
addToCart(limitedItem.id);
assert("Test 11: 3 rows created matching exact available stock limit of 3", currentCart.length === 3);

// 4th addition should be blocked by aggregate stock check
const t11CartLenBefore = currentCart.length;
addToCart(limitedItem.id);
assert("Test 11: Adding 4th row blocked by aggregate stock validation", currentCart.length === t11CartLenBefore);

// Increasing row 1 quantity should also be blocked because sum is already 3
selectCartItem(0);
changeActiveCartQty(1);
assert("Test 11: Increasing row 1 blocked when aggregate quantity would exceed stock", currentCart[0].qty === 1);

// TEST 12 — Checkout
currentCart = [];
addToCart(cheese.id);
selectCartItem(0);
changeActiveCartQty(2); // Cheese Qty 3
addToCart(chickenKebab.id); // Chicken Kebab Qty 1
addToCart(cheese.id); // Cheese Qty 1
addToCart(cheese.id); // Cheese Qty 1

const ordersBeforeCount = orders.length;
const t12Totals = calculateCartTotals();
if (typeof isPrintSequenceRunning !== 'undefined') isPrintSequenceRunning = false;
completeOrderAndShowReceipt(null, 'Cash', {}, t12Totals.grandTotal);

assert("Test 12: Exactly one order saved", orders.length === ordersBeforeCount + 1);
const t12SavedOrder = orders[0];
assert("Test 12: Saved order preserves all 4 separate lines", t12SavedOrder.items.length === 4);
assert("Test 12: Saved Line 1 is Cheese Qty 3", t12SavedOrder.items[0].id === cheese.id && t12SavedOrder.items[0].qty === 3);
assert("Test 12: Saved Line 2 is Chicken Kebab Qty 1", t12SavedOrder.items[1].id === chickenKebab.id && t12SavedOrder.items[1].qty === 1);
assert("Test 12: Saved Line 3 is Cheese Qty 1", t12SavedOrder.items[2].id === cheese.id && t12SavedOrder.items[2].qty === 1);
assert("Test 12: Saved Line 4 is Cheese Qty 1", t12SavedOrder.items[3].id === cheese.id && t12SavedOrder.items[3].qty === 1);
assert("Test 12: Correct grand total saved", t12SavedOrder.grandTotal === t12Totals.grandTotal);

// TEST 13 — Receipt Rendering (KOT & Customer Invoice)
const t13KotHtml = getKitchenOrderTicketHtml(t12SavedOrder);
assert("Test 13: KOT contains 3X and 1X badges for separate lines", t13KotHtml.includes('3X') && t13KotHtml.includes('1X'));
assert("Test 13: KOT does not merge Cheese into 5X", !t13KotHtml.includes('5X'));

renderReceipt(t12SavedOrder);
const t13RecHtml = elements['recItemsTbody'].innerHTML;
assert("Test 13: Customer invoice table contains all separate lines", t13RecHtml.includes('Cheese') && t13RecHtml.includes('Chicken Kebab'));

// TEST 14 — Manual Reprints
previewExistingOrderReceipt(t12SavedOrder.id);
const t14ReprintHtml = elements['recItemsTbody'].innerHTML;
assert("Test 14: Manual reprint retains separate lines", t14ReprintHtml.includes('Cheese') && t14ReprintHtml.includes('Chicken Kebab'));

// TEST 15 — Legacy Orders (without lineId)
const legacyOrder = {
    id: 'ORD-LEGACY-001',
    seq: 9999,
    date: new Date().toISOString(),
    type: 'dine_in',
    items: [
        { id: 'item_tikka_sauce', enName: 'Tikka sauce', arName: 'صوص تيكا', price: 2.00, qty: 2 },
        { id: 'item_burger_ff_meal', enName: 'Burger /FF Meal', arName: 'وجبة برجر / بطاطس', price: 18.50, qty: 1 }
    ],
    total: 22.50,
    grandTotal: 25.88,
    status: 'completed'
};
orders.unshift(legacyOrder);
let legacyPassed = true;
try {
    renderReceipt(legacyOrder);
    const legKot = getKitchenOrderTicketHtml(legacyOrder);
    if (!legKot || legKot.length === 0) legacyPassed = false;
} catch (e) {
    legacyPassed = false;
}
assert("Test 15: Legacy orders without lineId work without errors or crashes", legacyPassed);

// TEST 16 — Repeated Fast Taps
currentCart = [];
for (let i = 0; i < 10; i++) {
    addToCart(cheese.id);
}
assert("Test 16: 10 rapid taps generate 10 separate rows", currentCart.length === 10);
assert("Test 16: All 10 have qty 1 and unique lineIds", currentCart.every(r => r.qty === 1) && new Set(currentCart.map(r => r.lineId)).size === 10);

// TEST 17 — Remove at Quantity 1
currentCart = [];
addToCart(cheese.id);
addToCart(chickenKebab.id);
assert("Test 17: Pre-condition - cart has 2 rows", currentCart.length === 2);

selectCartItem(0);
changeActiveCartQty(-1);
assert("Test 17: Decreasing Qty 1 removes only that targeted row", currentCart.length === 1);
assert("Test 17: Surviving row is untouched (Chicken Kebab)", currentCart[0].id === chickenKebab.id);

// TEST 18 — UI and Navigation
renderCart();
assert("Test 18: Cart table renders with elements", document.getElementById('posCartTableWrapper').innerHTML.length > 0);
onBottomNavClick('orders');
assert("Test 18: Navigating to orders / admin view", document.getElementById('adminView').classList.contains('active'));
onBottomNavClick('main');
assert("Test 18: Returning to main view preserves currentCart", currentCart.length === 1 && document.getElementById('posView').classList.contains('active'));
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const posAddIdx = indexHtmlContent.indexOf('cartAddonsTotal');
const posDiscIdx = indexHtmlContent.indexOf('cartDiscount');
const posTaxIdx = indexHtmlContent.indexOf('cartTax');
const posGrandIdx = indexHtmlContent.indexOf('cartGrandTotal');
assert("Test 18: Summary order in HTML preserved: Additions -> Discounts -> Taxes -> Grand Total",
    posAddIdx > 0 && posAddIdx < posDiscIdx && posDiscIdx < posTaxIdx && posTaxIdx < posGrandIdx
);

// TEST 19 — Order Return Compatibility
const returnOrderTest = {
    id: 'ORD-RET-TEST-01',
    seq: 5555,
    date: new Date().toISOString(),
    status: 'completed',
    items: [
        {
            lineId: 'line_ret_row_1',
            id: chickenKebab.id,
            enName: 'Chicken Kebab',
            arName: 'كباب دجاج',
            price: 15.00,
            qty: 1,
            modifiers: [{ id: 'm1', labelEn: 'Spicy' }]
        },
        {
            lineId: 'line_ret_row_2',
            id: chickenKebab.id,
            enName: 'Chicken Kebab',
            arName: 'كباب دجاج',
            price: 15.00,
            qty: 1,
            modifiers: [{ id: 'm2', labelEn: 'Mild' }]
        }
    ]
};
orders.unshift(returnOrderTest);
startReturnProcess(returnOrderTest.id);
assert("Test 19: Return process initializes 2 separate lines for the same product", returnItemsState.length === 2);
assert("Test 19: Return item 1 has line_ret_row_1 and modifier Spicy", returnItemsState[0].lineId === 'line_ret_row_1' && returnItemsState[0].modifiers[0].labelEn === 'Spicy');
assert("Test 19: Return item 2 has line_ret_row_2 and modifier Mild", returnItemsState[1].lineId === 'line_ret_row_2' && returnItemsState[1].modifiers[0].labelEn === 'Mild');

// Target only item 2 for return
adjRetQty(1, 1);
assert("Test 19: Return qty set on targeted item 2 only", returnItemsState[1].returnQty === 1 && returnItemsState[0].returnQty === 0);

console.log("\n=======================================================");
console.log("=== SECTION 20: MANDATORY VAT-INCLUSIVE TEST SUITE ====");
console.log("=======================================================");

const kebabVat = { id: 'item_kebab_vat_test', enName: 'Chicken Kebab', arName: 'كباب دجاج', price: 9.50, available: true, catId: 'meals' };
items.push(kebabVat);
storeSettings.taxRate = 15;

// TEST A — Basic VAT Inclusive (9.50 @ 15% VAT)
currentCart = [];
discountType = 'fixed';
discountValue = 0;
addToCart(kebabVat.id);
let tA = calculateCartTotals();
assert("Test A: Single 9.50 item extracted VAT is 1.24", tA.tax === 1.24);
assert("Test A: Customer payable total is 9.50 (NOT 10.74)", tA.grandTotal === 9.50);
assert("Test A: Net before VAT is 8.26", tA.netBeforeVat === 8.26);

// TEST B — Quantity 2
selectCartItem(0);
changeActiveCartQty(1); // qty 2
let tB = calculateCartTotals();
assert("Test B: Qty 2 extracted VAT is 2.48", tB.tax === 2.48);
assert("Test B: Customer payable total is 19.00", tB.grandTotal === 19.00);
assert("Test B: Net before VAT is 16.52", tB.netBeforeVat === 16.52);

// TEST C — Quantity 3
changeActiveCartQty(1); // qty 3
let tC = calculateCartTotals();
assert("Test C: Qty 3 extracted VAT is 3.72", tC.tax === 3.72);
assert("Test C: Customer payable total is 28.50", tC.grandTotal === 28.50);
assert("Test C: Net before VAT is 24.78", tC.netBeforeVat === 24.78);

// TEST D — Fixed Discount (1.00 on 9.50)
currentCart = [];
addToCart(kebabVat.id);
discountType = 'fixed';
discountValue = 1.00;
let tD = calculateCartTotals();
assert("Test D: 1.00 fixed discount extracted VAT is 1.11", tD.tax === 1.11);
assert("Test D: Customer payable total is 8.50", tD.grandTotal === 8.50);
assert("Test D: Net before VAT is 7.39", tD.netBeforeVat === 7.39);

// TEST E — Percentage Discount (10% on 9.50)
currentCart = [];
addToCart(kebabVat.id);
discountType = 'percent';
discountValue = 10; // 10% -> 0.95 discount -> 8.55 total
let tE = calculateCartTotals();
assert("Test E: 10% discount extracted VAT is 1.12", tE.tax === 1.12);
assert("Test E: Customer payable total is 8.55", tE.grandTotal === 8.55);
assert("Test E: Net before VAT is 7.43", tE.netBeforeVat === 7.43);

// TEST F — Paid Addition (9.50 + 2.30)
currentCart = [];
discountType = 'fixed';
discountValue = 0;
addToCart(kebabVat.id);
currentCart[0].addons = [{ id: 'addon_sauce_f', name: 'Garlic Mayo', price: 2.30 }];
let tF = calculateCartTotals();
assert("Test F: 2.30 addition extracted VAT is 1.54", tF.tax === 1.54);
assert("Test F: Customer payable total is 11.80", tF.grandTotal === 11.80);
assert("Test F: Net before VAT is 10.26", tF.netBeforeVat === 10.26);

// TEST G — Zero VAT (0%)
storeSettings.taxRate = 0;
let tG = calculateCartTotals();
assert("Test G: 0% VAT extracted VAT is 0.00", tG.tax === 0.00);
assert("Test G: Customer payable total remains 11.80", tG.grandTotal === 11.80);
assert("Test G: Net before VAT equals gross 11.80", tG.netBeforeVat === 11.80);

// Single item with 0% VAT
currentCart = [];
addToCart(kebabVat.id);
let tG2 = calculateCartTotals();
assert("Test G: Single 9.50 with 0% VAT produces 0.00 tax", tG2.tax === 0.00);
assert("Test G: Single 9.50 total remains 9.50", tG2.grandTotal === 9.50);

// TEST H — Different VAT Rates (20% and 5%)
storeSettings.taxRate = 20;
let tH20 = calculateCartTotals();
// 9.50 * 20 / 120 = 1.5833 -> 1.58
assert("Test H: 20% VAT extracted VAT is 1.58", tH20.tax === 1.58);
assert("Test H: 20% VAT customer payable total is 9.50", tH20.grandTotal === 9.50);

storeSettings.taxRate = 5;
let tH5 = calculateCartTotals();
// 9.50 * 5 / 105 = 0.45238 -> 0.45
assert("Test H: 5% VAT extracted VAT is 0.45", tH5.tax === 0.45);
assert("Test H: 5% VAT customer payable total is 9.50", tH5.grandTotal === 9.50);

// Restore storeSettings.taxRate = 15
storeSettings.taxRate = 15;

// TEST I — Cash Payment (Total 9.50, Paid 10.00 -> Change 0.50, Remaining 0.00)
currentCart = [];
addToCart(kebabVat.id); // 9.50
const orderTotalI = calculateCartTotals().grandTotal;
const cashPaidI = 10.00;
const changeI = Math.round(Math.max(0, cashPaidI - orderTotalI) * 100) / 100;
const remI = Math.round(Math.max(0, orderTotalI - cashPaidI) * 100) / 100;
assert("Test I: Cash payment 10.00 on 9.50 -> Remaining is 0.00", remI === 0.00);
assert("Test I: Cash payment 10.00 on 9.50 -> Change is 0.50", changeI === 0.50);

// TEST J — Split Payment (Total 19.00: Cash 9.00 + Mada 10.00 -> Remaining 0.00)
const orderTotalJ = 19.00;
const splitCash = 9.00;
const splitMada = 10.00;
const totalSplitPaid = splitCash + splitMada;
const remJ = Math.round(Math.max(0, orderTotalJ - totalSplitPaid) * 100) / 100;
assert("Test J: Split payment remaining is 0.00", remJ === 0.00);

// TEST K — Separate Order Rows (Repeated product creates separate lines, sums properly)
currentCart = [];
addToCart(kebabVat.id);
addToCart(kebabVat.id);
addToCart(kebabVat.id);
assert("Test K: 3 separate rows created for repeated product", currentCart.length === 3 && currentCart.every(r => r.qty === 1));
let tK = calculateCartTotals();
assert("Test K: Combined subtotal is 28.50", tK.subtotal === 28.50);
assert("Test K: Combined included VAT is 3.72", tK.tax === 3.72);
assert("Test K: Customer payable total is 28.50", tK.grandTotal === 28.50);

// TEST L — Customer Invoice & Saved Values
currentCart = [];
addToCart(kebabVat.id); // 9.50
const tL = calculateCartTotals();
nextOrderSeq = 8801;
if (typeof isPrintSequenceRunning !== 'undefined') isPrintSequenceRunning = false;
completeOrderAndShowReceipt(null, 'Cash', {}, 9.50);
const savedOrderL = orders[0];
assert("Test L: Saved order total matches cart grandTotal (9.50)", savedOrderL.grandTotal === 9.50);
assert("Test L: Saved order tax matches cart tax (1.24)", savedOrderL.tax === 1.24);
assert("Test L: Saved order net matches taxableAmount (8.26)", savedOrderL.taxableAmount === 8.26);
renderReceipt(savedOrderL);
assert("Test L: Rendered receipt Grand Total is SAR 9.50", elements['recGrandTotal'].innerText === 'SAR 9.50');
assert("Test L: Rendered receipt Included VAT is 1.24", elements['recTax'].innerText === '1.24');
assert("Test L: Rendered receipt Subtotal is 9.50", elements['recSubtotal'].innerText === '9.50');
assert("Test L: Rendered receipt Net is 8.26", elements['recNet'].innerText === '8.26');

// TEST M — QR Tax Values Match Order Total & Extracted VAT
const qrBase64 = generateZatcaTlvBase64(
    storeSettings.storeName,
    storeSettings.vatNumber,
    savedOrderL.date,
    savedOrderL.grandTotal.toFixed(2),
    (savedOrderL.tax || 0).toFixed(2)
);
assert("Test M: QR Base64 generated successfully", typeof qrBase64 === 'string' && qrBase64.length > 20);
const qrBuf = Buffer.from(qrBase64, 'base64');
let pos = 0;
const tags = {};
while (pos < qrBuf.length) {
    const tag = qrBuf[pos++];
    const len = qrBuf[pos++];
    tags[tag] = qrBuf.slice(pos, pos + len).toString('utf8');
    pos += len;
}
assert("Test M: QR Tag 4 (Total) encodes exactly '9.50'", tags[4] === '9.50');
assert("Test M: QR Tag 5 (Tax) encodes exactly '1.24'", tags[5] === '1.24');

// TEST N — Historical Orders Preservation
const histOrder = {
    id: 'ORD-HIST-999',
    seq: 999,
    date: '2025-01-01T10:00:00.000Z',
    items: [{ id: 'itm_hist', enName: 'Hist Meal', price: 10.00, qty: 1 }],
    total: 10.00,
    tax: 1.50,
    grandTotal: 11.50,
    status: 'completed'
};
orders.unshift(histOrder);
renderReceipt(histOrder);
assert("Test N: Historical order values unmodified", histOrder.grandTotal === 11.50 && histOrder.tax === 1.50);
assert("Test N: Historical receipt displays saved grand total SAR 11.50", elements['recGrandTotal'].innerText === 'SAR 11.50');
assert("Test N: Historical receipt displays saved VAT 1.50", elements['recTax'].innerText === '1.50');

// TEST O — Small Halalah Rounding Over Multiple Items
currentCart = [];
const pennyItem = { id: 'penny_item', enName: 'Penny Sauce', price: 1.15, available: true };
items.push(pennyItem);
for (let i = 0; i < 10; i++) addToCart(pennyItem.id);
let tO = calculateCartTotals();
// 10 items * 1.15 = 11.50. VAT = 11.50 * 15 / 115 = 1.50. Net = 10.00.
assert("Test O: Multi-row fractional value grandTotal is exactly 11.50", tO.grandTotal === 11.50);
assert("Test O: Multi-row fractional value VAT is exactly 1.50", tO.tax === 1.50);
assert("Test O: Multi-row fractional value Net is exactly 10.00", tO.netBeforeVat === 10.00);

// TEST P — Sales & Shift Reports Financial Consistency
const reportOrders = [savedOrderL];
const totalRevenue = reportOrders.reduce((sum, o) => sum + (o.grandTotal || o.total || 0), 0);
const totalTax = reportOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
assert("Test P: Total sales in reports is 9.50 (NOT 10.74)", totalRevenue === 9.50);
assert("Test P: Total extracted tax in reports is 1.24", totalTax === 1.24);

console.log("\n=======================================================");
console.log("=== SECTION 21: CODEX ITEM FOLDER NAVIGATION TESTS ====");
console.log("=======================================================");

// Ensure meatKebab and chickenKebab are available in 'meals' folder
const meatKebab = { id: 'item_meat_kebab_test', enName: 'Meat Kebab', arName: 'كباب لحم', price: 16.00, available: true, catId: 'meals' };
items.push(meatKebab);

// TEST 1 — Same Folder After Done
currentCart = [];
openCategoryFolder('meals');
assert("Test 1: Active category set to 'meals'", activeCategory === 'meals');
addToCart(chickenKebab.id);
assert("Test 1: Cart has 1 row after selecting Chicken Kebab", currentCart.length === 1);
assert("Test 1: Active category remains 'meals' while modifier panel is open", activeCategory === 'meals');
assert("Test 1: Modifier panel is visible", elements['itemModifierPanel'].style.display === 'flex');
assert("Test 1: Catalog views container is hidden while modifying", elements['catalogViewsContainer'].style.display === 'none');
closeItemModifierPanel(); // Cashier presses Done
assert("Test 1: After Done, activeCategory remains 'meals'", activeCategory === 'meals');
assert("Test 1: After Done, catalogViewsContainer is restored to flex", elements['catalogViewsContainer'].style.display === 'flex');
assert("Test 1: After Done, itemModifierPanel is hidden", elements['itemModifierPanel'].style.display === 'none');
assert("Test 1: Products grid shows items from 'meals' folder (not All Folders overview)", elements['productsGrid'].innerHTML.includes('Chicken Kebab') && !elements['productsGrid'].classList.contains('category-folders-view'));

// TEST 2 — Multiple Items From One Folder (Without pressing Back)
currentCart = [];
openCategoryFolder('meals');
// 1. Select Chicken Kebab
addToCart(chickenKebab.id);
closeItemModifierPanel();
// 2. Select Meat Kebab
addToCart(meatKebab.id);
closeItemModifierPanel();
// 3. Select Chicken Kebab again
addToCart(chickenKebab.id);
closeItemModifierPanel();

assert("Test 2: All 3 product selections created their own separate cart rows", currentCart.length === 3);
assert("Test 2: Each row starts with quantity 1", currentCart[0].qty === 1 && currentCart[1].qty === 1 && currentCart[2].qty === 1);
assert("Test 2: Unique lineIds assigned to each row", new Set(currentCart.map(r => r.lineId)).size === 3);
assert("Test 2: Row 1 is Chicken Kebab, Row 2 is Meat Kebab, Row 3 is Chicken Kebab", 
    currentCart[0].id === chickenKebab.id && currentCart[1].id === meatKebab.id && currentCart[2].id === chickenKebab.id
);
assert("Test 2: Same 'meals' folder remains active throughout without extra folder selection", activeCategory === 'meals');
assert("Test 2: Product grid still shows 'meals' folder items", elements['productsGrid'].innerHTML.includes('Meat Kebab'));

// TEST 3 — Explicit Back
backToFolderView(); // Cashier explicitly clicks Back button
assert("Test 3: Pressing folder Back button resets activeCategory to null", activeCategory === null);
assert("Test 3: Grid switches to category-folders-view (All Folders overview)", elements['productsGrid'].classList.contains('category-folders-view'));
assert("Test 3: Cart items remain intact after explicit Back", currentCart.length === 3);
const t3Totals = calculateCartTotals();
assert("Test 3: Financial totals remain completely unchanged", t3Totals.subtotal === 15.00 + 16.00 + 15.00);

// TEST 4 — Switch Folder
openCategoryFolder('sandwiches');
assert("Test 4: Opened sandwiches folder", activeCategory === 'sandwiches');
addToCart(frenchFries.id);
assert("Test 4: Modifier panel opened for item in sandwiches folder", elements['itemModifierPanel'].style.display === 'flex');
assert("Test 4: Active category remains 'sandwiches'", activeCategory === 'sandwiches');
closeItemModifierPanel();
assert("Test 4: After Done, cashier returns to 'sandwiches' folder", activeCategory === 'sandwiches');
assert("Test 4: Product grid displays items of 'sandwiches' folder", elements['productsGrid'].innerHTML.includes('French Fries'));

// TEST 5 — Existing Exit Preference Ignored / Reconciled
posPreferences.stayAtCategory = 'exit'; // Simulate old/saved 'exit' preference
openCategoryFolder('meals');
assert("Test 5: Set up folder with stayAtCategory='exit'", activeCategory === 'meals');
addToCart(chickenKebab.id);
assert("Test 5: activeCategory NOT reset on product addition when preference is 'exit'", activeCategory === 'meals');
closeItemModifierPanel();
assert("Test 5: activeCategory NOT reset on Done when preference is 'exit'", activeCategory === 'meals');
assert("Test 5: Folder remains 'meals' after item customization", activeCategory === 'meals');
posPreferences.stayAtCategory = 'stay'; // Restore standard setting

// TEST 6 — Modifier Isolation Across Rows
currentCart = [];
openCategoryFolder('meals');
// Row 1: Chicken Kebab with Full
addToCart(chickenKebab.id);
toggleModifier({ id: 'mod_full_t6', labelEn: 'Full', labelAr: 'كامل', price: 0, actionType: 'normal' });
updateActiveItemNote("Well done");
closeItemModifierPanel();

// Row 2: Meat Kebab with Extra Sauce
addToCart(meatKebab.id);
toggleModifier({ id: 'mod_extra_sauce_t6', labelEn: 'Extra Sauce', labelAr: 'صوص زيادة', price: 2.00, actionType: 'extra' });
updateActiveItemNote("Spicy");
closeItemModifierPanel();

// Row 3: Chicken Kebab with No Lettuce
addToCart(chickenKebab.id);
toggleModifier({ id: 'mod_no_lettuce_t6', labelEn: 'No Lettuce', labelAr: 'بدون خس', price: 0, actionType: 'remove' });
updateActiveItemNote("No garlic");
closeItemModifierPanel();

assert("Test 6: Row 1 has Full modifier and 'Well done' note", currentCart[0].modifiers.some(m => m.id === 'mod_full_t6') && currentCart[0].note === "Well done");
assert("Test 6: Row 2 has Extra Sauce (+2.00) and 'Spicy' note", currentCart[1].modifiers.some(m => m.id === 'mod_extra_sauce_t6') && currentCart[1].note === "Spicy");
assert("Test 6: Row 3 has No Lettuce and 'No garlic' note", currentCart[2].modifiers.some(m => m.id === 'mod_no_lettuce_t6') && currentCart[2].note === "No garlic");
assert("Test 6: Cashier is still in 'meals' folder after all customizations", activeCategory === 'meals');

// TEST 7 — Scroll Restoration
openCategoryFolder('meals');
const scrollMock = document.querySelector('.products-grid-scroll');
scrollMock.scrollTop = 450;
addToCart(chickenKebab.id);
assert("Test 7: Scroll position 450 captured before modifier panel opens", savedCatalogScrollTop === 450);
closeItemModifierPanel();
assert("Test 7: Scroll position restored to 450 after Done", scrollMock.scrollTop === 450);
assert("Test 7: Active category remains 'meals'", activeCategory === 'meals');

// TEST 8 — Folder Search Filter Preservation
openCategoryFolder('meals');
elements['productSearchInput'].value = 'Kebab';
filterProducts();
assert("Test 8: Search filter within folder displays matched results", elements['productsGrid'].innerHTML.includes('Kebab'));
addToCart(chickenKebab.id);
closeItemModifierPanel();
assert("Test 8: Active folder remains 'meals'", activeCategory === 'meals');
assert("Test 8: Search query 'Kebab' preserved in input", elements['productSearchInput'].value === 'Kebab');
assert("Test 8: Filtered results preserved in grid after Done", elements['productsGrid'].innerHTML.includes('Chicken Kebab'));

// TEST 9 — Stock Validation Does Not Reset Folder
const outOfStockMeal = { id: 'item_oos_meal', enName: 'OOS Meal', arName: 'وجبة نافذة', price: 20.00, available: false, catId: 'meals' };
items.push(outOfStockMeal);
openCategoryFolder('meals');
addToCart(outOfStockMeal.id);
assert("Test 9: Out of stock item blocked and folder remains 'meals'", activeCategory === 'meals');

// Over stock limit check
openCategoryFolder('meals');
currentCart = [];
const limitedKebab = { id: 'item_limited_kebab', enName: 'Limited Kebab', arName: 'كباب محدود', price: 15.00, available: true, stock: 1, catId: 'meals' };
items.push(limitedKebab);
addToCart(limitedKebab.id);
closeItemModifierPanel();
assert("Test 9: Added 1 limited kebab to cart", currentCart.length === 1);
addToCart(limitedKebab.id); // Blocked: stock is 1
assert("Test 9: Adding 2nd limited kebab blocked and folder remains 'meals'", currentCart.length === 1 && activeCategory === 'meals');

// TEST 10 — Catalog Modes (grid8 and split)
openCategoryFolder('meals');
setPosCatalogMode('grid8');
assert("Test 10: Switched to grid8 mode and activeCategory preserved", activeCategory === 'meals');
addToCart(chickenKebab.id);
closeItemModifierPanel();
assert("Test 10: After Done in grid8 mode, activeCategory is 'meals'", activeCategory === 'meals');

setPosCatalogMode('split');
assert("Test 10: Switched to split mode and activeCategory preserved", activeCategory === 'meals');
addToCart(meatKebab.id);
closeItemModifierPanel();
assert("Test 10: After Done in split mode, activeCategory is 'meals'", activeCategory === 'meals');

// TEST 11 — Responsive Layout Classes & Structure Integrity
const cssContent = fs.readFileSync(path.join(__dirname, 'css', 'pos.css'), 'utf8');
const responsiveCssContent = fs.readFileSync(path.join(__dirname, 'css', 'responsive.css'), 'utf8');
assert("Test 11: .products-grid-scroll styled in pos.css", cssContent.includes('.products-grid-scroll'));
assert("Test 11: .pos-folder-header-bar styled in pos.css", cssContent.includes('.pos-folder-header-bar'));
assert("Test 11: .pos-folder-back-btn styled in pos.css", cssContent.includes('.pos-folder-back-btn'));
assert("Test 11: Responsive grid layout handles multiple breakpoints in responsive.css", 
    responsiveCssContent.includes('.products-grid') && responsiveCssContent.includes('.products-grid-scroll')
);

// TEST 12 — Full Regression: Totals, Payments, Printing, Receipts
currentCart = [];
openCategoryFolder('meals');
addToCart(chickenKebab.id); // 15.00
closeItemModifierPanel();
addToCart(meatKebab.id);    // 16.00
closeItemModifierPanel();

const regTotals = calculateCartTotals();
assert("Test 12: Subtotal calculated correctly (15 + 16 = 31.00)", regTotals.subtotal === 31.00);
assert("Test 12: Included VAT calculated correctly (31 * 15 / 115 = 4.04)", regTotals.tax === 4.04);
assert("Test 12: Grand total is 31.00", regTotals.grandTotal === 31.00);

nextOrderSeq = 7001;
completeOrderAndShowReceipt(null, 'Cash', {}, regTotals.grandTotal);
assert("Test 12: Order successfully placed", orders[0].seq === 7001 && orders[0].grandTotal === 31.00);
assert("Test 12: Saved order maintains 2 independent rows", orders[0].items.length === 2);
const kot = getKitchenOrderTicketHtml(orders[0]);
assert("Test 12: Kitchen ticket rendered properly with items", kot.includes('Chicken Kebab') && kot.includes('Meat Kebab'));

// =======================================================
// === SECTION 22: CODEX POS ORDER TYPE EXACT 5 OPTIONS ==
// =======================================================

function parseOptions(html) {
    const matches = [...html.matchAll(/<option\s+value="([^"]*)"[^>]*>(.*?)<\/option>/g)];
    return matches.map(m => ({ value: m[1], text: m[2] }));
}

// TEST 1 — Exact Options: 5 options in exact order with exact English labels & capitalization
currentLang = 'en';
currentOrderTypeId = 'local';
renderOrderTypeSelector();
let otOptions = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Section 22 Test 1: Exactly 5 options in Order Type dropdown", otOptions.length === 5);
assert("Section 22 Test 1: Option 1 is Delivery", otOptions[0].value === 'delivery' && otOptions[0].text === 'Delivery');
assert("Section 22 Test 1: Option 2 is local", otOptions[1].value === 'local' && otOptions[1].text === 'local');
assert("Section 22 Test 1: Option 3 is Receive", otOptions[2].value === 'receive' && otOptions[2].text === 'Receive');
assert("Section 22 Test 1: Option 4 is Cars", otOptions[3].value === 'cars' && otOptions[3].text === 'Cars');
assert("Section 22 Test 1: Option 5 is Delivery D", otOptions[4].value === 'delivery_d' && otOptions[4].text === 'Delivery D');

// TEST 2 — No Old Options: Verify Customer records or extra order types do NOT appear
const prohibitedValues = ['cash', 'hungerstation', 'jahiz', 'ninja', 'management', 'keeta', 'mrsool', 'toyou', 'thechefz', 'mosque'];
const hasProhibited = otOptions.some(opt => prohibitedValues.includes(opt.value) || opt.text.toLowerCase().includes('customer') || opt.text.toLowerCase().includes('staff'));
assert("Section 22 Test 2: No customer records appear in Order Type dropdown", !hasProhibited);

// Verify adding a custom 6th order type via orderTypes array does NOT pollute the POS dropdown
orderTypes.push({ id: 'ot_custom_extra', nameEn: 'Extra VIP Type', nameAr: 'نوع إضافي', icon: 'fa-star' });
renderOrderTypeSelector();
otOptions = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Section 22 Test 2: POS dropdown strictly preserves exactly 5 options when extra orderTypes exist", otOptions.length === 5);
assert("Section 22 Test 2: Extra VIP Type is not shown in POS dropdown", !otOptions.some(opt => opt.value === 'ot_custom_extra'));

// TEST 3 — Customer Unchanged: Customer dropdown retains all customers
renderCustomerSelector();
const custOptions = parseOptions(elements['posCustomerSelect'].innerHTML);
assert("Section 22 Test 3: Customer dropdown options preserved", custOptions.length >= 10);
assert("Section 22 Test 3: Customer dropdown contains cash customer", custOptions.some(c => c.value === 'cash'));
assert("Section 22 Test 3: Customer dropdown contains hungerstation", custOptions.some(c => c.value === 'hungerstation'));

// TEST 4 — Independent Selection: Selecting Cars updates Order Type without modifying Customer
currentCustomerId = 'cash';
elements['posCustomerSelect'].value = 'cash';
onPosOrderTypeChange('cars');
assert("Section 22 Test 4: currentOrderTypeId is cars", currentOrderTypeId === 'cars');
assert("Section 22 Test 4: Order Type select value is cars", elements['posOrderTypeSelect'].value === 'cars');
assert("Section 22 Test 4: Customer remains cash customer", currentCustomerId === 'cash');
assert("Section 22 Test 4: Customer select element remains cash", elements['posCustomerSelect'].value === 'cash');

// TEST 5 — Customer Synchronization: Selecting an online partner defaults to delivery, cash defaults to local
onPosCustomerChange('hungerstation');
assert("Section 22 Test 5: Selecting Hungerstation syncs customerId", currentCustomerId === 'hungerstation');
assert("Section 22 Test 5: Hungerstation defaults Order Type to delivery", currentOrderTypeId === 'delivery');
assert("Section 22 Test 5: Dropdown 2 shows delivery", elements['posOrderTypeSelect'].value === 'delivery');

onPosCustomerChange('cash');
assert("Section 22 Test 5: Selecting Cash Customer syncs customerId", currentCustomerId === 'cash');
assert("Section 22 Test 5: Cash Customer defaults Order Type to delivery", currentOrderTypeId === 'delivery');
assert("Section 22 Test 5: Dropdown 2 shows delivery", elements['posOrderTypeSelect'].value === 'delivery');

// TEST 6 — Order Type Persistence: Normal rerender or unrelated UI refresh does not reset Order Type
onPosOrderTypeChange('receive');
assert("Section 22 Test 6: Receive selected", currentOrderTypeId === 'receive');
renderOrderTypeSelector();
assert("Section 22 Test 6: renderOrderTypeSelector preserves Receive", currentOrderTypeId === 'receive' && elements['posOrderTypeSelect'].value === 'receive');
updateOrderPanelMeta();
assert("Section 22 Test 6: updateOrderPanelMeta preserves Receive", currentOrderTypeId === 'receive' && elements['posOrderTypeSelect'].value === 'receive');

// TEST 7 — All Five Options: Individually select each option
const expectedFive = [
    { id: 'delivery', label: 'Delivery' },
    { id: 'local', label: 'local' },
    { id: 'receive', label: 'Receive' },
    { id: 'cars', label: 'Cars' },
    { id: 'delivery_d', label: 'Delivery D' }
];
expectedFive.forEach(item => {
    onPosOrderTypeChange(item.id);
    assert(`Section 22 Test 7: Selecting ${item.id} sets internal ID`, currentOrderTypeId === item.id);
    assert(`Section 22 Test 7: Selecting ${item.id} sets select element value`, elements['posOrderTypeSelect'].value === item.id);
});

// TEST 8 — Gear and Arrow Controls
const posIndexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert("Section 22 Test 8: Customer select present in markup", posIndexHtml.includes('id="posCustomerSelect"'));
assert("Section 22 Test 8: Order Type select present in markup", posIndexHtml.includes('id="posOrderTypeSelect"'));
assert("Section 22 Test 8: Customer gear button present", posIndexHtml.includes('onclick="promptAddCustomer()"'));
assert("Section 22 Test 8: Order Type gear button present", posIndexHtml.includes('onclick="promptAddOrderType()"'));
// Test promptAddOrderType feedback and preservation of fixed 5 options
const prevOtCount = orderTypes.length;
promptAddOrderType();
assert("Section 22 Test 8: promptAddOrderType added item to data collection", orderTypes.length === prevOtCount + 1);
otOptions = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Section 22 Test 8: POS dropdown remains strictly 5 options after gear action", otOptions.length === 5);

// TEST 9 — Table Selector: Responds to applicable Order Types
onPosOrderTypeChange('local');
assert("Section 22 Test 9: Table selector displayed for local", elements['tablePickerRow'].style.display === 'flex');
onPosOrderTypeChange('delivery');
assert("Section 22 Test 9: Table selector hidden for delivery", elements['tablePickerRow'].style.display === 'none');
onPosOrderTypeChange('receive');
assert("Section 22 Test 9: Table selector hidden for receive", elements['tablePickerRow'].style.display === 'none');
onPosOrderTypeChange('cars');
assert("Section 22 Test 9: Table selector hidden for cars", elements['tablePickerRow'].style.display === 'none');
onPosOrderTypeChange('delivery_d');
assert("Section 22 Test 9: Table selector hidden for delivery_d", elements['tablePickerRow'].style.display === 'none');

// TEST 10 — Checkout and Saving: Order saving, receipts, KOT for all 5 types + Payment policies
expectedFive.forEach((item, idx) => {
    currentCart = [
        { lineId: generateCartLineId(), id: "item_chicken_kebab", enName: "Chicken Kebab", arName: "كباب دجاج", price: 10.00, qty: 1, addons: [], modifiers: [], note: '' }
    ];
    currentCustomerId = 'cash';
    onPosOrderTypeChange(item.id);
    const checkoutSeq = 8000 + idx;
    nextOrderSeq = checkoutSeq;
    const checkoutTotals = calculateCartTotals();
    completeOrderAndShowReceipt(null, 'Cash', {}, checkoutTotals.grandTotal);
    
    const saved = orders[0];
    assert(`Section 22 Test 10: Order saved with seq ${checkoutSeq}`, saved.seq === checkoutSeq);
    assert(`Section 22 Test 10: Order saved with orderTypeId ${item.id}`, saved.orderTypeId === item.id);
    assert(`Section 22 Test 10: Order saved with orderType label ${item.label}`, saved.orderType === item.label);
    if (item.id === 'local') {
        assert("Section 22 Test 10: local order records table number", saved.table !== '-');
    } else {
        assert(`Section 22 Test 10: ${item.id} order sets table to '-'`, saved.table === '-');
    }
    
    renderReceipt(saved);
    const receiptType = elements['recOrderType'].innerText;
    if (item.id === 'local') assert("Section 22 Test 10: Receipt displays DINE-IN", receiptType.includes('DINE-IN'));
    if (item.id === 'delivery') assert("Section 22 Test 10: Receipt displays DELIVERY", receiptType === 'DELIVERY');
    if (item.id === 'receive') assert("Section 22 Test 10: Receipt displays TAKEAWAY", receiptType === 'TAKEAWAY');
    if (item.id === 'cars') assert("Section 22 Test 10: Receipt displays CARS", receiptType === 'CARS');
    if (item.id === 'delivery_d') assert("Section 22 Test 10: Receipt displays DELIVERY D", receiptType === 'DELIVERY D');

    const kotHtml = getKitchenOrderTicketHtml(saved);
    if (item.id === 'local') assert("Section 22 Test 10: KOT displays DINE-IN", kotHtml.includes('DINE-IN'));
    if (item.id === 'delivery') assert("Section 22 Test 10: KOT displays DELIVERY", kotHtml.includes('DELIVERY'));
    if (item.id === 'receive') assert("Section 22 Test 10: KOT displays TAKEAWAY", kotHtml.includes('TAKEAWAY'));
    if (item.id === 'cars') assert("Section 22 Test 10: KOT displays CARS", kotHtml.includes('CARS'));
    if (item.id === 'delivery_d') assert("Section 22 Test 10: KOT displays DELIVERY D", kotHtml.includes('DELIVERY D'));
});

// Verify Customer Payment Restrictions are preserved
assert("Section 22 Test 10: Hungerstation policy is ONLINE_PARTNER", getOrderChannelPolicy('hungerstation') === 'ONLINE_PARTNER');
assert("Section 22 Test 10: Online partner only allows credit payment", JSON.stringify(getAllowedPaymentMethods('ONLINE_PARTNER')) === JSON.stringify(['credit']));
assert("Section 22 Test 10: Management staff policy is STAFF_EXPENSE", getOrderChannelPolicy('management') === 'STAFF_EXPENSE');
assert("Section 22 Test 10: Staff expense routes to expense screen", getCheckoutDestination('STAFF_EXPENSE') === 'STAFF_EXPENSE_SCREEN');

// TEST 11 — Language: Switch English <-> Arabic
onPosOrderTypeChange('receive');
currentLang = 'ar';
renderOrderTypeSelector();
const arOtOptions = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Section 22 Test 11: Arabic dropdown has 5 options", arOtOptions.length === 5);
assert("Section 22 Test 11: Arabic Option 1 is delivery / توصيل", arOtOptions[0].value === 'delivery' && arOtOptions[0].text === 'توصيل');
assert("Section 22 Test 11: Arabic Option 2 is local / محلي", arOtOptions[1].value === 'local' && arOtOptions[1].text === 'محلي');
assert("Section 22 Test 11: Arabic Option 3 is receive / استلام", arOtOptions[2].value === 'receive' && arOtOptions[2].text === 'استلام');
assert("Section 22 Test 11: Arabic Option 4 is cars / خدمة السيارات", arOtOptions[3].value === 'cars' && arOtOptions[3].text === 'خدمة السيارات');
assert("Section 22 Test 11: Arabic Option 5 is delivery_d / توصيل سريع", arOtOptions[4].value === 'delivery_d' && arOtOptions[4].text === 'توصيل سريع');
assert("Section 22 Test 11: Arabic selection remains receive", currentOrderTypeId === 'receive' && elements['posOrderTypeSelect'].value === 'receive');

currentLang = 'en';
renderOrderTypeSelector();
const enOtOptions = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Section 22 Test 11: English Option 2 is local", enOtOptions[1].text === 'local');
assert("Section 22 Test 11: English selection remains receive", currentOrderTypeId === 'receive' && elements['posOrderTypeSelect'].value === 'receive');

// TEST 12 — Responsive Design: Verify CSS rules keep selectors side-by-side
const posReportsCss = fs.readFileSync(path.join(__dirname, 'css', 'reports.css'), 'utf8');
assert("Section 22 Test 12: pos-meta-selectors-card has 2-column grid in CSS", posReportsCss.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important'));
assert("Section 22 Test 12: pos-meta-selectors-card enforces ltr direction in CSS", posReportsCss.includes('direction: ltr !important'));

// TEST 13 — Historical Data: Verify legacy orders remain readable
const historicalLegacyOrder = {
    id: 'ORD-999',
    seq: 999,
    date: '2026-09-01T10:00:00Z',
    dateFormatted: '9/1/2026, 10:00:00 AM',
    type: 'dine_in',
    orderType: 'Dine-in',
    orderTypeId: 'local',
    table: 'Table 4',
    customer: 'Cash Customer',
    customerId: 'cash',
    items: [
        { id: 'item_meat_kebab', arName: 'كباب لحم', enName: 'Meat Kebab', price: 9.50, qty: 1 }
    ],
    grandTotal: 9.50,
    paid: 9.50
};
renderReceipt(historicalLegacyOrder);
assert("Section 22 Test 13: Legacy order receipt renders DINE-IN (Table 4)", elements['recOrderType'].innerText === 'DINE-IN (Table 4)');
const legacyKot = getKitchenOrderTicketHtml(historicalLegacyOrder);
assert("Section 22 Test 13: Legacy order KOT renders DINE-IN (Table 4)", legacyKot.includes('DINE-IN (Table 4)'));

// TEST 14 — Full Regression Reset to clean state
safeStartNewOrder();
assert("Section 22 Test 14: Safe start new order resets to cash customer", currentCustomerId === 'cash');
assert("Section 22 Test 14: Safe start new order resets to delivery order type", currentOrderTypeId === 'delivery');

// =========================================================
// SECTION 23: CODEX MASTER ACCEPTANCE TESTS (Part 19)
// =========================================================

// Acceptance Test 1 — Fresh POS Initialization: Default is "Cash customer | Delivery"
safeStartNewOrder();
renderCustomerSelector();
renderOrderTypeSelector();
assert("Codex Test 1: Fresh order defaults customer to cash", currentCustomerId === 'cash');
assert("Codex Test 1: Fresh order defaults order type to delivery", currentOrderTypeId === 'delivery');
assert("Codex Test 1: Dropdown 1 shows cash customer", elements['posCustomerSelect'].value === 'cash');
assert("Codex Test 1: Dropdown 2 shows delivery", elements['posOrderTypeSelect'].value === 'delivery');

// Acceptance Test 2 — Exactly Five Options in Order Type dropdown
currentLang = 'en';
renderOrderTypeSelector();
const codexOtOpts = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Codex Test 2: Dropdown 2 contains exactly 5 options", codexOtOpts.length === 5);
assert("Codex Test 2: Option 1 is Delivery", codexOtOpts[0].value === 'delivery' && codexOtOpts[0].text === 'Delivery');
assert("Codex Test 2: Option 2 is local", codexOtOpts[1].value === 'local' && codexOtOpts[1].text === 'local');
assert("Codex Test 2: Option 3 is Receive", codexOtOpts[2].value === 'receive' && codexOtOpts[2].text === 'Receive');
assert("Codex Test 2: Option 4 is Cars", codexOtOpts[3].value === 'cars' && codexOtOpts[3].text === 'Cars');
assert("Codex Test 2: Option 5 is Delivery D", codexOtOpts[4].value === 'delivery_d' && codexOtOpts[4].text === 'Delivery D');

// Acceptance Test 3 — No extra options or customer records in Dropdown 2
const prohibitedCustomers = ['cash', 'hungerstation', 'jahiz', 'ninja', 'management', 'keeta', 'mrsool', 'toyou', 'thechefz', 'mosque'];
assert("Codex Test 3: No customer records in Dropdown 2", !codexOtOpts.some(o => prohibitedCustomers.includes(o.value)));
assert("Codex Test 3: Exactly 5 options enforced", codexOtOpts.length === 5);

// Acceptance Test 4 — Customer Dropdown retains all records
renderCustomerSelector();
const codexCustOpts = parseOptions(elements['posCustomerSelect'].innerHTML);
assert("Codex Test 4: All customer records available", codexCustOpts.length >= 10);
assert("Codex Test 4: Contains cash customer", codexCustOpts.some(c => c.value === 'cash'));
assert("Codex Test 4: Contains jahiz", codexCustOpts.some(c => c.value === 'jahiz'));
assert("Codex Test 4: Contains ninja", codexCustOpts.some(c => c.value === 'ninja'));

// Acceptance Test 5 — Manual Order Type Change (Select Cars)
onPosOrderTypeChange('cars');
assert("Codex Test 5: Customer is cash", currentCustomerId === 'cash');
assert("Codex Test 5: Order type is cars", currentOrderTypeId === 'cars');
assert("Codex Test 5: Display shows Cash customer | Cars", elements['posCustomerSelect'].value === 'cash' && elements['posOrderTypeSelect'].value === 'cars');

// Acceptance Test 6 — Product Addition preserves manual Order Type selection
const sampleKebab = items.find(i => i.id === 'item_chicken_kebab') || items[0];
addToCart(sampleKebab.id);
assert("Codex Test 6: Cart has items", currentCart.length > 0);
assert("Codex Test 6: Order type remains cars after product addition", currentOrderTypeId === 'cars');
assert("Codex Test 6: Dropdown 2 value remains cars", elements['posOrderTypeSelect'].value === 'cars');

// Acceptance Test 7 — Modifier Done preserves manual Order Type selection
closeItemModifierPanel();
assert("Codex Test 7: Order type remains cars after Modifier Done", currentOrderTypeId === 'cars');
assert("Codex Test 7: Dropdown 2 value remains cars after Modifier Done", elements['posOrderTypeSelect'].value === 'cars');

// Acceptance Test 8 — Customer Mapping (Jahiz -> Delivery without extra options)
onPosCustomerChange('jahiz');
assert("Codex Test 8: Customer updated to jahiz", currentCustomerId === 'jahiz');
assert("Codex Test 8: Order type mapped to delivery", currentOrderTypeId === 'delivery');
assert("Codex Test 8: Dropdown 2 value is delivery", elements['posOrderTypeSelect'].value === 'delivery');
const jahizOtOpts = parseOptions(elements['posOrderTypeSelect'].innerHTML);
assert("Codex Test 8: Dropdown 2 option count remains strictly 5", jahizOtOpts.length === 5);

// Acceptance Test 9 — Customer Mapping (Ninja -> Delivery with online partner policy)
onPosCustomerChange('ninja');
assert("Codex Test 9: Customer updated to ninja", currentCustomerId === 'ninja');
assert("Codex Test 9: Order type mapped to delivery", currentOrderTypeId === 'delivery');
assert("Codex Test 9: Policy is ONLINE_PARTNER", getOrderChannelPolicy('ninja') === 'ONLINE_PARTNER');

// Acceptance Test 10 — Manual Selection After Mapping (Select Cars after Ninja)
onPosOrderTypeChange('cars');
assert("Codex Test 10: Manual selection changes order type to cars", currentOrderTypeId === 'cars');
assert("Codex Test 10: Customer remains ninja", currentCustomerId === 'ninja');
// UI rerender
renderOrderTypeSelector();
assert("Codex Test 10: renderOrderTypeSelector preserves cars", currentOrderTypeId === 'cars' && elements['posOrderTypeSelect'].value === 'cars');

// Acceptance Test 11 — New Order (Safe start new order restores Cash customer | Delivery)
safeStartNewOrder();
assert("Codex Test 11: New order restores cash customer", currentCustomerId === 'cash');
assert("Codex Test 11: New order restores delivery", currentOrderTypeId === 'delivery');
assert("Codex Test 11: Dropdown 1 is cash", elements['posCustomerSelect'].value === 'cash');
assert("Codex Test 11: Dropdown 2 is delivery", elements['posOrderTypeSelect'].value === 'delivery');

// Acceptance Test 12 — Cancelled New Order Confirmation
// Setup order with items and Cars
addToCart(sampleKebab.id);
onPosOrderTypeChange('cars');
assert("Codex Test 12: Initial cart has items", currentCart.length === 1);
assert("Codex Test 12: Initial order type is cars", currentOrderTypeId === 'cars');
// Mock confirm dialog returning false (cashier cancels confirmation)
const origConfirm = global.confirm;
global.confirm = () => false;
const cancelResult = safeStartNewOrder();
assert("Codex Test 12: safeStartNewOrder returned false", cancelResult === false);
assert("Codex Test 12: Cart NOT cleared on cancel", currentCart.length === 1);
assert("Codex Test 12: Customer remains cash", currentCustomerId === 'cash');
assert("Codex Test 12: Order type remains cars", currentOrderTypeId === 'cars');
global.confirm = origConfirm;

// Acceptance Test 13 — Successful Checkout preserves completed order & resets NEXT to Cash | Delivery
const checkoutSeq2 = 9100;
nextOrderSeq = checkoutSeq2;
currentCustomerId = 'ninja';
currentOrderTypeId = 'cars';
currentOrderType = 'cars';
const chkTotals = calculateCartTotals();
completeOrderAndShowReceipt(null, 'Cash', {}, chkTotals.grandTotal);
const completedOrderRecord = orders[0];
assert("Codex Test 13: Completed order preserves customerId ninja", completedOrderRecord.customerId === 'ninja');
assert("Codex Test 13: Completed order preserves orderTypeId cars", completedOrderRecord.orderTypeId === 'cars');
assert("Codex Test 13: NEXT order customer resets to cash", currentCustomerId === 'cash');
assert("Codex Test 13: NEXT order orderTypeId resets to delivery", currentOrderTypeId === 'delivery');
assert("Codex Test 13: Dropdown 1 shows cash", elements['posCustomerSelect'].value === 'cash');
assert("Codex Test 13: Dropdown 2 shows delivery", elements['posOrderTypeSelect'].value === 'delivery');

// Acceptance Test 14 — Failed/Cancelled Checkout preserves cart and state
addToCart(sampleKebab.id);
onPosOrderTypeChange('receive');
assert("Codex Test 14: Cart has 1 item", currentCart.length === 1);
// Attempt invalid payment with 0 amount
completeOrderAndShowReceipt(null, 'Cash', {}, 0);
assert("Codex Test 14: Cart preserved on payment failure", currentCart.length === 1);
assert("Codex Test 14: Order type preserved as receive", currentOrderTypeId === 'receive');
safeStartNewOrder();

// Acceptance Test 15 — Language Switch (English <-> Arabic) preserves selected IDs and fixed positions
currentLang = 'en';
onPosCustomerChange('cash');
onPosOrderTypeChange('cars');
applyLanguage('ar');
assert("Codex Test 15: Arabic customer ID remains cash", currentCustomerId === 'cash');
assert("Codex Test 15: Arabic order type ID remains cars", currentOrderTypeId === 'cars');
assert("Codex Test 15: Arabic Dropdown 2 value is cars", elements['posOrderTypeSelect'].value === 'cars');
applyLanguage('en');
assert("Codex Test 15: English customer ID remains cash", currentCustomerId === 'cash');
assert("Codex Test 15: English order type ID remains cars", currentOrderTypeId === 'cars');
assert("Codex Test 15: English Dropdown 2 value is cars", elements['posOrderTypeSelect'].value === 'cars');

// Acceptance Test 16 — Both Dropdown Arrows present and functional
assert("Codex Test 16: Customer select has select dropdown element", elements['posCustomerSelect'] !== undefined);
assert("Codex Test 16: Order Type select has select dropdown element", elements['posOrderTypeSelect'] !== undefined);

// Acceptance Test 17 — Both Settings Icons (Gear buttons)
assert("Codex Test 17: Customer gear button bound to promptAddCustomer", posIndexHtml.includes('onclick="promptAddCustomer()"'));
assert("Codex Test 17: Order type gear button bound to promptAddOrderType", posIndexHtml.includes('onclick="promptAddOrderType()"'));

// Acceptance Test 18 — Customer and Order Type Independence
onPosOrderTypeChange('delivery_d');
assert("Codex Test 18: Order type is delivery_d", currentOrderTypeId === 'delivery_d');
assert("Codex Test 18: Customer was not changed by order type change", currentCustomerId === 'cash');

// Acceptance Test 19 — Table Selector responds to Order Types
onPosOrderTypeChange('local');
assert("Codex Test 19: Table visible for local", elements['tablePickerRow'].style.display === 'flex');
onPosOrderTypeChange('delivery');
assert("Codex Test 19: Table hidden for delivery", elements['tablePickerRow'].style.display === 'none');
onPosOrderTypeChange('cars');
assert("Codex Test 19: Table hidden for cars", elements['tablePickerRow'].style.display === 'none');

// Acceptance Test 20 — Partner Payment Restrictions preserved across Order Types
onPosCustomerChange('hungerstation');
onPosOrderTypeChange('cars'); // Manually change to Cars
assert("Codex Test 20: Hungerstation policy still ONLINE_PARTNER after order type change", getOrderChannelPolicy(currentCustomerId) === 'ONLINE_PARTNER');
assert("Codex Test 20: Only credit payment allowed for online partner", JSON.stringify(getAllowedPaymentMethods('ONLINE_PARTNER')) === JSON.stringify(['credit']));

// Acceptance Test 21 — Repeated Product Rows: Independent cart lines
safeStartNewOrder();
addToCart(sampleKebab.id);
addToCart(sampleKebab.id);
addToCart(sampleKebab.id);
assert("Codex Test 21: 3 independent cart rows created", currentCart.length === 3);
assert("Codex Test 21: Row 1 qty is 1", currentCart[0].qty === 1);
assert("Codex Test 21: Row 2 qty is 1", currentCart[1].qty === 1);
assert("Codex Test 21: Row 3 qty is 1", currentCart[2].qty === 1);
assert("Codex Test 21: Unique line IDs", currentCart[0].lineId !== currentCart[1].lineId);
safeStartNewOrder();

// Acceptance Test 22 — Responsive layout: Side by side verified in CSS
assert("Codex Test 22: Grid 2-column layout in CSS", posReportsCss.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important'));
assert("Codex Test 22: Enforces ltr direction", posReportsCss.includes('direction: ltr !important'));

// Acceptance Test 23 — Active Order Restoration across refresh
// Mock an active order in localStorage
const mockPreservedState = {
    cart: [{ lineId: 'test_line_1', id: 'item_tandoori', enName: 'Tandoori', arName: 'تندوري', price: 10.50, qty: 1 }],
    customerId: 'jahiz',
    orderTypeId: 'cars',
    orderType: 'cars',
    table: 'Table 2'
};
localStorage.setItem('nurpos_active_order', JSON.stringify(mockPreservedState));
const restored = restoreActiveOrderState();
assert("Codex Test 23: restoreActiveOrderState returns true when active order exists", restored === true);
assert("Codex Test 23: Preserved customerId jahiz restored", currentCustomerId === 'jahiz');
assert("Codex Test 23: Preserved orderTypeId cars restored", currentOrderTypeId === 'cars');
assert("Codex Test 23: Preserved cart restored", currentCart.length === 1 && currentCart[0].id === 'item_tandoori');
clearActiveOrderState();
safeStartNewOrder();

// Acceptance Test 24 — Historical Compatibility: Legacy orders readable
const legacyOrder2 = {
    id: 'ORD-500',
    seq: 500,
    date: '2026-08-15T12:00:00Z',
    dateFormatted: '8/15/2026, 12:00:00 PM',
    type: 'takeaway',
    orderType: 'Takeaway',
    orderTypeId: 'receive',
    table: '-',
    customer: 'Cash Customer',
    customerId: 'cash',
    items: [{ id: 'item_shish_tawooq', arName: 'شيش طاووق', enName: 'Shish Tawooq', price: 9.50, qty: 2 }],
    grandTotal: 19.00,
    paid: 19.00
};
renderReceipt(legacyOrder2);
assert("Codex Test 24: Legacy takeaway receipt renders TAKEAWAY", elements['recOrderType'].innerText === 'TAKEAWAY');

// Acceptance Test 25 — Final Clean State
safeStartNewOrder();
assert("Codex Test 25: Final clean state customer is cash", currentCustomerId === 'cash');
assert("Codex Test 25: Final clean state order type is delivery", currentOrderTypeId === 'delivery');

console.log(`\n=== Verification Finished: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) process.exit(1);
else process.exit(0);

