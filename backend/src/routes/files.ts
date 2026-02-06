import { Router, Response } from 'express';
import multer from 'multer';
import { createFileSystemService } from '../services/fileSystem.js';
import { getProjectPath } from '../services/git.js';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Helper to get file system service for a project
function getFileService(userId: string, projectId: string) {
    const projectPath = getProjectPath(userId, projectId);
    return createFileSystemService(projectPath);
}

// Get file tree for a project
router.get('/tree/:projectId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const fileService = getFileService(req.user!.id, projectId);
        await fileService.ensureWorkspace();
        const tree = await fileService.getFileTree();

        res.json({ success: true, data: tree });
    } catch (error) {
        console.error('Error getting file tree:', error);
        res.status(500).json({ success: false, error: 'Failed to get file tree' });
    }
});

// Read file content
router.get('/:projectId/read', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: filePath } = req.query;

        if (!filePath || typeof filePath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = getFileService(req.user!.id, projectId);
        const content = await fileService.readFile(filePath);

        res.json({ success: true, data: content });
    } catch (error: unknown) {
        console.error('Error reading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to read file';
        res.status(500).json({ success: false, error: message });
    }
});

// Write file content
router.post('/:projectId/write', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: filePath, content } = req.body;

        if (!filePath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = getFileService(req.user!.id, projectId);
        await fileService.writeFile(filePath, content || '');

        res.json({ success: true, message: 'File saved' });
    } catch (error: unknown) {
        console.error('Error writing file:', error);
        const message = error instanceof Error ? error.message : 'Failed to write file';
        res.status(500).json({ success: false, error: message });
    }
});

// Create file or folder
router.post('/:projectId/create', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath, type } = req.body;

        if (!itemPath) {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = getFileService(req.user!.id, projectId);

        if (type === 'folder') {
            await fileService.createFolder(itemPath);
        } else {
            await fileService.createFile(itemPath);
        }

        res.json({ success: true, message: `${type || 'file'} created` });
    } catch (error: unknown) {
        console.error('Error creating item:', error);
        const message = error instanceof Error ? error.message : 'Failed to create item';
        res.status(500).json({ success: false, error: message });
    }
});

// Delete file or folder
router.delete('/:projectId/delete', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: itemPath } = req.query;

        if (!itemPath || typeof itemPath !== 'string') {
            return res.status(400).json({ success: false, error: 'Path is required' });
        }

        const fileService = getFileService(req.user!.id, projectId);
        await fileService.delete(itemPath);

        res.json({ success: true, message: 'Item deleted' });
    } catch (error: unknown) {
        console.error('Error deleting item:', error);
        const message = error instanceof Error ? error.message : 'Failed to delete item';
        res.status(500).json({ success: false, error: message });
    }
});

// Upload file
router.post('/:projectId/upload', upload.single('file'), async (req: any, res: Response) => {
    try {
        const { projectId } = req.params;
        const { path: dirPath } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const fileService = getFileService(req.user!.id, projectId);
        const filePath = dirPath ? `${dirPath}/${file.originalname}` : file.originalname;

        await fileService.writeBuffer(filePath, file.buffer);

        res.json({ success: true, message: 'File uploaded successfully' });
    } catch (error: unknown) {
        console.error('Error uploading file:', error);
        const message = error instanceof Error ? error.message : 'Failed to upload file';
        res.status(500).json({ success: false, error: message });
    }
});

export default router;
