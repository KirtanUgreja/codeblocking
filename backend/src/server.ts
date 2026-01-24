import express, { Application } from 'express';
import cors from 'cors';
import { createServer, Server as HTTPServer } from 'http';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { workspaceService } from './services/workspace';
import { websocketService } from './services/websocket';
import filesystemRoutes from './routes/filesystem.routes';
import executionRoutes from './routes/execution.routes';

class Server {
    private app: Application;
    private httpServer: HTTPServer;

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.configureMiddleware();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    private configureMiddleware(): void {
        // CORS - localhost only
        this.app.use(
            cors({
                origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
                credentials: true,
            })
        );

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private configureRoutes(): void {
        // Health check endpoint
        this.app.get('/api/health', (_req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                workspace: config.workspaceDir,
            });
        });

        // API routes
        this.app.use('/api/files', filesystemRoutes);
        this.app.use('/api/execute', executionRoutes);
    }

    private configureErrorHandling(): void {
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            // Initialize workspace first
            await workspaceService.initialize();

            // Initialize WebSocket server
            websocketService.initialize(this.httpServer);

            // Start HTTP server
            this.httpServer.listen(config.port, config.host, () => {
                console.log(`Server running on http://${config.host}:${config.port}`);
                console.log(`Workspace directory: ${workspaceService.getWorkspacePath()}`);
                console.log(`Environment: ${config.nodeEnv}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    public getHttpServer(): HTTPServer {
        return this.httpServer;
    }
}

// Start server
const server = new Server();
server.start();

export default server;
