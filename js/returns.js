/* =========================================================
   RETURNS & ORDERS MANAGEMENT UI (js/returns.js)
   ========================================================= */

let currentReturnOrder = null;
let returnItemsState = [];
let activeRetInputId = 'retUserKey'; // default active input for dial pad
let currentReturnTab = 'uncompleted';

// Navigation & Modal Controls
function goReturnsScreen1() {
    closeCancelInvoiceModal();
    renderReturnsOrdersList();
}

function goReturnsScreen2() {
    const modal = document.getElementById('cancelInvoiceModal');
    if (modal) modal.classList.add('open');
    const s2 = document.getElementById('returnsScreen2');
    const s3 = document.getElementById('returnsScreen3');
    if (s2) s2.style.display = 'block';
    if (s3) s3.style.display = 'none';
    renderReturnItemsTable();
}

function goReturnsScreen3() {
    // Validation before moving to screen 3: must have at least one item with valid returnQty > 0
    const validItems = returnItemsState.filter(item => item.returnQty > 0);
    if (validItems.length === 0) {
        showToast(
            currentLang === 'ar' ? "الرجاء تحديد كمية الإرجاع للأصناف المراد إلغاؤها" : "Please specify Return Quantity for items to cancel",
            "warning"
        );
        return;
    }
    
    const s2 = document.getElementById('returnsScreen2');
    const s3 = document.getElementById('returnsScreen3');
    if (s2) s2.style.display = 'none';
    if (s3) s3.style.display = 'block';
    
    // Reset/init inputs for Step 2
    const keyInput = document.getElementById('retUserKey');
    const phoneInput = document.getElementById('retClientPhone');
    if (keyInput) keyInput.value = '';
    if (phoneInput) phoneInput.value = currentReturnOrder?.clientPhone || '';
    activeRetInputId = 'retUserKey';
    updateRetActiveInputStyle();
}

function closeCancelInvoiceModal() {
    const modal = document.getElementById('cancelInvoiceModal');
    if (modal) modal.classList.remove('open');
    const s2 = document.getElementById('returnsScreen2');
    const s3 = document.getElementById('returnsScreen3');
    if (s2) s2.style.display = 'block';
    if (s3) s3.style.display = 'none';
}

// Date / Time Formatting
function formatRetDateOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA'); // e.g. 2026-10-02
}

