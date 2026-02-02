"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectPath = getProjectPath;
exports.cloneRepository = cloneRepository;
exports.pullRepository = pullRepository;
exports.pushRepository = pushRepository;
exports.deleteProject = deleteProject;
const simple_git_1 = __importDefault(require("simple-git"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/tmp/codeblocking/workspaces';
function getProjectPath(userIdOrProjectId, projectId) {
    if (projectId === undefined) {
        // Called with just projectId - use 'projects' as subdirectory
        return path.join(WORKSPACE_DIR, 'projects', userIdOrProjectId);
    }
    return path.join(WORKSPACE_DIR, userIdOrProjectId, projectId);
}
async function cloneRepository(repoUrl, githubToken, userId, projectId) {
    const projectPath = getProjectPath(userId, projectId);
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(projectPath), { recursive: true });
    // Add token to URL for private repos
    const authenticatedUrl = repoUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
    const git = (0, simple_git_1.default)();
    await git.clone(authenticatedUrl, projectPath);
    return projectPath;
}
async function pullRepository(projectPath) {
    const git = (0, simple_git_1.default)(projectPath);
    await git.pull();
}
async function pushRepository(projectPath, message = 'Update from CodeBlocking IDE') {
    const git = (0, simple_git_1.default)(projectPath);
    await git.add('.');
    await git.commit(message);
    await git.push();
}
function deleteProject(userId, projectId) {
    const projectPath = getProjectPath(userId, projectId);
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true });
    }
}
