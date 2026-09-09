/* =========================================================
   RETURNS & CANCELLATIONS UI (js/returns.js)
   ========================================================= */

let currentReturnOrder = null;
let returnItemsState = [];
let activeRetInputId = 'retUserKey'; // default active input for dial pad

// Navigation
function goReturnsScreen1() {
    document.getElementById('returnsScreen1').classList.add('active');
    document.getElementById('returnsScreen2').classList.remove('active');
    document.getElementById('returnsScreen3').classList.remove('active');
    renderReturnsOrdersList();
}

function goReturnsScreen2() {
    document.getElementById('returnsScreen1').classList.remove('active');
    document.getElementById('returnsScreen2').classList.add('active');
    document.getElementById('returnsScreen3').classList.remove('active');
}

function goReturnsScreen3() {
    // Validation before moving to screen 3
    const selected = returnItemsState.filter(item => item.selected);
    if (selected.length === 0) {
        showToast(currentLang === 'ar' ? "الرجاء تحديد عناصر للإرجاع" : "Please select items to return", "danger");
        return;
    }
    
    document.getElementById('returnsScreen1').classList.remove('active');
    document.getElementById('returnsScreen2').classList.remove('active');
    document.getElementById('returnsScreen3').classList.add('active');
    
    // reset inputs
    document.getElementById('retUserKey').value = '';
    document.getElementById('retClientPhone').value = '';
    activeRetInputId = 'retUserKey';
    updateRetActiveInputStyle();
}

