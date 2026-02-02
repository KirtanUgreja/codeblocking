"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const supabase_js_1 = require("../lib/supabase.js");
async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        const token = authHeader.split(' ')[1];
        // Verify the JWT with Supabase
        const { data: { user }, error } = await supabase_js_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // Get the user's session to access provider token
        // Provider token is passed from frontend via X-GitHub-Token header
        const githubToken = req.headers['x-github-token'];
        req.user = {
            id: user.id,
            email: user.email || '',
            accessToken: token,
            providerToken: githubToken
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}
