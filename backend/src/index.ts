import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load environment variables
dotenv.config();

// Import routes
import filesRouter from './routes/files';

// Import services
import { terminalService } from './services/terminal';
import { fileSystemService } from './services/fileSystem';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Initialize terminal service with Socket.IO
terminalService.initialize(io);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'CodeBlocking IDE API',
        version: '1.0.0',
        status: 'healthy'
    });
});

// API routes
app.use('/api/files', filesRouter);

// API health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        terminals: terminalService.getActiveSessionCount()
    });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize workspace and start server
async function startServer() {
    try {
        // Ensure workspace directory exists
        await fileSystemService.ensureWorkspace();
        console.log('✓ Workspace initialized');

        // Start the HTTP server
        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📁 File API: http://localhost:${PORT}/api/files`);
            console.log(`🔌 Terminal WebSocket: ws://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
