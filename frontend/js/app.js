/* =========================================================
   APP.JS - Main App Bootstrap, Auth, Language & Router
   ========================================================= */

let currentView = 'pos';
let previousPosView = 'pos';

function switchView(viewName) {
    if (viewName === 'reports_screen' && currentView !== 'reports_screen') previousPosView = currentView;
    currentView = viewName;
    if (viewName === 'admin' && currentUser && !['admin', 'manager'].includes(currentUser.role)) {
        showToast('Access Denied: Admin role required', 'danger');
        switchView('pos');
        return;
    }
    if (viewName === 'reports_screen' && !canAccessReports()) {
        showToast('Access Denied: Reports permission required', 'danger');
        switchView('pos');
        return;
    }
    if (viewName === 'shifts' && currentUser && currentUser.role !== 'guest' && !canUseShiftModule()) {
        showToast('Access Denied: Shift permission required', 'danger');
        switchView('pos');
        return;
    }
    document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

    const topBar = document.querySelector('.app-topbar');
    const bottomNav = document.getElementById('posBottomNavBar');
    const mobileBottom = document.getElementById('mobileBottomBar');

    if (viewName === 'shifts') {
        topBar?.classList.add('hide-on-shifts');
        bottomNav?.classList.add('hide-on-shifts');
        mobileBottom?.classList.add('hide-on-shifts');
    } else {
        topBar?.classList.remove('hide-on-shifts');
        bottomNav?.classList.remove('hide-on-shifts');
        mobileBottom?.classList.remove('hide-on-shifts');
    }

    const posLayout = document.getElementById('posMainLayout') || document.querySelector('#posView .pos-layout');
    const posCatalogPanel = document.getElementById('posCatalogPanel') || document.querySelector('.pos-catalog-panel');
    const returnsView = document.getElementById('returnsView');

    if (viewName === 'pos') {
        document.getElementById('posView')?.classList.add('active');
        document.getElementById('tabPosBtn')?.classList.add('active');
        document.getElementById('mobileNavPos')?.classList.add('active');

        posLayout?.classList.remove('orders-mode');
        if (posCatalogPanel) posCatalogPanel.style.display = 'flex';
        if (returnsView) {
            returnsView.style.display = 'none';
            returnsView.classList.remove('active');
        }

        document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.bottom-nav-btn.btn-main-screen')?.classList.add('active');

        if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'staff' && currentCustomerId !== 'cash') {
            currentCustomerId = 'cash';
            currentOrderTypeId = 'delivery';
            currentOrderType = 'delivery';
            orderTypeSelectionSource = 'default';
            orderTypeDisplayLabel = null;
        }
        if (typeof renderCustomerSelector === 'function') renderCustomerSelector();
        if (typeof renderOrderTypeSelector === 'function') renderOrderTypeSelector();
        renderProducts();
        if (typeof applyCatalogViewMode === 'function') applyCatalogViewMode();
        updatePosOrderBadge();
    } else if (viewName === 'returns') {
        document.getElementById('posView')?.classList.add('active');
        document.getElementById('tabPosBtn')?.classList.add('active');
        document.getElementById('tabReturnsBtn')?.classList.add('active');
        document.getElementById('mobileNavReturns')?.classList.add('active');

        posLayout?.classList.add('orders-mode');
        if (posCatalogPanel) posCatalogPanel.style.display = 'none';
        if (returnsView) {
            returnsView.style.display = 'flex';
            returnsView.classList.add('active');
        }

        document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.bottom-nav-btn[onclick="bottomNavOrders()"]')?.classList.add('active');

        if (typeof goReturnsScreen1 === 'function') goReturnsScreen1();
        if (typeof refreshOrdersSilently === 'function') refreshOrdersSilently();
    } else if (viewName === 'kds') {
        posLayout?.classList.remove('orders-mode');
        document.getElementById('kdsView')?.classList.add('active');
        document.getElementById('tabKdsBtn')?.classList.add('active');
        document.getElementById('mobileNavKds')?.classList.add('active');
        renderKdsScreen();
    }

    if (viewName === 'admin') {
        posLayout?.classList.remove('orders-mode');
        document.getElementById('adminView')?.classList.add('active');
        document.getElementById('tabAdminBtn')?.classList.add('active');
        document.getElementById('mobileNavAdmin')?.classList.add('active');
        renderAdminOverview();
        renderAdminItems();
        renderAdminCategories();
        renderAllOrdersTable();
    } else if (viewName === 'reports_screen') {
        posLayout?.classList.remove('orders-mode');
        document.getElementById('reportsView')?.classList.add('active');
        if (typeof renderActiveReport === 'function') renderActiveReport();
    } else if (viewName === 'shifts') {
        posLayout?.classList.remove('orders-mode');
        document.getElementById('shiftsView')?.classList.add('active');
        if (typeof renderShiftsScreen === 'function') renderShiftsScreen();
    }
}

function canAccessReports() {
    if (!currentUser || currentUser.role === 'staff' || currentUser.role === 'guest') return false;
    return ['admin', 'manager'].includes(currentUser.role) || (Array.isArray(currentUser.permissions) && currentUser.permissions.includes('reports'));
}

function canAccessReportModule(moduleId) {
    if (!canAccessReports()) return false;
    if (['admin', 'manager'].includes(currentUser.role)) return true;
    const modulePermissions = { invoice_reports: 'invoice_reports', items_report: 'items_report', daily_shifts: 'daily_shifts' };
    const permission = modulePermissions[moduleId];
    return Boolean(permission && currentUser.permissions.includes(permission));
}

function requestReportsAccess() {
    if (!canAccessReports()) {
        showToast('Access Denied: Reports permission required', 'danger');
        return;
    }
    openReportModule('invoice_reports');
}

function canUseShiftModule() {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    if (currentUser.role === 'staff') return permissions.includes('staff_shifts');
    if (currentUser.role === 'cashier') return ['shifts', 'shift_manage', 'branch_shift_manage'].some(permission => permissions.includes(permission));
    return permissions.includes('shift_manage');
}

function canManageBranchShifts() {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    return permissions.includes('shift_manage') || permissions.includes('branch_shift_manage');
}

