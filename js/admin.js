/* =========================================================
   ADMIN.JS - Admin Overview, Menu CRUD, Categories & Settings
   ========================================================= */

function switchAdminTab(tabId, btn) {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
    if (tabId === 'overview') document.getElementById('paneOverview')?.classList.add('active');
    if (tabId === 'menu') document.getElementById('paneMenu')?.classList.add('active');
    if (tabId === 'categories') document.getElementById('paneCategories')?.classList.add('active');
    if (tabId === 'orders') document.getElementById('paneOrders')?.classList.add('active');
    if (tabId === 'settings') document.getElementById('paneSettings')?.classList.add('active');
}

function renderAdminOverview() {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.date).toDateString() === today && o.status !== 'cancelled');
    const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgTicket = todayOrders.length > 0 ? (todaySales / todayOrders.length) : 0;

    // Available items strictly counts available items
    const availableItemsCount = items.filter(i => i.available !== false).length;

    const todaySalesEl = document.getElementById('kpiTodaySales');
    const totalOrdersEl = document.getElementById('kpiTotalOrders');
    const totalItemsEl = document.getElementById('kpiTotalItems');
    const avgTicketEl = document.getElementById('kpiAvgTicket');

    if (todaySalesEl) todaySalesEl.innerText = formatCurrency(todaySales);
    if (totalOrdersEl) totalOrdersEl.innerText = orders.filter(o => o.status !== 'cancelled').length;
    if (totalItemsEl) totalItemsEl.innerText = availableItemsCount;
    if (avgTicketEl) avgTicketEl.innerText = formatCurrency(avgTicket);

    // Recent Orders Table
    const tbody = document.getElementById('recentOrdersTbody');
    if (!tbody) return;

    const recent = orders.slice(0, 10);
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted); padding: 24px;">${currentLang === 'ar' ? 'لا توجد طلبات مسجلة حتى الآن' : 'No recorded orders yet'}</td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(o => {
        const isCancelled = o.status === 'cancelled';
        const totalStyle = isCancelled ? 'text-decoration: line-through; color: var(--danger);' : '';
        const statusBadge = isCancelled 
            ? `<span class="stock-tag" style="background: var(--danger-soft); color: var(--danger); font-weight: 800;">${currentLang === 'ar' ? 'ملغي' : 'Voided'}</span>`
            : `<span class="stock-tag">${escapeHtml(o.type)}</span>`;

        return `
            <tr>
                <td><strong>${escapeHtml(o.id)}</strong></td>
                <td>${escapeHtml(o.dateFormatted)}</td>
                <td>${statusBadge}</td>
                <td>${escapeHtml(o.cashier)}</td>
                <td><strong style="${totalStyle}">${formatCurrency(o.total)}</strong></td>
                <td>${escapeHtml(o.method)}</td>
                <td>
                    <button class="btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="previewExistingOrderReceipt('${escapeHtml(o.id)}')">
                        <i class="fa-solid fa-receipt"></i> ${currentLang === 'ar' ? 'الفاتورة' : 'Receipt'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAllOrdersTable(targetList) {
    const tbody = document.getElementById('allOrdersTbody');
    if (!tbody) return;

    const list = targetList || orders;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--muted); padding: 24px;">${currentLang === 'ar' ? 'لا توجد طلبات مطابقة' : 'No matching orders'}</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(o => {
        const isCancelled = o.status === 'cancelled';
        const totalStyle = isCancelled ? 'text-decoration: line-through; color: var(--danger);' : '';
        
        let statusBadge = `<span class="kds-badge" style="background: var(--teal-soft); color: var(--teal); font-size: 11px; padding: 2px 8px;">جديد</span>`;
        if (isCancelled) {
            statusBadge = `<span class="kds-badge" style="background: var(--danger-soft); color: var(--danger); font-size: 11px; padding: 2px 8px; font-weight: 800;">ملغي / Void</span>`;
        } else if (o.status === 'served') {
            statusBadge = `<span class="kds-badge" style="background: var(--success-soft); color: var(--success); font-size: 11px; padding: 2px 8px;">مكتمل / Served</span>`;
        } else if (o.status === 'preparing') {
            statusBadge = `<span class="kds-badge" style="background: var(--orange-soft); color: var(--orange); font-size: 11px; padding: 2px 8px;">قيد التجهيز</span>`;
        } else if (o.status === 'ready') {
            statusBadge = `<span class="kds-badge" style="background: var(--success-soft); color: var(--success); font-size: 11px; padding: 2px 8px;">جاهز Ready</span>`;
        }

        const voidBtn = !isCancelled
            ? `<button class="btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="voidOrder('${escapeHtml(o.id)}')" title="إلغاء الطلب"><i class="fa-solid fa-ban"></i> ${currentLang === 'ar' ? 'إلغاء' : 'Void'}</button>`
            : '';

        return `
            <tr>
                <td><strong>${escapeHtml(o.id)}</strong></td>
                <td>${escapeHtml(o.dateFormatted)}</td>
                <td>${escapeHtml(o.type)}</td>
                <td>${escapeHtml(o.table || '-')}</td>
                <td><strong style="${totalStyle}">${formatCurrency(o.total)}</strong></td>
                <td>${escapeHtml(o.method)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="previewExistingOrderReceipt('${escapeHtml(o.id)}')">
                            <i class="fa-solid fa-receipt"></i> ${currentLang === 'ar' ? 'فاتورة' : 'Receipt'}
                        </button>
                        ${voidBtn}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterAllOrders() {
    const q = (document.getElementById('orderSearchInput')?.value || '').trim().toLowerCase();
    const status = document.getElementById('orderStatusFilter')?.value || 'all';

    const filtered = orders.filter(o => {
        const matchesQuery = !q || 
            (o.id && o.id.toLowerCase().includes(q)) || 
            (o.cashier && o.cashier.toLowerCase().includes(q)) || 
            (o.table && o.table.toLowerCase().includes(q)) ||
            (o.method && o.method.toLowerCase().includes(q));

        const matchesStatus = (status === 'all') || (o.status === status) || (status === 'active' && o.status !== 'cancelled');
        return matchesQuery && matchesStatus;
    });

    renderAllOrdersTable(filtered);
}

function filterOrders() {
    filterAllOrders();
}
window.filterOrders = filterOrders;

function voidOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'cancelled') {
        showToast(currentLang === 'ar' ? "هذا الطلب ملغي بالفعل" : "Order is already voided", "info");
        return;
    }
    const confirmMsg = currentLang === 'ar'
        ? `هل أنت متأكد من إلغاء الطلب ${order.id} بقيمة ${formatCurrency(order.total)}؟ سيتم حذف أرباحه من المبيعات.`
        : `Are you sure you want to void order ${order.id} (${formatCurrency(order.total)})?`;

    if (confirm(confirmMsg)) {
        order.status = 'cancelled';
        persistData();
        renderAllOrdersTable();
        renderAdminOverview();
        renderKdsScreen();
        soundWarning();
        showToast(currentLang === 'ar' ? `تم إلغاء الطلب ${order.id} بنجاح` : `Order ${order.id} has been voided`, "danger");
    }
}

function exportOrdersCSV() {
    if (orders.length === 0) {
        showToast(currentLang === 'ar' ? "لا توجد طلبات لتصديرها" : "No orders to export", "danger");
        return;
    }

    let csv = "Order ID,Date,Type,Table,Cashier,Subtotal,Tax,Discount,Total,Method\n";
    orders.forEach(o => {
        const safeId = (o.id || '').replace(/"/g, '""');
        const safeDate = (o.dateFormatted || '').replace(/"/g, '""');
        const safeType = (o.type || '').replace(/"/g, '""');
        const safeTable = (o.table || '-').replace(/"/g, '""');
        const safeCashier = (o.cashier || '').replace(/"/g, '""');
        const safeMethod = (o.method || '').replace(/"/g, '""');
        csv += `"${safeId}","${safeDate}","${safeType}","${safeTable}","${safeCashier}",${Number(o.subtotal || 0).toFixed(2)},${Number(o.tax || 0).toFixed(2)},${Number(o.discount || 0).toFixed(2)},${Number(o.total || 0).toFixed(2)},"${safeMethod}"\n`;
    });

    // \uFEFF Byte Order Mark ensures Microsoft Excel displays Arabic text properly
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NurPOS_Orders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(currentLang === 'ar' ? "تم تصدير ملف الإكسل بنجاح" : "Orders exported to CSV", "success");
}

/* Menu Item Management (CRUD) */
function renderAdminItems() {
    const tbody = document.getElementById('adminItemsTbody');
    if (!tbody) return;

    tbody.innerHTML = items.map(item => {
        const cat = categories.find(c => c.id === item.catId);
        const catName = cat ? (currentLang === 'ar' ? cat.nameAr : cat.nameEn) : (currentLang === 'ar' ? 'غير مصنف' : 'Uncategorized');
        const imgThumb = item.image || getCategoryFallbackImage(item.catId);

        return `
            <tr>
                <td>
                    <img src="${imgThumb}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" onerror="handleImageError(this, '${escapeHtml(item.catId)}')">
                </td>
                <td><span class="stock-tag">${escapeHtml(item.code || '-')}</span></td>
                <td><strong>${escapeHtml(item.arName)}</strong></td>
                <td>${escapeHtml(item.enName)}</td>
                <td>${escapeHtml(catName)}</td>
                <td><strong style="color: var(--teal);">${formatCurrency(item.price)}</strong></td>
                <td>
                    <span class="badge-pill ${item.available ? 'role-staff' : 'role-admin'}" style="font-size: 10.5px;">
                        ${item.available ? (currentLang === 'ar' ? 'متوفر' : 'Available') : (currentLang === 'ar' ? 'غير متوفر' : 'Unavailable')}
                    </span>
                </td>
                <td>
                    <div class="action-btns-cell">
                        <button class="action-icon-btn edit" onclick="editItem('${escapeHtml(item.id)}')" title="تعديل">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-icon-btn delete" onclick="deleteItem('${escapeHtml(item.id)}')" title="حذف">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateCategoryDropdowns() {
    const sel = document.getElementById('itemCategorySelect');
    if (!sel) return;
    sel.innerHTML = categories.map(c => `
        <option value="${escapeHtml(c.id)}">${escapeHtml(c.nameAr)} (${escapeHtml(c.nameEn)})</option>
    `).join('');
}

