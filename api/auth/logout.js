// POST /api/auth/logout
const authService = require('../_auth_service');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const cookies = authService.parseCookies(req.headers.cookie);
    let token = cookies['nurpos_session'];

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (token) {
        authService.revokeSession(token);
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', 'nurpos_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax');

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};
