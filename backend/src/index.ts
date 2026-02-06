import 'dotenv/config' // Load environment variables - Reload for lowercase path fix3400 config
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import githubRoutes from './routes/github.js'
import projectsRoutes from './routes/projects.js'
import filesRoutes from './routes/files.js'
import { initializeTerminalService, getActiveSessionCount, cleanupTerminals } from './services/terminal.js'
import { cleanupAllContainers } from './services/container.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 4001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4000'

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
})

// Initialize terminal service with Socket.IO
initializeTerminalService(io)

// Middleware
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}))
app.use(express.json())

// Health check
app.get('/health', async (req, res) => {
    const dockerStatus = await import('./services/container.js').then(m => m.pingDocker());
    res.json({
        status: dockerStatus ? 'ok' : 'error',
        docker: dockerStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        terminals: getActiveSessionCount()
    })
})

// API Routes
app.use('/api/github', githubRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/files', filesRoutes)

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down...')
    await cleanupTerminals()
    await cleanupAllContainers()
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Start server
// Cleanup orphaned containers on startup
cleanupAllContainers().catch(console.error);

httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`)
    console.log(`   Frontend URL: ${FRONTEND_URL}`)
    console.log(`   Socket.IO enabled for terminal connections`)
})
