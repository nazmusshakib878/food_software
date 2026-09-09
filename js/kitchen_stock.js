/* =========================================================
   KITCHEN STOCK MANAGEMENT (DAILY ITEM LIMITS)
   ========================================================= */

let tempStockData = {};

function openKitchenStockModal() {
    // Clone current stock limits to temporary state for editing
    tempStockData = {};
    items.forEach(item => {
        // If stock is undefined or null, it's unlimited.
        tempStockData[item.id] = (item.stock !== undefined && item.stock !== null) ? item.stock : '';
    });
    
    document.getElementById('kitchenStockModal').classList.add('active');
    renderKitchenStock();
}

function closeKitchenStockModal() {
    document.getElementById('kitchenStockModal').classList.remove('active');
}

function renderKitchenStock() {
    const grid = document.getElementById('kitchenStockGrid');
    if (!grid) return;
    
    let html = '';
    
    // Sort items by category
    const sortedItems = [...items].sort((a, b) => a.category.localeCompare(b.category));
    
    sortedItems.forEach(item => {
        const itemName = currentLang === 'ar' ? (item.nameAr || item.name) : (item.nameEn || item.name);
        let stockVal = tempStockData[item.id];
        
        let displayVal = (stockVal === '') ? '∞' : stockVal;
        
        html += `
            <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <span style="font-weight: 600; font-size: 14px; text-align: center; color: var(--text-dark);">${escapeHtml(itemName)}</span>
                <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-light); border-radius: 20px; padding: 4px;">
                    <button type="button" onclick="adjustTempStock('${item.id}', -1)" style="width: 30px; height: 30px; border-radius: 50%; border: none; background: var(--danger); color: #fff; font-weight: bold; cursor: pointer;">-</button>
                    <span style="font-size: 16px; font-weight: bold; min-width: 30px; text-align: center;">${displayVal}</span>
                    <button type="button" onclick="adjustTempStock('${item.id}', 1)" style="width: 30px; height: 30px; border-radius: 50%; border: none; background: var(--teal); color: #fff; font-weight: bold; cursor: pointer;">+</button>
                </div>
                <button type="button" onclick="setUnlimitedStock('${item.id}')" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--muted); background: transparent; color: var(--text-muted); cursor: pointer;">
                    ${currentLang === 'ar' ? 'غير محدود' : 'Unlimited'}
                </button>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function adjustTempStock(itemId, amount) {
    let current = tempStockData[itemId];
    if (current === '') {
        current = amount > 0 ? amount : 0;
    } else {
        current += amount;
    }
    if (current < 0) current = 0;
    tempStockData[itemId] = current;
    renderKitchenStock();
}

function setUnlimitedStock(itemId) {
    tempStockData[itemId] = '';
    renderKitchenStock();
}

function saveKitchenStock() {
    items.forEach(item => {
        let val = tempStockData[item.id];
        if (val === '') {
            item.stock = null; // Unlimited
        } else {
            item.stock = parseInt(val, 10);
        }
    });
    
    persistData(); // Save to localStorage
    
    if (typeof showToast === 'function') {
        showToast(currentLang === 'ar' ? "تم حفظ المخزون بنجاح" : "Stock saved successfully", "success");
    }
    
    closeKitchenStockModal();
    
    // Refresh UI if necessary
    if (typeof renderProducts === 'function') {
        renderProducts();
    }
    if (typeof renderCart === 'function') {
        renderCart();
    }
}
