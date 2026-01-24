import { WSMessage } from '@/types';

type MessageHandler = (message: WSMessage) => void;

export class WebSocketService {
    private ws: WebSocket | null = null;
    private handlers: Set<MessageHandler> = new Set();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private shouldReconnect = true;

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            return;
        }

        this.ws = new WebSocket('ws://127.0.0.1:3001');

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as WSMessage;
                this.handlers.forEach((handler) => handler(message));
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.ws = null;

            // Auto-reconnect
            if (this.shouldReconnect && !this.reconnectTimeout) {
                this.reconnectTimeout = setTimeout(() => {
                    console.log('Reconnecting WebSocket...');
                    this.connect();
                }, 2000);
            }
        };
    }

    disconnect(): void {
        this.shouldReconnect = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(message: { type: string; terminalId?: string; data?: string; cols?: number; rows?: number }): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected');
        }
    }

    onMessage(handler: MessageHandler): () => void {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }
}

export const websocketService = new WebSocketService();
