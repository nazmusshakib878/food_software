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

    select.value = currentCustomerId;
}

function getPosOrderTypeDisplayedLabel() {
    // 1. If manual selection was made, return canonical localized label
    if (typeof orderTypeSelectionSource !== 'undefined' && orderTypeSelectionSource === 'manual') {
        const allowedList = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
            ? POS_ORDER_TYPES
            : [
                { id: "delivery", nameEn: "Delivery", nameAr: "توصيل" },
                { id: "local", nameEn: "local", nameAr: "محلي" },
                { id: "receive", nameEn: "Receive", nameAr: "استلام" },
                { id: "cars", nameEn: "Cars", nameAr: "خدمة السيارات" },
                { id: "delivery_d", nameEn: "Delivery D", nameAr: "توصيل سريع" }
            ];
        const match = allowedList.find(t => t.id === currentOrderTypeId);
        if (match) {
            if (currentLang === 'ar') {
                const found = (typeof orderTypes !== 'undefined' && Array.isArray(orderTypes))
                    ? orderTypes.find(t => t.id === match.id)
                    : null;
                return (found && found.nameAr) ? found.nameAr : match.nameAr;
            }
            return match.nameEn;
        }
        return currentOrderTypeId;
    }

    // 2. If automatic customer mapping
    if (typeof orderTypeSelectionSource !== 'undefined' && orderTypeSelectionSource === 'automatic') {
        const mapping = (typeof getCustomerDeliveryMapping === 'function')
            ? getCustomerDeliveryMapping(currentCustomerId)
            : null;
        if (mapping) {
            if (currentLang === 'ar') {
                return mapping.displayAr || mapping.displayEn || 'توصيل';
            }
            return mapping.displayEn || mapping.displayAr || 'Delivery';
        }
    }

    // 3. Fresh default (Cash customer | Delivery)
    if (currentOrderTypeId && currentOrderTypeId !== 'delivery') {
        const allowedList = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
            ? POS_ORDER_TYPES
            : [
                { id: "delivery", nameEn: "Delivery", nameAr: "توصيل" },
                { id: "local", nameEn: "local", nameAr: "محلي" },
                { id: "receive", nameEn: "Receive", nameAr: "استلام" },
                { id: "cars", nameEn: "Cars", nameAr: "خدمة السيارات" },
                { id: "delivery_d", nameEn: "Delivery D", nameAr: "توصيل سريع" }
            ];
        const match = allowedList.find(t => t.id === currentOrderTypeId);
        if (match) {
            return currentLang === 'ar' ? (match.nameAr || match.nameEn) : (match.nameEn || match.nameAr);
        }
    }
    return currentLang === 'ar' ? 'توصيل' : 'Delivery';
}

function onPosCustomerChange(newId) {
    currentCustomerId = newId;
    if (typeof orderTypeSelectionSource !== 'undefined') {
        orderTypeSelectionSource = 'automatic';
    }
    
    const cust = (typeof customers !== 'undefined' && Array.isArray(customers)) ? customers.find(c => c.id === newId) : null;
    if (cust) {
        const mapping = (typeof getCustomerDeliveryMapping === 'function')
            ? getCustomerDeliveryMapping(newId)
            : { orderTypeId: 'delivery', displayEn: 'Delivery', displayAr: 'توصيل' };

        currentOrderTypeId = mapping.orderTypeId || 'delivery';
        currentOrderType = currentOrderTypeId;
        if (typeof orderTypeDisplayLabel !== 'undefined') {
            orderTypeDisplayLabel = (currentLang === 'ar' ? (mapping.displayAr || mapping.displayEn) : (mapping.displayEn || mapping.displayAr));
        }

        renderOrderTypeSelector(); // This will re-render options and sync table picker & display overlay
        
        // Sync Dropdown 1 value in case this function was called from elsewhere
        const select1 = document.getElementById('posCustomerSelect');
        if (select1 && select1.value !== newId) {
            select1.value = newId;
        }

        if (typeof showToast === 'function') {
            const name = currentLang === 'ar' ? cust.nameAr : cust.nameEn;
            showToast(currentLang === 'ar' ? `العميل المحدد: ${name}` : `Customer selected: ${name}`, 'info');
        }

        // Auto-open Notes for Special Channels
        const autoNoteChannels = [
            'hungerstation', 'jahiz', 'ninja', 'management', 'keeta', 'mrsool', 'toyou', 'thechefz', 'mosque'
        ];
        if (autoNoteChannels.includes(newId)) {
            const modal = document.getElementById('notesModal');
            if (!modal || !modal.classList.contains('open')) {
                openNotesModal();
            }
        }
    }
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
}

// Gear Icon 1 — Default Client Type Modal Functions
function openDefaultClientTypeModal() {
    const modal = document.getElementById('defaultClientTypeModal');
    if (!modal) return;

    const select = document.getElementById('defaultClientTypeSelect');
    if (select) {
        // Exactly the 10 reference Customer identities in order:
        const clientOptions = [
            { id: "cash", nameEn: "Cash customer", nameAr: "عميل نقدي" },
            { id: "hungerstation", nameEn: "Hungerstation", nameAr: "شركة هنجر" },
            { id: "jahiz", nameEn: "jahiz", nameAr: "شركة جاهز الدولية" },
            { id: "ninja", nameEn: "ninja", nameAr: "شركة الخيال / نينجا" },
            { id: "management", nameEn: "Management Staff", nameAr: "Management Staff" },
            { id: "keeta", nameEn: "keeta", nameAr: "تطبيق كيتا" },
            { id: "mrsool", nameEn: "Mrsool", nameAr: "مرسول - شركة تطبيق" },
            { id: "toyou", nameEn: "ToYou", nameAr: "ToYou - شركة تطبيق تويو" },
            { id: "thechefz", nameEn: "The chefz", nameAr: "The chefz - تطبيق ذا شفز" },
            { id: "mosque", nameEn: "عميل مسجد", nameAr: "عميل مسجد" }
        ];

        select.innerHTML = clientOptions.map(opt => {
            const cust = (typeof customers !== 'undefined' && Array.isArray(customers))
                ? customers.find(c => c.id === opt.id)
                : null;
            let label = '';
            if (currentLang === 'ar') {
                label = (cust && cust.nameAr) ? cust.nameAr : opt.nameAr;
            } else {
                label = (cust && cust.nameEn) ? cust.nameEn : opt.nameEn;
            }
            return `<option value="${escapeHtml(opt.id)}">${escapeHtml(label)}</option>`;
        }).join('');

        const savedDefault = (typeof storeSettings !== 'undefined' && storeSettings.defaultCustomerId)
            ? storeSettings.defaultCustomerId
            : 'cash';
        select.value = savedDefault;
    }

    modal.classList.add('open');
    modal.style.display = 'flex';
}

function closeDefaultClientTypeModal() {
    const modal = document.getElementById('defaultClientTypeModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

function saveDefaultClientType() {
    const select = document.getElementById('defaultClientTypeSelect');
    if (!select) return;
    const val = select.value;

    const allowed = ['cash', 'hungerstation', 'jahiz', 'ninja', 'management', 'keeta', 'mrsool', 'toyou', 'thechefz', 'mosque'];
    if (!allowed.includes(val)) return;

    if (typeof storeSettings !== 'undefined') {
        storeSettings.defaultCustomerId = val;
    }
    if (typeof persistData === 'function') {
        persistData();
    }
    closeDefaultClientTypeModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم حفظ نوع العميل الافتراضي' : 'Default Client Type saved', 'success');
    }
}

// Gear Icon 1 Handler: Customer Gear opens Default Client Type
function promptAddCustomer() {
    openDefaultClientTypeModal();
}

// Preserved Customer Creation capability
function promptAddCustomerLegacy() {
    const nameAr = prompt(currentLang === 'ar' ? "اسم العميل الجديد:" : "Customer Name (Arabic):", "");
    if (!nameAr) return;
    const nameEn = prompt(currentLang === 'ar' ? "اسم العميل بالإنجليزي:" : "Customer Name (English):", nameAr);
    
    const newCust = {
        id: "cust_" + Date.now(),
        nameAr: nameAr.trim(),
        nameEn: (nameEn || nameAr).trim()
    };
    customers.push(newCust);
    currentCustomerId = newCust.id;
    if (typeof orderTypeSelectionSource !== 'undefined') {
        orderTypeSelectionSource = 'automatic';
    }
    persistData();
    renderCustomerSelector();
    renderOrderTypeSelector();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تمت إضافة عميل' : 'Customer added', 'success');
    }
}