function requestAdminAccess() {
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
        switchView('admin');
    } else if (canAccessReports()) {
        openReportModule('invoice_reports');
    } else {
        showToast(currentLang === 'ar' ? "غير مصرح: لوحة الإدارة مخصصة للمدير فقط" : "Access Denied: Admin role required", "danger");
    }
}

function updateUserBadge() {
    const badge = document.getElementById('userRoleBadge');
    const adminTabBtn = document.getElementById('tabAdminBtn');
    const mobileNavAdmin = document.getElementById('mobileNavAdmin');
    const shiftsMenuLabel = document.getElementById('moreShiftsLabel');

    if (!currentUser) return;
    const canSeeReports = canAccessReports();
    const reportsButton = document.getElementById('mobileReportsButton');
    if (reportsButton) reportsButton.style.display = canSeeReports ? '' : 'none';
    document.querySelectorAll('[data-report-id]').forEach(item => {
        item.style.display = canAccessReportModule(item.getAttribute('data-report-id')) ? '' : 'none';
    });
    if (adminTabBtn) adminTabBtn.style.display = currentUser.role === 'staff' ? 'none' : '';
    if (mobileNavAdmin) mobileNavAdmin.style.display = currentUser.role === 'staff' ? 'none' : '';
    if (mobileNavAdmin && currentUser.role === 'cashier') mobileNavAdmin.onclick = requestReportsAccess;
    if (mobileNavAdmin && ['admin', 'manager'].includes(currentUser.role)) mobileNavAdmin.onclick = requestAdminAccess;
    if (shiftsMenuLabel) {
        shiftsMenuLabel.textContent = currentUser.role === 'staff'
            ? (currentLang === 'ar' ? 'إغلاق الوردية' : 'Close Shift')
            : (i18n[currentLang]?.lbl_shifts || (currentLang === 'ar' ? 'إدارة الورديات' : 'Shift Management'));
    }

    if (currentUser.role === 'admin') {
        if (badge) {
            badge.className = 'badge-pill role-admin';
            badge.innerHTML = `<i class="fa-solid fa-crown"></i> <span id="userRoleText">Admin (${escapeHtml(currentUser.name)})</span>`;
        }
        if (adminTabBtn) {
            adminTabBtn.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${i18n[currentLang]?.admin_nav || 'Admin & Reports'}</span>`;
            adminTabBtn.title = currentLang === 'ar' ? 'لوحة تحكم المدير الكاملة' : 'Full Admin Dashboard';
        }
        if (mobileNavAdmin) {
            mobileNavAdmin.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${currentLang === 'ar' ? 'الإدارة' : 'Admin'}</span>`;
        }
    } else if (currentUser.role === 'cashier') {
        if (badge) {
            badge.className = 'badge-pill role-cashier';
            badge.innerHTML = `<i class="fa-solid fa-cash-register"></i> <span id="userRoleText">${currentLang === 'ar' ? 'كاشير' : 'Cashier'} (${escapeHtml(currentUser.name)})</span>`;
        }
        if (adminTabBtn) {
            adminTabBtn.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${i18n[currentLang]?.admin_nav || 'Reports'}</span>`;
            adminTabBtn.title = currentLang === 'ar' ? 'تقارير الكاشير' : 'Cashier Reports';
        }
        if (mobileNavAdmin) {
            mobileNavAdmin.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${currentLang === 'ar' ? 'التقارير' : 'Reports'}</span>`;
        }
    } else {
        // Staff
        if (badge) {
            badge.className = 'badge-pill role-staff';
            badge.innerHTML = `<i class="fa-solid fa-user-check"></i> <span id="userRoleText">${currentLang === 'ar' ? 'موظف' : 'Staff'} (${escapeHtml(currentUser.name)})</span>`;
        }
        if (adminTabBtn) {
            adminTabBtn.innerHTML = `<i class="fa-solid fa-lock" style="opacity: 0.7;"></i> <span data-i18n="admin_nav">${i18n[currentLang]?.admin_nav || 'Admin & Reports'}</span>`;
            adminTabBtn.title = currentLang === 'ar' ? 'لوحة الإدارة (غير مصرح)' : 'Admin Dashboard (Restricted)';
        }
        if (mobileNavAdmin) {
            mobileNavAdmin.innerHTML = `<i class="fa-solid fa-lock"></i> <span data-i18n="admin_nav">${currentLang === 'ar' ? 'الإدارة' : 'Admin'}</span>`;
        }
    }
    const cashierDisp = document.getElementById('cashierNameDisplay');
    if (cashierDisp) {
        cashierDisp.innerHTML = `<i class="fa-solid fa-user"></i> ${escapeHtml(currentUser.name)}`;
    }
}

let loginRoleSelection = 'staff';
function selectLoginRole(role) {
    loginRoleSelection = role;
    document.getElementById('rolePickStaff')?.classList.toggle('active', role === 'staff');
    document.getElementById('rolePickAdmin')?.classList.toggle('active', role === 'admin');
    const pinInput = document.getElementById('loginPinInput');
    if (pinInput) {
        pinInput.value = '';
        pinInput.focus();
    }
}

function openLoginModal(defaultRole = 'cashier') {
    closeSideDrawer();
    selectLoginRole(defaultRole);
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('open');
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    kioskPinDigits = [];
    updateKioskPinDisplay();
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('open');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function submitLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pin = (document.getElementById('loginPinInput')?.value || '').trim();
    authenticatePosPin(pin).then(user => {
        if (!user) return;
        currentUser = user;
        persistData();
        window.location.href = 'dashboard.html';
    });
}

/* Language & Localization */
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    applyLanguage(currentLang);
    updateUserBadge();
    persistData();
}

function changeLanguage(lang) {
    currentLang = lang;
    applyLanguage(lang);
    updateUserBadge();
    persistData();
    if (typeof showToast === 'function') {
        showToast(lang === 'ar' ? 'تم تحويل الواجهة إلى العربية' : 'Interface switched to English', 'info');
    }
}

