/* =========================================================
   POS.JS - Main POS Dashboard, Customer/Type Selectors,
   Touch Actions, Cart Table (#, Total, Price, Qty, Name),
   Notes Modal, Discount Modal, More Panel & Bottom Navigation
   ========================================================= */

function updatePosOrderBadge() {
    const badge = document.getElementById('currentOrderNumBadge');
    if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-receipt"></i> #ORD-${nextOrderSeq}`;
    }
    updateOrderPanelMeta();
}

function updateOrderPanelMeta() {
    const cashierEl = document.getElementById('cashierNameDisplay');
    const companyEl = document.getElementById('currentCompanyDisplay');
    if (cashierEl) {
        const cashierName = currentLang === 'ar' 
            ? (currentUser.nameAr || currentUser.name || 'كاشير')
            : (currentUser.nameEn || currentUser.name || 'Cashier');
        cashierEl.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${escapeHtml(cashierName)}`;
    }
    if (companyEl) {
        const compName = currentLang === 'ar'
            ? (storeSettings.companyNameAr || 'شركة صح للتجارة')
            : (storeSettings.companyName || 'Sah Trading Co.');
        companyEl.innerHTML = `<i class="fa-solid fa-store"></i> ${escapeHtml(compName)}`;
    }

    renderCustomerSelector();
    renderOrderTypeSelector();
}

// 1. Dynamic Customer Selector
function renderCustomerSelector() {
    const select = document.getElementById('posCustomerSelect');
    if (!select) return;

    select.innerHTML = customers.map(c => {
        const name = currentLang === 'ar' ? c.nameAr : c.nameEn;
        const selected = (c.id === currentCustomerId) ? 'selected' : '';
        return `<option value="${escapeHtml(c.id)}" ${selected}>${escapeHtml(name)}</option>`;
    }).join('');
}

function onPosCustomerChange(newId) {
    currentCustomerId = newId;
    const cust = customers.find(c => c.id === newId);
    if (cust) {
        // If delivery app is selected, suggest delivery order type
        if (['hungerstation', 'jahiz', 'ninja', 'keeta', 'mrsool', 'toyou', 'thechefz'].includes(newId)) {
            currentOrderTypeId = 'delivery';
            renderOrderTypeSelector();
        }
        if (typeof showToast === 'function') {
            const name = currentLang === 'ar' ? cust.nameAr : cust.nameEn;
            showToast(currentLang === 'ar' ? `العميل المحدد: ${name}` : `Customer selected: ${name}`, 'info');
        }
    }
}

function promptAddCustomer() {
    const nameAr = prompt(currentLang === 'ar' ? "اسم العميل بالعربي:" : "Customer Name (Arabic):", "");
    if (!nameAr) return;
    const nameEn = prompt(currentLang === 'ar' ? "الاسم بالإنجليزي:" : "Customer Name (English):", nameAr);
    
    const newCust = {
        id: "cust_" + Date.now(),
        nameAr: nameAr.trim(),
        nameEn: (nameEn || nameAr).trim()
    };
    customers.push(newCust);
    currentCustomerId = newCust.id;
    persistData();
    renderCustomerSelector();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تمت إضافة العميل' : 'Customer added', 'success');
    }
}

// 2. Dynamic Order Type Selector
function renderOrderTypeSelector() {
    const select = document.getElementById('posOrderTypeSelect');
    if (!select) return;

    select.innerHTML = orderTypes.map(ot => {
        const name = currentLang === 'ar' ? ot.nameAr : ot.nameEn;
        const selected = (ot.id === currentOrderTypeId) ? 'selected' : '';
        return `<option value="${escapeHtml(ot.id)}" ${selected}>${escapeHtml(name)}</option>`;
    }).join('');

    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = (currentOrderTypeId === 'local') ? 'flex' : 'none';
    }
}

function onPosOrderTypeChange(newId) {
    currentOrderTypeId = newId;
    currentOrderType = newId;
    const ot = orderTypes.find(t => t.id === newId);
    if (ot) {
        const tablePicker = document.getElementById('tablePickerRow');
        if (tablePicker) {
            tablePicker.style.display = (newId === 'local') ? 'flex' : 'none';
        }
        if (typeof showToast === 'function') {
            const name = currentLang === 'ar' ? ot.nameAr : ot.nameEn;
            showToast(currentLang === 'ar' ? `نوع الطلب: ${name}` : `Order type: ${name}`, 'info');
        }
    }
}

function promptAddOrderType() {
    const nameAr = prompt(currentLang === 'ar' ? "اسم نوع الطلب بالعربي:" : "Order Type Name (Arabic):", "");
    if (!nameAr) return;
    const nameEn = prompt(currentLang === 'ar' ? "الاسم بالإنجليزي:" : "Order Type Name (English):", nameAr);
    
    const newOt = {
        id: "ot_" + Date.now(),
        nameAr: nameAr.trim(),
        nameEn: (nameEn || nameAr).trim(),
        icon: "fa-bag-shopping"
    };
    orderTypes.push(newOt);
    currentOrderTypeId = newOt.id;
    persistData();
    renderOrderTypeSelector();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تمت إضافة نوع الطلب' : 'Order type added', 'success');
    }
}

// 3. Categories Ribbon / Cards
function renderCategoriesRibbon() {
    const ribbon = document.getElementById('categoriesRibbon');
    if (!ribbon) return;

    const availableItems = items.filter(i => i.available !== false);

    let html = `
        <div class="cat-chip ${activeCategory === 'all' ? 'active' : ''}" onclick="selectCategory('all')">
            <i class="fa-solid fa-utensils"></i>
            <span>${escapeHtml(i18n[currentLang].all_cat || 'الكل')}</span>
            <span class="count-badge">${availableItems.length}</span>
        </div>
    `;

    categories.forEach(cat => {
        const itemCount = availableItems.filter(i => i.catId === cat.id).length;
        const displayName = currentLang === 'ar' ? cat.nameAr : cat.nameEn;
        const iconClass = cat.icon || 'fa-burger';
        html += `
            <div class="cat-chip ${activeCategory === cat.id ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat.id)}')">
                <i class="fa-solid ${iconClass}"></i>
                <span>${escapeHtml(displayName)}</span>
                <span class="count-badge">${itemCount}</span>
            </div>
        `;
    });

    ribbon.innerHTML = html;
}

function selectCategory(catId) {
    activeCategory = catId;
    renderCategoriesRibbon();
    renderProducts();
}

// Normalize Arabic letters for fuzzy search
function normalizeArabicText(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();
}

// 4. Products Grid
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const rawQuery = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
    const normalizedQuery = normalizeArabicText(rawQuery);

    const filtered = items.filter(item => {
        const matchesCat = (activeCategory === 'all' || item.catId === activeCategory);
        
        const arNorm = normalizeArabicText(item.arName);
        const enNorm = (item.enName || '').toLowerCase();
        const codeNorm = (item.code || '').toLowerCase();

        const matchesSearch = !rawQuery || 
                              arNorm.includes(normalizedQuery) || 
                              enNorm.includes(rawQuery) ||
                              codeNorm.includes(rawQuery);

        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i class="fa-solid fa-utensils" style="font-size: 36px; margin-bottom: 8px;"></i>
                <p>${currentLang === 'ar' ? 'لا توجد أصناف مطابقة للبحث' : 'No matching products found'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        let isAvailable = item.available !== false;
        
        const inCartQty = currentCart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.qty, 0);
        
        // Stock logic
        let stockPillHTML = '';
        if (item.stock !== undefined && item.stock !== null) {
            if (item.stock <= 0) {
                isAvailable = false;
            } else {
                let remaining = item.stock - inCartQty;
                let badgeColor = remaining > 10 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(245, 158, 11, 0.95)';
                let icon = remaining > 10 ? 'fa-box-open' : 'fa-triangle-exclamation';
                let stockText = currentLang === 'ar' ? `باقي ${remaining}` : `${remaining} Left`;
                if (inCartQty > 0) {
                    stockText = currentLang === 'ar' ? `المتبقي ${remaining}` : `${remaining} Left`;
                }
                stockPillHTML = `<span style="position: absolute; bottom: 6px; inset-inline-start: 6px; background: ${badgeColor}; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"><i class="fa-solid ${icon}"></i> ${stockText}</span>`;
            }
        }

        const qtyBadge = inCartQty > 0 ? `<span class="cart-qty-badge">${inCartQty}</span>` : '';
        const primaryName = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
        const cat = categories.find(c => c.id === item.catId);
        const catName = cat ? (currentLang === 'ar' ? cat.nameAr : cat.nameEn) : '';
        const subtitle = currentLang === 'ar' ? (item.subtitleAr || catName) : (item.subtitleEn || catName);
        const imgUrl = item.image || getCategoryFallbackImage(item.catId);
        const codePill = `<span class="code-pill">${escapeHtml(item.code !== undefined && item.code !== null ? String(item.code) : '0')}</span>`;
        const outOfStockBadge = !isAvailable 
            ? `<span class="out-of-stock-badge"><i class="fa-solid fa-circle-exclamation"></i> ${currentLang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span>` 
            : '';

        const cardClick = isAvailable 
            ? `onclick="addToCart('${escapeHtml(item.id)}')"` 
            : `onclick="handleOutOfStockClick('${escapeHtml(primaryName)}')`;
        
        const actionBtn = isAvailable 
            ? `<div class="card-add-btn"><i class="fa-solid fa-plus"></i></div>` 
            : `<div class="card-add-btn" style="background: rgba(225, 29, 72, 0.1); color: var(--danger);"><i class="fa-solid fa-ban"></i></div>`;

        return `
            <div class="product-card ${!isAvailable ? 'out-of-stock' : ''}" ${cardClick}>
                ${qtyBadge}
                ${outOfStockBadge}
                <div class="product-card-media">
                    ${stockPillHTML}
                    <img src="${imgUrl}" alt="${escapeHtml(primaryName)}" loading="lazy" onerror="handleImageError(this, '${escapeHtml(item.catId)}')">
                    ${codePill}
                    <span class="price-pill">${formatCurrency(item.price)}</span>
                </div>
                <div class="product-card-body">
                    <div class="item-titles">
                        <h3 title="${escapeHtml(primaryName)}">${escapeHtml(primaryName)}</h3>
                        <p class="product-category-subtitle" title="${escapeHtml(subtitle)}">${escapeHtml(subtitle)}</p>
                    </div>
                    <div class="card-footer">
                        <span class="card-price-value">${formatCurrency(item.price)}</span>
                        ${actionBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterProducts() {
    renderProducts();
}

function handleOutOfStockClick(name) {
    soundBeep();
    showToast(currentLang === 'ar' ? `عذراً، الصنف "${name}" غير متوفر حالياً بالمطبخ` : `Sorry, "${name}" is currently out of stock`, "warning");
}

function addToCart(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.available === false || (item.stock !== undefined && item.stock !== null && item.stock <= 0)) {
        handleOutOfStockClick(currentLang === 'ar' ? item.arName : item.enName);
        return;
    }

    const currentQtyInCart = currentCart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.qty, 0);
    if (item.stock !== undefined && item.stock !== null && currentQtyInCart >= item.stock) {
        showToast(currentLang === 'ar' ? `لقد وصلت للحد الأقصى للكمية المتوفرة بالمطبخ (${item.stock})` : `Max kitchen stock limit reached (${item.stock})`, 'warning');
        soundWarning();
        return;
    }

    const existing = currentCart.find(c => c.id === itemId && (!c.addons || c.addons.length === 0) && !c.note);
    if (existing) {
        existing.qty += 1;
        existing.price = item.price;
        existing.arName = item.arName;
        existing.enName = item.enName;
    } else {
        currentCart.push({
            id: item.id,
            arName: item.arName,
            enName: item.enName,
            price: item.price,
            image: item.image || getCategoryFallbackImage(item.catId),
            catId: item.catId,
            qty: 1,
            addons: [],
            note: ''
        });
    }

    // Respect Stay at Selected Category Preference
    if (posPreferences.stayAtCategory === 'exit' && activeCategory !== 'all') {
        activeCategory = 'all';
        renderCategoriesRibbon();
    }

    soundBeep();
    renderCart();
    renderProducts();
}

function changeCartQty(index, delta) {
    const cartItem = currentCart[index];
    if (!cartItem) return;

    if (delta > 0) {
        const item = items.find(i => i.id === cartItem.id);
        if (item && item.stock !== undefined && item.stock !== null) {
            const currentQtyInCart = currentCart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.qty, 0);
            if (currentQtyInCart + delta > item.stock) {
                showToast(currentLang === 'ar' ? `لقد وصلت للحد الأقصى للكمية المتوفرة بالمطبخ (${item.stock})` : `Max kitchen stock limit reached (${item.stock})`, 'warning');
                soundWarning();
                return;
            }
        }
    }

    cartItem.qty += delta;
    if (cartItem.qty <= 0) {
        currentCart.splice(index, 1);
        soundTrash();
    } else if (delta > 0) {
        soundBeep();
    }
    if (currentCart.length === 0) {
        customDiscount = 0;
    }

    renderCart();
    renderProducts();
}

function removeCartItem(index) {
    currentCart.splice(index, 1);
    soundTrash();
    if (currentCart.length === 0) {
        customDiscount = 0;
    }
    renderCart();
    renderProducts();
}

function clearCartConfirm() {
    safeCancelOrder();
}

function setOrderType(type, btn) {
    currentOrderType = type;
    currentOrderTypeId = type;
    document.querySelectorAll('.order-type-tabs .order-type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = (type === 'dine_in' || type === 'local') ? 'flex' : 'none';
    }
}

// 5. Cart Table Rendering (Columns: # | Name | Qty | Price | Total)
function renderCart() {
    const container = document.getElementById('posCartTableWrapper') || document.getElementById('cartItemsList');
    if (!container) return;

    const isDetailed = posPreferences.ordersView !== 'briefly';

    if (currentCart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-view">
                <i class="fa-solid fa-cart-arrow-down"></i>
                <strong>${currentLang === 'ar' ? 'لا توجد أصناف في الطلب' : 'Cart is empty'}</strong>
                <small>${currentLang === 'ar' ? 'اضغط على أي صنف من القائمة لإضافته' : 'Click any product from the catalog to add'}</small>
            </div>
        `;
    } else {
        container.innerHTML = `
            <table class="pos-cart-table">
                <thead>
                    <tr>
                        <th class="col-num">${currentLang === 'ar' ? '#' : '#'}</th>
                        <th>${currentLang === 'ar' ? 'الصنف' : 'Name'}</th>
                        <th class="col-qty">${currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th class="col-price">${currentLang === 'ar' ? 'السعر' : 'Price'}</th>
                        <th class="col-total">${currentLang === 'ar' ? 'المجموع' : 'Total'}</th>
                        <th class="col-del"></th>
                    </tr>
                </thead>
                <tbody>
                    ${currentCart.map((item, idx) => {
                        const addonsSum = (item.addons && Array.isArray(item.addons)) 
                            ? item.addons.reduce((s, a) => s + (Number(a.price) || 0), 0) 
                            : 0;
                        const unitPrice = Number(item.price) + addonsSum;
                        const lineTotal = unitPrice * item.qty;
                        const displayName = currentLang === 'ar' ? item.arName : item.enName;

                        const addonsHtml = (isDetailed && item.addons && item.addons.length) 
                            ? item.addons.map(a => `<span class="cart-addons-list">+${escapeHtml(currentLang === 'ar' ? a.nameAr : a.nameEn)}</span>`).join('') 
                            : '';
                        const noteHtml = (isDetailed && item.note) 
                            ? `<span class="cart-note-text"><i class="fa-regular fa-comment-dots"></i> ${escapeHtml(item.note)}</span>` 
                            : '';

                        return `
                            <tr>
                                <td class="cart-item-num">${idx + 1}</td>
                                <td class="cart-item-cell-name">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 700;">${escapeHtml(displayName)}</span>
                                        <button type="button" class="btn-item-customize" onclick="openItemCustomizer(${idx})" title="${currentLang === 'ar' ? 'تخصيص' : 'Customize'}">
                                            <i class="fa-solid fa-sliders"></i>
                                        </button>
                                    </div>
                                    ${addonsHtml}
                                    ${noteHtml}
                                </td>
                                <td class="col-qty">
                                    <div class="cart-qty-ctrls">
                                        <button type="button" class="cart-qty-btn" onclick="changeCartQty(${idx}, -1)">−</button>
                                        <span class="cart-qty-val">${item.qty}</span>
                                        <button type="button" class="cart-qty-btn" onclick="changeCartQty(${idx}, 1)">+</button>
                                    </div>
                                </td>
                                <td class="col-price" style="text-align: center;">${unitPrice.toFixed(2)}</td>
                                <td class="col-total" style="text-align: end; font-weight: 800;">${lineTotal.toFixed(2)}</td>
                                <td class="col-del">
                                    <button type="button" class="row-del-btn" onclick="removeCartItem(${idx})" title="${currentLang === 'ar' ? 'حذف' : 'Remove'}">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // Calculation using compliant accounting
    const totals = calculateCartTotals();

    const addEl = document.getElementById('cartAddonsTotal') || document.getElementById('summaryAdditions');
    if (addEl) addEl.innerText = formatCurrency(totals.additionsTotal);

    const subEl = document.getElementById('cartSubtotal') || document.getElementById('summarySubtotal');
    if (subEl) subEl.innerText = formatCurrency(totals.subtotal);

    const taxEl = document.getElementById('cartTax') || document.getElementById('summaryTax');
    if (taxEl) taxEl.innerText = formatCurrency(totals.tax);

    const discEl = document.getElementById('cartDiscount') || document.getElementById('summaryDiscount');
    if (discEl) discEl.innerText = formatCurrency(totals.discount);

    const grandEl = document.getElementById('cartGrandTotal') || document.getElementById('summaryGrandTotal');
    if (grandEl) grandEl.innerText = formatCurrency(totals.grandTotal);

    const totalDueEl = document.getElementById('summaryTotalDueDisplay');
    if (totalDueEl) totalDueEl.innerText = formatCurrency(totals.grandTotal);

    // Floating Cart Widget for 8-Column Mode
    const floatBadge = document.getElementById('floatCartBadge');
    const floatTotal = document.getElementById('floatCartTotalText');
    const floatWidget = document.getElementById('catalogFloatingCart');
    const totalCount = currentCart.reduce((s, i) => s + i.qty, 0);

    if (floatBadge) floatBadge.innerText = totalCount;
    if (floatTotal) floatTotal.innerText = `${currentLang === 'ar' ? 'الإجمالي: ' : 'Total: '}${formatCurrency(totals.grandTotal)}`;
    if (floatWidget) {
        if (catalogViewMode === 'grid8' && totalCount > 0) {
            floatWidget.style.display = 'flex';
        } else if (catalogViewMode !== 'grid8') {
            floatWidget.style.display = 'none';
        }
    }

    // Mobile floater update
    const totalQty = currentCart.reduce((s, i) => s + i.qty, 0);
    const mobileCountEl = document.getElementById('mobileCartCount');
    const mobileTotalEl = document.getElementById('mobileCartTotal');
    const mobileFloaterEl = document.getElementById('mobileCartFloater');
    const mobileArrowEl = document.getElementById('mobileCartArrow');

    if (mobileCountEl) mobileCountEl.innerText = totalQty;
    if (mobileTotalEl) mobileTotalEl.innerText = formatCurrency(totals.grandTotal);
    if (mobileFloaterEl) {
        mobileFloaterEl.style.display = (totalQty > 0) ? 'flex' : 'none';
    }
    if (mobileArrowEl) {
        mobileArrowEl.className = (currentLang === 'ar') ? 'fa-solid fa-arrow-left' : 'fa-solid fa-arrow-right';
    }

    updatePosOrderBadge();
}

// 6. Item Modifiers / Addons Customizer
let customizerActiveIndex = null;
let customizerSelectedAddonIds = [];

function openItemCustomizer(index) {
    const item = currentCart[index];
    if (!item) return;
    customizerActiveIndex = index;
    customizerSelectedAddonIds = (item.addons || []).map(a => a.id);

    const titleEl = document.getElementById('customizerItemTitle');
    const noteEl = document.getElementById('customizerItemNote');
    const indexInput = document.getElementById('customizerCartIndex');

    if (titleEl) {
        titleEl.innerText = currentLang === 'ar' ? `تخصيص: ${item.arName}` : `Customize: ${item.enName}`;
    }
    if (noteEl) {
        noteEl.value = item.note || '';
    }
    if (indexInput) {
        indexInput.value = index;
    }

    renderCustomizerModifiers();
    document.getElementById('customizerModal')?.classList.add('open');
}

function renderCustomizerModifiers() {
    const container = document.getElementById('modifierGridContainer');
    if (!container) return;

    container.innerHTML = POPULAR_ADDONS.map(addon => {
        const isSelected = customizerSelectedAddonIds.includes(addon.id);
        const name = currentLang === 'ar' ? addon.nameAr : addon.nameEn;
        return `
            <div class="modifier-card-pick ${isSelected ? 'selected' : ''}" onclick="toggleCustomizerAddon('${addon.id}')">
                <div class="mod-name">
                    <i class="fa-solid ${isSelected ? 'fa-square-check' : 'fa-square'}"></i> ${escapeHtml(name)}
                </div>
                <div class="mod-price">+${formatCurrency(addon.price)}</div>
            </div>
        `;
    }).join('');
}

function toggleCustomizerAddon(addonId) {
    if (customizerSelectedAddonIds.includes(addonId)) {
        customizerSelectedAddonIds = customizerSelectedAddonIds.filter(id => id !== addonId);
    } else {
        customizerSelectedAddonIds.push(addonId);
    }
    soundBeep();
    renderCustomizerModifiers();
}

function insertQuickNote(text) {
    const input = document.getElementById('customizerItemNote');
    if (!input) return;
    const currentVal = input.value.trim();
    if (currentVal.length > 0) {
        if (!currentVal.includes(text)) {
            input.value = `${currentVal}, ${text}`;
        }
    } else {
        input.value = text;
    }
    soundBeep();
}

function closeItemCustomizer() {
    document.getElementById('customizerModal')?.classList.remove('open');
    customizerActiveIndex = null;
}

function saveItemCustomizer(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (customizerActiveIndex === null || !currentCart[customizerActiveIndex]) {
        closeItemCustomizer();
        return;
    }

    const item = currentCart[customizerActiveIndex];
    const selectedAddons = POPULAR_ADDONS.filter(a => customizerSelectedAddonIds.includes(a.id));
    const note = (document.getElementById('customizerItemNote')?.value || '').trim();

    item.addons = selectedAddons;
    item.note = note;

    closeItemCustomizer();
    renderCart();
    soundBeep();
    showToast(currentLang === 'ar' ? "تم تحديث إضافات وملاحظات الصنف" : "Item modifiers updated", "success");
}

function openMobileCart() {
    document.getElementById('posOrderPanel')?.classList.add('mobile-open');
}

function closeMobileCart() {
    document.getElementById('posOrderPanel')?.classList.remove('mobile-open');
}

// 7. NOTES MODAL
function openNotesModal() {
    const modal = document.getElementById('notesModal');
    const notesInput = document.getElementById('orderNotesInput');
    const phoneInput = document.getElementById('clientPhoneInput');

    if (notesInput) notesInput.value = currentOrderNotes || '';
    if (phoneInput) phoneInput.value = currentClientPhone || '';

    if (modal) modal.classList.add('open');
}

function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    if (modal) modal.classList.remove('open');
}

function saveNotesModal() {
    const notesInput = document.getElementById('orderNotesInput');
    const phoneInput = document.getElementById('clientPhoneInput');

    const notes = notesInput ? notesInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    // Sensible validation for phone (digits, spaces, +)
    if (phone && !/^[0-9+\s-]{7,18}$/.test(phone)) {
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'يرجى إدخال رقم هاتف صالح' : 'Please enter a valid phone number', 'warning');
        }
        return;
    }

    currentOrderNotes = notes;
    currentClientPhone = phone;

    closeNotesModal();
    soundBeep();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم حفظ ملاحظات وبيانات العميل للطلب' : 'Order notes and phone saved', 'success');
    }
}

