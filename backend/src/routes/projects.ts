import { Router } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import { createUserClient } from '../lib/supabase.js'
import { cloneRepository, deleteProject, getProjectPath } from '../services/git.js'
import { detectEnvironment } from '../services/environment.js'
import * as fs from 'fs'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/projects - List user's projects
router.get('/', async (req: AuthenticatedRequest, res) => {
    try {
        const supabase = createUserClient(req.user!.accessToken)

        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('last_opened', { ascending: false })

        if (error) {
            console.error('Error fetching projects:', error)
            return res.status(500).json({ error: 'Failed to fetch projects' })
        }

        return res.json({ projects })
    } catch (error) {
        console.error('Error in GET /projects:', error)
        return res.status(500).json({ error: 'Failed to fetch projects' })
    }
})

// POST /api/projects - Create a new project from GitHub repo
router.post('/', async (req: AuthenticatedRequest, res) => {
    try {
        const { repoUrl, repoFullName, name, isPrivate, environment } = req.body

        if (!repoUrl || !repoFullName || !name) {
            return res.status(400).json({ error: 'Missing required fields' })
        }

        // Validate environment
        const validEnvironments = ['python', 'node', 'java', 'base']
        const selectedEnvironment = validEnvironments.includes(environment) ? environment : 'base'

        const githubToken = req.user?.providerToken
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' })
        }

        const supabase = createUserClient(req.user!.accessToken)

        // Create project in database with selected environment
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
                user_id: req.user!.id,
                name,
                repo_url: repoUrl,
                repo_full_name: repoFullName,
                is_private: isPrivate || false,
                environment: selectedEnvironment
            })
            .select()
            .single()

        if (createError || !project) {
            console.error('Error creating project:', createError)
            return res.status(500).json({ error: 'Failed to create project' })
        }

        // Clone the repository
        try {
            await cloneRepository(
                repoUrl,
                githubToken,
                req.user!.id,
                project.id
            )
        } catch (cloneError) {
            console.error('Error cloning repository:', cloneError)
            // Delete the project record if clone failed
            await supabase.from('projects').delete().eq('id', project.id)
            return res.status(500).json({ error: 'Failed to clone repository' })
        }

        return res.status(201).json({ project })
    } catch (error) {
        console.error('Error in POST /projects:', error)
        return res.status(500).json({ error: 'Failed to create project' })
    }
})

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        // Delete from database (RLS will ensure user owns it)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting project:', error)
            return res.status(500).json({ error: 'Failed to delete project' })
        }

        // Delete local files
        deleteProject(req.user!.id, id)

        return res.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /projects/:id:', error)
        return res.status(500).json({ error: 'Failed to delete project' })
    }
})

// GET /api/projects/:id/open - Open a project (update last_opened, ensure cloned)
router.get('/:id/open', async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params
        const supabase = createUserClient(req.user!.accessToken)

        // Get project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !project) {
            return res.status(404).json({ error: 'Project not found' })
        }

        // Check if project is cloned locally
        const projectPath = getProjectPath(req.user!.id, id)
        const isCloned = fs.existsSync(projectPath)

        if (!isCloned) {
            // Re-clone if needed
            const githubToken = req.user?.providerToken
            if (!githubToken) {
                return res.status(400).json({ error: 'GitHub token not available' })
            }

            await cloneRepository(project.repo_url, githubToken, req.user!.id, id)
        }

        // Update last_opened
        await supabase
            .from('projects')
            .update({ last_opened: new Date().toISOString() })
            .eq('id', id)

        return res.json({
            project,
            path: projectPath
        })
    } catch (error) {
        console.error('Error in GET /projects/:id/open:', error)
        return res.status(500).json({ error: 'Failed to open project' })
    }
})

export default router
