/* =========================================================
   STORE.JS - LocalStorage State Management & Storage Engine
   ========================================================= */

// Category-Aware Smart Fallback Images
function getCategoryFallbackImage(catId) {
    switch (catId) {
        case 'drinks':
            return 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=400&q=80';
        case 'hot_drinks':
            return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80';
        case 'sandwiches':
            return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80';
        case 'meals':
        default:
            return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80';
    }
}

// Global Image Error Handler (prevents infinite loop & replaces with proper category image)
function handleImageError(imgEl, catId) {
    if (!imgEl) return;
    imgEl.onerror = null;
    imgEl.src = getCategoryFallbackImage(catId);
}

// Persistent Collections
var storeSettings = (() => {
    try {
        const saved = JSON.parse(localStorage.getItem('nurpos_settings') || 'null');
        const s = saved ? { ...DEFAULT_STORE, ...saved } : { ...DEFAULT_STORE };
        s.nameEn = "NUR FOODES";
        s.companyName = "شركة صح للتجارة";
        s.companyNameAr = "شركة صح للتجارة";
        s.vatNumber = "300987654300003";
        // Ensure valid fallback logic
        if (!s.adminPin) s.adminPin = "1234";
        if (!s.staffPin) s.staffPin = "0000";
        if (!s.currencyAr) s.currencyAr = DEFAULT_STORE.currencyAr;
        return s;
    } catch (e) {
        return { ...DEFAULT_STORE };
    }
})();

var categories = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_categories') || 'null') || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    }
})();

const MENU_SCHEMA_VERSION = 'v2026_09_08_exact24';
var items;
(() => {
    try {
        const storedVer = localStorage.getItem('nurpos_menu_ver_v4');
        const raw = JSON.parse(localStorage.getItem('nurpos_items') || 'null');
        const isValid = storedVer === MENU_SCHEMA_VERSION && 
                        Array.isArray(raw) && 
                        raw.length === 24 && 
                        raw[0].id === 'item_tikka_sauce';
        if (isValid) {
            items = raw;
            // Inject default stock for demo if not present
            let hasStock = items.some(i => i.stock !== undefined && i.stock !== null);
            if (!hasStock) {
                items.forEach(i => i.stock = 50);
                localStorage.setItem('nurpos_items', JSON.stringify(items));
            }
        } else {
            items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
            localStorage.setItem('nurpos_menu_ver_v4', MENU_SCHEMA_VERSION);
            localStorage.setItem('nurpos_items', JSON.stringify(items));
        }
    } catch (e) {
        items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
    }
})();

var catalogViewMode = localStorage.getItem('nurpos_catalog_mode') || 'grid8';

var orders = (() => {
    try {
        let ords = JSON.parse(localStorage.getItem('nurpos_orders') || 'null') || [];
        if (typeof SAMPLE_ORD_1013 !== 'undefined') {
            const hasSample = ords.some(o => o.id === 'ORD-1013');
            if (!hasSample) {
                ords.unshift(JSON.parse(JSON.stringify(SAMPLE_ORD_1013)));
                localStorage.setItem('nurpos_orders', JSON.stringify(ords));
            }
        }
        return ords;
    } catch (e) {
        return (typeof SAMPLE_ORD_1013 !== 'undefined') ? [JSON.parse(JSON.stringify(SAMPLE_ORD_1013))] : [];
    }
})();

var currentUser = (() => {
    try {
        const u = JSON.parse(localStorage.getItem('nurpos_user') || 'null');
        return u ? { nameEn: 'Nawaf Saeed', nameAr: 'نواف سعيد', ...u } : { role: 'admin', name: 'Nawaf Saeed', nameEn: 'Nawaf Saeed', nameAr: 'نواف سعيد' };
    } catch (e) {
        return { role: 'admin', name: 'Nawaf Saeed', nameEn: 'Nawaf Saeed', nameAr: 'نواف سعيد' };
    }
})();

// Data-Driven Configurations
var customers = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_customers') || 'null') || JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_CUSTOMERS));
    }
})();

var orderTypes = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_order_types') || 'null') || JSON.parse(JSON.stringify(DEFAULT_ORDER_TYPES));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_ORDER_TYPES));
    }
})();

var printers = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_printers') || 'null') || JSON.parse(JSON.stringify(DEFAULT_PRINTERS));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_PRINTERS));
    }
})();

var paymentMethods = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_payment_methods') || 'null') || JSON.parse(JSON.stringify(DEFAULT_PAYMENT_METHODS));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_PAYMENT_METHODS));
    }
})();

var applications = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_applications') || 'null') || JSON.parse(JSON.stringify(DEFAULT_APPLICATIONS));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_APPLICATIONS));
    }
})();

var inventoryRecords = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_inventory') || 'null') || JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_INVENTORY));
    }
})();

var internalOrders = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_internal_orders') || 'null') || JSON.parse(JSON.stringify(DEFAULT_INTERNAL_ORDERS));
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_INTERNAL_ORDERS));
    }
})();