// 8. REUSABLE DISCOUNTS MODAL
let activeDiscountTab = 'fixed'; // 'fixed' | 'percent'

function openDiscountModal() {
    const totals = calculateCartTotals();
    if (totals.subtotal <= 0) {
        showToast(currentLang === 'ar' ? "يرجى إضافة أصناف إلى الطلب أولاً" : "Add items to cart first", "warning");
        return;
    }

    const modal = document.getElementById('discountModal');
    const input = document.getElementById('discountModalInput');
    setDiscountTab(discountType || 'fixed');

    if (input) {
        input.value = discountValue || '';
    }

    if (modal) modal.classList.add('open');
}

function closeDiscountModal() {
    const modal = document.getElementById('discountModal');
    if (modal) modal.classList.remove('open');
}

function setDiscountTab(type) {
    activeDiscountTab = type;
    document.querySelectorAll('.discount-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-type') === type);
    });
    const prefixEl = document.getElementById('discountInputUnit');
    if (prefixEl) {
        prefixEl.innerText = (type === 'percent') ? '%' : storeSettings.currency;
    }
}

function applyDiscountModal() {
    const totals = calculateCartTotals();
    const input = document.getElementById('discountModalInput');
    const val = parseFloat(input?.value) || 0;

    if (val < 0) {
        showToast(currentLang === 'ar' ? 'قيمة الخصم غير صحيحة' : 'Invalid discount value', 'danger');
        return;
    }

    discountType = activeDiscountTab;
    discountValue = val;

    if (activeDiscountTab === 'percent') {
        if (val > 100) {
            showToast(currentLang === 'ar' ? 'نسبة الخصم لا يمكن أن تتجاوز 100%' : 'Discount cannot exceed 100%', 'danger');
            return;
        }
        customDiscount = Math.round(((totals.subtotal * val) / 100) * 100) / 100;
    } else {
        if (val > totals.subtotal) {
            showToast(currentLang === 'ar' ? 'قيمة الخصم لا يمكن أن تتجاوز المجموع الفرعي' : 'Discount cannot exceed subtotal', 'danger');
            return;
        }
        customDiscount = val;
    }

    closeDiscountModal();
    renderCart();
    soundSuccess();
    showToast(currentLang === 'ar' ? `تم تطبيق خصم بقيمة ${formatCurrency(customDiscount)}` : `Discount applied: ${formatCurrency(customDiscount)}`, 'success');
}

