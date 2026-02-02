"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const git_js_1 = require("../services/git.js");
const fs = __importStar(require("fs"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_js_1.authMiddleware);
// GET /api/projects - List user's projects
router.get('/', async (req, res) => {
    try {
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('last_opened', { ascending: false });
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
        return res.json({ projects });
    }
    catch (error) {
        console.error('Error in GET /projects:', error);
        return res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// POST /api/projects - Create a new project from GitHub repo
router.post('/', async (req, res) => {
    try {
        const { repoUrl, repoFullName, name, isPrivate, environment } = req.body;
        if (!repoUrl || !repoFullName || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Validate environment
        const validEnvironments = ['python', 'node', 'java', 'base'];
        const selectedEnvironment = validEnvironments.includes(environment) ? environment : 'base';
        const githubToken = req.user?.providerToken;
        if (!githubToken) {
            return res.status(400).json({ error: 'GitHub token not available' });
        }
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Create project in database with selected environment
        const { data: project, error: createError } = await supabase
            .from('projects')
            .insert({
            user_id: req.user.id,
            name,
            repo_url: repoUrl,
            repo_full_name: repoFullName,
            is_private: isPrivate || false,
            environment: selectedEnvironment
        })
            .select()
            .single();
        if (createError || !project) {
            console.error('Error creating project:', createError);
            return res.status(500).json({ error: 'Failed to create project' });
        }
        // Clone the repository
        try {
            await (0, git_js_1.cloneRepository)(repoUrl, githubToken, req.user.id, project.id);
        }
        catch (cloneError) {
            console.error('Error cloning repository:', cloneError);
            // Delete the project record if clone failed
            await supabase.from('projects').delete().eq('id', project.id);
            return res.status(500).json({ error: 'Failed to clone repository' });
        }
        return res.status(201).json({ project });
    }
    catch (error) {
        console.error('Error in POST /projects:', error);
        return res.status(500).json({ error: 'Failed to create project' });
    }
});
// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Delete from database (RLS will ensure user owns it)
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Error deleting project:', error);
            return res.status(500).json({ error: 'Failed to delete project' });
        }
        // Delete local files
        (0, git_js_1.deleteProject)(req.user.id, id);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error in DELETE /projects/:id:', error);
        return res.status(500).json({ error: 'Failed to delete project' });
    }
});
// GET /api/projects/:id/open - Open a project (update last_opened, ensure cloned)
router.get('/:id/open', async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = (0, supabase_js_1.createUserClient)(req.user.accessToken);
        // Get project
        const { data: project, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        // Check if project is cloned locally
        const projectPath = (0, git_js_1.getProjectPath)(req.user.id, id);
        const isCloned = fs.existsSync(projectPath);
        if (!isCloned) {
            // Re-clone if needed
            const githubToken = req.user?.providerToken;
            if (!githubToken) {
                return res.status(400).json({ error: 'GitHub token not available' });
            }
            await (0, git_js_1.cloneRepository)(project.repo_url, githubToken, req.user.id, id);
        }
        // Update last_opened
        await supabase
            .from('projects')
            .update({ last_opened: new Date().toISOString() })
            .eq('id', id);
        return res.json({
            project,
            path: projectPath
        });
    }
    catch (error) {
        console.error('Error in GET /projects/:id/open:', error);
        return res.status(500).json({ error: 'Failed to open project' });
    }
});
exports.default = router;