function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            if (key === 'tax_vat') {
                const tr = (storeSettings.taxRate !== undefined && storeSettings.taxRate !== null) ? storeSettings.taxRate : 15;
                el.innerText = `${i18n[lang][key]} (${tr}%)`;
            } else {
                el.innerText = i18n[lang][key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18n[lang] && i18n[lang][key]) {
            el.setAttribute('placeholder', i18n[lang][key]);
        }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (i18n[lang] && i18n[lang][key]) {
            el.setAttribute('title', i18n[lang][key]);
        }
    });

    const storeTitleEl = document.getElementById('topbarStoreName');
    const compNameEl = document.getElementById('topbarCompanyName');
    if (storeTitleEl) storeTitleEl.innerText = lang === 'ar' ? storeSettings.nameAr : storeSettings.nameEn;
    if (compNameEl) compNameEl.innerText = lang === 'ar' ? (storeSettings.companyNameAr || storeSettings.companyName || 'شركة صح للتجارة') : (storeSettings.companyName || storeSettings.nameEn || 'Sah Trading Co.');

    const tabInvBtn = document.getElementById('tabTaxInvoiceBtn');
    if (tabInvBtn) {
        tabInvBtn.innerHTML = `<i class="fa-solid fa-receipt"></i> <span>${lang === 'ar' ? 'الفاتورة الضريبية' : 'Tax Invoice'}</span>`;
    }

    const langArBtn = document.getElementById('langArBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langArBtn && langEnBtn) {
        langArBtn.classList.toggle('active', lang === 'ar');
        langEnBtn.classList.toggle('active', lang === 'en');
    }

    const kioskLangText = document.getElementById('kioskLangText');
    if (kioskLangText) {
        kioskLangText.innerText = lang === 'ar' ? 'English' : 'العربية';
    }

    if (typeof renderCustomerSelector === 'function') renderCustomerSelector();
    if (typeof renderOrderTypeSelector === 'function') renderOrderTypeSelector();

    if (typeof renderCategoriesRibbon === 'function') renderCategoriesRibbon();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderCart === 'function') renderCart();
    if (typeof updateOrderPanelMeta === 'function') updateOrderPanelMeta();
    if (typeof updatePaymentModalUI === 'function' && typeof calculateCartTotals === 'function') {
        const totals = calculateCartTotals();
        updatePaymentModalUI(totals.grandTotal);
    }
    if (typeof renderAdminOverview === 'function') renderAdminOverview();
    if (typeof renderAdminItems === 'function') renderAdminItems();
    if (typeof renderAdminCategories === 'function') renderAdminCategories();
    if (typeof renderAllOrdersTable === 'function') renderAllOrdersTable();
    if (typeof renderActiveReport === 'function') renderActiveReport();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    if (typeof renderReturnsOrdersList === 'function') renderReturnsOrdersList();
    if (document.getElementById('shiftsView')?.classList.contains('active') && typeof renderShiftsScreen === 'function') {
        if (!document.getElementById('shiftInvoicesSubView')?.classList.contains('active')) {
            renderShiftsScreen();
        }
    }
    updatePosOrderBadge();
}

/* Side Drawer Logic */
function canUserOpenSidebar() {
    if (!currentUser) return false;
    // Staff 1 and Staff 2 cannot open the sidebar (hamburger icon remains visible)
    if (currentUser.role === 'staff') {
        return false;
    }
    // Cashier and Admin can open the sidebar
    return currentUser.role === 'cashier' || currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.canOpenSidebar === true;
}

function toggleSideDrawer() {
    if (!canUserOpenSidebar()) {
        // Staff user sees hamburger icon, but sidebar does NOT open
        return;
    }
    const drawer = document.getElementById('sideDrawer');
    const overlay = document.getElementById('sideDrawerOverlay');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        closeSideDrawer();
    } else {
        drawer.classList.add('open');
        overlay?.classList.add('open');
    }
}

function closeSideDrawer() {
    document.getElementById('sideDrawer')?.classList.remove('open');
    document.getElementById('sideDrawerOverlay')?.classList.remove('open');
}