var balancingRecords = (() => {
    try {
        return JSON.parse(localStorage.getItem('nurpos_balancing') || 'null') || [];
    } catch (e) {
        return [];
    }
})();

var posPreferences = (() => {
    try {
        const saved = JSON.parse(localStorage.getItem('nurpos_preferences') || 'null');
        return Object.assign({
            ordersView: 'detailed', // 'briefly' | 'detailed'
            stayAtCategory: 'stay', // 'stay' | 'exit'
            autoPrint: true
        }, saved || {});
    } catch (e) {
        return { ordersView: 'detailed', stayAtCategory: 'stay', autoPrint: true };
    }
})();

// Runtime State Variables
var currentLang = localStorage.getItem('nurpos_lang') || 'ar';
var activeCategory = 'all';
var currentCart = [];
var currentOrderType = 'local';
var currentOrderTypeId = 'local';
var currentTable = 'Table 1';
var currentCustomerId = 'cash';
var currentOrderNotes = '';
var currentClientPhone = '';
var discountType = 'fixed'; // 'fixed' | 'percent'
var discountValue = 0;
var customDiscount = 0;
var paymentInput = '';
var selectedPayMethod = 'Cash';

// Reliable Next Order Sequence
const storedSeq = parseInt(localStorage.getItem('nurpos_order_seq') || '0', 10);
const maxExistingSeq = orders.reduce((max, o) => Math.max(max, Number(o.seq) || 0), 1000);
var nextOrderSeq = Math.max(storedSeq, maxExistingSeq) + 1;

var lastCompletedOrder = null;

// Escape HTML for XSS Prevention
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format Currency Utility
function formatCurrency(val) {
    const curr = (currentLang === 'ar') ? (storeSettings.currencyAr || 'ر.س') : (storeSettings.currency || 'SAR');
    return currentLang === 'ar' 
        ? `${Number(val || 0).toFixed(2)} ${curr}`
        : `${curr} ${Number(val || 0).toFixed(2)}`;
}

// Centralized Financial Calculation (Discount applied before VAT)
function calculateCartTotals() {
    let baseItemsSubtotal = 0;
    let additionsTotal = 0;

    currentCart.forEach(i => {
        const itemPrice = Number(i.price) || 0;
        const qty = Number(i.qty) || 1;
        baseItemsSubtotal += (itemPrice * qty);

        if (i.addons && Array.isArray(i.addons)) {
            const addSum = i.addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
            additionsTotal += (addSum * qty);
        }
    });

    const subtotal = Math.round((baseItemsSubtotal + additionsTotal) * 100) / 100;
    
    let validDiscount = 0;
    if (discountType === 'percent') {
        const pct = Math.min(100, Math.max(0, Number(discountValue) || 0));
        validDiscount = Math.round(((subtotal * pct) / 100) * 100) / 100;
    } else {
        const val = Math.max(0, Number(discountValue || customDiscount) || 0);
        validDiscount = Math.min(subtotal, Math.round(val * 100) / 100);
    }
    customDiscount = validDiscount;

    const taxableAmount = Math.max(0, Math.round((subtotal - validDiscount) * 100) / 100);
    const taxRate = Math.max(0, Number(storeSettings.taxRate) || 0);
    const tax = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
    const grandTotal = Math.round((taxableAmount + tax) * 100) / 100;

    return { 
        baseItemsSubtotal: Math.round(baseItemsSubtotal * 100) / 100, 
        additionsTotal: Math.round(additionsTotal * 100) / 100, 
        subtotal, 
        discount: validDiscount, 
        taxableAmount, 
        tax, 
        grandTotal 
    };
}

// Persist All Collections to LocalStorage safely
function persistData() {
    try {
        localStorage.setItem('nurpos_settings', JSON.stringify(storeSettings));
        localStorage.setItem('nurpos_categories', JSON.stringify(categories));
        localStorage.setItem('nurpos_items', JSON.stringify(items));
        localStorage.setItem('nurpos_orders', JSON.stringify(orders));
        localStorage.setItem('nurpos_user', JSON.stringify(currentUser));
        localStorage.setItem('nurpos_lang', currentLang);
        localStorage.setItem('nurpos_order_seq', String(nextOrderSeq));
        localStorage.setItem('nurpos_customers', JSON.stringify(customers));
        localStorage.setItem('nurpos_order_types', JSON.stringify(orderTypes));
        localStorage.setItem('nurpos_printers', JSON.stringify(printers));
        localStorage.setItem('nurpos_preferences', JSON.stringify(posPreferences));
        localStorage.setItem('nurpos_inventory', JSON.stringify(inventoryRecords));
        localStorage.setItem('nurpos_internal_orders', JSON.stringify(internalOrders));
        localStorage.setItem('nurpos_balancing', JSON.stringify(balancingRecords));
    } catch (e) {
        console.error("LocalStorage persistence error:", e);
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? "تحذير: تعذر حفظ البيانات محلياً في المتصفح" : "Warning: Failed to save data locally in browser", "danger");
        }
    }
}

