import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { terminalService } from './terminal';
import { WebSocketMessage } from '../types';

export class WebSocketService {
    private wss: WebSocketServer | null = null;
    private clients: Set<WebSocket> = new Set();

    initialize(server: HTTPServer): void {
        this.wss = new WebSocketServer({ server });

        // Set up terminal callbacks
        terminalService.setCallbacks(
            (terminalId, data) => this.broadcast({ type: 'terminal:output', terminalId, data }),
            (terminalId, exitCode) => this.broadcast({ type: 'terminal:exit', terminalId, exitCode })
        );

        this.wss.on('connection', (ws: WebSocket) => {
            console.log('WebSocket client connected');
            this.clients.add(ws);

            ws.on('message', (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString()) as WebSocketMessage;
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                console.log('WebSocket client disconnected');
                this.clients.delete(ws);

                // If no clients, close all terminals
                if (this.clients.size === 0) {
                    terminalService.closeAll();
                }
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.clients.delete(ws);
            });
        });

        console.log('WebSocket server initialized');
    }

    private handleMessage(_ws: WebSocket, message: WebSocketMessage): void {
        switch (message.type) {
            case 'terminal:create':
                if (message.terminalId) {
                    terminalService.createTerminal(message.terminalId);
                }
                break;

            case 'terminal:input':
                if (message.terminalId && message.data) {
                    terminalService.write(message.terminalId, message.data);
                }
                break;

            case 'terminal:resize':
                if (message.terminalId && message.cols && message.rows) {
                    terminalService.resize(message.terminalId, message.cols, message.rows);
                }
                break;

            case 'terminal:close':
                if (message.terminalId) {
                    terminalService.closeTerminal(message.terminalId);
                }
                break;

            default:
                console.warn('Unknown WebSocket message type:', message.type);
        }
    }

    broadcast(message: object): void {
        const payload = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    broadcastExecutionOutput(type: 'stdout' | 'stderr' | 'exit', data: string, exitCode?: number): void {
        this.broadcast({
            type: `execution:${type}`,
            data,
            exitCode,
        });
    }
}

export const websocketService = new WebSocketService();