/* Toast Notifications */
function showToast(message, type = 'info') {
    const shelf = document.getElementById('toastShelf');
    if (!shelf) return;

    const pill = document.createElement('div');
    pill.className = `toast-pill ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-circle-exclamation' : 'fa-info');
    pill.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    shelf.appendChild(pill);

    setTimeout(() => {
        pill.style.opacity = '0';
        pill.style.transform = 'translateY(10px)';
        pill.style.transition = 'all 0.3s ease';
        setTimeout(() => pill.remove(), 300);
    }, 2800);
}

/* =========================================================
   KITCHEN DISPLAY SYSTEM (KDS) LOGIC
   ========================================================= */
function getOrderElapsedMinutes(isoDateStr) {
    if (!isoDateStr) return 0;
    const diffMs = Date.now() - new Date(isoDateStr).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

function renderKdsScreen() {
    const container = document.getElementById('kdsCardsContainer');
    if (!container) return;

    const activeOrders = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled');

    const newCount = activeOrders.filter(o => !o.status || o.status === 'new').length;
    const prepCount = activeOrders.filter(o => o.status === 'preparing').length;
    const readyCount = activeOrders.filter(o => o.status === 'ready').length;

    const newBadge = document.getElementById('kdsCountNew');
    const prepBadge = document.getElementById('kdsCountPrep');
    const readyBadge = document.getElementById('kdsCountReady');

    if (newBadge) newBadge.innerText = newCount;
    if (prepBadge) prepBadge.innerText = prepCount;
    if (readyBadge) readyBadge.innerText = readyCount;
    if (typeof updateKdsStockAlert === 'function') updateKdsStockAlert();

    if (activeOrders.length === 0) {
        container.innerHTML = `
            <div style="margin: 60px auto; text-align: center; color: var(--muted);">
                <i class="fa-solid fa-circle-check" style="font-size: 54px; color: var(--success); margin-bottom: 12px; display: block;"></i>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--text);">${currentLang === 'ar' ? 'جميع طلبات المطبخ جاهزة ومكتملة!' : 'All kitchen orders fulfilled!'}</h3>
                <p style="font-size: 12px; margin-top: 4px;">${currentLang === 'ar' ? 'بانتظار طلبات جديدة من الكاشير' : 'Waiting for incoming tickets from cashier terminal'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activeOrders.map(order => {
        const status = order.status || 'new';
        const mins = getOrderElapsedMinutes(order.date);
        const timerText = mins === 0 
            ? (currentLang === 'ar' ? 'الآن' : 'Just now') 
            : (currentLang === 'ar' ? `منذ ${mins} د` : `${mins}m ago`);
        
        let timerClass = 'timer-normal';
        if (mins >= 15) timerClass = 'timer-urgent';
        else if (mins >= 10) timerClass = 'timer-warning';

        let typeText = '';
        if (order.type === 'dine_in') {
            typeText = currentLang === 'ar' ? `محلي (${order.table && order.table !== '-' ? order.table : 'طاولة 1'})` : `Dine-in (${order.table || 'T1'})`;
        } else if (order.type === 'takeaway') {
            typeText = currentLang === 'ar' ? 'سفري' : 'Takeaway';
        } else {
            typeText = currentLang === 'ar' ? 'توصيل' : 'Delivery';
        }

        const itemsHtml = (order.items || []).map(item => {
            const addonsHtml = (item.addons && item.addons.length)
                ? `<div class="kds-item-modifiers">+ ${item.addons.map(a => escapeHtml(currentLang === 'ar' ? a.nameAr : a.nameEn)).join(', ')}</div>`
                : '';
            const modifiersHtml = (item.modifiers && item.modifiers.length)
                ? `<div class="kds-item-modifiers" style="color: #ffffbb;">* ${item.modifiers.map(m => `${m.actionType === 'without' ? '-' : (m.actionType === 'extra' ? '+' : '*')} ${escapeHtml(currentLang === 'ar' ? m.labelAr : m.labelEn)}`).join(', ')}</div>`
                : '';
            const noteHtml = item.note
                ? `<div class="kds-item-chef-note"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(item.note)}</div>`
                : '';

            return `
                <div class="kds-card-item-row">
                    <div class="kds-item-main">
                        <span class="kds-qty-badge">${item.qty}×</span>
                        <span class="kds-item-title">${escapeHtml(currentLang === 'ar' ? item.arName : item.enName)}</span>
                    </div>
                    ${addonsHtml}
                    ${modifiersHtml}
                    ${noteHtml}
                </div>
            `;
        }).join('');

        let actionBtn = '';
        if (status === 'new') {
            actionBtn = `
                <button type="button" class="btn-kds-action btn-kds-prep" onclick="updateKdsOrderStatus('${order.id}', 'preparing')">
                    <i class="fa-solid fa-fire-burner"></i>
                    <span>${currentLang === 'ar' ? 'بدء التجهيز' : 'Start Cooking'}</span>
                </button>
            `;
        } else if (status === 'preparing') {
            actionBtn = `
                <button type="button" class="btn-kds-action btn-kds-ready" onclick="updateKdsOrderStatus('${order.id}', 'ready')">
                    <i class="fa-solid fa-bell"></i>
                    <span>${currentLang === 'ar' ? 'جاهز للتسليم' : 'Mark Ready'}</span>
                </button>
            `;
        } else if (status === 'ready') {
            actionBtn = `
                <button type="button" class="btn-kds-action btn-kds-served" onclick="updateKdsOrderStatus('${order.id}', 'served')">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>${currentLang === 'ar' ? 'تم التسليم' : 'Served'}</span>
                </button>
            `;
        }

        return `
            <div class="kds-ticket-card status-${status}">
                <div class="kds-card-header">
                    <div class="kds-ticket-number">#${escapeHtml(order.seq || order.id)}</div>
                    <div class="kds-ticket-timer ${timerClass}">
                        <i class="fa-regular fa-clock"></i>
                        <span>${timerText}</span>
                    </div>
                </div>
                <div class="kds-card-subhead">
                    <span>${escapeHtml(typeText)}</span>
                    <span>${order.date ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div class="kds-card-items-list">
                    ${itemsHtml}
                </div>
                <div class="kds-card-footer">
                    ${actionBtn}
                </div>
            </div>
        `;
    }).join('');
}

function updateKdsOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId || String(o.seq) === String(orderId));
    if (!order) return;

    order.status = newStatus;
    persistData();
    soundSuccess();
    renderKdsScreen();

    const statusNames = {
        preparing: currentLang === 'ar' ? 'قيد التحضير بالمطبخ' : 'Cooking in progress',
        ready: currentLang === 'ar' ? 'الطلب جاهز للتسليم!' : 'Order ready for pickup!',
        served: currentLang === 'ar' ? 'تم تسليم الطلب للعميل' : 'Order served'
    };
    showToast(statusNames[newStatus] || newStatus, 'success');
}

