import { Server as SocketIOServer } from 'socket.io';
export declare function initializeTerminalService(io: SocketIOServer): void;
export declare function getActiveSessionCount(): number;
export declare function cleanupTerminals(): Promise<void>;
