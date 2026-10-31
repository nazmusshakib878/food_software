// GET /api/auth/session
const authService = require('../_auth_service');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const cookies = authService.parseCookies(req.headers.cookie);
    let token = cookies['nurpos_session'];

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ success: false, error: 'No active session' });
    }

    const session = authService.getSession(token);
    if (!session) {
        return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }

    return res.status(200).json({
        success: true,
        user: session.user
    });
};