/* Dark Mode / Theme Support */
function initTheme() {
    const savedTheme = localStorage.getItem('nurpos_theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun" style="color: #facc15;"></i>' : '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    localStorage.setItem('nurpos_theme', nextTheme);
    soundBeep();
    showToast(currentLang === 'ar' 
        ? (nextTheme === 'dark' ? "تم تفعيل الوضع الداكن" : "تم تفعيل الوضع الفاتح") 
        : (nextTheme === 'dark' ? "Dark Mode activated" : "Light Mode activated"), 
        "info"
    );
}

/* App Initialization */
async function refreshAuthoritativePosData() {
    const [catalogResponse, productResponse, orderResponse, shiftResponse] = await Promise.all([
        fetch('/api/catalog/categories', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/catalog/products', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/orders', { credentials: 'same-origin', headers: { Accept: 'application/json' } }),
        fetch('/api/shifts', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    ]);
    for (const response of [catalogResponse, productResponse, orderResponse, shiftResponse]) {
        if (!response.ok) throw new Error(`POS data request failed (${response.status})`);
    }
    const [catalog, productData, orderData, shiftData] = await Promise.all([
        catalogResponse.json(), productResponse.json(), orderResponse.json(), shiftResponse.json()
    ]);
    categories = (catalog.categories || []).map(c => ({ id: c.category_id, nameEn: c.name_en, nameAr: c.name_ar, icon: c.icon, parentId: c.parent_category_id }));
    items = (productData.products || []).map(p => ({
        id: p.product_id, catId: p.category_id, code: p.code, enName: p.name_en, arName: p.name_ar,
        subtitleEn: p.subtitle_en, subtitleAr: p.subtitle_ar, image: p.image, price: Number(p.price),
        taxRate: Number(p.tax_rate), available: Boolean(p.available), stock: p.track_stock ? Number(p.stock_on_hand) : null
    }));
    orders = (orderData.orders || []).map(o => {
        const seqStr = o.seq ? String(o.seq) : '';
        let fallbackOrderNum = o.id;
        if (seqStr) {
            if (o.user?.staff_id === 'STF-1052') {
                fallbackOrderNum = `C.${seqStr}`;
            } else if (o.user?.role === 'staff' || o.user?.staff_id === 'STF-1051') {
                fallbackOrderNum = `B.${seqStr}`;
            } else {
                fallbackOrderNum = `A.${seqStr}`;
            }
        }
        const assignedNum = o.order_number || o.orderNumber || o.client_order_id || fallbackOrderNum;
        const creator = (typeof getOrderCreatorClassification === 'function') ? getOrderCreatorClassification(assignedNum) : { isStaff: false };
        const resolvedUser = o.user?.name || (o.user_id === currentUser?.id ? currentUser?.name : (creator.isStaff ? 'Staff' : 'Cashier'));

        return {
            id: o.id,
            orderNumber: assignedNum,
            seq: o.seq,
            shiftId: o.shift_id,
            date: o.created_at,
            dateFormatted: o.created_at,
            type: o.order_type_id,
            orderTypeId: o.order_type_id,
            orderType: o.order_type_name,
            deliveryDisplay: o.delivery_display,
            table: o.table,
            customer: o.customer_name || o.customer_id,
            customerId: o.customer_id,
            notes: o.notes,
            phone: o.phone,
            status: o.status,
            cashier: resolvedUser,
            cashierName: resolvedUser,
            userName: resolvedUser,
            staffName: resolvedUser,
            userId: o.user_id,
            staffId: o.staff_id || o.user?.staff_id,
            userRole: o.user?.role,
            companyId: o.company_id,
            branchId: o.branch_id,
            subtotal: Number(o.subtotal || 0),
            tax: Number(o.tax || 0),
            discount: Number(o.discount || 0),
            total: Number(o.grand_total || 0),
            grandTotal: Number(o.grand_total || 0),
            paid: Number(o.paid || 0),
            change: Number(o.change || 0),
            method: o.method,
            paymentStatus: o.payment_status,
            items: (o.items || []).map(i => ({
                id: i.item_id,
                enName: i.en_name,
                arName: i.ar_name,
                price: Number(i.price || 0),
                qty: Number(i.qty || 1),
                note: i.note || '',
                addons: i.addons || [],
                modifiers: i.modifiers || []
            }))
        };
    });
    shifts = (shiftData.shifts || []).map(s => ({
        id: s.id, cashier: s.cashier, cashierEn: s.cashier_en, cashierAr: s.cashier_ar,
        userId: s.user_id, staffId: s.staff_id, companyId: s.company_id, branchId: s.branch_id,
        openedAt: s.opened_at, closedAt: s.closed_at, status: s.status,
        openingCash: Number(s.opening_cash), notes: s.notes
    }));
    nextOrderSeq = Math.max(1001, ...orders.map(o => Number(o.seq || 0) + 1));
    renderCategoriesRibbon(); renderProducts(); renderAdminItems(); renderAdminCategories();
    renderAllOrdersTable(); updatePosOrderBadge();
}

async function restoreBackendSession() {
    try {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.user) return;
        currentUser = data.user;
        if (typeof closeLoginModal === 'function') closeLoginModal();
        if (typeof restoreActiveOrderState === 'function') restoreActiveOrderState();
        if (currentUser.role === 'staff') {
            currentCustomerId = 'cash'; currentOrderTypeId = 'delivery'; currentOrderType = 'delivery';
        }
        updateUserBadge();
        await refreshAuthoritativePosData();
    } catch (error) {
        console.error('Authenticated POS data unavailable:', error);
        showToast('The POS backend is unavailable. Sign-in and sales require a working backend.', 'danger');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateSoundBtnUI();
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'staff' && currentCustomerId !== 'cash') {
        currentCustomerId = 'cash';
        currentOrderTypeId = 'delivery';
        currentOrderType = 'delivery';
        orderTypeSelectionSource = 'default';
        orderTypeDisplayLabel = null;
    }
    applyLanguage(currentLang);
    if (typeof renderCustomerSelector === 'function') renderCustomerSelector();
    if (typeof renderOrderTypeSelector === 'function') renderOrderTypeSelector();
    updateUserBadge();
    updatePosOrderBadge();
    renderCategoriesRibbon();
    renderProducts();
    renderCart();
    renderAdminOverview();
    renderAdminItems();
    renderAdminCategories();
    renderAllOrdersTable();
    if (typeof populateCategoryDropdowns === 'function') populateCategoryDropdowns();
    if (typeof syncStoreSettingsForm === 'function') syncStoreSettingsForm();
    if (typeof updateKdsStockAlert === 'function') updateKdsStockAlert();
    restoreBackendSession();
    window.setInterval(() => {
        if (document.visibilityState === 'visible' && currentUser && currentUser.role !== 'guest') {
            if (typeof refreshShiftStatuses === 'function') refreshShiftStatuses();
            if (typeof currentView !== 'undefined' && currentView === 'returns' && typeof refreshOrdersSilently === 'function') {
                refreshOrdersSilently();
            }
        }
    }, 30000);
});