/* Preset Image Gallery & Device File Upload */
function renderAdminImagePresets(selectedCatId = null) {
    const container = document.getElementById('adminImagePresetsShelf');
    if (!container || typeof IMAGE_PRESETS === 'undefined') return;

    const currentUrl = (document.getElementById('itemImageInput')?.value || '').trim();
    
    // Prioritize presets matching the chosen category
    const sortedPresets = [...IMAGE_PRESETS].sort((a, b) => {
        if (selectedCatId && a.catId === selectedCatId && b.catId !== selectedCatId) return -1;
        if (selectedCatId && b.catId === selectedCatId && a.catId !== selectedCatId) return 1;
        return 0;
    });

    container.innerHTML = sortedPresets.map(preset => {
        const isSelected = (currentUrl === preset.url);
        const label = currentLang === 'ar' ? preset.labelAr : preset.labelEn;
        return `
            <div class="image-preset-card ${isSelected ? 'active' : ''}" onclick="selectAdminPresetImage('${preset.url}', '${preset.catId}', '${escapeHtml(label)}')" title="${escapeHtml(label)}">
                <img src="${preset.url}" alt="${escapeHtml(label)}" loading="lazy">
                <span>${escapeHtml(label)}</span>
            </div>
        `;
    }).join('');
}

function selectAdminPresetImage(url, catId, label) {
    const input = document.getElementById('itemImageInput');
    if (input) input.value = url;
    updateItemImagePreview(url, catId);
    renderAdminImagePresets(catId);
    soundBeep();
}