function formatRetTimeOnly(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// Tabs Handling
function setReturnOrderTab(tabName, el) {
    currentReturnTab = tabName;
    document.querySelectorAll('.orders-top-tabs .order-tab').forEach(b => {
        b.classList.remove('active');
    });
    if (el) el.classList.add('active');
    filterReturnsOrders();
}

function clearReturnsSearch() {
    const input = document.getElementById('returnsSearchInput');
    if (input) input.value = '';
    filterReturnsOrders();
}

function filterReturnsOrders() {
    renderReturnsOrdersList();
}

// Orders Screen (Screen 1): Render Orders
function renderReturnsOrdersList() {
    const grid = document.getElementById('returnsOrdersGrid');
    if (!grid) return;

    if (!orders || orders.length === 0) {
        grid.innerHTML = `<div style="text-align: center; color: var(--muted); grid-column: 1/-1; padding: 40px; font-size: 15px;">No orders found.</div>`;
        return;
    }

    const searchTerm = (document.getElementById('returnsSearchInput')?.value || '').toLowerCase().trim();
    
    const filteredOrders = orders.filter(order => {
        const isDelivered = (order.status === 'served');
        const isCancelled = (order.status === 'cancelled' || order.status === 'returned' || order.isReturned === true);
        
        let matchTab = false;
        if (currentReturnTab === 'uncompleted') {
            matchTab = !isDelivered && !isCancelled;
        } else if (currentReturnTab === 'all') {
            matchTab = true;
        } else if (currentReturnTab === 'offline') {
            matchTab = (order.type === 'offline' || order.isOffline === true);
        } else if (currentReturnTab === 'outgoing') {
            matchTab = (order.type === 'delivery' || order.type === 'takeaway' || order.type === 'receive' || order.type === 'cars' || order.type === 'delivery_d' || order.orderTypeId === 'delivery' || order.orderTypeId === 'receive' || order.orderTypeId === 'cars' || order.orderTypeId === 'delivery_d');
        } else if (currentReturnTab === 'returned') {
            matchTab = isCancelled;
        } else if (currentReturnTab === 'active') {
            matchTab = (!isDelivered && !isCancelled);
        } else if (currentReturnTab === 'done') {
            matchTab = isDelivered && !isCancelled;
        }
        
        if (!matchTab) return false;

        // Search filtering: Order Number, Invoice ID, Customer/User/Cashier name
        if (searchTerm) {
            const invoiceMatch = order.id && order.id.toLowerCase().includes(searchTerm);
            const orderNumMatch = (order.seq && order.seq.toString().toLowerCase().includes(searchTerm)) ||
                                  (order.orderNumber && order.orderNumber.toString().toLowerCase().includes(searchTerm));
            const userMatch = (order.cashierName && order.cashierName.toLowerCase().includes(searchTerm)) ||
                              (order.cashier && order.cashier.toLowerCase().includes(searchTerm)) ||
                              (order.returnedBy && order.returnedBy.toLowerCase().includes(searchTerm));
            const custMatch = (order.customer && order.customer.toLowerCase().includes(searchTerm)) ||
                              (order.customerName && order.customerName.toLowerCase().includes(searchTerm));
            if (!invoiceMatch && !orderNumMatch && !userMatch && !custMatch) return false;
        }
        return true;
    });

    if (filteredOrders.length === 0) {
        grid.innerHTML = `<div style="text-align: center; color: var(--muted); grid-column: 1/-1; padding: 40px; font-size: 15px;">No orders match the filter.</div>`;
        return;
    }

    grid.innerHTML = filteredOrders.map(order => {
        let paymentTypes = order.paymentMethod || order.method || 'Cash';
        if (paymentTypes === 'mixed' && order.splitPayments) {
            paymentTypes = order.splitPayments.map(p => p.method).join(' / ');
        }
        const totalFormatted = Number(order.total || order.grandTotal || 0).toFixed(2);
        const orderNum = order.orderNumber || order.seq || order.id.substring(0, 5);
        const cashierName = order.cashierName || order.cashier || (typeof currentUser !== 'undefined' ? currentUser.name : 'Cashier');
        const invoiceId = order.id;
        const dateStr = formatRetDateOnly(order.date);
        const timeStr = formatRetTimeOnly(order.date);

        return `
            <div class="ret-order-card">
                <div class="ret-order-info-grid">
                    <div class="ret-info-item">
                        <span class="ret-label">Date:</span>
                        <span class="ret-value">${dateStr}</span>
                    </div>
                    <div class="ret-info-item text-right">
                        <span class="ret-label">Order Number:</span>
                        <span class="ret-value">${orderNum}</span>
                    </div>

                    <div class="ret-info-item">
                        <span class="ret-label">Time:</span>
                        <span class="ret-value">(${timeStr})</span>
                    </div>
                    <div class="ret-info-item text-right">
                        <span class="ret-label">Payment Types:</span>
                        <span class="ret-value">${escapeHtml(paymentTypes)} / ${totalFormatted}</span>
                    </div>

                    <div class="ret-info-item">
                        <span class="ret-label">Total:</span>
                        <span class="ret-value font-bold">${totalFormatted}</span>
                    </div>
                    <div class="ret-info-item text-right">
                        <span class="ret-label">Invoice ID:</span>
                        <span class="ret-value">${invoiceId}</span>
                    </div>

                    <div class="ret-info-user">
                        <span class="ret-label">User Name:</span>
                        <span class="ret-value">[${escapeHtml(cashierName)}]</span>
                    </div>
                </div>

                <!-- 4 Action Buttons in EXACT ORDER: Order Delivered | Return | Kitchen Print | Print -->
                <div class="ret-card-actions">
                    <button type="button" class="btn-card-action btn-order-delivered" onclick="markOrderDelivered('${order.id}')">Order Delivered</button>
                    <button type="button" class="btn-card-action btn-order-return" onclick="startReturnProcess('${order.id}')">Return</button>
                    <button type="button" class="btn-card-action btn-order-kitchen" onclick="kitchenPrintOrder('${order.id}')">Kitchen Print</button>
                    <button type="button" class="btn-card-action btn-order-print" onclick="printReceipt('${order.id}')">Print</button>
                </div>
            </div>
        `;
    }).join('');
}

// 1. Order Delivered Action
function markOrderDelivered(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (order.status === 'cancelled' || order.status === 'returned' || order.isReturned === true) {
        showToast(currentLang === 'ar' ? 'لا يمكن توصيل طلب ملغي' : 'Cannot deliver a cancelled order', 'danger');
        return;
    }
    order.status = 'served';
    persistData();
    filterReturnsOrders();
    if (typeof renderKdsScreen === 'function') renderKdsScreen();
    showToast(currentLang === 'ar' ? 'تم تحديث حالة الطلب إلى تم التوصيل' : 'Order marked as Delivered', 'success');
}

// 2. Kitchen Print Action (Prints ONLY KOT)
function kitchenPrintOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (typeof executeKitchenPrint === 'function') {
        executeKitchenPrint(order);
    } else {
        showToast(currentLang === 'ar' ? 'خاصية طباعة المطبخ غير متوفرة' : 'Kitchen Print function not available', 'danger');
    }
}