async function refreshOrdersSilently() {
    try {
        if (typeof setOrdersLoadingState === 'function' && (!orders || orders.length === 0)) {
            setOrdersLoadingState(true);
        }
        const response = await fetch('/api/orders', {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            if (typeof setOrdersLoadingState === 'function') setOrdersLoadingState(false);
            return;
        }
        const data = await response.json();
        if (data && data.success && Array.isArray(data.orders)) {
            orders = data.orders.map(o => {
                const seqStr = o.seq ? String(o.seq) : '';
                let fallbackOrderNum = o.id;
                if (seqStr) {
                    if (o.user?.staff_id === 'STF-1052') {
                        fallbackOrderNum = `C.${seqStr}`;
                    } else if (o.user?.role === 'staff' || o.user?.staff_id === 'STF-1051') {
                        fallbackOrderNum = `B.${seqStr}`;
                    } else {
                        fallbackOrderNum = `A.${seqStr}`;
                    }
                }
                const assignedNum = o.order_number || o.orderNumber || o.client_order_id || fallbackOrderNum;
                const creator = (typeof getOrderCreatorClassification === 'function') ? getOrderCreatorClassification(assignedNum) : { isStaff: false };
                const resolvedUser = o.user?.name || (o.user_id === currentUser?.id ? currentUser?.name : (creator.isStaff ? 'Staff' : 'Cashier'));

                return {
                    id: o.id,
                    orderNumber: assignedNum,
                    seq: o.seq,
                    shiftId: o.shift_id,
                    date: o.created_at,
                    dateFormatted: o.created_at,
                    type: o.order_type_id,
                    orderTypeId: o.order_type_id,
                    orderType: o.order_type_name,
                    deliveryDisplay: o.delivery_display,
                    table: o.table,
                    customer: o.customer_name || o.customer_id,
                    customerId: o.customer_id,
                    notes: o.notes,
                    phone: o.phone,
                    status: o.status,
                    cashier: resolvedUser,
                    cashierName: resolvedUser,
                    userName: resolvedUser,
                    staffName: resolvedUser,
                    userId: o.user_id,
                    staffId: o.staff_id || o.user?.staff_id,
                    userRole: o.user?.role,
                    companyId: o.company_id,
                    branchId: o.branch_id,
                    subtotal: Number(o.subtotal || 0),
                    tax: Number(o.tax || 0),
                    discount: Number(o.discount || 0),
                    total: Number(o.grand_total || 0),
                    grandTotal: Number(o.grand_total || 0),
                    paid: Number(o.paid || 0),
                    change: Number(o.change || 0),
                    method: o.method,
                    paymentStatus: o.payment_status,
                    items: (o.items || []).map(i => ({
                        id: i.item_id,
                        enName: i.en_name,
                        arName: i.ar_name,
                        price: Number(i.price || 0),
                        qty: Number(i.qty || 1),
                        note: i.note || '',
                        addons: i.addons || [],
                        modifiers: i.modifiers || []
                    }))
                };
            });
            if (typeof setOrdersLoadingState === 'function') {
                setOrdersLoadingState(false);
            }
            const isReturnsActive = (document.getElementById('returnsView')?.classList.contains('active')) || currentView === 'returns';
            if (typeof renderReturnsOrdersList === 'function' && isReturnsActive) {
                renderReturnsOrdersList();
            }
        } else {
            if (typeof setOrdersLoadingState === 'function') setOrdersLoadingState(false);
        }
    } catch (_) {
        if (typeof setOrdersLoadingState === 'function') setOrdersLoadingState(false);
    }
}

if (typeof window !== 'undefined') {
    window.refreshOrdersSilently = refreshOrdersSilently;
}

// Dismiss Modals on Backdrop Click or Escape Key
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-overlay.open');
        openModals.forEach(m => m.classList.remove('open'));
        closeMobileCart();
        closeSideDrawer();
        closeMorePanel();
    }
});

/* KIOSK LOGIN LOGIC - SECURE 3-PIN AUTHENTICATION */
let kioskPinDigits = [];

function kioskFillDemoPin() {
    // Disabled - demo credentials removed from Login Screen
}

function kioskKeyPress(key) {
    if (key === 'C' || key === 'c') {
        kioskPinDigits = [];
    } else if (key === 'BACK') {
        if (kioskPinDigits.length > 0) {
            kioskPinDigits.pop();
        }
    } else {
        if (kioskPinDigits.length < 4 && /^[0-9]$/.test(key)) {
            kioskPinDigits.push(key);
        }
    }
    updateKioskPinDisplay();
}

function updateKioskPinDisplay() {
    for (let i = 0; i < 4; i++) {
        const box = document.getElementById('kioskPin' + i);
        if (box) {
            if (i < kioskPinDigits.length) {
                box.innerHTML = '\u25cf'; // Masked bullet dot (●)
                box.classList.add('filled');
            } else {
                box.innerHTML = '';
                box.classList.remove('filled');
            }
        }
    }
}

async function authenticatePosPin(pin) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ pin })
        });
        let data;
        try {
            data = await response.json();
        } catch (_) {
            data = null;
        }
        if (response.ok && data.success && data.session?.user) return data.session.user;
        const fallback = response.status === 503
            ? 'Login service is not configured. Contact the administrator.'
            : response.status === 502
                ? 'Login service is offline. Check the backend connection.'
                : `Sign-in failed (${response.status || 'unknown error'}).`;
        showToast(data?.error || fallback, 'danger');
        return null;
    } catch (_) {
        showToast('Cannot reach the login service. Check your internet connection.', 'danger');
        return null;
    }
}

function triggerKioskShake() {
    for (let i = 0; i < 4; i++) {
        const b = document.getElementById('kioskPin' + i);
        if (b) {
            b.classList.add('error');
            setTimeout(() => b.classList.remove('error'), 500);
        }
    }
}

async function kioskSubmitLogin() {
    const pin = kioskPinDigits.join('');
    if (pin.length !== 4) {
        showToast(currentLang === 'ar' ? 'Ø§Ø¯Ø®Ù„ Ø£Ø±Ø¨Ø¹Ø© Ø£Ø±Ù‚Ø§Ù…' : 'Please enter 4 digits', 'danger');
        return;
    }
    const authUser = await authenticatePosPin(pin);
    if (!authUser) {
        triggerKioskShake();
        kioskPinDigits = [];
        updateKioskPinDisplay();
        return;
    }

    currentUser = authUser;
    currentCustomerId = 'cash';
    currentOrderTypeId = 'delivery';
    currentOrderType = 'delivery';
    orderTypeSelectionSource = 'default';
    orderTypeDisplayLabel = null;
    currentCart = [];
    try { localStorage.removeItem('nurpos_active_order'); } catch (_) {}
    persistData();
    updateUserBadge();
    kioskPinDigits = [];
    updateKioskPinDisplay();
    window.location.href = 'dashboard.html';
}