// 9. MORE / SETTINGS PANEL
function toggleMorePanel() {
    const panel = document.getElementById('moreSettingsPanel');
    const overlay = document.getElementById('moreSettingsOverlay');
    if (!panel) return;

    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        closeMorePanel();
    } else {
        panel.classList.add('open');
        overlay?.classList.add('open');
        updateMorePanelUI();
    }
}

function closeMorePanel() {
    document.getElementById('moreSettingsPanel')?.classList.remove('open');
    document.getElementById('moreSettingsOverlay')?.classList.remove('open');
}

function updateMorePanelUI() {
    // Orders view toggle
    document.getElementById('ordersViewBriefBtn')?.classList.toggle('active', posPreferences.ordersView === 'briefly');
    document.getElementById('ordersViewDetailBtn')?.classList.toggle('active', posPreferences.ordersView === 'detailed');

    // Stay at category toggle
    document.getElementById('stayCatExitBtn')?.classList.toggle('active', posPreferences.stayAtCategory === 'exit');
    document.getElementById('stayCatStayBtn')?.classList.toggle('active', posPreferences.stayAtCategory === 'stay');
}

function setOrdersViewPreference(view) {
    setPosPreference('ordersView', view);
    updateMorePanelUI();
    renderCart();
    if (typeof showToast === 'function') {
        showToast(view === 'briefly' ? (currentLang === 'ar' ? 'عرض السلة: مختصر' : 'Cart view: Briefly') : (currentLang === 'ar' ? 'عرض السلة: مفصل' : 'Cart view: Detailed'), 'info');
    }
}

