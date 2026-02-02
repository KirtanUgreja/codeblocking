// Error handling middleware and utilities

import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ApiError';
    }
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    }

    // Handle path traversal errors
    if (err.message.includes('Path traversal')) {
        return res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    }

    // Handle file not found errors
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            error: 'File or directory not found'
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
};