function updateItemImagePreview(url, catId = null) {
    const previewImg = document.getElementById('itemPreviewImg');
    const previewLabel = document.getElementById('itemPreviewTitle');
    if (!previewImg) return;

    const effectiveCatId = catId || document.getElementById('itemCategorySelect')?.value || 'meals';
    const effectiveUrl = url && url.trim().length > 5 ? url.trim() : getCategoryFallbackImage(effectiveCatId);
    
    previewImg.src = effectiveUrl;
    if (previewLabel) {
        previewLabel.innerText = currentLang === 'ar' ? "معاينة مباشرة للصورة" : "Live Product Image Preview";
    }
}

function handleItemFileUpload(input) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    
    if (!file.type.startsWith('image/')) {
        showToast(currentLang === 'ar' ? "يرجى اختيار ملف صورة صالح" : "Please select a valid image file", "danger");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Url = e.target.result;
        const imgInput = document.getElementById('itemImageInput');
        if (imgInput) imgInput.value = base64Url;
        updateItemImagePreview(base64Url);
        soundBeep();
        showToast(currentLang === 'ar' ? "تم تحميل الصورة من جهازك بنجاح!" : "Image uploaded from device!", "success");
    };
    reader.readAsDataURL(file);
}

function openItemModal(itemId = null) {
    populateCategoryDropdowns();
    if (itemId) {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        document.getElementById('itemModalTitle').innerHTML = `<i class="fa-solid fa-pen"></i> ${currentLang === 'ar' ? 'تعديل الصنف' : 'Edit Item'} (${escapeHtml(item.arName)})`;
        document.getElementById('editItemId').value = item.id;
        document.getElementById('itemArName').value = item.arName;
        document.getElementById('itemEnName').value = item.enName;
        document.getElementById('itemCategorySelect').value = item.catId;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemCode').value = item.code || '';
        document.getElementById('itemImageInput').value = item.image || '';
        document.getElementById('itemAvailable').value = String(item.available !== false);
        updateItemImagePreview(item.image, item.catId);
        renderAdminImagePresets(item.catId);
    } else {
        document.getElementById('itemModalTitle').innerHTML = `<i class="fa-solid fa-burger"></i> ${currentLang === 'ar' ? 'إضافة صنف جديد' : 'Add New Item'}`;
        document.getElementById('editItemId').value = '';
        document.getElementById('itemArName').value = '';
        document.getElementById('itemEnName').value = '';
        document.getElementById('itemPrice').value = '';
        document.getElementById('itemCode').value = '';
        document.getElementById('itemImageInput').value = '';
        document.getElementById('itemAvailable').value = 'true';
        const initialCat = document.getElementById('itemCategorySelect')?.value || 'meals';
        updateItemImagePreview('', initialCat);
        renderAdminImagePresets(initialCat);
    }
    document.getElementById('itemModal')?.classList.add('open');
}

