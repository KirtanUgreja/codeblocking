import { Router, Request, Response, NextFunction } from 'express';
import { filesystemService } from '../services/filesystem';

const router = Router();

/**
 * GET /api/files - Get workspace file tree
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const tree = await filesystemService.getFileTree();
        res.json({ success: true, data: tree });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/files/* - Get file contents
 */
router.get('/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params[0];
        const fileContent = await filesystemService.readFile(filePath);
        res.json({ success: true, data: fileContent });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/files/* - Create or update file
 */
router.post('/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params[0];
        const { content } = req.body;

        if (typeof content !== 'string') {
            res.status(400).json({ success: false, message: 'Content must be a string' });
            return;
        }

        await filesystemService.writeFile(filePath, content);
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/files/* - Delete file or directory
 */
router.delete('/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filePath = req.params[0];
        await filesystemService.delete(filePath);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
