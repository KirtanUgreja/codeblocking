"use strict";
// Files routes - API for file operations
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fileSystem_1 = require("../services/fileSystem");
const git_1 = require("../services/git");
const router = (0, express_1.Router)();
// Helper to get file system service for a project
function getFileService(projectId) {
    const projectPath = (0, git_1.getProjectPath)(projectId);
    return (0, fileSystem_1.createFileSystemService)(projectPath);
}
// Get file tree for a project
router.get('/tree/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const fileService = getFileService(projectId);
        await fileService.ensureWorkspace();
        const tree = await fileService.getFileTree();
        res.json({ success: true, data: tree });
    }
    catch (error) {
        console.error('Error getting file tree:', error);
        res.status(500).json({ success: false, error: 'Failed to get file tree' });
    }
});
// Read file content
router.get('/:projectId/read', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: filePath } = req.query;
        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = getFileService(projectId);
        const content = await fileService.readFile(filePath);
        res.json({ success: true, data: content });
    }
    catch (error) {
        console.error('Error reading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to read file';
        res.status(500).json({ success: false, error: message });
    }
});
// Write file content
router.post('/:projectId/write', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: filePath, content } = req.body;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = getFileService(projectId);
        await fileService.writeFile(filePath, content || '');
        res.json({ success: true, message: 'File saved' });
    }
    catch (error) {
        console.error('Error writing file:', error);
        const message = error instanceof Error ? error.message : 'Failed to write file';
        res.status(500).json({ success: false, error: message });
    }
});
// Create file or folder
router.post('/:projectId/create', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath, type } = req.body;
        if (!itemPath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = getFileService(projectId);
        if (type === 'folder') {
            await fileService.createFolder(itemPath);
        }
        else {
            await fileService.createFile(itemPath);
        }
        res.json({ success: true, message: `${type || 'file'} created` });
    }
    catch (error) {
        console.error('Error creating item:', error);
        const message = error instanceof Error ? error.message : 'Failed to create item';
        res.status(500).json({ success: false, error: message });
    }
});
// Delete file or folder
router.delete('/:projectId/delete', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath } = req.query;
        if (!itemPath || typeof itemPath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }
        const fileService = getFileService(projectId);
        await fileService.delete(itemPath);
        res.json({ success: true, message: 'Item deleted' });
    }
    catch (error) {
        console.error('Error deleting item:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete item';
        res.status(500).json({ success: false, error: message });
    }
});
exports.default = router;