// 3. Print Action (Customer / Tax Invoice ONLY)
function printReceipt(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (posPreferences && posPreferences.autoPrint) {
        // Direct print to Cashier Printer without confirmation modal
        if (typeof renderReceipt === 'function') renderReceipt(order);
        const thermalNode = document.getElementById('thermalReceiptNode');
        if (thermalNode && typeof routePrintJob === 'function') {
            routePrintJob('cashier', thermalNode.outerHTML, `Order #${order.seq || order.id.substring(0, 5)}`);
        } else if (typeof printReceiptDirect === 'function') {
            printReceiptDirect();
        }
    } else {
        // Manual confirmation modal with Print and OK
        if (typeof previewExistingOrderReceipt === 'function') {
            previewExistingOrderReceipt(orderId);
        } else {
            if (typeof renderReceipt === 'function') renderReceipt(order);
            document.getElementById('receiptModal')?.classList.add('open');
        }
    }
}

// 4. Return Workflow (Cancel Invoice Step 1)
function startReturnProcess(orderId) {
    currentReturnOrder = orders.find(o => o.id === orderId);
    if (!currentReturnOrder) return;

    // Build initial items state: Default Return Quantity is 0 as per Section 12!
    returnItemsState = (currentReturnOrder.items || []).map((item, index) => ({
        index: index,
        lineId: item.lineId || `item_line_${index}`,
        id: item.id || `item_${index}`,
        name: currentLang === 'ar' ? (item.arName || item.name || item.enName) : (item.enName || item.name || item.arName),
        enName: item.enName || item.name || '',
        arName: item.arName || '',
        price: Number(item.price || 0),
        originalQty: Number(item.qty || 1),
        returnQty: 0, // Default 0
        damagedQty: 0,
        selected: false,
        isDamagedChecked: false,
        addons: item.addons || [],
        modifiers: item.modifiers || [],
        note: item.note || ''
    }));

    const masterCb = document.getElementById('retSelectAll');
    if (masterCb) masterCb.checked = false;

    goReturnsScreen2();
    renderReturnItemsTable();
}

