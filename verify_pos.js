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
// onPosOrderTypeChange was repurposed to mirror customers array.
currentCustomerId = 'cash'; // Reset to cash so downstream tests (like Image 1 receipt) don't fail due to ONLINE_PARTNER policy

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

completeOrderAndShowReceipt(null, 'Cash', {}, 206.43);
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

console.log(`\n=== Verification Finished: ${passed} Passed, ${failed} Failed ===`);
if (failed > 0) process.exit(1);