// Format Date
function formatRetDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Screen 1: Render Orders
function renderReturnsOrdersList() {
    const grid = document.getElementById('returnsOrdersGrid');
    if (!grid) return;

    if (!orders || orders.length === 0) {
        grid.innerHTML = `<p style="text-align: center; color: var(--muted); grid-column: 1/-1;">No orders found.</p>`;
        return;
    }

    grid.innerHTML = orders.map(order => {
        const isDelivered = order.status === 'served';
        const isCancelled = order.status === 'cancelled';
        
        let statusHtml = '';
        if (isCancelled) {
            statusHtml = `<span class="ret-status-badge ret-status-cancelled">Cancelled</span>`;
        } else if (isDelivered) {
            statusHtml = `<span class="ret-status-badge ret-status-delivered">Delivered</span>`;
        } else {
            statusHtml = `<span class="ret-status-badge" style="background: var(--muted); color: #fff;">${order.status || 'New'}</span>`;
        }

        return `
            <div class="ret-order-card">
                <div class="ret-order-card-header">
                    <div>
                        <h3>Order #${order.seq || order.id.substring(0, 5)}</h3>
                        <div class="ret-time">${formatRetDate(order.date)}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; text-align: right; color: var(--muted);">Inv: ${order.id.substring(0, 8)}</div>
                    </div>
                </div>
                <div class="ret-order-card-body">
                    <div>User: ${escapeHtml(order.cashierName || 'Cashier')}</div>
                    <div class="ret-total">SAR ${Number(order.total || 0).toFixed(2)}</div>
                </div>
                <div class="ret-order-card-actions">
                    ${statusHtml}
                    <div class="ret-btn-group">
                        <button class="ret-btn-small" onclick="printReceipt('${order.id}')" title="Print"><i class="fa-solid fa-print"></i></button>
                        <button class="ret-btn-small" title="Kitchen Print"><i class="fa-solid fa-fire"></i></button>
                        <button class="ret-btn-small ret-btn-return" onclick="startReturnProcess('${order.id}')">Return</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Screen 2: Init
function startReturnProcess(orderId) {
    currentReturnOrder = orders.find(o => o.id === orderId);
    if (!currentReturnOrder) return;

    // Build state
    returnItemsState = (currentReturnOrder.items || []).map((item, index) => ({
        index: index,
        name: currentLang === 'ar' ? item.arName : item.enName,
        price: item.price,
        originalQty: item.qty,
        returnQty: item.qty, // default to returning all
        damagedQty: 0,
        selected: false,
        isDamagedChecked: false
    }));

    // Update Sidebar Meta
    const metaHtml = `
        <div class="sidebar-meta-row"><span>Order No:</span> <strong>#${currentReturnOrder.seq || currentReturnOrder.id.substring(0, 5)}</strong></div>
        <div class="sidebar-meta-row"><span>Date:</span> <strong>${formatRetDate(currentReturnOrder.date)}</strong></div>
        <div class="sidebar-meta-row"><span>Cashier:</span> <strong>${escapeHtml(currentReturnOrder.cashierName || 'Cashier')}</strong></div>
        <div class="sidebar-meta-row"><span>Total Bill:</span> <strong>SAR ${Number(currentReturnOrder.total || 0).toFixed(2)}</strong></div>
    `;
    document.getElementById('retSidebarMeta').innerHTML = metaHtml;
    document.getElementById('retSidebarMeta3').innerHTML = metaHtml;

    document.getElementById('retSelectAll').checked = false;
    
    renderReturnItemsTable();
    goReturnsScreen2();
}

function renderReturnItemsTable() {
    const tbody = document.getElementById('returnsItemsTbody');
    if (!tbody) return;

    tbody.innerHTML = returnItemsState.map((item, i) => {
        const rowClass = item.selected ? 'selected' : '';
        const totalDamage = item.damagedQty * item.price;
        return `
            <tr class="${rowClass}">
                <td><input type="checkbox" ${item.selected ? 'checked' : ''} onchange="toggleRetItem(${i}, this.checked)"></td>
                <td>${escapeHtml(item.name)}</td>
                <td>${Number(item.price).toFixed(2)}</td>
                <td>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="adjRetQty(${i}, -1)">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.returnQty}</span>
                        <button class="qty-btn" onclick="adjRetQty(${i}, 1)">+</button>
                        <span style="color: var(--muted); font-size: 12px;">/ ${item.originalQty}</span>
                    </div>
                </td>
                <td>
                    <div class="qty-control">
                        <button class="qty-btn" onclick="adjDamagedQty(${i}, -1)">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.damagedQty}</span>
                        <button class="qty-btn" onclick="adjDamagedQty(${i}, 1)">+</button>
                    </div>
                </td>
                <td>SAR ${totalDamage.toFixed(2)}</td>
                <td><input type="checkbox" ${item.isDamagedChecked ? 'checked' : ''} onchange="toggleDamagedStatus(${i}, this.checked)"></td>
            </tr>
        `;
    }).join('');
}

function toggleSelectAllReturns(checked) {
    returnItemsState.forEach(item => item.selected = checked);
    renderReturnItemsTable();
}

function toggleRetItem(index, checked) {
    returnItemsState[index].selected = checked;
    
    // Check if all selected to update master checkbox
    const allChecked = returnItemsState.every(item => item.selected);
    const masterCb = document.getElementById('retSelectAll');
    if(masterCb) masterCb.checked = allChecked;
    
    renderReturnItemsTable();
}

function adjRetQty(index, delta) {
    const item = returnItemsState[index];
    let newQty = item.returnQty + delta;
    if (newQty < 1) newQty = 1;
    if (newQty > item.originalQty) newQty = item.originalQty;
    item.returnQty = newQty;
    
    // ensure damaged qty doesn't exceed return qty
    if (item.damagedQty > item.returnQty) {
        item.damagedQty = item.returnQty;
    }
    renderReturnItemsTable();
}

function adjDamagedQty(index, delta) {
    const item = returnItemsState[index];
    let newQty = item.damagedQty + delta;
    if (newQty < 0) newQty = 0;
    if (newQty > item.returnQty) newQty = item.returnQty;
    item.damagedQty = newQty;
    
    // Auto check/uncheck damaged status
    item.isDamagedChecked = item.damagedQty > 0;
    renderReturnItemsTable();
}

function toggleDamagedStatus(index, checked) {
    const item = returnItemsState[index];
    item.isDamagedChecked = checked;
    if (checked && item.damagedQty === 0) {
        item.damagedQty = 1;
    } else if (!checked) {
        item.damagedQty = 0;
    }
    renderReturnItemsTable();
}

// Screen 2 Bottom actions (dummy functionality as per UI design requirements)
function incrementReturnItem() {
    showToast(currentLang === 'ar' ? 'قم بتحديد صنف أو اضغط (+) للزيادة' : 'Use + to increase quantity', 'info');
}
function decrementReturnItem() {
    showToast(currentLang === 'ar' ? 'قم بتحديد صنف أو اضغط (-) للنقصان' : 'Use - to decrease quantity', 'info');
}


// Screen 3: Dial Pad Logic
function setActiveRetInput(id) {
    activeRetInputId = id;
    updateRetActiveInputStyle();
}

function updateRetActiveInputStyle() {
    const inputs = ['retUserKey', 'retClientPhone'];
    inputs.forEach(inId => {
        const el = document.getElementById(inId);
        if(el) {
            if(inId === activeRetInputId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });
}

function retPadPress(val) {
    const inputEl = document.getElementById(activeRetInputId);
    if (!inputEl) return;

    if (val === 'C') {
        inputEl.value = '';
    } else if (val === 'BACK') {
        inputEl.value = inputEl.value.slice(0, -1);
    } else {
        if (activeRetInputId === 'retClientPhone' && inputEl.value.length >= 15) return;
        if (activeRetInputId === 'retUserKey' && inputEl.value.length >= 6) return;
        inputEl.value += val;
    }
}

function confirmCancellation() {
    const pin = document.getElementById('retUserKey').value;
    // Basic validation
    if (pin !== storeSettings.adminPin && pin !== storeSettings.staffPin) {
        showToast(currentLang === 'ar' ? "رمز الدخول غير صحيح" : "Invalid User Key PIN", "danger");
        return;
    }

    const phone = document.getElementById('retClientPhone').value;
    const reasonElement = document.querySelector('input[name="cancelReason"]:checked');
    const reason = reasonElement ? reasonElement.value : 'Unknown';

    // Apply the return to the actual order
    // In a real system, we'd adjust item quantities, recalculate totals, update inventory, etc.
    // For this prototype, we'll mark the order as cancelled/returned
    if (currentReturnOrder) {
        currentReturnOrder.status = 'cancelled';
        currentReturnOrder.cancelReason = reason;
        currentReturnOrder.clientPhone = phone;
        currentReturnOrder.returnedBy = pin === storeSettings.adminPin ? 'Admin' : 'Staff';
        persistData(); // save changes
    }

    showToast(currentLang === 'ar' ? "تم تأكيد الإلغاء/الإرجاع بنجاح!" : "Cancellation Confirmed Successfully!", "success");
    goReturnsScreen1();
}

// Listen for view changes to auto-initialize Returns screen
const originalSwitchView = switchView;
window.switchView = function(viewName) {
    originalSwitchView(viewName);
    if (viewName === 'returns') {
        document.getElementById('returnsView')?.classList.add('active');
        document.getElementById('tabReturnsBtn')?.classList.add('active');
        document.getElementById('mobileNavReturns')?.classList.add('active');
        goReturnsScreen1();
    } else {
        document.getElementById('returnsView')?.classList.remove('active');
    }
};