function setStayAtCategoryPreference(pref) {
    setPosPreference('stayAtCategory', pref);
    updateMorePanelUI();
    if (typeof showToast === 'function') {
        showToast(pref === 'stay' ? (currentLang === 'ar' ? 'البقاء في الصنف المحدد' : 'Stay at selected category') : (currentLang === 'ar' ? 'الرجوع للقائمة بعد الإضافة' : 'Return to all after add'), 'info');
    }
}

function triggerSyncData() {
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'جاري مزامنة بيانات نقاط البيع والمنتجات...' : 'Synchronizing POS data...', 'info');
    }
    setTimeout(() => {
        persistData();
        soundSuccess();
        if (typeof showToast === 'function') {
            showToast(currentLang === 'ar' ? 'تمت مزامنة جميع البيانات بنجاح' : 'Data synchronized successfully', 'success');
        }
    }, 800);
}

function logoutPosUser() {
    if (currentCart.length > 0) {
        const msg = currentLang === 'ar' ? 'يوجد طلب مفتوح حالياً. هل تريد تسجيل الخروج؟' : 'Active cart items exist. Logout anyway?';
        if (!confirm(msg)) return;
    }
    closeMorePanel();
    currentUser = { role: 'guest', name: 'Guest' };
    persistData();
    if (typeof updateUserBadge === 'function') updateUserBadge();
    if (typeof openLoginModal === 'function') openLoginModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out', 'info');
    }
}