// 2. Dynamic Order Type Selector (Fixed Exactly 5 Allowed Options in Strict Order)
function renderOrderTypeSelector() {
    const select = document.getElementById('posOrderTypeSelect');
    if (!select) return;

    // Normalize legacy type identifiers to valid allowed POS IDs
    if (currentOrderTypeId === 'dine_in') currentOrderTypeId = 'local';
    if (currentOrderTypeId === 'takeaway') currentOrderTypeId = 'receive';

    const allowedList = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
        ? POS_ORDER_TYPES
        : [
            { id: "delivery", nameEn: "Delivery", nameAr: "توصيل" },
            { id: "local", nameEn: "local", nameAr: "محلي" },
            { id: "receive", nameEn: "Receive", nameAr: "استلام" },
            { id: "cars", nameEn: "Cars", nameAr: "خدمة السيارات" },
            { id: "delivery_d", nameEn: "Delivery D", nameAr: "توصيل سريع" }
        ];

    const allowedIds = allowedList.map(t => t.id);
    if (!allowedIds.includes(currentOrderTypeId)) {
        currentOrderTypeId = 'delivery';
    }
    currentOrderType = currentOrderTypeId;

    select.innerHTML = allowedList.map(ot => {
        let label;
        if (currentLang === 'ar') {
            const found = (typeof orderTypes !== 'undefined' && Array.isArray(orderTypes))
                ? orderTypes.find(t => t.id === ot.id)
                : null;
            label = (found && found.nameAr) ? found.nameAr : ot.nameAr;
        } else {
            label = ot.nameEn;
        }
        const selected = (ot.id === currentOrderTypeId) ? 'selected' : '';
        return `<option value="${escapeHtml(ot.id)}" ${selected}>${escapeHtml(label)}</option>`;
    }).join('');

    select.value = currentOrderTypeId;

    // Update partner-specific display label overlay while keeping exactly 5 standard options in native select
    const displayLabel = getPosOrderTypeDisplayedLabel();
    if (!select.dataset) select.dataset = {};
    select.dataset.displayLabel = displayLabel;
    if (typeof select.setAttribute === 'function') {
        select.setAttribute('data-display-label', displayLabel);
    }

    let badge = document.getElementById('posOrderTypeDisplayBadge');
    if (!badge && select.parentElement) {
        badge = document.createElement('div');
        badge.id = 'posOrderTypeDisplayBadge';
        badge.className = 'pos-select-display-overlay';
        badge.setAttribute('aria-hidden', 'true');
        select.parentElement.insertBefore(badge, select);
    }
    if (badge) {
        badge.innerHTML = `<bdi>${escapeHtml(displayLabel)}</bdi>`;
        badge.title = displayLabel;
    }

    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = (currentOrderTypeId === 'local') ? 'flex' : 'none';
    }
}

function onPosOrderTypeChange(newId) {
    const allowedList = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
        ? POS_ORDER_TYPES
        : [
            { id: "delivery", nameEn: "Delivery", nameAr: "توصيل" },
            { id: "local", nameEn: "local", nameAr: "محلي" },
            { id: "receive", nameEn: "Receive", nameAr: "استلام" },
            { id: "cars", nameEn: "Cars", nameAr: "خدمة السيارات" },
            { id: "delivery_d", nameEn: "Delivery D", nameAr: "توصيل سريع" }
        ];
    const allowedIds = allowedList.map(t => t.id);
    if (!allowedIds.includes(newId)) return;

    currentOrderTypeId = newId;
    currentOrderType = newId;
    if (typeof orderTypeSelectionSource !== 'undefined') {
        orderTypeSelectionSource = 'manual';
    }
    if (typeof orderTypeDisplayLabel !== 'undefined') {
        orderTypeDisplayLabel = null;
    }

    // Synchronize Table Picker visibility (shown only for local / dine-in)
    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = (currentOrderTypeId === 'local') ? 'flex' : 'none';
    }

    // Keep POS Order Type select in sync
    const select = document.getElementById('posOrderTypeSelect');
    if (select && select.value !== newId) {
        select.value = newId;
    }

    // Update display label overlay
    const displayLabel = getPosOrderTypeDisplayedLabel();
    if (select) {
        if (!select.dataset) select.dataset = {};
        select.dataset.displayLabel = displayLabel;
        if (typeof select.setAttribute === 'function') {
            select.setAttribute('data-display-label', displayLabel);
        }
    }
    const badge = document.getElementById('posOrderTypeDisplayBadge');
    if (badge) {
        badge.innerHTML = `<bdi>${escapeHtml(displayLabel)}</bdi>`;
        badge.title = displayLabel;
    }

    // Update active tab buttons if present in DOM
    document.querySelectorAll('.order-type-tabs .order-type-btn').forEach(b => {
        const bType = b.getAttribute('data-type') || b.dataset?.type;
        if (bType === newId || (newId === 'local' && bType === 'dine_in') || (newId === 'receive' && bType === 'takeaway')) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    if (typeof showToast === 'function') {
        const item = allowedList.find(t => t.id === newId);
        let label = newId;
        if (item) {
            if (currentLang === 'ar') {
                const found = (typeof orderTypes !== 'undefined' && Array.isArray(orderTypes))
                    ? orderTypes.find(t => t.id === item.id)
                    : null;
                label = (found && found.nameAr) ? found.nameAr : item.nameAr;
            } else {
                label = item.nameEn;
            }
        }
        showToast(currentLang === 'ar' ? `نوع الطلب: ${label}` : `Order Type: ${label}`, 'info');
    }
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
}

// Gear Icon 2 — Default Delivery Type Modal Functions
function openDefaultDeliveryTypeModal() {
    const modal = document.getElementById('defaultDeliveryTypeModal');
    if (!modal) return;

    const select = document.getElementById('defaultDeliveryTypeSelect');
    if (select) {
        // Exactly the 5 approved POS options in required order:
        const deliveryOptions = (typeof POS_ORDER_TYPES !== 'undefined' && Array.isArray(POS_ORDER_TYPES))
            ? POS_ORDER_TYPES
            : [
                { id: "delivery", nameEn: "Delivery", nameAr: "توصيل" },
                { id: "local", nameEn: "local", nameAr: "محلي" },
                { id: "receive", nameEn: "Receive", nameAr: "استلام" },
                { id: "cars", nameEn: "Cars", nameAr: "خدمة السيارات" },
                { id: "delivery_d", nameEn: "Delivery D", nameAr: "توصيل سريع" }
            ];

        select.innerHTML = deliveryOptions.map(t => {
            const label = currentLang === 'ar' ? (t.nameAr || t.nameEn) : (t.nameEn || t.nameAr);
            return `<option value="${escapeHtml(t.id)}">${escapeHtml(label)}</option>`;
        }).join('');

        const savedDefault = (typeof storeSettings !== 'undefined' && storeSettings.defaultOrderTypeId)
            ? storeSettings.defaultOrderTypeId
            : 'delivery';
        select.value = savedDefault;
    }

    modal.classList.add('open');
    modal.style.display = 'flex';
}

function closeDefaultDeliveryTypeModal() {
    const modal = document.getElementById('defaultDeliveryTypeModal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
    }
}

function saveDefaultDeliveryType() {
    const select = document.getElementById('defaultDeliveryTypeSelect');
    if (!select) return;
    const val = select.value;

    const allowed = ['delivery', 'local', 'receive', 'cars', 'delivery_d'];
    if (!allowed.includes(val)) return;

    if (typeof storeSettings !== 'undefined') {
        storeSettings.defaultOrderTypeId = val;
    }
    if (typeof persistData === 'function') {
        persistData();
    }
    closeDefaultDeliveryTypeModal();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'تم حفظ نوع التوصيل الافتراضي' : 'Default Delivery Type saved', 'success');
    }
}