function closeItemModal() {
    document.getElementById('itemModal')?.classList.remove('open');
}

function saveItemForm(e) {
    e.preventDefault();
    const editId = document.getElementById('editItemId').value;
    const arName = document.getElementById('itemArName').value.trim();
    const enName = document.getElementById('itemEnName').value.trim();
    const catId = document.getElementById('itemCategorySelect').value;
    const price = Math.max(0, parseFloat(document.getElementById('itemPrice').value) || 0);
    const code = document.getElementById('itemCode').value.trim();
    const rawImage = document.getElementById('itemImageInput').value.trim();
    const image = rawImage || getCategoryFallbackImage(catId);
    const available = document.getElementById('itemAvailable').value === 'true';

    if (editId) {
        const item = items.find(i => i.id === editId);
        if (item) {
            item.arName = arName;
            item.enName = enName;
            item.catId = catId;
            item.price = price;
            item.code = code;
            item.image = image;
            item.available = available;

            // Also update any instance in active cart
            const inCart = currentCart.find(c => c.id === editId);
            if (inCart) {
                inCart.price = price;
                inCart.arName = arName;
                inCart.enName = enName;
                inCart.image = image;
            }

            showToast(currentLang === 'ar' ? "تم تحديث بيانات الصنف بنجاح" : "Product updated successfully", "success");
        }
    } else {
        const newItem = {
            id: `item_${Date.now()}`,
            arName,
            enName,
            catId,
            price,
            code,
            image,
            available
        };
        items.push(newItem);
        showToast(currentLang === 'ar' ? "تمت إضافة الصنف الجديد إلى المنيو بنجاح" : "Product added successfully", "success");
    }

    persistData();
    closeItemModal();
    renderAdminItems();
    renderAdminOverview();
    renderProducts();
    renderCart();
    renderCategoriesRibbon();
}

function editItem(id) {
    openItemModal(id);
}

function deleteItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const confirmMsg = currentLang === 'ar'
        ? `هل أنت متأكد من حذف الصنف "${item.arName}" نهائياً من المنيو؟`
        : `Are you sure you want to permanently delete "${item.enName}"?`;

    if (confirm(confirmMsg)) {
        items = items.filter(i => i.id !== id);
        // Also remove from active cart if present
        currentCart = currentCart.filter(c => c.id !== id);

        persistData();
        renderAdminItems();
        renderAdminOverview();
        renderProducts();
        renderCart();
        renderCategoriesRibbon();
        showToast(currentLang === 'ar' ? "تم حذف الصنف من المنيو" : "Product removed from menu", "danger");
    }
}