// 10. PERSISTENT BOTTOM NAVIGATION
function onBottomNavClick(action) {
    document.querySelectorAll('.pos-bottom-nav-item').forEach(b => b.classList.remove('active'));
    const clickedBtn = document.getElementById(`bottomNav_${action}`);
    if (clickedBtn) clickedBtn.classList.add('active');

    switch (action) {
        case 'new':
            safeStartNewOrder();
            break;
        case 'orders':
            switchView('admin');
            if (typeof switchAdminTab === 'function') switchAdminTab('orders');
            break;
        case 'tables':
            openTablePickerModal();
            break;
        case 'main':
        default:
            switchView('pos');
            break;
    }
}

function openTablePickerModal() {
    const modal = document.getElementById('tablePickerModal');
    if (!modal) return;
    const grid = document.getElementById('tablePickerGrid');
    if (grid) {
        const tables = [
            { id: '1', nameAr: 'طاولة 1', nameEn: 'Table 1' },
            { id: '2', nameAr: 'طاولة 2', nameEn: 'Table 2' },
            { id: '3', nameAr: 'طاولة 3', nameEn: 'Table 3' },
            { id: '4', nameAr: 'طاولة 4', nameEn: 'Table 4' },
            { id: '5', nameAr: 'طاولة 5', nameEn: 'Table 5' },
            { id: '6', nameAr: 'طاولة 6', nameEn: 'Table 6' },
            { id: 'terrace', nameAr: 'جلسات خارجية', nameEn: 'Outdoor Terrace' }
        ];
        grid.innerHTML = tables.map(t => {
            const label = currentLang === 'ar' ? t.nameAr : t.nameEn;
            return `
                <button type="button" class="order-type-btn" style="height: 64px; font-weight: 800; font-size: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;" onclick="selectDineInTable('${escapeHtml(label)}')">
                    <i class="fa-solid fa-chair" style="font-size: 18px; color: var(--teal);"></i>
                    <span>${escapeHtml(label)}</span>
                </button>
            `;
        }).join('');
    }
    modal.classList.add('open');
}

