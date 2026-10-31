// POST /api/auth/login
const authService = require('../_auth_service');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            return res.status(400).json({ success: false, error: 'Malformed JSON payload' });
        }
    }

    const pin = body?.pin;
    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ success: false, error: 'A valid four-digit numeric PIN is required' });
    }

    const result = authService.authenticate(pin, ip);

    if (result.status === 200) {
        // Set secure HttpOnly session cookie
        const isProd = process.env.NODE_ENV === 'production';
        const cookieFlags = [
            `nurpos_session=${result.token}`,
            'Path=/',
            'HttpOnly',
            'SameSite=Lax',
            'Max-Age=28800',
            isProd ? 'Secure' : ''
        ].filter(Boolean).join('; ');

        res.setHeader('Set-Cookie', cookieFlags);
    }

    return res.status(result.status).json(result.body);
};
