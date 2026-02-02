import { Router } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import { listUserRepos } from '../services/github.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/github/repos - List user's GitHub repositories
router.get('/repos', async (req: AuthenticatedRequest, res) => {
    try {
        const githubToken = req.user?.providerToken

        if (!githubToken) {
            return res.status(400).json({
                error: 'GitHub token not available. Please re-login with GitHub.'
            })
        }

        const repos = await listUserRepos(githubToken)

        return res.json({
            repos: repos.map(repo => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                isPrivate: repo.private,
                htmlUrl: repo.html_url,
                cloneUrl: repo.clone_url,
                defaultBranch: repo.default_branch,
                language: repo.language,
                updatedAt: repo.updated_at
            }))
        })
    } catch (error) {
        console.error('Error fetching GitHub repos:', error)
        return res.status(500).json({ error: 'Failed to fetch repositories' })
    }
})

export default router