function closeTablePickerModal() {
    document.getElementById('tablePickerModal')?.classList.remove('open');
}

function selectDineInTable(tblName) {
    currentTable = tblName;
    const select = document.getElementById('tableSelect');
    if (select) select.value = tblName;
    closeTablePickerModal();
    setOrderType('local');
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? `تم تحديد: ${tblName}` : `Selected: ${tblName}`, 'info');
    }
}

function loadSampleInvoiceOrder() {
    currentCart = [
        { id: "item_meat_burger", name: "Meat Burger", enName: "Meat Burger", arName: "برجر لحم", price: 13.50, qty: 5 },
        { id: "item_chicken_strips_meal", name: "Chicken Strips Meal", enName: "Chicken Strips Meal", arName: "وجبة دجاج استربس", price: 18.50, qty: 1 },
        { id: "item_tandoori", name: "Tandoori", enName: "Tandoori", arName: "تندوري", price: 10.50, qty: 1 },
        { id: "item_fish_sandwich", name: "Fish sandwich", enName: "Fish sandwich", arName: "سمك", price: 9.50, qty: 1 },
        { id: "item_shish_tawooq", name: "Shish Tawooq", enName: "Shish Tawooq", arName: "شيش طاووق", price: 9.50, qty: 5 },
        { id: "item_chicken_strips_burger", name: "Chicken Strips Burger", enName: "Chicken Strips Burger", arName: "برجر دجاج استربس", price: 12.50, qty: 1 },
        { id: "item_mineral_water", name: "Mineral Water", enName: "Mineral Water", arName: "مياه معدنية", price: 1.50, qty: 1 },
        { id: "item_large_fries", name: "Large Fries", enName: "Large Fries", arName: "بطاطس كبير", price: 6.00, qty: 2 }
    ];
    currentOrderType = 'dine_in';
    currentOrderTypeId = 'local';
    currentTable = 'Table 1';
    currentCustomerId = 'cash';
    discountType = 'fixed';
    discountValue = 0;
    customDiscount = 0;
    currentOrderNotes = '';
    currentClientPhone = '';
    const tableSelect = document.getElementById('tableSelect');
    if (tableSelect) tableSelect.value = 'Table 1';

    renderCart();
    renderProducts();
    updatePosOrderBadge();
    showToast(currentLang === 'ar' ? 'تم تحميل طلب الفاتورة النموذجية ORD-1013 بنجاح' : 'Loaded sample invoice order ORD-1013 successfully', 'success');
}
