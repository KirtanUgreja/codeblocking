export interface Config {
    port: number;
    host: string;
    workspaceDir: string;
    nodeEnv: string;
}

export const config: Config = {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '127.0.0.1',
    workspaceDir: process.env.WORKSPACE_DIR || './workspace',
    nodeEnv: process.env.NODE_ENV || 'development',
};
