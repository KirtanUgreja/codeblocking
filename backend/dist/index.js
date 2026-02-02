"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const github_js_1 = __importDefault(require("./routes/github.js"));
const projects_js_1 = __importDefault(require("./routes/projects.js"));
const files_js_1 = __importDefault(require("./routes/files.js"));
const terminal_js_1 = require("./services/terminal.js");
const container_js_1 = require("./services/container.js");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// Socket.IO setup
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling']
});
// Initialize terminal service with Socket.IO
(0, terminal_js_1.initializeTerminalService)(io);
// Middleware
app.use((0, cors_1.default)({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        terminals: (0, terminal_js_1.getActiveSessionCount)()
    });
});
// API Routes
app.use('/api/github', github_js_1.default);
app.use('/api/projects', projects_js_1.default);
app.use('/api/files', files_js_1.default);
// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
async function shutdown() {
    console.log('\nShutting down...');
    await (0, terminal_js_1.cleanupTerminals)();
    await (0, container_js_1.cleanupAllContainers)();
    process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   Socket.IO enabled for terminal connections`);
});