// Gear Icon 2 Handler: Order Type Gear opens Default Delivery Type
function promptAddOrderType() {
    openDefaultDeliveryTypeModal();
}

// Preserved Order Type Creation capability
function promptAddOrderTypeLegacy() {
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
    persistData();
    renderOrderTypeSelector();
    if (typeof showToast === 'function') {
        const msg = currentLang === 'ar'
            ? 'تم حفظ نوع الطلب في الإعدادات. تقتصر قائمة نقطة البيع السريعة على الـ 5 خيارات المعتمدة.'
            : 'Order type saved in settings. POS quick selector is fixed to the 5 approved types.';
        showToast(msg, 'info');
    }
}

// Robust item category resolution
function getItemCategoryId(item) {
    if (!item) return '';
    if (item.catId !== undefined && item.catId !== null) return String(item.catId);
    if (item.categoryId !== undefined && item.categoryId !== null) return String(item.categoryId);
    if (item.category !== undefined && item.category !== null) {
        if (typeof item.category === 'object') {
            return String(item.category.id || item.category.catId || item.category.name || '');
        }
        return String(item.category);
    }
    if (item.mealCategory) return 'meals';
    return '';
}

function itemMatchesCategory(item, catId) {
    if (!item || !catId) return false;
    const itemCat = getItemCategoryId(item);
    if (!itemCat) return false;
    if (itemCat === catId) return true;
    const catObj = categories.find(c => c.id === catId);
    if (catObj) {
        if (catObj.nameEn && itemCat.toLowerCase() === catObj.nameEn.toLowerCase()) return true;
        if (catObj.nameAr && itemCat === catObj.nameAr) return true;
    }
    return false;
}

// 3. Categories Ribbon / Folder Navigation Header
function renderCategoriesRibbon() {
    const ribbon = document.getElementById('categoriesRibbon');
    if (!ribbon) return;

    const availableItems = items.filter(i => i.available !== false);
    const isInsideFolder = Boolean(activeCategory && activeCategory !== 'all');

    if (!isInsideFolder) {
        // Folder Overview Mode: Clean category chips bar
        let html = `
            <div class="cat-chip active" onclick="backToFolderView()" title="${currentLang === 'ar' ? 'عرض كل المجلدات' : 'View All Folders'}">
                <i class="fa-solid fa-folder-tree"></i>
                <span>${currentLang === 'ar' ? 'كل المجلدات' : 'All Folders'}</span>
                <span class="count-badge">${categories.length}</span>
            </div>
        `;

        categories.forEach(cat => {
            const itemCount = availableItems.filter(i => itemMatchesCategory(i, cat.id)).length;
            const displayName = currentLang === 'ar' ? (cat.nameAr || cat.nameEn) : (cat.nameEn || cat.nameAr);
            const iconClass = cat.icon || 'fa-burger';
            html += `
                <div class="cat-chip" onclick="openCategoryFolder('${escapeHtml(cat.id)}')">
                    <i class="fa-solid ${iconClass}"></i>
                    <span>${escapeHtml(displayName)}</span>
                    <span class="count-badge">${itemCount}</span>
                </div>
            `;
        });

        ribbon.innerHTML = html;
        return;
    }

    // Inside Folder Mode: Show prominent Back button + active folder badge + category switcher
    const activeCat = categories.find(c => c.id === activeCategory);
    const catDisplayName = activeCat 
        ? (currentLang === 'ar' ? (activeCat.nameAr || activeCat.nameEn) : (activeCat.nameEn || activeCat.nameAr))
        : activeCategory;
    const folderCount = availableItems.filter(i => itemMatchesCategory(i, activeCategory)).length;
    const backArrowIcon = 'fa-arrow-left';

    let html = `
        <div class="pos-folder-header-bar">
            <button type="button" class="pos-folder-back-btn" onclick="backToFolderView()" title="${currentLang === 'ar' ? 'الرجوع للمجلدات' : 'Back to Folders'}">
                <i class="fa-solid ${backArrowIcon}"></i>
                <span>${currentLang === 'ar' ? 'رجوع للمجلدات' : 'Back'}</span>
            </button>
            <div class="pos-folder-current-meta">
                <span class="pos-folder-active-badge">
                    <i class="fa-solid fa-folder-open"></i>
                    <span>${escapeHtml(catDisplayName)}</span>
                </span>
                <span class="pos-folder-active-count">${folderCount} ${currentLang === 'ar' ? 'صنف' : 'items'}</span>
            </div>
            <div class="pos-folder-quick-chips">
                <div class="cat-chip" onclick="backToFolderView()" title="${currentLang === 'ar' ? 'كل المجلدات' : 'All Folders'}">
                    <i class="fa-solid fa-folder-tree"></i>
                    <span>${currentLang === 'ar' ? 'المجلدات' : 'Folders'}</span>
                </div>
                ${categories.map(cat => {
                    const isAct = cat.id === activeCategory;
                    const cnt = availableItems.filter(i => itemMatchesCategory(i, cat.id)).length;
                    const name = currentLang === 'ar' ? (cat.nameAr || cat.nameEn) : (cat.nameEn || cat.nameAr);
                    const icon = cat.icon || 'fa-burger';
                    return `
                        <div class="cat-chip ${isAct ? 'active' : ''}" onclick="openCategoryFolder('${escapeHtml(cat.id)}')">
                            <i class="fa-solid ${icon}"></i>
                            <span>${escapeHtml(name)}</span>
                            <span class="count-badge">${cnt}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    ribbon.innerHTML = html;
}

function openCategoryFolder(catId) {
    activeCategory = catId;
    savedCatalogScrollTop = 0;
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput) searchInput.value = '';
    renderCategoriesRibbon();
    renderProducts();
}

function backToFolderView() {
    activeCategory = null;
    savedCatalogScrollTop = 0;
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput) searchInput.value = '';
    renderCategoriesRibbon();
    renderProducts();
}

function clearProductSearch() {
    const searchInput = document.getElementById('productSearchInput');
    if (searchInput) searchInput.value = '';
    renderProducts();
}