// Global Keyboard Listener for Kiosk Login
document.addEventListener('keydown', (e) => {
    // If Connection Modal is open or typing inside an input/textarea/select, do NOT process kiosk keys!
    const connModal = document.getElementById('connectionModal');
    if (connModal && (connModal.classList.contains('open') || connModal.getAttribute('aria-hidden') === 'false')) {
        return;
    }
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        return;
    }

    const modal = document.getElementById('loginModal');
    if (!modal) return;
    const isModalVisible = modal.classList.contains('open') || modal.classList.contains('active') || modal.style.display === 'flex';
    if (!isModalVisible) return;

    if (e.key >= '0' && e.key <= '9') {
        kioskKeyPress(e.key);
    } else if (e.key === 'Backspace') {
        kioskKeyPress('BACK');
    } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        kioskKeyPress('C');
    } else if (e.key === 'Enter') {
        kioskSubmitLogin();
    }
});

/* =========================================================
   CONNECTION ID POPUP & CONFIGURATION MODULE
   ========================================================= */

// In-memory working state
const connectionModule = {
    accountNumber: '',
    selectedBranches: [],
    hasKey: false,
    sessionKey: '', // Kept securely in memory only, never logged or stored in plaintext localStorage
    isSaving: false,
    
    // Default available branches
    availableBranches: [
        { id: 'branch_main', nameEn: 'Main Branch', nameAr: 'الفرع الرئيسي' },
        { id: 'branch_olaya', nameEn: 'Branch 1 - Olaya', nameAr: 'فرع 1 - العليا' },
        { id: 'branch_malaz', nameEn: 'Branch 2 - Malaz', nameAr: 'فرع 2 - الملز' },
        { id: 'branch_rawdah', nameEn: 'Branch 3 - Rawdah', nameAr: 'فرع 3 - الروضة' },
        { id: 'branch_express', nameEn: 'Express Kiosk', nameAr: 'كشك إكسبريس' }
    ]
};

// Retrieve saved configuration from localStorage
function getSavedConnectionConfig() {
    try {
        const raw = localStorage.getItem('nurpos_connection');
        if (raw) {
            return JSON.parse(raw);
        }
    } catch (e) {
        // Safe fallback
    }
    return null;
}

// Populate branch dropdown
function populateConnectionBranchDropdown() {
    const select = document.getElementById('connBranchSelect');
    if (!select) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    select.innerHTML = '';

    // Add prompt option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = isAr ? '-- اختر الفرع للإضافة --' : '-- Select Branch to Add --';
    select.appendChild(defaultOption);

    connectionModule.availableBranches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.nameEn;
        opt.textContent = isAr ? `${b.nameAr} (${b.nameEn})` : `${b.nameEn} - ${b.nameAr}`;
        select.appendChild(opt);
    });
}

// Render selected branch chips
function renderSelectedBranchChips() {
    const container = document.getElementById('connSelectedChips');
    if (!container) return;

    container.innerHTML = '';
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (connectionModule.selectedBranches.length === 0) {
        const emptyHint = document.createElement('span');
        emptyHint.className = 'connection-chips-empty-hint';
        emptyHint.textContent = isAr ? 'لم يتم تحديد أي فرع حتى الآن' : 'No branches selected yet';
        container.appendChild(emptyHint);
        return;
    }

    connectionModule.selectedBranches.forEach(branchName => {
        const chip = document.createElement('span');
        chip.className = 'connection-branch-chip';
        chip.setAttribute('data-branch-name', branchName);

        const textSpan = document.createElement('span');
        textSpan.className = 'conn-chip-text';
        textSpan.textContent = branchName;
        chip.appendChild(textSpan);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'connection-chip-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = isAr ? `إزالة ${branchName}` : `Remove ${branchName}`;
        removeBtn.setAttribute('aria-label', `Remove ${branchName}`);
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeSelectedBranch(branchName);
        };
        chip.appendChild(removeBtn);

        container.appendChild(chip);
    });
}

// Add branch
function addSelectedBranch() {
    const select = document.getElementById('connBranchSelect');
    if (!select) return;
    const branchName = select.value.trim();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (!branchName) {
        showConnectionGeneralFeedback(isAr ? 'يرجى اختيار فرع للإضافة' : 'Please select a branch to add', 'error');
        return;
    }

    if (connectionModule.selectedBranches.includes(branchName)) {
        showConnectionGeneralFeedback(isAr ? 'الفرع محدد بالفعل في القائمة' : 'This branch is already selected', 'info');
        return;
    }

    connectionModule.selectedBranches.push(branchName);
    renderSelectedBranchChips();
    clearConnectionGeneralFeedback();
    select.value = '';
}

// Remove single branch
function removeSelectedBranch(branchName) {
    connectionModule.selectedBranches = connectionModule.selectedBranches.filter(b => b !== branchName);
    renderSelectedBranchChips();
    clearConnectionGeneralFeedback();
}

// Check Account Number action
function checkConnectionAccount() {
    const input = document.getElementById('connAccountNumber');
    const feedback = document.getElementById('connAccountFeedback');
    if (!input || !feedback) return;

    const val = input.value.trim();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (!val) {
        feedback.className = 'connection-feedback error';
        feedback.textContent = isAr ? 'يرجى إدخال رقم الحساب' : 'Please enter an Account Number';
        input.focus();
        return;
    }

    // Validate account format (e.g., minimum 4 digits)
    const isValidFormat = /^[0-9A-Za-z-]{4,20}$/.test(val);
    if (!isValidFormat) {
        feedback.className = 'connection-feedback error';
        feedback.textContent = isAr ? 'صيغة رقم الحساب غير صحيحة (4 خانات على الأقل)' : 'Invalid account format (minimum 4 characters/digits)';
        input.focus();
        return;
    }

    // Format is valid, but report realistic backend verification boundary:
    feedback.className = 'connection-feedback info';
    feedback.textContent = isAr 
        ? '✓ صيغة الحساب مقبولة (ملاحظة: خدمة التحقق السحابية غير متصلة حالياً)' 
        : '✓ Account format valid (Note: Remote verification service is not connected)';
}

