// File System Routes - API endpoints for file operations

import { Router, Request, Response } from 'express';
import { fileSystemService } from '../services/fileSystem';

const router = Router();

/**
 * GET /api/files/tree
 * Get the complete file tree
 */
router.get('/tree', async (req: Request, res: Response) => {
    try {
        await fileSystemService.ensureWorkspace();
        const tree = await fileSystemService.getFileTree();
        res.json({ success: true, data: tree });
    } catch (error) {
        console.error('Error getting file tree:', error);
        res.status(500).json({ success: false, error: 'Failed to get file tree' });
    }
});

/**
 * GET /api/files/read
 * Read file content
 * Query: path - file path relative to workspace
 */
router.get('/read', async (req: Request, res: Response) => {
    try {
        const filePath = req.query.path as string;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'File path is required' });
        }

        const fileContent = await fileSystemService.readFile(filePath);
        res.json({ success: true, data: fileContent });
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).json({ success: false, error: 'Failed to read file' });
    }
});

/**
 * POST /api/files/write
 * Write content to a file
 * Body: { path: string, content: string }
 */
router.post('/write', async (req: Request, res: Response) => {
    try {
        const { path: filePath, content } = req.body;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'File path is required' });
        }

        await fileSystemService.writeFile(filePath, content || '');
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error writing file:', error);
        res.status(500).json({ success: false, error: 'Failed to write file' });
    }
});

/**
 * POST /api/files/create
 * Create a new file or folder
 * Body: { path: string, type: 'file' | 'folder' }
 */
router.post('/create', async (req: Request, res: Response) => {
    try {
        const { path: itemPath, type } = req.body;
        if (!itemPath || !type) {
            return res.status(400).json({ success: false, error: 'Path and type are required' });
        }

        if (type === 'folder') {
            await fileSystemService.createFolder(itemPath);
        } else {
            await fileSystemService.createFile(itemPath);
        }

        res.json({ success: true, message: `${type} created successfully` });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ success: false, error: 'Failed to create item' });
    }
});

/**
 * DELETE /api/files/delete
 * Delete a file or folder
 * Query: path - item path relative to workspace
 */
router.delete('/delete', async (req: Request, res: Response) => {
    try {
        const itemPath = req.query.path as string;
        if (!itemPath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        await fileSystemService.delete(itemPath);
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, error: 'Failed to delete item' });
    }
});

/**
 * POST /api/files/rename
 * Rename a file or folder
 * Body: { oldPath: string, newPath: string }
 */
router.post('/rename', async (req: Request, res: Response) => {
    try {
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) {
            return res.status(400).json({ success: false, error: 'Old path and new path are required' });
        }

        await fileSystemService.rename(oldPath, newPath);
        res.json({ success: true, message: 'Item renamed successfully' });
    } catch (error) {
        console.error('Error renaming item:', error);
        res.status(500).json({ success: false, error: 'Failed to rename item' });
    }
});

export default router;