/* Category Management with Safe Migration */
function renderAdminCategories() {
    const tbody = document.getElementById('adminCategoriesTbody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(cat => {
        const count = items.filter(i => i.catId === cat.id).length;
        const iconClass = cat.icon || 'fa-burger';
        return `
            <tr>
                <td><i class="fa-solid ${iconClass}" style="color: var(--teal); font-size: 16px;"></i></td>
                <td><strong>${escapeHtml(cat.nameAr)}</strong></td>
                <td>${escapeHtml(cat.nameEn)}</td>
                <td><span class="stock-tag">${count} ${currentLang === 'ar' ? 'صنف' : 'items'}</span></td>
                <td>
                    <button class="action-icon-btn delete" onclick="deleteCategory('${escapeHtml(cat.id)}')" title="حذف">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCategoryModal() {
    document.getElementById('catArName').value = '';
    document.getElementById('catEnName').value = '';
    document.getElementById('categoryModal')?.classList.add('open');
}

function closeCategoryModal() {
    document.getElementById('categoryModal')?.classList.remove('open');
}

function saveCategoryForm(e) {
    e.preventDefault();
    const ar = document.getElementById('catArName').value.trim();
    const en = document.getElementById('catEnName').value.trim();
    if (!ar || !en) return;

    const newCat = {
        id: `cat_${Date.now()}`,
        nameAr: ar,
        nameEn: en,
        icon: "fa-utensils"
    };
    categories.push(newCat);
    persistData();
    closeCategoryModal();
    renderAdminCategories();
    renderCategoriesRibbon();
    populateCategoryDropdowns();
    showToast(currentLang === 'ar' ? "تمت إضافة القسم الجديد بنجاح" : "Category created successfully", "success");
}

function deleteCategory(id) {
    if (categories.length <= 1) {
        showToast(currentLang === 'ar' ? "لا يمكن حذف جميع الأقسام! يجب وجود قسم واحد على الأقل" : "Cannot delete all categories! At least one must remain.", "danger");
        return;
    }

    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;

    const count = items.filter(i => i.catId === id).length;
    const remainingCat = categories.find(c => c.id !== id);

    const msg = currentLang === 'ar'
        ? `هل أنت متأكد من حذف قسم "${catToDelete.nameAr}"؟ سيتم نقل الأصناف التابعة له (${count} صنف) إلى قسم "${remainingCat.nameAr}".`
        : `Delete category "${catToDelete.nameEn}"? Its ${count} items will be moved to "${remainingCat.nameEn}".`;

    if (confirm(msg)) {
        // Migrate items to remaining category
        items.forEach(item => {
            if (item.catId === id) {
                item.catId = remainingCat.id;
            }
        });

        categories = categories.filter(c => c.id !== id);

        if (activeCategory === id) {
            activeCategory = 'all';
        }

        persistData();
        renderAdminCategories();
        renderAdminItems();
        renderCategoriesRibbon();
        renderProducts();
        populateCategoryDropdowns();
        showToast(currentLang === 'ar' ? "تم حذف القسم ونقل الأصناف بنجاح" : "Category deleted and items moved", "danger");
    }
}

/* Settings Management */
function syncStoreSettingsForm() {
    document.getElementById('setStoreNameAr').value = storeSettings.nameAr || '';
    document.getElementById('setStoreNameEn').value = storeSettings.nameEn || '';
    document.getElementById('setCompanyName').value = storeSettings.companyName || '';
    document.getElementById('setVatNumber').value = storeSettings.vatNumber || '';
    document.getElementById('setTaxRate').value = storeSettings.taxRate || 15;
    document.getElementById('setCurrency').value = storeSettings.currency || 'SAR';
    document.getElementById('setAdminPin').value = storeSettings.adminPin || '1234';
    document.getElementById('setStaffPin').value = storeSettings.staffPin || '0000';
}

function saveStoreSettings(e) {
    e.preventDefault();
    const taxVal = parseFloat(document.getElementById('setTaxRate').value);
    const adminPinVal = document.getElementById('setAdminPin').value.trim();
    const staffPinVal = document.getElementById('setStaffPin').value.trim();

    if (!adminPinVal || !staffPinVal) {
        showToast(currentLang === 'ar' ? "رمز المرور لا يمكن أن يكون فارغاً" : "PIN cannot be empty", "danger");
        return;
    }

    storeSettings.nameAr = document.getElementById('setStoreNameAr').value.trim();
    storeSettings.nameEn = document.getElementById('setStoreNameEn').value.trim();
    storeSettings.companyName = document.getElementById('setCompanyName').value.trim();
    storeSettings.vatNumber = document.getElementById('setVatNumber').value.trim();
    storeSettings.taxRate = isNaN(taxVal) || taxVal < 0 ? 0 : taxVal;
    storeSettings.currency = document.getElementById('setCurrency').value.trim() || 'SAR';
    storeSettings.adminPin = adminPinVal;
    storeSettings.staffPin = staffPinVal;

    persistData();
    applyLanguage(currentLang);
    renderAdminOverview();
    renderAdminItems();
    renderAllOrdersTable();
    showToast(currentLang === 'ar' ? "تم حفظ وتحديث إعدادات المطعم بنجاح" : "Store settings saved successfully", "success");
}

function resetToDemoData() {
    const confirmMsg = currentLang === 'ar'
        ? "هل أنت متأكد من استعادة بيانات المنيو والإعدادات الافتراضية؟"
        : "Reset menu and store settings to defaults?";

    if (confirm(confirmMsg)) {
        items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
        categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        storeSettings = JSON.parse(JSON.stringify(DEFAULT_STORE));
        activeCategory = 'all';
        currentCart = [];
        persistData();
        location.reload();
    }
}

/* =========================================================
   CASHIER SHIFT MANAGEMENT & END-OF-DAY Z-REPORT
   ========================================================= */
function openZReportModal() {
    const today = new Date().toDateString();
    let shiftOrders = orders.filter(o => new Date(o.date).toDateString() === today);
    if (shiftOrders.length === 0 && orders.length > 0) {
        shiftOrders = orders.slice(0, 15);
    }

    const validOrders = shiftOrders.filter(o => o.status !== 'cancelled');
    const cancelledOrders = shiftOrders.filter(o => o.status === 'cancelled');

    const totalOrdersCount = validOrders.length;
    const cancelledCount = cancelledOrders.length;
    const grossSales = validOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
    const totalDiscounts = validOrders.reduce((sum, o) => sum + (Number(o.discount) || 0), 0);
    const totalTax = validOrders.reduce((sum, o) => sum + (Number(o.tax) || 0), 0);
    const netSales = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const cashTotal = validOrders
        .filter(o => (o.method || '').toLowerCase().includes('cash'))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const cardTotal = validOrders
        .filter(o => (o.method || '').toLowerCase().includes('card') || (o.method || '').includes('مدى'))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const onlineTotal = validOrders
        .filter(o => (o.method || '').toLowerCase().includes('online') || (o.method || '').toLowerCase().includes('transfer') || (o.method || '').includes('تحويل'))
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const storeNameEn = (storeSettings.nameEn || storeSettings.nameAr || 'NUR FOODES').toUpperCase();
    const firstOrderTime = validOrders.length > 0 ? (validOrders[validOrders.length - 1].dateFormatted || '-') : '-';
    const lastOrderTime = validOrders.length > 0 ? (validOrders[0].dateFormatted || '-') : '-';

    document.getElementById('zStoreName').innerText = storeNameEn;
    document.getElementById('zDateTime').innerText = new Date().toLocaleString(currentLang === 'ar' ? 'ar-SA' : 'en-US');
    document.getElementById('zCashier').innerText = currentUser.name || 'Cashier';
    document.getElementById('zFirstOrder').innerText = firstOrderTime;
    document.getElementById('zLastOrder').innerText = lastOrderTime;
    document.getElementById('zTotalOrdersCount').innerText = totalOrdersCount;
    const cancelledEl = document.getElementById('zCancelledCount');
    if (cancelledEl) cancelledEl.innerText = cancelledCount;
    document.getElementById('zGrossSales').innerText = formatCurrency(grossSales);
    document.getElementById('zTotalDiscounts').innerText = formatCurrency(totalDiscounts);
    document.getElementById('zTotalTax').innerText = formatCurrency(totalTax);
    document.getElementById('zNetSales').innerText = formatCurrency(netSales);
    document.getElementById('zCashTotal').innerText = formatCurrency(cashTotal);
    document.getElementById('zCardTotal').innerText = formatCurrency(cardTotal);
    document.getElementById('zOnlineTotal').innerText = formatCurrency(onlineTotal);

    document.getElementById('zReportModal')?.classList.add('open');
    soundBeep();
}

function closeZReportModal() {
    document.getElementById('zReportModal')?.classList.remove('open');
}

function printZReport() {
    const paper = document.getElementById('thermalZReportNode');
    if (!paper) {
        window.print();
        return;
    }

    const printWin = window.open('', '_blank', 'width=400,height=650');
    if (!printWin) {
        window.print();
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="utf-8">
            <title>Z-Report - Shift End</title>
            <style>
                body { font-family: 'Courier New', monospace, sans-serif; padding: 12px; color: #000; font-size: 12px; }
                .z-line { border-top: 1px dashed #000; margin: 8px 0; }
                .z-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .bold { font-weight: bold; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            ${paper.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}