// Toggle User Key visibility
function toggleUserKeyVisibility() {
    const input = document.getElementById('connUserKey');
    const icon = document.getElementById('connEyeIcon');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Reset feedback elements
function resetConnectionFeedback() {
    const af = document.getElementById('connAccountFeedback');
    const kf = document.getElementById('connKeyFeedback');
    const gf = document.getElementById('connGeneralFeedback');
    if (af) { af.className = 'connection-feedback'; af.textContent = ''; }
    if (kf) { kf.className = 'connection-feedback'; kf.textContent = ''; }
    if (gf) { gf.className = 'connection-general-feedback'; gf.textContent = ''; gf.style.display = 'none'; }
}

function showConnectionGeneralFeedback(msg, type = 'error') {
    const gf = document.getElementById('connGeneralFeedback');
    if (!gf) return;
    gf.className = `connection-general-feedback ${type}`;
    gf.textContent = msg;
    gf.style.display = 'block';
}

function clearConnectionGeneralFeedback() {
    const gf = document.getElementById('connGeneralFeedback');
    if (!gf) return;
    gf.className = 'connection-general-feedback';
    gf.textContent = '';
    gf.style.display = 'none';
}

// Load saved config into form
function loadConnectionConfigIntoForm() {
    resetConnectionFeedback();
    populateConnectionBranchDropdown();

    const saved = getSavedConnectionConfig();
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    if (saved) {
        connectionModule.accountNumber = saved.accountNumber || '';
        connectionModule.selectedBranches = Array.isArray(saved.branches) ? [...saved.branches] : [];
        connectionModule.hasKey = !!saved.hasKey;
    } else {
        connectionModule.accountNumber = '';
        // Default to Main Branch if fresh
        connectionModule.selectedBranches = [connectionModule.availableBranches[0].nameEn];
        connectionModule.hasKey = false;
        connectionModule.sessionKey = '';
    }

    const accInput = document.getElementById('connAccountNumber');
    if (accInput) accInput.value = connectionModule.accountNumber;

    const keyInput = document.getElementById('connUserKey');
    if (keyInput) {
        keyInput.type = 'password';
        const eyeIcon = document.getElementById('connEyeIcon');
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
        if (connectionModule.sessionKey) {
            keyInput.value = connectionModule.sessionKey;
            keyInput.placeholder = '••••••••••••';
        } else if (connectionModule.hasKey) {
            keyInput.value = '';
            keyInput.placeholder = isAr ? '•••••••• (محفوظ بأمان)' : '•••••••• (Saved securely)';
        } else {
            keyInput.value = '';
            keyInput.placeholder = isAr ? 'أدخل مفتاح المستخدم' : 'Enter User Key';
        }
    }

    renderSelectedBranchChips();
}

// Open Connection Modal
function openConnectionModal() {
    const modal = document.getElementById('connectionModal');
    if (!modal) return;
    
    // Prevent opening multiple instances
    if (modal.classList.contains('open')) return;

    loadConnectionConfigIntoForm();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Accessibility: Focus first interactive input
    setTimeout(() => {
        const input = document.getElementById('connAccountNumber');
        if (input) input.focus();
    }, 60);
}

// Close Connection Modal (Cancel)
function closeConnectionModal() {
    const modal = document.getElementById('connectionModal');
    if (!modal || !modal.classList.contains('open')) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    resetConnectionFeedback();

    // Accessibility: Return focus to trigger button
    const trigger = document.getElementById('kioskConnectionBtn');
    if (trigger) trigger.focus();
}

// Save Connection Settings
function saveConnectionSettings() {
    if (connectionModule.isSaving) return;

    const accInput = document.getElementById('connAccountNumber');
    const keyInput = document.getElementById('connUserKey');
    const saveBtn = document.getElementById('connSaveBtn');
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    resetConnectionFeedback();

    const accountNumber = accInput ? accInput.value.trim() : '';
    const userKey = keyInput ? keyInput.value.trim() : '';

    // Validate Account Number
    if (!accountNumber) {
        showConnectionGeneralFeedback(isAr ? 'يرجى إدخال رقم الحساب' : 'Account Number is required', 'error');
        if (accInput) accInput.focus();
        return;
    }

    // Validate User Key (either new key entered or previously saved)
    if (!userKey && !connectionModule.hasKey && !connectionModule.sessionKey) {
        showConnectionGeneralFeedback(isAr ? 'يرجى إدخال مفتاح المستخدم' : 'User Key is required', 'error');
        if (keyInput) keyInput.focus();
        return;
    }

    // Validate Branches
    if (connectionModule.selectedBranches.length === 0) {
        showConnectionGeneralFeedback(isAr ? 'يرجى تحديد فرع واحد على الأقل' : 'Please select at least one branch', 'error');
        return;
    }

    // Prevent duplicate submission
    connectionModule.isSaving = true;
    if (saveBtn) saveBtn.disabled = true;

    // Securely hold session key in memory if provided
    if (userKey) {
        connectionModule.sessionKey = userKey;
        connectionModule.hasKey = true;
    }

    // Persist non-sensitive configuration only (NO plaintext user keys in storage)
    const configToPersist = {
        accountNumber: accountNumber,
        branches: [...connectionModule.selectedBranches],
        hasKey: true,
        savedAt: new Date().toISOString()
    };

    try {
        localStorage.setItem('nurpos_connection', JSON.stringify(configToPersist));
    } catch (e) {
        showConnectionGeneralFeedback(isAr ? 'فشل حفظ الإعدادات في المتصفح' : 'Failed to save configuration locally', 'error');
        connectionModule.isSaving = false;
        if (saveBtn) saveBtn.disabled = false;
        return;
    }

    connectionModule.accountNumber = accountNumber;

    // Show success feedback
    if (typeof showToast === 'function') {
        showToast(isAr ? 'تم حفظ معرّف الاتصال بنجاح' : 'Connection ID saved successfully', 'success');
    }

    connectionModule.isSaving = false;
    if (saveBtn) saveBtn.disabled = false;

    // Close popup only after successful saving
    closeConnectionModal();
}

// Trap focus & Escape handling inside Connection Modal
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('connectionModal');
    if (!modal || !modal.classList.contains('open')) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeConnectionModal();
        return;
    }

    // Focus trap
    if (e.key === 'Tab') {
        const focusables = modal.querySelectorAll('input:not([disabled]), button:not([disabled]), select:not([disabled])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});
