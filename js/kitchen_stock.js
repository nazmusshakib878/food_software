/* =========================================================
   KITCHEN STOCK & MENU AVAILABILITY ENGINE
   Allows Kitchen staff to track daily stock limits, restock
   sold-out items with 1 click (+10, +20, +50, Unlimited),
   and manage item availability directly from KDS.
   ========================================================= */

let currentStockFilter = 'all'; // 'all', 'out_of_stock', 'low_stock', 'available'
let stockSearchQuery = '';

function openKitchenStockModal(filter = 'all') {
    currentStockFilter = filter;
    stockSearchQuery = '';
    
    const searchInput = document.getElementById('kitchenStockSearch');
    if (searchInput) searchInput.value = '';

    const modal = document.getElementById('kitchenStockModal');
    if (modal) modal.classList.add('active');

    // Sync filter buttons
    document.querySelectorAll('.kds-stock-filter-chip').forEach(chip => {
        if (chip.dataset.filter === filter) chip.classList.add('active');
        else chip.classList.remove('active');
    });

    renderKitchenStock();
}

function closeKitchenStockModal() {
    const modal = document.getElementById('kitchenStockModal');
    if (modal) modal.classList.remove('active');
}

function setKitchenStockFilter(filter) {
    currentStockFilter = filter;
    
    // Update active filter chip UI
    document.querySelectorAll('.kds-stock-filter-chip').forEach(chip => {
        if (chip.dataset.filter === filter) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    renderKitchenStock();
}

function filterKitchenStock() {
    const searchInput = document.getElementById('kitchenStockSearch');
    stockSearchQuery = (searchInput ? searchInput.value : '').trim().toLowerCase();
    renderKitchenStock();
}

function renderKitchenStock() {
    const grid = document.getElementById('kitchenStockGrid');
    if (!grid) return;

    if (!Array.isArray(items) || items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i class="fa-solid fa-boxes-stacked" style="font-size: 36px; margin-bottom: 8px;"></i>
                <p>${currentLang === 'ar' ? 'لا توجد أصناف في القائمة' : 'No items found in menu'}</p>
            </div>
        `;
        return;
    }

    // Filter items based on search and status
    const filtered = items.filter(item => {
        const arName = (item.arName || '').toLowerCase();
        const enName = (item.enName || '').toLowerCase();
        const code = String(item.code || '').toLowerCase();

        const matchesSearch = !stockSearchQuery || 
                              arName.includes(stockSearchQuery) || 
                              enName.includes(stockSearchQuery) ||
                              code.includes(stockSearchQuery);

        const isOutOfStock = (item.available === false) || (item.stock !== undefined && item.stock !== null && item.stock <= 0);
        const isLowStock = !isOutOfStock && (item.stock !== undefined && item.stock !== null && item.stock <= 10);
        const isAvailable = !isOutOfStock;

        let matchesFilter = true;
        if (currentStockFilter === 'out_of_stock') matchesFilter = isOutOfStock;
        else if (currentStockFilter === 'low_stock') matchesFilter = isLowStock;
        else if (currentStockFilter === 'available') matchesFilter = isAvailable;

        return matchesSearch && matchesFilter;
    });

    // Counts for filter pills
    const outCount = items.filter(i => (i.available === false) || (i.stock !== undefined && i.stock !== null && i.stock <= 0)).length;
    const lowCount = items.filter(i => i.available !== false && (i.stock !== undefined && i.stock !== null && i.stock > 0 && i.stock <= 10)).length;
    const totalCount = items.length;

    const outBadge = document.getElementById('kdsFilterOutCount');
    if (outBadge) outBadge.innerText = outCount;
    const lowBadge = document.getElementById('kdsFilterLowCount');
    if (lowBadge) lowBadge.innerText = lowCount;
    const totalBadge = document.getElementById('kdsFilterTotalCount');
    if (totalBadge) totalBadge.innerText = totalCount;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 32px; margin-bottom: 8px;"></i>
                <p>${currentLang === 'ar' ? 'لا توجد أصناف مطابقة للبحث' : 'No items match your filter'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isOutOfStock = (item.available === false) || (item.stock !== undefined && item.stock !== null && item.stock <= 0);
        const isUnlimited = (item.stock === undefined || item.stock === null);
        const stockQty = !isUnlimited ? Math.max(0, item.stock) : null;
        
        const primaryName = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
        const cat = (typeof categories !== 'undefined' ? categories : []).find(c => c.id === item.catId);
        const catName = cat ? (currentLang === 'ar' ? cat.nameAr : cat.nameEn) : '';
        const imgUrl = item.image || (typeof getCategoryFallbackImage === 'function' ? getCategoryFallbackImage(item.catId) : '');

        let statusBadge = '';
        if (isOutOfStock) {
            statusBadge = `<span class="kds-item-status-pill out"><i class="fa-solid fa-circle-exclamation"></i> ${currentLang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span>`;
        } else if (isUnlimited) {
            statusBadge = `<span class="kds-item-status-pill unlimited"><i class="fa-solid fa-infinity"></i> ${currentLang === 'ar' ? 'غير محدود' : 'Unlimited'}</span>`;
        } else if (stockQty <= 10) {
            statusBadge = `<span class="kds-item-status-pill low"><i class="fa-solid fa-triangle-exclamation"></i> ${currentLang === 'ar' ? `تبقى ${stockQty} فقط` : `Only ${stockQty} left`}</span>`;
        } else {
            statusBadge = `<span class="kds-item-status-pill available"><i class="fa-solid fa-circle-check"></i> ${currentLang === 'ar' ? `المتوفر: ${stockQty}` : `In Stock: ${stockQty}`}</span>`;
        }

        return `
            <div class="kds-stock-card ${isOutOfStock ? 'is-out' : ''}">
                <div class="kds-stock-card-top">
                    <img src="${imgUrl}" alt="${escapeHtml(primaryName)}" class="kds-stock-thumb" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80'">
                    <div class="kds-stock-info">
                        <div class="kds-stock-title-row">
                            <h4 title="${escapeHtml(primaryName)}">${escapeHtml(primaryName)}</h4>
                            <span class="kds-stock-cat-pill">${escapeHtml(catName)}</span>
                        </div>
                        <div class="kds-stock-status-row">
                            ${statusBadge}
                        </div>
                    </div>
                </div>

                <div class="kds-stock-controls-row">
                    <div class="kds-stock-stepper">
                        <button type="button" class="btn-step-stock minus" onclick="adjustKitchenStock('${escapeHtml(item.id)}', -1)" title="-1">−</button>
                        <input type="number" min="0" max="9999" class="input-stock-exact" id="stockInput_${escapeHtml(item.id)}" value="${isUnlimited ? '' : stockQty}" placeholder="∞" onchange="setExactKitchenStock('${escapeHtml(item.id)}', this.value)">
                        <button type="button" class="btn-step-stock plus" onclick="adjustKitchenStock('${escapeHtml(item.id)}', 1)" title="+1">+</button>
                    </div>

                    <div class="kds-stock-quick-btns">
                        <button type="button" class="btn-quick-add add-10" onclick="quickRestockItem('${escapeHtml(item.id)}', 10)" title="+10">+10</button>
                        <button type="button" class="btn-quick-add add-20" onclick="quickRestockItem('${escapeHtml(item.id)}', 20)" title="+20">+20</button>
                        <button type="button" class="btn-quick-add add-50" onclick="quickRestockItem('${escapeHtml(item.id)}', 50)" title="+50">+50</button>
                        <button type="button" class="btn-quick-add unlimited" onclick="setItemUnlimited('${escapeHtml(item.id)}')" title="${currentLang === 'ar' ? 'غير محدود' : 'Unlimited'}">∞</button>
                    </div>
                </div>

                <div class="kds-stock-card-footer">
                    <button type="button" class="btn-toggle-avail ${item.available !== false ? 'active-avail' : 'inactive-avail'}" onclick="toggleItemKitchenAvailability('${escapeHtml(item.id)}')">
                        <i class="fa-solid ${item.available !== false ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                        <span>${item.available !== false ? (currentLang === 'ar' ? 'متاح للطلب' : 'Available') : (currentLang === 'ar' ? 'معطّل (غير متاح)' : 'Unavailable')}</span>
                    </button>
                    ${isOutOfStock ? `
                        <button type="button" class="btn-instant-restock" onclick="quickRestockItem('${escapeHtml(item.id)}', 50)">
                            <i class="fa-solid fa-rotate-left"></i> ${currentLang === 'ar' ? 'إتاحة 50 حبة فوراً' : 'Restock 50 Now'}
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Quick Restock Action: Adds specified amount and marks available
function quickRestockItem(itemId, amount) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.available = true;
    const current = (item.stock !== undefined && item.stock !== null && !isNaN(item.stock)) ? Math.max(0, parseInt(item.stock, 10)) : 0;
    item.stock = current + amount;

    persistData();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();

    renderKitchenStock();

    const name = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
    if (typeof showToast === 'function') {
        showToast(
            currentLang === 'ar' 
                ? `تمت إتاحة (${name}) بنجاح - المخزون الحالي: ${item.stock}` 
                : `(${name}) restocked: ${item.stock} available`, 
            "success"
        );
    }
}

// Step adjust stock by +1 or -1
function adjustKitchenStock(itemId, delta) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let current = (item.stock !== undefined && item.stock !== null && !isNaN(item.stock)) ? parseInt(item.stock, 10) : 0;
    current += delta;
    if (current < 0) current = 0;

    item.stock = current;
    if (item.stock > 0) {
        item.available = true;
    } else {
        item.available = false;
    }

    persistData();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();

    renderKitchenStock();
}

// Set exact number from input
function setExactKitchenStock(itemId, rawVal) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const trimmed = String(rawVal || '').trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'unlimited' || trimmed === '∞') {
        item.stock = null;
        item.available = true;
    } else {
        const val = parseInt(trimmed, 10);
        if (isNaN(val) || val < 0) {
            item.stock = 0;
            item.available = false;
        } else {
            item.stock = val;
            if (val > 0) item.available = true;
            else item.available = false;
        }
    }

    persistData();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();

    renderKitchenStock();

    const name = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
    if (typeof showToast === 'function') {
        showToast(
            currentLang === 'ar'
                ? `تم تحديث مخزون (${name}) إلى ${item.stock === null ? 'غير محدود' : item.stock}`
                : `(${name}) stock updated to ${item.stock === null ? 'Unlimited' : item.stock}`,
            "info"
        );
    }
}

// Make item Unlimited
function setItemUnlimited(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.stock = null;
    item.available = true;

    persistData();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();

    renderKitchenStock();

    const name = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
    if (typeof showToast === 'function') {
        showToast(
            currentLang === 'ar' 
                ? `تم ضبط (${name}) كمتوفر بشكل غير محدود` 
                : `(${name}) set to unlimited`, 
            "info"
        );
    }
}

// Toggle Availability Switch
function toggleItemKitchenAvailability(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    item.available = (item.available === false) ? true : false;
    
    // If made available but stock was 0, reset to 50
    if (item.available && (item.stock === 0 || item.stock === '0')) {
        item.stock = 50;
    }

    persistData();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();

    renderKitchenStock();

    const name = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
    if (typeof showToast === 'function') {
        showToast(
            item.available
                ? (currentLang === 'ar' ? `تمت إتاحة (${name}) للطلب - المخزون: ${item.stock || 'غير محدود'}` : `(${name}) made available`)
                : (currentLang === 'ar' ? `تم إيقاف (${name}) في المطبخ` : `(${name}) made unavailable`),
            item.available ? "success" : "warning"
        );
    }
}

// Save all kitchen stocks (optional batch confirmation)
function saveKitchenStock() {
    persistData();

    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? "تم حفظ إعدادات المخزون بنجاح" : "Kitchen stock saved successfully", "success");
    }

    closeKitchenStockModal();

    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    updateKdsStockAlert();
}

// Live Out-of-Stock Alert in KDS Topbar
function updateKdsStockAlert() {
    if (!Array.isArray(items)) return;

    const outItems = items.filter(i => (i.available === false) || (i.stock !== undefined && i.stock !== null && i.stock <= 0));
    const pill = document.getElementById('kdsStockAlertPill');
    const countSpan = document.getElementById('kdsStockAlertCount');

    if (pill && countSpan) {
        countSpan.innerText = outItems.length;
        if (outItems.length > 0) {
            pill.style.display = 'inline-flex';
        } else {
            pill.style.display = 'none';
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    updateKdsStockAlert();
});
