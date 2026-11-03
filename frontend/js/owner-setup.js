const form = document.getElementById('ownerForm');
const statusText = document.getElementById('status');
const message = document.getElementById('message');
let setupAvailable = false;

function setBranches() {
    const company = document.getElementById('companyId');
    const branch = document.getElementById('branchId');
    const selected = company.selectedOptions[0];
    const list = selected ? JSON.parse(selected.dataset.branches || '[]') : [];
    branch.replaceChildren(...list.map(item => {
        const option = document.createElement('option');
        option.value = item.code;
        option.textContent = `${item.name} (${item.code})`;
        return option;
    }));
}

async function loadSetupStatus() {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        statusText.textContent = 'Owner setup requires HTTPS.';
        return;
    }

    try {
        const response = await fetch('/api/setup', {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok || data.available !== true) {
            statusText.textContent = 'First-owner setup is unavailable or has already been completed.';
            return;
        }

        const companySelect = document.getElementById('companyId');
        for (const company of data.companies || []) {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = `${company.name} (${company.id})`;
            option.dataset.branches = JSON.stringify(company.branches || []);
            companySelect.append(option);
        }
        setBranches();
        setupAvailable = true;
        statusText.textContent = 'Create the first owner for the existing company and branch.';
        form.classList.remove('hidden');
    } catch (_) {
        statusText.textContent = 'Cannot reach the setup service. Please try again later.';
    }
}

document.getElementById('companyId').addEventListener('change', setBranches);
form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!setupAvailable || !form.reportValidity()) return;

    const button = document.getElementById('submitButton');
    button.disabled = true;
    message.textContent = '';
    const payload = Object.fromEntries(new FormData(form).entries());
    const token = payload.setupToken;
    delete payload.setupToken;

    try {
        const response = await fetch('/api/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Owner-Setup-Token': token,
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });
        const data = await response.json();
        if (response.ok) {
            setupAvailable = false;
            form.reset();
            form.classList.add('hidden');
            statusText.textContent = 'First-owner setup is complete.';
            message.textContent = 'Owner account created. Return to the POS login and sign in with the PIN you chose.';
        } else {
            message.textContent = data.message || 'Setup could not be completed. Check the details and try again.';
            clearSecrets();
        }
    } catch (_) {
        message.textContent = 'Cannot reach the setup service. No confirmation was received.';
        clearSecrets();
    } finally {
        button.disabled = false;
    }
});

function clearSecrets() {
    document.getElementById('ownerPin').value = '';
    document.getElementById('ownerPinConfirmation').value = '';
    document.getElementById('setupToken').value = '';
}

loadSetupStatus();