function renderReturnItemsTable() {
    const tbody = document.getElementById('returnsItemsTbody');
    if (!tbody) return;

    if (returnItemsState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--muted); padding: 20px;">No items in this invoice.</td></tr>`;
        return;
    }

    tbody.innerHTML = returnItemsState.map((item, i) => {
        const rowClass = item.selected ? 'selected-row' : '';
        const totalDamage = item.damagedQty * item.price;
        return `
            <tr class="${rowClass}">
                <td style="text-align: center;">
                    <input type="checkbox" class="ret-item-checkbox" ${item.selected ? 'checked' : ''} onchange="toggleRetItem(${i}, this.checked)">
                </td>
                <td style="font-weight: 600;">
                    ${escapeHtml(item.name)}
                </td>
                <td style="font-weight: 600; color: #475569;">
                    SAR ${item.price.toFixed(2)}
                </td>
                <!-- Return Quantity Stepper & Input -->
                <td style="text-align: center;">
                    <div class="ret-stepper-wrap">
                        <button type="button" class="ret-stepper-btn" onclick="adjRetQty(${i}, -1)">−</button>
                        <input type="number" class="ret-stepper-input" min="0" max="${item.originalQty}" value="${item.returnQty}" onchange="setRetQtyInput(${i}, this.value)" oninput="setRetQtyInput(${i}, this.value)">
                        <button type="button" class="ret-stepper-btn" onclick="adjRetQty(${i}, 1)">+</button>
                    </div>
                </td>
                <!-- Original Quantity -->
                <td style="text-align: center; font-weight: 700; color: #334155;">
                    ${item.originalQty}
                </td>
                <!-- Damaged Quantity Stepper -->
                <td style="text-align: center;">
                    <div class="ret-stepper-wrap">
                        <button type="button" class="ret-stepper-btn" onclick="adjDamagedQty(${i}, -1)">−</button>
                        <input type="number" class="ret-stepper-input" min="0" max="${item.returnQty}" value="${item.damagedQty}" onchange="setDamagedQtyInput(${i}, this.value)" oninput="setDamagedQtyInput(${i}, this.value)">
                        <button type="button" class="ret-stepper-btn" onclick="adjDamagedQty(${i}, 1)">+</button>
                    </div>
                </td>
                <!-- Total Damage -->
                <td style="font-weight: 700; color: #e11d48;">
                    SAR ${totalDamage.toFixed(2)}
                </td>
                <!-- Damaged Checkbox -->
                <td style="text-align: center;">
                    <input type="checkbox" class="ret-item-checkbox" ${item.isDamagedChecked ? 'checked' : ''} onchange="toggleDamagedStatus(${i}, this.checked)">
                </td>
                <!-- Remove Row from current Return session -->
                <td style="text-align: center;">
                    <button type="button" class="ret-row-xmark" onclick="removeRetItem(${i})" title="Remove item from return session">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Update master checkbox
    const allChecked = returnItemsState.length > 0 && returnItemsState.every(item => item.selected);
    const masterCb = document.getElementById('retSelectAll');
    if (masterCb) masterCb.checked = allChecked;
}

function toggleSelectAllReturns(checked) {
    returnItemsState.forEach(item => {
        item.selected = checked;
        if (checked) {
            if (item.returnQty === 0) item.returnQty = item.originalQty;
        } else {
            item.returnQty = 0;
            item.damagedQty = 0;
            item.isDamagedChecked = false;
        }
    });
    renderReturnItemsTable();
}

function toggleRetItem(index, checked) {
    const item = returnItemsState[index];
    if (!item) return;
    item.selected = checked;
    if (checked && item.returnQty === 0) {
        item.returnQty = item.originalQty;
    } else if (!checked) {
        item.returnQty = 0;
        item.damagedQty = 0;
        item.isDamagedChecked = false;
    }
    renderReturnItemsTable();
}

function adjRetQty(index, delta) {
    const item = returnItemsState[index];
    if (!item) return;
    let newQty = item.returnQty + delta;
    if (newQty < 0) newQty = 0;
    if (newQty > item.originalQty) newQty = item.originalQty;
    item.returnQty = newQty;
    item.selected = (item.returnQty > 0);

    // ensure damaged qty doesn't exceed return qty
    if (item.damagedQty > item.returnQty) {
        item.damagedQty = item.returnQty;
        item.isDamagedChecked = item.damagedQty > 0;
    }
    renderReturnItemsTable();
}

function setRetQtyInput(index, val) {
    const item = returnItemsState[index];
    if (!item) return;
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    if (parsed > item.originalQty) parsed = item.originalQty;
    item.returnQty = parsed;
    item.selected = (item.returnQty > 0);
    if (item.damagedQty > item.returnQty) {
        item.damagedQty = item.returnQty;
        item.isDamagedChecked = item.damagedQty > 0;
    }
    renderReturnItemsTable();
}

function adjDamagedQty(index, delta) {
    const item = returnItemsState[index];
    if (!item) return;
    let newQty = item.damagedQty + delta;
    if (newQty < 0) newQty = 0;
    if (newQty > item.returnQty) newQty = item.returnQty;
    item.damagedQty = newQty;
    item.isDamagedChecked = item.damagedQty > 0;
    renderReturnItemsTable();
}

function setDamagedQtyInput(index, val) {
    const item = returnItemsState[index];
    if (!item) return;
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    if (parsed > item.returnQty) parsed = item.returnQty;
    item.damagedQty = parsed;
    item.isDamagedChecked = item.damagedQty > 0;
    renderReturnItemsTable();
}

function toggleDamagedStatus(index, checked) {
    const item = returnItemsState[index];
    if (!item) return;
    item.isDamagedChecked = checked;
    if (checked && item.damagedQty === 0) {
        item.damagedQty = item.returnQty > 0 ? item.returnQty : 1;
        if (item.returnQty === 0) {
            item.returnQty = item.damagedQty;
            item.selected = true;
        }
    } else if (!checked) {
        item.damagedQty = 0;
    }
    renderReturnItemsTable();
}

function removeRetItem(index) {
    returnItemsState.splice(index, 1);
    returnItemsState.forEach((item, i) => item.index = i);
    renderReturnItemsTable();
}

function promptReturnNotes() {
    const note = prompt(
        currentLang === 'ar' ? "أدخل ملاحظات الإلغاء/الإرجاع:" : "Enter notes for this cancellation/return:",
        currentReturnOrder?.returnNotes || ""
    );
    if (note !== null && currentReturnOrder) {
        currentReturnOrder.returnNotes = note;
    }
}

// Step 1 Top controls: + and − buttons
function incrementReturnItem() {
    const selectedItems = returnItemsState.filter(item => item.selected);
    if (selectedItems.length > 0) {
        selectedItems.forEach(item => {
            if (item.returnQty < item.originalQty) {
                item.returnQty++;
            }
        });
    } else if (returnItemsState.length > 0) {
        if (returnItemsState[0].returnQty < returnItemsState[0].originalQty) {
            returnItemsState[0].returnQty++;
            returnItemsState[0].selected = true;
        }
    }
    renderReturnItemsTable();
}

function decrementReturnItem() {
    const selectedItems = returnItemsState.filter(item => item.selected);
    if (selectedItems.length > 0) {
        selectedItems.forEach(item => {
            if (item.returnQty > 0) {
                item.returnQty--;
                if (item.damagedQty > item.returnQty) {
                    item.damagedQty = item.returnQty;
                    item.isDamagedChecked = item.damagedQty > 0;
                }
            }
        });
    } else if (returnItemsState.length > 0) {
        if (returnItemsState[0].returnQty > 0) {
            returnItemsState[0].returnQty--;
            if (returnItemsState[0].damagedQty > returnItemsState[0].returnQty) {
                returnItemsState[0].damagedQty = returnItemsState[0].returnQty;
                returnItemsState[0].isDamagedChecked = returnItemsState[0].damagedQty > 0;
            }
        }
    }
    renderReturnItemsTable();
}

// Step 2: Keypad Logic
function setActiveRetInput(id) {
    activeRetInputId = id;
    updateRetActiveInputStyle();
}

function updateRetActiveInputStyle() {
    const inputs = ['retUserKey', 'retClientPhone'];
    inputs.forEach(inId => {
        const el = document.getElementById(inId);
        if (el) {
            if (inId === activeRetInputId) {
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
        if (activeRetInputId === 'retUserKey' && inputEl.value.length >= 12) return;
        inputEl.value += val;
    }
}

// Step 2: Confirm Cancellation
function confirmCancellation() {
    // 1. Validate Reason Selected (Required)
    const reasonElement = document.querySelector('input[name="cancelReason"]:checked');
    if (!reasonElement) {
        showToast(currentLang === 'ar' ? "الرجاء اختيار سبب الإلغاء" : "Please select a cancellation reason", "danger");
        return;
    }
    const reason = reasonElement.value;

    // 2. Validate Items to Cancel
    const validItems = returnItemsState.filter(item => item.returnQty > 0);
    if (validItems.length === 0) {
        showToast(currentLang === 'ar' ? "الرجاء تحديد كمية الإرجاع للأصناف" : "Please specify Return Quantity for at least one item", "danger");
        goReturnsScreen2();
        return;
    }

    // 3. Validate User Key (PIN 11223344 is REQUIRED)
    const pin = (document.getElementById('retUserKey')?.value || '').trim();
    if (pin !== '11223344') {
        // Must show "Wrong User Key", block cancellation, keep modal open, preserve state, no print!
        showToast(currentLang === 'ar' ? "رمز الدخول غير صحيح (Wrong User Key)" : "Wrong User Key", "danger");
        return;
    }

    // 4. Client Phone Number (Optional)
    const phone = (document.getElementById('retClientPhone')?.value || '').trim();

    // 5. Complete Cancellation
    if (currentReturnOrder) {
        currentReturnOrder.status = 'cancelled';
        currentReturnOrder.isReturned = true;
        currentReturnOrder.cancelledAt = new Date().toISOString();
        currentReturnOrder.cancelReason = reason;
        currentReturnOrder.clientPhone = phone;
        currentReturnOrder.returnedBy = (typeof currentUser !== 'undefined' && currentUser && currentUser.name)
            ? currentUser.name
            : 'Authorized Manager';

        currentReturnOrder.cancelledItems = validItems.map(item => ({
            lineId: item.lineId,
            id: item.id,
            name: item.name,
            enName: item.enName,
            arName: item.arName,
            unitPrice: item.price,
            cancelledQty: item.returnQty,
            originalQty: item.originalQty,
            damagedQty: item.damagedQty,
            totalDamage: item.damagedQty * item.price,
            lineTotal: item.returnQty * item.price,
            addons: item.addons,
            modifiers: item.modifiers,
            note: item.note
        }));

        // Remove literal secret PIN from records
        delete currentReturnOrder.cancelPin;

        persistData();

        // Print Cancel Invoice Receipt
        printCancelInvoiceReceipt(currentReturnOrder);
    }

    showToast(currentLang === 'ar' ? "تم تأكيد إلغاء الفاتورة وطباعة الإشعار بنجاح!" : "Invoice Cancelled & Receipt Printed!", "success");
    closeCancelInvoiceModal();
    filterReturnsOrders();
}

// Cancel Invoice Receipt Printing
function getCancelInvoiceReceiptHtml(order) {
    if (!order) return '';

    const cancelDate = order.cancelledAt ? new Date(order.cancelledAt).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA');
    const cancelTime = order.cancelledAt ? new Date(order.cancelledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : new Date().toLocaleTimeString();
    const reason = order.cancelReason || 'Client Cancellation';
    const cashierName = order.cashierName || order.cashier || 'Cashier';
    const authUser = order.returnedBy || 'Authorized Manager';
    const storeName = (typeof storeSettings !== 'undefined' && storeSettings.nameEn) ? storeSettings.nameEn.toUpperCase() : 'NUR FOODES';
    const companyAr = (typeof storeSettings !== 'undefined' && (storeSettings.companyNameAr || storeSettings.companyName)) ? (storeSettings.companyNameAr || storeSettings.companyName) : 'شركة صح للتجارة';
    const vatNo = (typeof storeSettings !== 'undefined' && storeSettings.vatNumber) ? storeSettings.vatNumber : '300987654300003';

    const items = order.cancelledItems || [];
    let totalRefund = 0;
    let totalDamage = 0;

    const itemsRowsHtml = items.map(item => {
        const lineTotal = item.lineTotal || (item.cancelledQty * item.unitPrice);
        totalRefund += lineTotal;
        totalDamage += (item.totalDamage || 0);

        return `
            <tr>
                <td style="padding: 4px 0; border-bottom: 1px dotted #ccc;">
                    <div style="font-weight: 700;">${escapeHtml(item.name || item.enName || '')}</div>
                    <div style="font-size: 11px; color: #555;">
                        ${item.cancelledQty} x SAR ${Number(item.unitPrice).toFixed(2)}
                        ${item.damagedQty > 0 ? ` (Damaged: ${item.damagedQty})` : ''}
                    </div>
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 0; border-bottom: 1px dotted #ccc; font-weight: 700;">
                    SAR ${lineTotal.toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="thermal-paper cancel-invoice-paper" style="width: 80mm; max-width: 80mm; margin: 0 auto; padding: 8px; font-family: 'Courier New', monospace; font-size: 12px; color: #000; background: #fff; line-height: 1.35;">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
                <h2 style="margin: 0; font-size: 17px; font-weight: 900; letter-spacing: 0.5px;">CANCEL INVOICE</h2>
                <div style="font-size: 13px; font-weight: 700;">إشعار إلغاء فاتورة / إرجاع</div>
                <div style="margin-top: 4px; font-size: 12px; font-weight: bold;">${storeName}</div>
                <div style="font-size: 11px;">${companyAr}</div>
                <div style="font-size: 11px;">VAT: ${vatNo}</div>
            </div>

            <div style="border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px; font-size: 11.5px;">
                <div><strong>Original Invoice ID:</strong> ${order.id}</div>
                <div><strong>Original Order Number:</strong> #${order.orderNumber || order.seq || order.id.substring(0, 5)}</div>
                <div><strong>Cancellation Date:</strong> ${cancelDate}</div>
                <div><strong>Cancellation Time:</strong> ${cancelTime}</div>
                <div><strong>Cancellation Reason:</strong> ${escapeHtml(reason)}</div>
                ${order.clientPhone ? `<div><strong>Client Phone:</strong> ${escapeHtml(order.clientPhone)}</div>` : ''}
                ${order.returnNotes ? `<div><strong>Notes:</strong> ${escapeHtml(order.returnNotes)}</div>` : ''}
                <div><strong>Cashier:</strong> ${escapeHtml(cashierName)}</div>
                <div><strong>Authorized By:</strong> ${escapeHtml(authUser)}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px;">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding-bottom: 4px;">Item / Details</th>
                        <th style="text-align: right; padding-bottom: 4px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRowsHtml}
                </tbody>
            </table>

            <div style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-size: 13px; font-weight: 900; display: flex; justify-content: space-between;">
                <span>TOTAL REFUND:</span>
                <span>SAR ${totalRefund.toFixed(2)}</span>
            </div>

            ${totalDamage > 0 ? `
            <div style="font-size: 11.5px; color: #444; margin-top: 4px; display: flex; justify-content: space-between;">
                <span>Total Damage Value:</span>
                <span>SAR ${totalDamage.toFixed(2)}</span>
            </div>` : ''}

            <div style="text-align: center; border-top: 1px dashed #000; margin-top: 10px; padding-top: 8px; font-size: 11px;">
                *** TRANSACTION CANCELLED / RETURNED ***
                <br>[ تم إلغاء العملية واسترجاع المبلغ ]
            </div>
        </div>
    `;
}

function printCancelInvoiceReceipt(order) {
    if (!order) return;
    const cancelHtml = getCancelInvoiceReceiptHtml(order);

    if (typeof routePrintJob === 'function') {
        routePrintJob('cashier', cancelHtml, 'Cancel Invoice');
    } else {
        const printFrame = document.getElementById('posSilentPrintFrame');
        if (printFrame && printFrame.contentWindow) {
            printFrame.contentDocument.body.innerHTML = cancelHtml;
            setTimeout(() => printFrame.contentWindow.print(), 250);
        }
    }
}
