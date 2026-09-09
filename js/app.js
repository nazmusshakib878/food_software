/* =========================================================
   APP.JS - Main App Bootstrap, Auth, Language & Router
   ========================================================= */

function switchView(viewName) {
    document.querySelectorAll('.screen-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

    if (viewName === 'pos') {
        document.getElementById('posView')?.classList.add('active');
        document.getElementById('tabPosBtn')?.classList.add('active');
        document.getElementById('mobileNavPos')?.classList.add('active');
        renderProducts();
    if (typeof applyCatalogViewMode === 'function') applyCatalogViewMode();
        updatePosOrderBadge();
    } else if (viewName === 'kds') {
        document.getElementById('kdsView')?.classList.add('active');
        document.getElementById('tabKdsBtn')?.classList.add('active');
        document.getElementById('mobileNavKds')?.classList.add('active');
        renderKdsScreen();
    } else if (viewName === 'admin') {
        document.getElementById('adminView')?.classList.add('active');
        document.getElementById('tabAdminBtn')?.classList.add('active');
        document.getElementById('mobileNavAdmin')?.classList.add('active');
        renderAdminOverview();
        renderAdminItems();
        renderAdminCategories();
        renderAllOrdersTable();
    } else if (viewName === 'reports_screen') {
        document.getElementById('reportsView')?.classList.add('active');
        if (typeof renderActiveReport === 'function') renderActiveReport();
    } else if (viewName === 'returns') {
        document.getElementById('returnsView')?.classList.add('active');
        document.getElementById('tabReturnsBtn')?.classList.add('active');
        document.getElementById('mobileNavReturns')?.classList.add('active');
        if (typeof goReturnsScreen1 === 'function') goReturnsScreen1();
    }
}

function requestAdminAccess() {
    if (currentUser.role === 'admin') {
        switchView('admin');
    } else {
        showToast(currentLang === 'ar' ? "يرجى إدخال رمز المدير للوصول للوحة الإدارة" : "Enter Admin PIN to access dashboard", "danger");
        openLoginModal('admin');
    }
}

function updateUserBadge() {
    const badge = document.getElementById('userRoleBadge');
    const adminTabBtn = document.getElementById('tabAdminBtn');
    const mobileNavAdmin = document.getElementById('mobileNavAdmin');

    if (currentUser.role === 'admin') {
        if (badge) {
            badge.className = 'badge-pill role-admin';
            badge.innerHTML = `<i class="fa-solid fa-crown"></i> <span id="userRoleText">Admin (${escapeHtml(currentUser.name)})</span>`;
        }
        if (adminTabBtn) {
            adminTabBtn.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${i18n[currentLang]?.admin_nav || 'لوحة الإدارة'}</span>`;
            adminTabBtn.title = currentLang === 'ar' ? 'لوحة تحكم المدير الكاملة' : 'Full Admin Dashboard';
        }
        if (mobileNavAdmin) {
            mobileNavAdmin.innerHTML = `<i class="fa-solid fa-chart-pie"></i> <span data-i18n="admin_nav">${currentLang === 'ar' ? 'الإدارة' : 'Admin'}</span>`;
        }
    } else {
        if (badge) {
            badge.className = 'badge-pill role-staff';
            badge.innerHTML = `<i class="fa-solid fa-user-check"></i> <span id="userRoleText">Staff (${escapeHtml(currentUser.name)})</span>`;
        }
        if (adminTabBtn) {
            adminTabBtn.innerHTML = `<i class="fa-solid fa-lock" style="opacity: 0.7;"></i> <span data-i18n="admin_nav">${i18n[currentLang]?.admin_nav || 'لوحة الإدارة'}</span>`;
            adminTabBtn.title = currentLang === 'ar' ? 'لوحة الإدارة (محمية برمز المرور)' : 'Admin Dashboard (PIN Protected)';
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

function openLoginModal(defaultRole = 'staff') {
    selectLoginRole(defaultRole);
    document.getElementById('loginModal')?.classList.add('open');
}

function closeLoginModal() {
    document.getElementById('loginModal')?.classList.remove('open');
}

function submitLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pinInput = document.getElementById('loginPinInput');
    const pin = (pinInput ? pinInput.value : '').trim();

    if (loginRoleSelection === 'admin') {
        if (pin === storeSettings.adminPin) {
            currentUser = { role: 'admin', name: 'Nawaf Saeed (Manager)' };
            persistData();
            updateUserBadge();
            closeLoginModal();
            showToast(currentLang === 'ar' ? "مرحباً بك كمدير للنظام" : "Welcome Admin", "success");
            switchView('admin');
        } else {
            showToast(currentLang === 'ar' ? `رمز المدير غير صحيح! (افتراضي: ${storeSettings.adminPin})` : "Invalid Admin PIN!", "danger");
        }
    } else {
        if (pin === storeSettings.staffPin) {
            currentUser = { role: 'staff', name: 'Cashier 1' };
            persistData();
            updateUserBadge();
            closeLoginModal();
            showToast(currentLang === 'ar' ? "تم تسجيل الدخول ككاشير" : "Logged in as Cashier", "success");
            switchView('pos');
        } else {
            showToast(currentLang === 'ar' ? `رمز الكاشير غير صحيح! (افتراضي: ${storeSettings.staffPin})` : "Invalid Staff PIN!", "danger");
        }
    }
}

/* Language & Localization */
function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    applyLanguage(currentLang);
    persistData();
}

function changeLanguage(lang) {
    currentLang = lang;
    applyLanguage(lang);
    persistData();
    if (typeof showToast === 'function') {
        showToast(lang === 'ar' ? 'تم تحويل الواجهة إلى العربية' : 'Interface switched to English', 'info');
    }
}

function applyLanguage(lang) {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            if (key === 'tax_vat') {
                el.innerText = `${i18n[lang][key]} (${storeSettings.taxRate}%)`;
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
    updatePosOrderBadge();
}

/* Side Drawer Logic */
function toggleSideDrawer() {
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

function toggleDrawerReportsSubmenu() {
    const sub = document.getElementById('drawerReportsSubmenu');
    const arrow = document.getElementById('drawerReportsArrow');
    if (!sub) return;
    const isShown = sub.style.display !== 'none';
    sub.style.display = isShown ? 'none' : 'flex';
    if (arrow) arrow.className = isShown ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
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
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateSoundBtnUI();
    applyLanguage(currentLang);
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
});

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
