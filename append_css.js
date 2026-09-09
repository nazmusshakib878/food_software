const fs = require('fs');
const css = `
/* --- Kiosk Login UI --- */
.kiosk-login-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: #78C2C4;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    flex-direction: column;
}

.kiosk-logo-container {
    text-align: center;
    margin-bottom: 2rem;
    position: relative;
}

.kiosk-logo-nur {
    font-family: 'Pacifico', cursive;
    font-size: 5rem;
    color: #1e3a8a;
    margin: 0;
    transform: rotate(-6deg);
    display: inline-block;
    line-height: 1;
}

.kiosk-logo-foodes {
    font-family: 'Inter', sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    color: #ffffff;
    margin-top: -10px;
    letter-spacing: 2px;
}

.kiosk-logo-icon {
    position: absolute;
    top: -10px;
    right: -30px;
    font-size: 2rem;
    color: #facc15;
}

.kiosk-login-card {
    background: rgba(255, 255, 255, 0.95);
    padding: 2.5rem;
    border-radius: 24px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 420px;
    text-align: center;
}

.kiosk-login-title {
    font-size: 1.5rem;
    color: #334155;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.kiosk-login-subtitle {
    color: #64748b;
    margin-bottom: 2rem;
    font-size: 0.95rem;
}

.kiosk-pin-container {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 2.5rem;
    direction: ltr;
}

.kiosk-pin-box {
    width: 45px;
    height: 55px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #0f172a;
    font-weight: 600;
    background: #f8fafc;
    transition: all 0.2s ease;
}

.kiosk-pin-box.filled {
    border-color: #78C2C4;
    background: #e0f2f1;
}

.kiosk-pin-box.error {
    border-color: #ef4444;
    animation: shake 0.4s ease-in-out;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
}

.kiosk-numpad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 2rem;
    direction: ltr;
}

.kiosk-numpad-btn {
    background: #f1f5f9;
    border: none;
    border-radius: 16px;
    height: 65px;
    font-size: 1.5rem;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: center;
    align-items: center;
}

.kiosk-numpad-btn:hover, .kiosk-numpad-btn:active {
    background: #e2e8f0;
    transform: scale(0.98);
}

.kiosk-numpad-btn.clear-btn {
    background: #fee2e2;
    color: #ef4444;
}

.kiosk-numpad-btn.clear-btn:hover {
    background: #fecaca;
}

.kiosk-login-btn {
    background: #78C2C4;
    color: white;
    border: none;
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(120, 194, 196, 0.3);
}

.kiosk-login-btn:hover {
    background: #5CA3A5;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(120, 194, 196, 0.4);
}

.kiosk-hidden {
    display: none !important;
}

/* RTL Support */
[dir="rtl"] .kiosk-login-card {
    direction: rtl;
}
[dir="rtl"] .kiosk-pin-container, 
[dir="rtl"] .kiosk-numpad {
    direction: ltr;
}

@media (max-width: 600px) {
    .kiosk-logo-nur { font-size: 4rem; }
    .kiosk-logo-foodes { font-size: 2rem; }
    .kiosk-login-card {
        padding: 1.5rem;
        border-radius: 20px;
        max-width: 90%;
    }
    .kiosk-pin-box { width: 40px; height: 50px; }
    .kiosk-numpad-btn { height: 55px; }
}
`;
fs.appendFileSync('css/style.css', '\n' + css);
