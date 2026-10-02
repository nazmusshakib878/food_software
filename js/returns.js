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
function formatRetDateOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA'); // e.g. 2026-10-02
}
function formatRetTimeOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return '(' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ')';
}

let currentReturnTab = 'uncompleted';

function setReturnOrderTab(tabName, el) {
    currentReturnTab = tabName;
    document.querySelectorAll('.orders-top-tabs .order-tab').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'transparent';
        b.style.color = '#64748b';
    });
    el.classList.add('active');
    el.style.background = 'var(--teal)';
    el.style.color = 'white';
    filterReturnsOrders();
}

function filterReturnsOrders() {
    renderReturnsOrdersList();
}

// Screen 1: Render Orders
function renderReturnsOrdersList() {
    const grid = document.getElementById('returnsOrdersGrid');
    if (!grid) return;

    if (!orders || orders.length === 0) {
        grid.innerHTML = `<p style="text-align: center; color: var(--muted); grid-column: 1/-1;">No orders found.</p>`;
        return;
    }

    const searchTerm = (document.getElementById('returnsSearchInput')?.value || '').toLowerCase().trim();
    
    const filteredOrders = orders.filter(order => {
        // Tab filtering
        let matchTab = false;
        const isCompleted = order.status === 'served';
        const isCancelled = order.status === 'cancelled';
        if (currentReturnTab === 'uncompleted') {
            matchTab = !isCompleted && !isCancelled;
        } else if (currentReturnTab === 'all') {
            matchTab = true;
        } else if (currentReturnTab === 'offline') {
            matchTab = (order.type === 'offline'); // hypothetical
        } else if (currentReturnTab === 'outgoing') {
            matchTab = (order.type === 'delivery' || order.type === 'takeaway');
        } else if (currentReturnTab === 'returned') {
            matchTab = isCancelled;
        } else if (currentReturnTab === 'active') {
            matchTab = (!isCompleted && !isCancelled);
        } else if (currentReturnTab === 'done') {
            matchTab = isCompleted;
        }
        
        if (!matchTab) return false;

        // Search filtering
        if (searchTerm) {
            const invoiceMatch = order.id && order.id.toLowerCase().includes(searchTerm);
            const orderNumMatch = order.seq && order.seq.toString().includes(searchTerm);
            const userMatch = order.cashierName && order.cashierName.toLowerCase().includes(searchTerm);
            if (!invoiceMatch && !orderNumMatch && !userMatch) return false;
        }
        return true;
    });

    if (filteredOrders.length === 0) {
        grid.innerHTML = `<p style="text-align: center; color: var(--muted); grid-column: 1/-1;">No orders match the filter.</p>`;
        return;
    }

    grid.innerHTML = filteredOrders.map(order => {
        const isDelivered = order.status === 'served';
        const isCancelled = order.status === 'cancelled';
        
        let paymentTypes = order.paymentMethod || 'Unknown';
        if (paymentTypes === 'mixed' && order.splitPayments) {
            paymentTypes = order.splitPayments.map(p => p.method).join(' / ');
        }
        
        return `
            <div class="ret-order-card" style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; font-weight: 600; color: #334155;">
                    <div>${formatRetDateOnly(order.date)} :Date</div>
                    <div style="text-align: right;">${order.seq || order.id.substring(0, 5)} :Order Number</div>
                    <div>${formatRetTimeOnly(order.date)}</div>
                    <div style="text-align: right;">${paymentTypes}/${Number(order.total || 0).toFixed(2)} :Payment Types</div>
                    <div>${Number(order.total || 0).toFixed(2)} :Total</div>
                    <div style="text-align: right;">${order.id} :Invoice Id</div>
                    <div style="grid-column: 1/-1;">User Name : [${escapeHtml(order.cashierName || 'Cashier')}]</div>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                    <button class="ret-btn-small" onclick="markOrderDelivered('${order.id}')" style="flex: 1; padding: 10px; background: #800020; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Order Delivered</button>
                    <button class="ret-btn-small" onclick="startReturnProcess('${order.id}')" style="flex: 1; padding: 10px; background: var(--teal); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Return</button>
                    <button class="ret-btn-small" onclick="kitchenPrintOrder('${order.id}')" style="flex: 1; padding: 10px; background: var(--teal); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kitchen Print</button>
                    <button class="ret-btn-small" onclick="printReceipt('${order.id}')" style="flex: 1; padding: 10px; background: var(--teal); color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Print</button>
                </div>
            </div>
        `;
    }).join('');
}

function markOrderDelivered(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'cancelled') {
        showToast(currentLang === 'ar' ? 'لا يمكن توصيل طلب ملغي' : 'Cannot deliver a cancelled order', 'danger');
        return;
    }
    order.status = 'served';
    persistData();
    filterReturnsOrders();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    showToast(currentLang === 'ar' ? 'تم تحديث حالة الطلب إلى مكتمل' : 'Order marked as Delivered', 'success');
}

function kitchenPrintOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (typeof executeKitchenPrint === 'function') {
        executeKitchenPrint(order);
    } else {
        showToast('Kitchen Print function not available', 'danger');
    }
}

