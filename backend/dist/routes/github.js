"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const github_js_1 = require("../services/github.js");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_js_1.authMiddleware);
// GET /api/github/repos - List user's GitHub repositories
router.get('/repos', async (req, res) => {
    try {
        const githubToken = req.user?.providerToken;
        if (!githubToken) {
            return res.status(400).json({
                error: 'GitHub token not available. Please re-login with GitHub.'
            });
        }
        const repos = await (0, github_js_1.listUserRepos)(githubToken);
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
        });
    }
    catch (error) {
        console.error('Error fetching GitHub repos:', error);
        return res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});
exports.default = router;