function selectCategory(catId) {
    if (!catId || catId === 'all' || catId === 'folders') {
        backToFolderView();
    } else {
        openCategoryFolder(catId);
    }
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

// 4. Products & Folders Grid
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    const rawQuery = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
    const normalizedQuery = normalizeArabicText(rawQuery);

    const isInsideFolder = Boolean(activeCategory && activeCategory !== 'all');

    // Case 1: Search query typed from Folder View -> search across all items
    if (!isInsideFolder && rawQuery) {
        grid.classList.remove('category-folders-view');
        const searchMatches = items.filter(item => {
            const arNorm = normalizeArabicText(item.arName);
            const enNorm = (item.enName || '').toLowerCase();
            const codeNorm = (item.code !== undefined && item.code !== null ? String(item.code) : '').toLowerCase();
            return arNorm.includes(normalizedQuery) || enNorm.includes(rawQuery) || codeNorm.includes(rawQuery);
        });

        if (searchMatches.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 36px; margin-bottom: 8px;"></i>
                    <p>${currentLang === 'ar' ? 'لا توجد أصناف مطابقة للبحث' : 'No matching products found'}</p>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="clearProductSearch()" style="margin-top: 10px;">
                        <i class="fa-solid fa-folder-tree"></i> ${currentLang === 'ar' ? 'الرجوع للمجلدات' : 'Back to Folders'}
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = `
            <div style="grid-column: 1/-1; display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: rgba(13, 148, 136, 0.08); border-radius: 12px; border: 1px solid rgba(13, 148, 136, 0.2); margin-bottom: 6px;">
                <span style="font-size: 13px; font-weight: 700; color: var(--teal);">
                    <i class="fa-solid fa-magnifying-glass"></i> ${currentLang === 'ar' ? 'نتائج البحث عن:' : 'Search results for:'} "${escapeHtml(rawQuery)}" (${searchMatches.length})
                </span>
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearProductSearch()" style="font-size: 12px; padding: 4px 10px;">
                    <i class="fa-solid fa-xmark"></i> ${currentLang === 'ar' ? 'مسح والعودة للمجلدات' : 'Clear & Back to Folders'}
                </button>
            </div>
            ${renderProductCardsHTML(searchMatches)}
        `;
        return;
    }

    // Case 2: Folder View (Default: show category folder cards)
    if (!isInsideFolder) {
        grid.classList.add('category-folders-view');
        renderCategoryFoldersView(grid);
        return;
    }

    // Case 3: Inside a specific folder -> show ONLY items belonging to this folder
    grid.classList.remove('category-folders-view');
    renderFolderItemsView(grid, rawQuery, normalizedQuery);
}

function renderCategoryFoldersView(grid) {
    if (!categories || categories.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; margin-bottom: 8px;"></i>
                <p>${currentLang === 'ar' ? 'لا توجد مجلدات أو أقسام مضافة' : 'No category folders found'}</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = categories.map(cat => {
        const catItems = items.filter(i => itemMatchesCategory(i, cat.id));
        const totalCount = catItems.length;

        const displayName = currentLang === 'ar' ? (cat.nameAr || cat.nameEn) : (cat.nameEn || cat.nameAr);
        const secondaryName = currentLang === 'ar' ? (cat.nameEn || '') : (cat.nameAr || '');
        const iconClass = cat.icon || 'fa-burger';
        
        // Find preview image
        const firstWithImage = catItems.find(i => i.image && i.image.trim().length > 5);
        const imgUrl = (firstWithImage ? firstWithImage.image : '') || getCategoryFallbackImage(cat.id);

        const countLabel = currentLang === 'ar' ? `${totalCount} صنف` : `${totalCount} items`;

        return `
            <div class="pos-category-folder-card" onclick="openCategoryFolder('${escapeHtml(cat.id)}')">
                <div class="folder-card-media">
                    <img src="${imgUrl}" alt="${escapeHtml(displayName)}" loading="lazy" onerror="handleImageError(this, '${escapeHtml(cat.id)}')">
                    <span class="folder-tab-pill">
                        <i class="fa-solid fa-folder"></i>
                        <span>${currentLang === 'ar' ? 'مجلد' : 'Folder'}</span>
                    </span>
                    <span class="folder-count-pill">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span>${countLabel}</span>
                    </span>
                </div>
                <div class="folder-card-body">
                    <div class="folder-title-row">
                        <div class="folder-icon-circle">
                            <i class="fa-solid ${iconClass}"></i>
                        </div>
                        <div class="folder-text-wrap">
                            <h3 class="folder-primary-title" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</h3>
                            <p class="folder-secondary-title" title="${escapeHtml(secondaryName)}">${escapeHtml(secondaryName)}</p>
                        </div>
                    </div>
                    <div class="folder-card-footer">
                        <span class="folder-enter-hint">
                            <i class="fa-regular fa-folder-open"></i>
                            <span>${currentLang === 'ar' ? 'عرض الأصناف' : 'Open Folder'}</span>
                        </span>
                        <div class="folder-chevron-circle">
                            <i class="fa-solid fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFolderItemsView(grid, rawQuery, normalizedQuery) {
    const activeCat = categories.find(c => c.id === activeCategory);
    const catDisplayName = activeCat 
        ? (currentLang === 'ar' ? (activeCat.nameAr || activeCat.nameEn) : (activeCat.nameEn || activeCat.nameAr))
        : activeCategory;

    // Filter strictly by this folder
    const folderItems = items.filter(item => itemMatchesCategory(item, activeCategory));

    // Stable sort using configured sortOrder/position/order
    folderItems.sort((a, b) => {
        const orderA = (a.sortOrder !== undefined && a.sortOrder !== null) ? a.sortOrder :
                       (a.position !== undefined && a.position !== null) ? a.position :
                       (a.order !== undefined && a.order !== null) ? a.order : null;
        const orderB = (b.sortOrder !== undefined && b.sortOrder !== null) ? b.sortOrder :
                       (b.position !== undefined && b.position !== null) ? b.position :
                       (b.order !== undefined && b.order !== null) ? b.order : null;
        if (orderA !== null && orderB !== null) return orderA - orderB;
        if (orderA !== null) return -1;
        if (orderB !== null) return 1;
        return 0; // Stable original order
    });

    const filtered = folderItems.filter(item => {
        if (!rawQuery) return true;
        const arNorm = normalizeArabicText(item.arName);
        const enNorm = (item.enName || '').toLowerCase();
        const codeNorm = (item.code !== undefined && item.code !== null ? String(item.code) : '').toLowerCase();
        return arNorm.includes(normalizedQuery) || enNorm.includes(rawQuery) || codeNorm.includes(rawQuery);
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">
                <i class="fa-solid fa-utensils" style="font-size: 36px; margin-bottom: 8px;"></i>
                <p>${rawQuery 
                    ? (currentLang === 'ar' ? 'لا توجد أصناف مطابقة للبحث في هذا المجلد' : 'No matching products found in this folder')
                    : (currentLang === 'ar' ? 'لا توجد أصناف في هذا المجلد حالياً' : 'No products in this folder currently')
                }</p>
                <button type="button" class="btn btn-secondary btn-sm" onclick="backToFolderView()" style="margin-top: 10px;">
                    <i class="fa-solid fa-arrow-left"></i> ${currentLang === 'ar' ? 'الرجوع للمجلدات' : 'Back to Folders'}
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = renderProductCardsHTML(filtered);
}

function renderProductCardsHTML(itemsList) {
    return itemsList.map(item => {
        let isAvailable = item.available !== false;
        
        const inCartQty = currentCart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.qty, 0);
        
        // Stock logic
        let stockIndicatorHTML = '';
        let stockPillHTML = '';
        if (item.stock !== undefined && item.stock !== null) {
            if (item.stock <= 0) {
                isAvailable = false;
            } else {
                let remaining = item.stock - inCartQty;
                let isLow = remaining <= 10;
                let icon = isLow ? 'fa-triangle-exclamation' : 'fa-boxes-stacked';
                let stockText = currentLang === 'ar' ? `باقي ${remaining}` : `${remaining} Left`;
                
                stockPillHTML = `<span class="product-stock-pill ${isLow ? 'low' : 'normal'}"><i class="fa-solid ${icon}"></i> ${stockText}</span>`;
                
                if (inCartQty > 0) {
                    stockIndicatorHTML = `<div class="product-stock-hint"><span class="stock-rem">${remaining} ${currentLang === 'ar' ? 'متبقي' : 'left'}</span> <span class="stock-incart">(${inCartQty} ${currentLang === 'ar' ? 'بالسلة' : 'in cart'})</span></div>`;
                }
            }
        }

        const qtyBadge = inCartQty > 0 ? `<span class="cart-qty-badge">${inCartQty}</span>` : '';
        const primaryName = currentLang === 'ar' ? (item.arName || item.enName) : (item.enName || item.arName);
        const cat = categories.find(c => c.id === getItemCategoryId(item));
        const catName = cat ? (currentLang === 'ar' ? cat.nameAr : cat.nameEn) : '';
        const subtitle = currentLang === 'ar' ? (item.subtitleAr || catName) : (item.subtitleEn || catName);
        const imgUrl = item.image || getCategoryFallbackImage(getItemCategoryId(item));
        const codePill = `<span class="code-pill">${escapeHtml(item.code !== undefined && item.code !== null ? String(item.code) : '0')}</span>`;
        const outOfStockBadge = !isAvailable 
            ? `<span class="out-of-stock-badge"><i class="fa-solid fa-ban"></i> ${currentLang === 'ar' ? 'نفذت الكمية' : 'Out of Stock'}</span>` 
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
                    <img src="${imgUrl}" alt="${escapeHtml(primaryName)}" loading="lazy" onerror="handleImageError(this, '${escapeHtml(getItemCategoryId(item))}')">
                    ${codePill}
                    <span class="price-pill">${formatCurrency(item.price)}</span>
                </div>
                <div class="product-card-body">
                    <div class="item-titles">
                        <h3 title="${escapeHtml(primaryName)}">${escapeHtml(primaryName)}</h3>
                        <p class="product-category-subtitle" title="${escapeHtml(subtitle)}">${escapeHtml(subtitle)}</p>
                        ${stockIndicatorHTML}
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

function getSelectedCartItem() {
    if (selectedCartLineId) {
        const found = currentCart.find(c => c.lineId === selectedCartLineId);
        if (found) return found;
    }
    if (selectedCartItemIndex !== null && selectedCartItemIndex >= 0 && selectedCartItemIndex < currentCart.length) {
        return currentCart[selectedCartItemIndex];
    }
    return null;
}

function syncSelectedCartIndex() {
    if (selectedCartLineId) {
        const idx = currentCart.findIndex(c => c.lineId === selectedCartLineId);
        if (idx !== -1) {
            selectedCartItemIndex = idx;
        } else {
            selectedCartLineId = null;
            selectedCartItemIndex = null;
            closeItemModifierPanel();
        }
    } else if (selectedCartItemIndex !== null) {
        if (selectedCartItemIndex >= 0 && selectedCartItemIndex < currentCart.length) {
            selectedCartLineId = currentCart[selectedCartItemIndex].lineId || null;
        } else {
            selectedCartItemIndex = null;
            closeItemModifierPanel();
        }
    }
}

function addToCart(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.available === false || (item.stock !== undefined && item.stock !== null && item.stock <= 0)) {
        handleOutOfStockClick(currentLang === 'ar' ? item.arName : item.enName);
        return;
    }

    const currentQtyInCart = currentCart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.qty, 0);
    if (item.stock !== undefined && item.stock !== null && currentQtyInCart + 1 > item.stock) {
        showToast(currentLang === 'ar' ? `لقد وصلت للحد الأقصى للكمية المتوفرة بالمطبخ (${item.stock})` : `Max kitchen stock limit reached (${item.stock})`, 'warning');
        soundWarning();
        return;
    }

    // Capture catalog scroll position before modifier panel potentially hides the catalog
    const scrollEl = document.querySelector ? document.querySelector('.products-grid-scroll') : null;
    if (scrollEl && scrollEl.scrollTop !== undefined && scrollEl.scrollTop > 0) {
        savedCatalogScrollTop = scrollEl.scrollTop;
    }

    // Every successful product click creates one completely new, independent order row
    const lineId = generateCartLineId();
    const newItem = {
        lineId: lineId,
        id: item.id,
        arName: item.arName,
        enName: item.enName,
        price: item.price,
        image: item.image || (typeof getCategoryFallbackImage === 'function' ? getCategoryFallbackImage(getItemCategoryId(item) || item.catId) : (item.image || '')),
        catId: getItemCategoryId(item) || item.catId,
        qty: 1,
        addons: [],
        modifiers: [],
        note: ''
    };
    currentCart.push(newItem);
    const targetIndex = currentCart.length - 1;
    
    // Auto-select newly added row for Fast Order Entry Customization
    selectCartItem(targetIndex);

    soundBeep();
    renderCart();

    // Re-render products only if catalog container remains visible (avoid re-rendering while hidden by modifier panel)
    const catalogViews = document.getElementById('catalogViewsContainer');
    if (catalogViews && catalogViews.style.display !== 'none') {
        renderProducts();
    }

    // Scroll cart table to keep latest newly added row visible
    const scrollContainer = document.getElementById('posCartTableWrapper') || document.getElementById('cartItemsList');
    if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
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
        const removedLineId = cartItem.lineId;
        currentCart.splice(index, 1);
        soundTrash();
        if (selectedCartLineId === removedLineId) {
            selectedCartLineId = null;
            selectedCartItemIndex = null;
            closeItemModifierPanel();
        } else {
            syncSelectedCartIndex();
        }
    } else if (delta > 0) {
        soundBeep();
    }
    if (currentCart.length === 0) {
        customDiscount = 0;
        selectedCartLineId = null;
        selectedCartItemIndex = null;
        closeItemModifierPanel();
    }

    renderCart();
    renderProducts();
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
}

function removeCartItem(index) {
    const cartItem = currentCart[index];
    if (!cartItem) return;
    const removedLineId = cartItem.lineId;
    currentCart.splice(index, 1);
    soundTrash();
    if (selectedCartLineId === removedLineId) {
        selectedCartLineId = null;
        selectedCartItemIndex = null;
        closeItemModifierPanel();
    } else {
        syncSelectedCartIndex();
    }
    if (currentCart.length === 0) {
        customDiscount = 0;
        selectedCartLineId = null;
        selectedCartItemIndex = null;
        closeItemModifierPanel();
    }
    renderCart();
    renderProducts();
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
}

function clearCartConfirm() {
    safeCancelOrder();
}

function setOrderType(type, btn) {
    let normalized = type;
    if (type === 'dine_in') normalized = 'local';
    if (type === 'takeaway') normalized = 'receive';

    currentOrderType = normalized;
    currentOrderTypeId = normalized;
    if (typeof orderTypeSelectionSource !== 'undefined') {
        orderTypeSelectionSource = 'manual';
    }
    if (typeof orderTypeDisplayLabel !== 'undefined') {
        orderTypeDisplayLabel = null;
    }
    document.querySelectorAll('.order-type-tabs .order-type-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = (currentOrderTypeId === 'local') ? 'flex' : 'none';
    }

    const select = document.getElementById('posOrderTypeSelect');
    if (select && select.value !== currentOrderTypeId) {
        select.value = currentOrderTypeId;
    }
    renderOrderTypeSelector();
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
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
                        <th class="col-num">${currentLang === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th>${currentLang === 'ar' ? 'الصنف' : 'Name'}</th>
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

                        const modifiersHtml = (isDetailed && item.modifiers && item.modifiers.length)
                            ? item.modifiers.map(m => `<div class="cart-modifier-line" style="font-size: 11px; color: var(--muted); padding-right: 5px;">${m.actionType === 'without' ? '-' : (m.actionType === 'extra' ? '+' : '*')} ${escapeHtml(currentLang === 'ar' ? m.labelAr : m.labelEn)}</div>`).join('')
                            : '';

                        const isRowActive = selectedCartLineId ? (item.lineId === selectedCartLineId) : (selectedCartItemIndex === idx);
                        const rowTarget = item.lineId ? item.lineId : idx;

                        return `
                            <tr onclick="selectCartItem('${escapeHtml(String(rowTarget))}')" class="cart-row ${isRowActive ? 'active-row' : ''}" data-line-id="${escapeHtml(item.lineId || '')}" style="cursor: pointer;">
                                <td class="cart-item-num">${item.qty}</td>
                                <td class="cart-item-cell-name">
                                    <div style="display: flex; align-items: center; justify-content: space-between;">
                                        <span style="font-weight: 700;">${escapeHtml(displayName)}</span>
                                    </div>
                                    ${addonsHtml}
                                    ${modifiersHtml}
                                    ${noteHtml}
                                </td>
                                <td class="col-price" style="text-align: center;">${unitPrice.toFixed(2)}</td>
                                <td class="col-total" style="text-align: end; font-weight: 800;">${lineTotal.toFixed(2)}</td>
                                <td class="col-del">
                                    <button type="button" class="row-del-btn" onclick="event.stopPropagation(); removeCartItem(${idx})" title="${currentLang === 'ar' ? 'حذف' : 'Remove'}">
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
        } else {
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
let customizerActiveLineId = null;
let customizerSelectedAddonIds = [];

function openItemCustomizer(index) {
    const item = currentCart[index];
    if (!item) return;
    customizerActiveIndex = index;
    customizerActiveLineId = item.lineId || null;
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
    customizerActiveLineId = null;
}

function saveItemCustomizer(e) {
    if (e && e.preventDefault) e.preventDefault();
    const item = (customizerActiveLineId ? currentCart.find(c => c.lineId === customizerActiveLineId) : null) || (customizerActiveIndex !== null ? currentCart[customizerActiveIndex] : null);
    if (!item) {
        closeItemCustomizer();
        return;
    }

    const selectedAddons = POPULAR_ADDONS.filter(a => customizerSelectedAddonIds.includes(a.id)).map(a => ({ ...a }));
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
    const quickChip = document.getElementById('telephoneQuickChip');

    if (notesInput) notesInput.value = currentOrderNotes || '';
    if (phoneInput) phoneInput.value = currentClientPhone || '';

    if (quickChip) {
        if (currentCustomerId === 'cash') {
            quickChip.style.display = 'flex';
        } else {
            quickChip.style.display = 'none';
        }
    }

    if (modal) modal.classList.add('open');
}

function insertTelephoneNote() {
    const notesInput = document.getElementById('orderNotesInput');
    if (!notesInput) return;
    const textToInsert = "Telephone / هاتف";
    const currentVal = notesInput.value;
    
    if (currentVal.includes(textToInsert)) {
        return;
    }
    
    if (currentVal.trim() === '') {
        notesInput.value = textToInsert;
    } else {
        notesInput.value = currentVal.trim() + "\n" + textToInsert;
    }
    notesInput.focus();
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
        { lineId: generateCartLineId(), id: "item_meat_burger", name: "Meat Burger", enName: "Meat Burger", arName: "برجر لحم", price: 13.50, qty: 5, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_chicken_strips_meal", name: "Chicken Strips Meal", enName: "Chicken Strips Meal", arName: "وجبة دجاج استربس", price: 18.50, qty: 1, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_tandoori", name: "Tandoori", enName: "Tandoori", arName: "تندوري", price: 10.50, qty: 1, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_fish_sandwich", name: "Fish sandwich", enName: "Fish sandwich", arName: "سمك", price: 9.50, qty: 1, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_shish_tawooq", name: "Shish Tawooq", enName: "Shish Tawooq", arName: "شيش طاووق", price: 9.50, qty: 5, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_chicken_strips_burger", name: "Chicken Strips Burger", enName: "Chicken Strips Burger", arName: "برجر دجاج استربس", price: 12.50, qty: 1, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_mineral_water", name: "Mineral Water", enName: "Mineral Water", arName: "مياه معدنية", price: 1.50, qty: 1, addons: [], modifiers: [], note: '' },
        { lineId: generateCartLineId(), id: "item_large_fries", name: "Large Fries", enName: "Large Fries", arName: "بطاطس كبير", price: 6.00, qty: 2, addons: [], modifiers: [], note: '' }
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

// Bottom Navigation Actions
function bottomNavNewOrder() {
    switchView('pos');
    const started = safeStartNewOrder();
    if (!started) return;
    const select = document.getElementById('tableSelect');
    if (select) select.value = 'Table 1';
}

function bottomNavOrders() {
    switchView('returns');
}

function bottomNavTables() {
    switchView('pos');
    currentOrderTypeId = 'local';
    currentOrderType = 'local';
    if (typeof orderTypeSelectionSource !== 'undefined') {
        orderTypeSelectionSource = 'manual';
    }
    if (typeof orderTypeDisplayLabel !== 'undefined') {
        orderTypeDisplayLabel = null;
    }
    if (typeof renderOrderTypeSelector === 'function') renderOrderTypeSelector();
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? 'الرجاء اختيار الطاولة من القائمة العلوية' : 'Please select a table from the top menu', 'info');
    }
    const tablePicker = document.getElementById('tablePickerRow');
    if (tablePicker) {
        tablePicker.style.display = 'flex';
        tablePicker.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (typeof saveActiveOrderState === 'function') saveActiveOrderState();
}

function bottomNavMainScreen() {
    switchView('pos');
}

// -----------------------------------------------------------------------------
// Fast Order Entry - Item Modifier / Ingredient System
// -----------------------------------------------------------------------------

function selectCartItem(target) {
    let index = -1;
    if (typeof target === 'string') {
        index = currentCart.findIndex(c => c.lineId === target);
        if (index === -1) {
            const parsed = parseInt(target, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed < currentCart.length) {
                index = parsed;
            }
        }
    } else if (typeof target === 'number') {
        index = target;
    } else if (target && target.lineId) {
        index = currentCart.findIndex(c => c.lineId === target.lineId);
    }
    
    const cartItem = currentCart[index];
    if (!cartItem) {
        closeItemModifierPanel();
        return;
    }

    // Capture catalog scroll position before modifier panel hides the catalog view
    const scrollEl = document.querySelector ? document.querySelector('.products-grid-scroll') : null;
    if (scrollEl && scrollEl.scrollTop !== undefined && scrollEl.scrollTop > 0) {
        savedCatalogScrollTop = scrollEl.scrollTop;
    }

    selectedCartLineId = cartItem.lineId;
    selectedCartItemIndex = index;
    renderCart();
    
    // Show modifier panel UI
    const globalActionBar = document.getElementById('globalActionBar');
    const itemActionBar = document.getElementById('itemActionBar');
    const catalogViewsContainer = document.getElementById('catalogViewsContainer');
    const itemModifierPanel = document.getElementById('itemModifierPanel');
    
    if (globalActionBar) globalActionBar.style.display = 'none';
    if (itemActionBar) itemActionBar.style.display = 'flex';
    if (catalogViewsContainer) catalogViewsContainer.style.display = 'none';
    if (itemModifierPanel) itemModifierPanel.style.display = 'flex';
    
    // Set item name and note
    const nameEl = document.getElementById('modifierPanelItemName');
    if (nameEl) nameEl.innerText = currentLang === 'ar' ? (cartItem.arName || cartItem.enName) : (cartItem.enName || cartItem.arName);
    
    const noteEl = document.getElementById('modifierPanelItemNote');
    if (noteEl) noteEl.value = cartItem.note || '';
    
    // Generate and render groups
    const product = items.find(i => i.id === cartItem.id) || cartItem;
    const modifierGroups = getModifiersForProduct(product);
    renderModifierGroups(modifierGroups, cartItem.modifiers || []);
}

function closeItemModifierPanel() {
    selectedCartItemIndex = null;
    selectedCartLineId = null;
    renderCart();
    
    const globalActionBar = document.getElementById('globalActionBar');
    const itemActionBar = document.getElementById('itemActionBar');
    const catalogViewsContainer = document.getElementById('catalogViewsContainer');
    const itemModifierPanel = document.getElementById('itemModifierPanel');
    
    if (globalActionBar) globalActionBar.style.display = 'flex';
    if (itemActionBar) itemActionBar.style.display = 'none';
    if (catalogViewsContainer) catalogViewsContainer.style.display = 'flex';
    if (itemModifierPanel) itemModifierPanel.style.display = 'none';

    // Restore active folder product view and update card badges/stock
    renderProducts();

    // Restore previous scroll position inside the active folder
    const scrollEl = document.querySelector ? document.querySelector('.products-grid-scroll') : null;
    if (scrollEl && savedCatalogScrollTop > 0) {
        scrollEl.scrollTop = savedCatalogScrollTop;
    }
}

function changeActiveCartQty(delta) {
    const cartItem = getSelectedCartItem();
    if (cartItem) {
        const idx = currentCart.indexOf(cartItem);
        if (idx !== -1) {
            changeCartQty(idx, delta);
        }
    }
}

function deleteActiveCartItem() {
    const cartItem = getSelectedCartItem();
    if (cartItem) {
        const idx = currentCart.indexOf(cartItem);
        if (idx !== -1) {
            removeCartItem(idx);
        }
    }
}

function updateActiveItemNote(note) {
    const cartItem = getSelectedCartItem();
    if (cartItem) {
        cartItem.note = note;
        renderCart();
    }
}

function getModifiersForProduct(product) {
    const rawGroups = getRawModifiersForProduct(product);
    
    const GLOBAL_BASIC_ADDITIONS = {
        type: 'basic', 
        titleAr: 'إضافات أساسية', 
        titleEn: 'Basic Additions', 
        items: [
            { code: 'ba_full', labelAr: 'Full كل', labelEn: 'Full كل' },
            { code: 'ba_s_minus', labelAr: 'شطة خفيف S - -', labelEn: 'شطة خفيف S - -' },
            { code: 'ba_dkh', labelAr: 'دبل خبز | DKH', labelEn: 'دبل خبز | DKH' },
            { code: 'ba_1x2', labelAr: 'تدبيل سيخ (1*2)', labelEn: 'تدبيل سيخ (1*2)' },
            { code: 'ba_s', labelAr: 'شطة S', labelEn: 'شطة S' },
            { code: 'ba_c', labelAr: 'صوص C', labelEn: 'صوص C' },
            { code: 'ba_sa', labelAr: 'سادة SA', labelEn: 'سادة SA' },
            { code: 'ba_bp', labelAr: 'بطاطس فقط BP', labelEn: 'بطاطس فقط BP' }
        ]
    };

    // Prevent duplicates if rawGroups already contains a basic additions group
    const filteredRawGroups = rawGroups.filter(g => g.type !== 'basic' && g.titleEn !== 'Basic Additions');

    return [GLOBAL_BASIC_ADDITIONS, ...filteredRawGroups];
}

function getRawModifiersForProduct(product) {
    const GLOBAL_ONLY = {
        type: 'only', titleAr: 'فقط', titleEn: 'Only', items: [
            { code: 'on_fp', labelAr: 'ف فقط FP', labelEn: 'ف فقط FP' },
            { code: 'on_bp', labelAr: 'بطاطس فقط BP', labelEn: 'بطاطس فقط BP' },
            { code: 'on_tp', labelAr: 'طماطم فقط TP', labelEn: 'طماطم فقط TP' },
            { code: 'on_bsp', labelAr: 'بصل فقط BSP', labelEn: 'بصل فقط BSP' },
            { code: 'on_cp', labelAr: 'صوص فقط CP', labelEn: 'صوص فقط CP' },
            { code: 'on_hp', labelAr: 'خس فقط HP', labelEn: 'خس فقط HP' },
            { code: 'on_mp', labelAr: 'مايونيز فقط MP', labelEn: 'مايونيز فقط MP' },
            { code: 'on_sp', labelAr: 'شطة فقط SP', labelEn: 'شطة فقط SP' },
            { code: 'on_k', labelAr: 'كاتشب +K', labelEn: 'كاتشب +K' }
        ]
    };

    const GLOBAL_WITHOUT = {
        type: 'without', titleAr: 'بدون', titleEn: 'Without', items: [
            { code: 'no_wbkh', labelAr: 'بدون خبز BKH', labelEn: 'بدون خبز BKH' },
            { code: 'no_wbb', labelAr: 'بدون بطاطس BB', labelEn: 'بدون بطاطس BB' },
            { code: 'no_wbbs', labelAr: 'بدون بصل BBS', labelEn: 'بدون بصل BBS' },
            { code: 'no_wbf', labelAr: 'بدون ف BF', labelEn: 'بدون ف BF' },
            { code: 'no_wbh', labelAr: 'بدون خس BH', labelEn: 'بدون خس BH' },
            { code: 'no_wbt', labelAr: 'بدون طماط BT', labelEn: 'بدون طماط BT' },
            { code: 'no_wbc', labelAr: 'بدون صوص BC', labelEn: 'بدون صوص BC' },
            { code: 'no_wbs', labelAr: 'بدون شطة BS', labelEn: 'بدون شطة BS' },
            { code: 'no_wbk', labelAr: 'بدون كتشب BK', labelEn: 'بدون كتشب BK' },
            { code: 'no_wbm', labelAr: 'بدون مايونيز BM', labelEn: 'بدون مايونيز BM' }
        ]
    };

    const GLOBAL_TOPPING = {
        type: 'extra', titleAr: 'Topping Options ++', titleEn: 'Topping Options ++', items: [
            { code: 'top_tm', labelAr: 'مايونيز + M', labelEn: 'مايونيز + M' },
            { code: 'top_tk', labelAr: 'كاتشب +K', labelEn: 'كاتشب +K' },
            { code: 'top_tb', labelAr: 'بطاطس +B', labelEn: 'بطاطس +B' },
            { code: 'top_th', labelAr: 'خس زيادة +H', labelEn: 'خس زيادة +H' },
            { code: 'top_ts', labelAr: 'شطة +S', labelEn: 'شطة +S' },
            { code: 'top_tc', labelAr: 'صوص +C', labelEn: 'صوص +C' },
            { code: 'top_tbs', labelAr: 'بصل + BS', labelEn: 'بصل + BS' },
            { code: 'top_tt', labelAr: 'طماطم + T', labelEn: 'طماطم + T' },
            { code: 'top_tf', labelAr: 'ف +F', labelEn: 'ف +F' },
            { code: 'top_tkm', labelAr: 'K&M++', labelEn: 'K&M++' },
            { code: 'top_thm', labelAr: 'H&M++', labelEn: 'H&M++' }
        ]
    };

    let modifiers = [GLOBAL_ONLY, GLOBAL_WITHOUT, GLOBAL_TOPPING];

    const prodName = ((product.arName || '') + ' ' + (product.enName || '')).toLowerCase();

    if (prodName.includes('كباب') || prodName.includes('kebab')) {
        modifiers.unshift({
            type: 'without', titleAr: 'Kebab modifier options', titleEn: 'Kebab modifier options', items: [
                { code: 'k_no_onion', labelAr: 'بدون بصل', labelEn: 'بدون بصل' },
                { code: 'k_no_parsley', labelAr: 'بدون بقدونس', labelEn: 'بدون بقدونس' },
                { code: 'k_no_tomato', labelAr: 'بدون طماطم', labelEn: 'بدون طماطم' },
                { code: 'k_burnt', labelAr: 'محروق', labelEn: 'محروق' },
                { code: 'k_extra_fat', labelAr: 'زيادة شحم', labelEn: 'زيادة شحم' }
            ]
        });
    }

    if (prodName.includes('لحم') || prodName.includes('meat') || prodName.includes('beef')) {
        modifiers.unshift({
            type: 'without', titleAr: 'Meat Burger modifier options', titleEn: 'Meat Burger modifier options', items: [
                { code: 'mb_no_onion', labelAr: 'بدون بصل', labelEn: 'بدون بصل' },
                { code: 'mb_no_lettuce', labelAr: 'بدون خس', labelEn: 'بدون خس' },
                { code: 'mb_no_tomato', labelAr: 'بدون طماطم', labelEn: 'بدون طماطم' },
                { code: 'mb_no_sauce', labelAr: 'بدون صوص', labelEn: 'بدون صوص' },
                { code: 'mb_no_pickle', labelAr: 'بدون مخلل', labelEn: 'بدون مخلل' }
            ]
        });
    }

    if (prodName.includes('حاشي') || prodName.includes('hashi')) {
        modifiers.unshift({
            type: 'without', titleAr: 'Hashi Burger modifier options', titleEn: 'Hashi Burger modifier options', items: [
                { code: 'hb_no_onion', labelAr: 'بدون بصل', labelEn: 'بدون بصل' },
                { code: 'hb_no_lettuce', labelAr: 'بدون خس', labelEn: 'بدون خس' },
                { code: 'hb_no_tomato', labelAr: 'بدون طماطم', labelEn: 'بدون طماطم' },
                { code: 'hb_no_sauce', labelAr: 'بدون صوص', labelEn: 'بدون صوص' },
                { code: 'hb_no_pickle', labelAr: 'بدون مخلل', labelEn: 'بدون مخلل' }
            ]
        });
    }

    if (prodName.includes('دجاج') || prodName.includes('chicken') || prodName.includes('طاووق') || prodName.includes('tawooq')) {
        modifiers.unshift({
            type: 'without', titleAr: 'Chicken modifier options', titleEn: 'Chicken modifier options', items: [
                { code: 'ch_no_garlic', labelAr: 'بدون ثوم', labelEn: 'بدون ثوم' },
                { code: 'ch_burnt', labelAr: 'محروق', labelEn: 'محروق' },
                { code: 'ch_no_fries', labelAr: 'بدون بطاطس', labelEn: 'بدون بطاطس' }
            ]
        });
    }

    return modifiers;
}

function renderModifierGroups(groups, activeModifiers) {
    const container = document.getElementById('modifierPanelGroups');
    if (!container) return;
    
    const activeCodes = activeModifiers.map(m => m.code);
    
    container.innerHTML = groups.map(g => {
        const title = currentLang === 'ar' ? g.titleAr : g.titleEn;
        const gType = g.type || 'basic';
        
        return `
            <div class="modifier-group">
                <h4 class="modifier-group-heading group-${escapeHtml(gType)}">${escapeHtml(title)}</h4>
                <div class="modifier-group-options">
                    ${g.items.map(item => {
                        const isSelected = activeCodes.includes(item.code);
                        const label = currentLang === 'ar' ? item.labelAr : item.labelEn;
                        return `
                            <button type="button" 
                                class="modifier-option-btn group-${escapeHtml(gType)} ${isSelected ? 'selected' : ''}" 
                                data-code="${escapeHtml(item.code)}" 
                                data-type="${escapeHtml(gType)}" 
                                onclick="toggleModifier('${item.code}', '${escapeHtml(item.labelEn)}', '${escapeHtml(item.labelAr)}', '${g.type}')">
                                ${isSelected ? '<i class="fa-solid fa-check mod-check-icon"></i> ' : ''}<span>${escapeHtml(label)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleModifier(codeOrObj, labelEn, labelAr, type) {
    const cartItem = getSelectedCartItem();
    if (!cartItem) return;
    
    if (!cartItem.modifiers) cartItem.modifiers = [];

    let code, lEn, lAr, actionType, price = 0;
    if (typeof codeOrObj === 'object' && codeOrObj !== null) {
        code = codeOrObj.code || codeOrObj.id || 'mod';
        lEn = codeOrObj.labelEn || codeOrObj.label || codeOrObj.nameEn || '';
        lAr = codeOrObj.labelAr || codeOrObj.nameAr || lEn;
        actionType = codeOrObj.actionType || codeOrObj.type || 'normal';
        price = Number(codeOrObj.price || codeOrObj.priceDelta || 0);
    } else {
        code = String(codeOrObj || '');
        lEn = labelEn || '';
        lAr = labelAr || '';
        actionType = type || 'normal';
    }
    
    const existingIndex = cartItem.modifiers.findIndex(m => (m.code === code || m.id === code));
    if (existingIndex > -1) {
        // Remove it
        cartItem.modifiers.splice(existingIndex, 1);
    } else {
        // Add it. Also, conflict resolution (e.g. if adding "without onion", remove "extra onion")
        const baseName = (code && typeof code === 'string' && code.includes('_')) ? code.split('_')[1] : null;
        if (baseName) {
            cartItem.modifiers = cartItem.modifiers.filter(m => {
                const mCode = m.code || m.id || '';
                const mBaseName = (mCode && typeof mCode === 'string' && mCode.includes('_')) ? mCode.split('_')[1] : null;
                // Remove if it affects the same ingredient but different type (e.g. 'no_onion' vs 'ex_onion')
                if (mBaseName === baseName && (m.actionType || m.type) !== actionType) {
                    return false; 
                }
                return true;
            });
        }
        
        cartItem.modifiers.push({
            id: code,
            code: code,
            labelEn: lEn,
            labelAr: lAr,
            actionType: actionType,
            price: price,
            priceDelta: price
        });
    }
    
    renderCart(); // Re-render cart to show modifier lines
    // Re-render modifier panel
    const product = items.find(i => i.id === cartItem.id) || cartItem;
    if (typeof renderModifierGroups === 'function' && typeof getModifiersForProduct === 'function') {
        renderModifierGroups(getModifiersForProduct(product), cartItem.modifiers);
    }
}

/* =========================================================
   QUANTITY MODAL LOGIC
   ========================================================= */

let tempQuantityInput = "";

function openQuantityModal() {
    const cartItem = getSelectedCartItem();
    if (!cartItem) return;
    tempQuantityInput = "";
    const inputEl = document.getElementById('quantityModalInput');
    if (inputEl) inputEl.value = tempQuantityInput;
    const modal = document.getElementById('quantityModal');
    if (modal) modal.style.display = 'flex';
}

function appendQuantityDigit(digit) {
    if (tempQuantityInput === "0") {
        tempQuantityInput = digit;
    } else {
        tempQuantityInput += digit;
    }
    const inputEl = document.getElementById('quantityModalInput');
    if (inputEl) inputEl.value = tempQuantityInput;
}

function clearQuantityInput() {
    tempQuantityInput = "";
    const inputEl = document.getElementById('quantityModalInput');
    if (inputEl) inputEl.value = tempQuantityInput;
}

function backspaceQuantityInput() {
    if (tempQuantityInput.length > 0) {
        tempQuantityInput = tempQuantityInput.slice(0, -1);
        const inputEl = document.getElementById('quantityModalInput');
        if (inputEl) inputEl.value = tempQuantityInput;
    }
}

function closeQuantityModal() {
    const modal = document.getElementById('quantityModal');
    if (modal) modal.style.display = 'none';
    tempQuantityInput = "";
}

function confirmQuantityModal() {
    const cartItem = getSelectedCartItem();
    if (!cartItem) {
        closeQuantityModal();
        return;
    }

    const inputEl = document.getElementById('quantityModalInput');
    const rawVal = tempQuantityInput || (inputEl ? inputEl.value : '');
    let newQty = parseInt(rawVal, 10);
    if (isNaN(newQty) || newQty <= 0) {
        // Invalid, don't apply
        return;
    }

    // Check stock limitation if applicable
    const item = items.find(i => i.id === cartItem.id);
    if (item && item.stock !== undefined && item.stock !== null) {
        const otherItemsInCart = currentCart.filter(c => c.id === item.id && c !== cartItem).reduce((sum, c) => sum + c.qty, 0);
        if (otherItemsInCart + newQty > item.stock) {
            showToast(currentLang === 'ar' ? `لقد وصلت للحد الأقصى للكمية المتوفرة بالمطبخ (${item.stock})` : `Max kitchen stock limit reached (${item.stock})`, 'warning');
            soundWarning();
            return;
        }
    }

    cartItem.qty = newQty;
    soundBeep();
    renderCart();
    renderProducts();
    closeQuantityModal();
}

document.addEventListener('keydown', function(e) {
    const qtyModal = document.getElementById('quantityModal');
    if (qtyModal && qtyModal.style.display === 'flex') {
        if (e.key >= '0' && e.key <= '9') {
            appendQuantityDigit(e.key);
        } else if (e.key === 'Backspace') {
            backspaceQuantityInput();
        } else if (e.key === 'Enter') {
            confirmQuantityModal();
        } else if (e.key === 'Escape') {
            closeQuantityModal();
        }
    }
    const clientModal = document.getElementById('defaultClientTypeModal');
    if (clientModal && (clientModal.classList.contains('open') || clientModal.style.display === 'flex')) {
        if (e.key === 'Escape') {
            closeDefaultClientTypeModal();
        } else if (e.key === 'Enter') {
            saveDefaultClientType();
        }
    }
    const deliveryModal = document.getElementById('defaultDeliveryTypeModal');
    if (deliveryModal && (deliveryModal.classList.contains('open') || deliveryModal.style.display === 'flex')) {
        if (e.key === 'Escape') {
            closeDefaultDeliveryTypeModal();
        } else if (e.key === 'Enter') {
            saveDefaultDeliveryType();
        }
    }
});