// Reset Menu to Factory Defaults
function resetMenuToDefaults() {
    const msg = currentLang === 'ar' 
        ? "هل تريد استعادة جميع أصناف المنيو الافتراضية مع الصور الصحيحة؟ (لن يتم مسح فواتير المبيعات أو الإعدادات)" 
        : "Restore all official menu items and photos? (Past order receipts and settings will be preserved)";
    if (confirm(msg)) {
        items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        persistData();
        if (typeof renderCategoriesRibbon === 'function') renderCategoriesRibbon();
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof renderCart === 'function') renderCart();
        if (typeof renderAdminItems === 'function') renderAdminItems();
        if (typeof renderAdminCategories === 'function') renderAdminCategories();
        if (typeof renderAdminOverview === 'function') renderAdminOverview();
        soundSuccess();
        showToast(currentLang === 'ar' ? "تمت استعادة أصناف المنيو بنجاح بالصور الصحيحة!" : "Menu reset to official defaults with verified photos!", "success");
    }
}

// Start a New Order Safely
function safeStartNewOrder() {
    if (currentCart.length > 0) {
        const msg = currentLang === 'ar'
            ? 'يوجد أصناف في السلة الحالية. هل تريد إلغاء الطلب الحالي وبدء طلب جديد؟'
            : 'Active items in cart. Do you want to cancel current order and start a new order?';
        if (!confirm(msg)) return false;
    }
    currentCart = [];
    currentOrderNotes = '';
    currentClientPhone = '';
    customDiscount = 0;
    discountValue = 0;
    discountType = 'fixed';
    currentCustomerId = 'cash';
    currentOrderTypeId = 'local';
    if (typeof renderCart === 'function') renderCart();
    if (typeof updateOrderPanelMeta === 'function') updateOrderPanelMeta();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم فتح طلب جديد' : 'New order started', 'info');
    }
    return true;
}

// Cancel Current Order Safely
function safeCancelOrder() {
    if (currentCart.length === 0 && !currentOrderNotes && !currentClientPhone) {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'السلة فارغة بالفعل' : 'Cart is already empty', 'warning');
        }
        return false;
    }
    const msg = currentLang === 'ar' 
        ? 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب ومسح السلة بالكامل؟' 
        : 'Are you sure you want to cancel this order and clear the cart?';
    if (confirm(msg)) {
        currentCart = [];
        currentOrderNotes = '';
        currentClientPhone = '';
        customDiscount = 0;
        discountValue = 0;
        discountType = 'fixed';
        if (typeof renderCart === 'function') renderCart();
        if (typeof updateOrderPanelMeta === 'function') updateOrderPanelMeta();
        soundTrash();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تم إلغاء الطلب بنجاح' : 'Order cancelled successfully', 'info');
        }
        return true;
    }
    return false;
}

// Update Preference
function setPosPreference(key, val) {
    posPreferences[key] = val;
    try {
        localStorage.setItem('nurpos_preferences', JSON.stringify(posPreferences));
    } catch (e) {}
}

/* =========================================================
   WEB AUDIO FX ENGINE (Offline, Zero-Asset Audio Oscillators)
   ========================================================= */
let audioCtx = null;
let soundEnabled = localStorage.getItem('nurpos_sound') !== 'false';

function getAudioContext() {
    if (!audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
            audioCtx = new AudioCtxClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('nurpos_sound', soundEnabled ? 'true' : 'false');
    updateSoundBtnUI();
    if (soundEnabled) {
        soundBeep();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تم تشغيل المؤثرات الصوتية' : 'Sound effects enabled', 'info');
        }
    } else {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تم كتم الصوت' : 'Sound muted', 'info');
        }
    }
}

function updateSoundBtnUI() {
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
        btn.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        btn.style.opacity = soundEnabled ? '1' : '0.6';
    }
}

// Crisp cart add blip
function soundBeep() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
    } catch (e) {}
}

// Cash register chime
function soundSuccess() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + (idx * 0.07);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.14, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    } catch (e) {}
}

// Delete pop
function soundTrash() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
}

// Warning buzzer
function soundWarning() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        [220, 233].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.21);
        });
    } catch (e) {}
}


function setPosCatalogMode(mode) {
    catalogViewMode = mode;
    localStorage.setItem('nurpos_catalog_mode', mode);
    applyCatalogViewMode();
}

function applyCatalogViewMode() {
    const posLayout = document.querySelector('.pos-layout');
    const btnGrid = document.getElementById('btnCatalogGrid8');
    const btnSplit = document.getElementById('btnCatalogSplit');
    const floatBar = document.getElementById('catalogFloatingCart');
    
    if (!posLayout) return;

    if (catalogViewMode === 'grid8') {
        posLayout.classList.add('catalog-mode-grid8');
        posLayout.classList.remove('catalog-mode-split');
        btnGrid?.classList.add('active');
        btnSplit?.classList.remove('active');
        if (floatBar) floatBar.style.display = 'flex';
    } else {
        posLayout.classList.remove('catalog-mode-grid8');
        posLayout.classList.add('catalog-mode-split');
        btnSplit?.classList.add('active');
        btnGrid?.classList.remove('active');
        if (floatBar) floatBar.style.display = 'none';
    }
}