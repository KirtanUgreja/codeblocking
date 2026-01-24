import { Router, Request, Response, NextFunction } from 'express';
import { executorService } from '../services/executor';
import { ExecutionRequest } from '../types';

const router = Router();

/**
 * POST /api/execute - Start executing a file
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { filePath, command } = req.body as ExecutionRequest;

        if (!filePath) {
            res.status(400).json({ success: false, message: 'filePath is required' });
            return;
        }

        const result = executorService.execute({ filePath, command });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/execute/stop - Stop current execution
 */
router.post('/stop', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const result = executorService.stop();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
