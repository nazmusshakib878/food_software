// Secure Server-Side PIN Authentication & Session Service
// Salted PBKDF2 Hash Verifiers, Rate Limiting & Role Authorization
const crypto = require('crypto');

// Provisioned Salted Password Hashes for POS Credentials
// PBKDF2 with SHA-256 (100,000 iterations, 64 bytes)
const CREDENTIAL_REGISTRY = [
    {
        userId: 'usr_cashier',
        salt: '9f6c0d8b5a3241e7a68f0b1c4e2d8a5f',
        hash: 'c5f201b3ea8b03f3d39cfd313e00b8cbcf046686db255cbabf0c813de506b01aa266f91575eb166e5acd047aa52cdd38d915117bf2d62488f7d82802c6b1c263',
        user: {
            id: 'usr_cashier',
            staffId: 'STF-1050',
            name: 'Cashier',
            nameEn: 'Cashier',
            nameAr: 'كاشير',
            role: 'cashier',
            companyId: 'CMP-001',
            branchId: 'BR-001',
            permissions: ['pos_login', 'pos_orders', 'open_sidebar', 'invoice_reports', 'items_report', 'daily_shifts', 'reports', 'shifts'],
            canOpenSidebar: true
        }
    },
    {
        userId: 'usr_staff_1',
        salt: '3d8b1c4e2a5f7e9a0b6c2d4e8f1a3b5c',
        hash: '601ee8fb6cc8a20889f08484ab74da19e4e9a058630745b62157ed095777b47039e183c32cfbbee83a42c74be60b3a82f82070b17f8547e404d4f2c2492d66d9',
        user: {
            id: 'usr_staff_1',
            staffId: 'STF-1051',
            name: 'Staff 1',
            nameEn: 'Staff 1',
            nameAr: 'موظف 1',
            role: 'staff',
            companyId: 'CMP-001',
            branchId: 'BR-001',
            permissions: ['pos_login', 'pos_orders'],
            canOpenSidebar: false
        }
    },
    {
        userId: 'usr_staff_2',
        salt: '7a5b3c1d9e2f4a6b8c0d1e3f5a7b9c2d',
        hash: '98b7f7516860a65aa77a234728400062669e39e7e2d67331beda05dae27bc316828a55628cd876708efbb2b2294ce0ea80ff5577e720d49fc1b4839cde190893',
        user: {
            id: 'usr_staff_2',
            staffId: 'STF-1052',
            name: 'Staff 2',
            nameEn: 'Staff 2',
            nameAr: 'موظف 2',
            role: 'staff',
            companyId: 'CMP-001',
            branchId: 'BR-001',
            permissions: ['pos_login', 'pos_orders'],
            canOpenSidebar: false
        }
    }
];

// In-Memory Rate Limiting & Lockout
const failedAttempts = new Map(); // ip -> { count, firstAttempt, lockedUntil }
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-Memory Session Store
const activeSessions = new Map(); // token -> { token, user, createdAt, expiresAt }
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Security Audit Event Log (No raw PINs recorded)
const securityAuditEvents = [];

function recordSecurityEvent(event, ip, userId = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        event,
        ip: ip || 'unknown',
        userId: userId || 'anonymous'
    };
    securityAuditEvents.push(entry);
    if (securityAuditEvents.length > 500) {
        securityAuditEvents.shift();
    }
}

function checkRateLimit(ip) {
    const now = Date.now();
    const record = failedAttempts.get(ip);
    if (!record) return { allowed: true };

    if (record.lockedUntil && now < record.lockedUntil) {
        const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
        return {
            allowed: false,
            locked: true,
            retryAfter: remainingSec,
            error: `Too many failed login attempts. Locked for ${remainingSec}s.`
        };
    }

    if (record.lockedUntil && now >= record.lockedUntil) {
        // Lockout expired, reset
        failedAttempts.delete(ip);
        return { allowed: true };
    }

    if (now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
        failedAttempts.delete(ip);
        return { allowed: true };
    }

    return { allowed: true };
}

function recordFailedAttempt(ip) {
    const now = Date.now();
    let record = failedAttempts.get(ip);
    if (!record || now - record.firstAttempt > ATTEMPT_WINDOW_MS) {
        record = { count: 1, firstAttempt: now, lockedUntil: 0 };
    } else {
        record.count++;
    }

    if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.lockedUntil = now + LOCKOUT_DURATION_MS;
        recordSecurityEvent('ACCOUNT_LOCKOUT', ip);
    } else {
        recordSecurityEvent('AUTH_FAILURE', ip);
    }

    failedAttempts.set(ip, record);
}

function clearFailedAttempts(ip) {
    failedAttempts.delete(ip);
}

function verifyPinHash(inputPin) {
    if (typeof inputPin !== 'string' || inputPin.length !== 4 || !/^\d{4}$/.test(inputPin)) {
        return null;
    }

    // Explicitly reject legacy demo PINs
    if (inputPin === '0000' || inputPin === '1234') {
        return null;
    }

    for (const cred of CREDENTIAL_REGISTRY) {
        const inputHash = crypto.pbkdf2Sync(inputPin, cred.salt, 100000, 64, 'sha256').toString('hex');
        const inputBuf = Buffer.from(inputHash, 'hex');
        const targetBuf = Buffer.from(cred.hash, 'hex');

        if (inputBuf.length === targetBuf.length && crypto.timingSafeEqual(inputBuf, targetBuf)) {
            // Return cloned user object without hash or salt
            return JSON.parse(JSON.stringify(cred.user));
        }
    }

    return null;
}

function createSession(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const session = {
        token,
        user,
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS
    };
    activeSessions.set(token, session);
    return session;
}

function getSession(token) {
    if (!token) return null;
    const session = activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
        activeSessions.delete(token);
        return null;
    }

    return session;
}

function revokeSession(token) {
    if (!token) return false;
    return activeSessions.delete(token);
}

function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

function authenticate(pin, ip) {
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
        return {
            status: 429,
            body: { success: false, error: rateCheck.error, retryAfter: rateCheck.retryAfter }
        };
    }

    const user = verifyPinHash(pin);
    if (!user) {
        recordFailedAttempt(ip);
        return {
            status: 401,
            body: { success: false, error: 'Invalid PIN. Access denied.' }
        };
    }

    // Success: clear failed attempts and create session
    clearFailedAttempts(ip);
    const session = createSession(user);
    recordSecurityEvent('AUTH_SUCCESS', ip, user.id);

    return {
        status: 200,
        body: {
            success: true,
            session: {
                token: session.token,
                user: session.user
            }
        },
        token: session.token
    };
}

module.exports = {
    CREDENTIAL_REGISTRY,
    authenticate,
    verifyPinHash,
    createSession,
    getSession,
    revokeSession,
    parseCookies,
    checkRateLimit,
    recordSecurityEvent,
    securityAuditEvents,
    clearFailedAttempts
};

