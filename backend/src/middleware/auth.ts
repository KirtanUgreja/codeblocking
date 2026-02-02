import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string
        email: string
        accessToken: string
        providerToken?: string // GitHub token
    }
}

export async function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' })
        }

        const token = authHeader.split(' ')[1]

        // Verify the JWT with Supabase
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' })
        }

        // Get the user's session to access provider token
        // Provider token is passed from frontend via X-GitHub-Token header
        const githubToken = req.headers['x-github-token'] as string | undefined

        req.user = {
            id: user.id,
            email: user.email || '',
            accessToken: token,
            providerToken: githubToken
        }

        next()
    } catch (error) {
        console.error('Auth middleware error:', error)
        return res.status(500).json({ error: 'Authentication failed' })
    }
}