function printReceipt(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (posPreferences && posPreferences.autoPrint) {
        if (typeof renderReceipt === 'function') renderReceipt(order);
        const thermalNode = document.getElementById('thermalReceiptNode');
        if (thermalNode && typeof routePrintJob === 'function') {
            routePrintJob('cashier', thermalNode.outerHTML, `Order #${order.seq || order.id.substring(0, 5)}`);
        } else if (typeof previewExistingOrderReceipt === 'function') {
            previewExistingOrderReceipt(orderId);
        }
    } else {
        if (typeof previewExistingOrderReceipt === 'function') {
            previewExistingOrderReceipt(orderId);
        } else {
            showToast('Preview function not available', 'danger');
        }
    }
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
                <td><input type="checkbox" style="width: 20px; height: 20px;" ${item.selected ? 'checked' : ''} onchange="toggleRetItem(${i}, this.checked)"></td>
                <td>${escapeHtml(item.name)}</td>
                <td>${Number(item.price).toFixed(2)}</td>
                <td>
                    <div class="qty-control" style="display: flex; gap: 5px; align-items: center; justify-content: center;">
                        <button class="qty-btn" style="background: var(--purple, #6f42c1); color: white; border: none; border-radius: 4px; padding: 4px 10px;" onclick="adjRetQty(${i}, -1)">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.returnQty}</span>
                        <button class="qty-btn" style="background: var(--purple, #6f42c1); color: white; border: none; border-radius: 4px; padding: 4px 10px;" onclick="adjRetQty(${i}, 1)">+</button>
                        <span style="color: var(--muted); font-size: 12px;">/ ${item.originalQty}</span>
                    </div>
                </td>
                <td>
                    <div class="qty-control" style="display: flex; gap: 5px; align-items: center; justify-content: center;">
                        <button class="qty-btn" style="background: var(--purple, #6f42c1); color: white; border: none; border-radius: 4px; padding: 4px 10px;" onclick="adjDamagedQty(${i}, -1)">-</button>
                        <span style="min-width: 20px; text-align: center;">${item.damagedQty}</span>
                        <button class="qty-btn" style="background: var(--purple, #6f42c1); color: white; border: none; border-radius: 4px; padding: 4px 10px;" onclick="adjDamagedQty(${i}, 1)">+</button>
                    </div>
                </td>
                <td>SAR ${totalDamage.toFixed(2)}</td>
                <td><input type="checkbox" style="width: 20px; height: 20px;" ${item.isDamagedChecked ? 'checked' : ''} onchange="toggleDamagedStatus(${i}, this.checked)"></td>
                <td><button type="button" style="background: var(--danger); color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer;" onclick="removeRetItem(${i})"><i class="fa-solid fa-xmark"></i></button></td>
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

function removeRetItem(index) {
    returnItemsState.splice(index, 1);
    // update indices
    returnItemsState.forEach((item, i) => item.index = i);
    renderReturnItemsTable();
}

function promptReturnNotes() {
    const note = prompt("Enter notes for this return:", currentReturnOrder?.returnNotes || "");
    if (note !== null && currentReturnOrder) {
        currentReturnOrder.returnNotes = note;
    }
}

// Screen 2 Bottom actions
function incrementReturnItem() {
    const selected = returnItemsState.findIndex(item => item.selected);
    if(selected >= 0) adjRetQty(selected, 1);
}
function decrementReturnItem() {
    const selected = returnItemsState.findIndex(item => item.selected);
    if(selected >= 0) adjRetQty(selected, -1);
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
        if (activeRetInputId === 'retUserKey' && inputEl.value.length >= 8) return;
        inputEl.value += val;
    }
}

function confirmCancellation() {
    const pin = document.getElementById('retUserKey').value;
    // Security Requirement: Cancellation authorization must use PIN 11223344.
    if (pin !== '11223344') {
        showToast(currentLang === 'ar' ? "رمز الدخول غير صحيح" : "Invalid User Key PIN", "danger");
        return;
    }

    const phone = document.getElementById('retClientPhone').value;
    const reasonElement = document.querySelector('input[name="cancelReason"]:checked');
    const reason = reasonElement ? reasonElement.value : 'Unknown';

    if (currentReturnOrder) {
        currentReturnOrder.status = 'cancelled';
        currentReturnOrder.cancelReason = reason;
        currentReturnOrder.clientPhone = phone;
        currentReturnOrder.returnedBy = 'Admin';
        
        // Remove PIN from any stored logs
        delete currentReturnOrder.cancelPin;
        
        persistData(); // save changes

        // Auto-print CANCEL INVOICE without exposing PIN
        if (typeof renderReceipt === 'function') {
            renderReceipt(currentReturnOrder);
            const receiptTitle = document.querySelector('#thermalReceiptNode .invoice-badge-title');
            if (receiptTitle) {
                receiptTitle.innerHTML = 'CANCEL INVOICE';
            }
            const thermalNode = document.getElementById('thermalReceiptNode');
            if (thermalNode && typeof routePrintJob === 'function') {
                routePrintJob('cashier', thermalNode.outerHTML, 'Cancel Invoice');
            }
        }
    }

    showToast(currentLang === 'ar' ? "تم تأكيد الإلغاء/الإرجاع بنجاح!" : "Cancellation Confirmed Successfully!", "success");
    goReturnsScreen1();
}


