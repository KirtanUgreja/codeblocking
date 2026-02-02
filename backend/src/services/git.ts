import simpleGit, { SimpleGit } from 'simple-git'
import * as fs from 'fs'
import * as path from 'path'
import os from 'os'

// Use home directory for workspaces (shared by default in Docker Desktop)
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || path.join(os.homedir(), '.codeblocking', 'workspaces')

// Get project path with userId and projectId
export function getProjectPath(userId: string, projectId: string): string;
// Get project path with just projectId (uses 'default' for userId placeholder)
export function getProjectPath(projectId: string): string;
export function getProjectPath(userIdOrProjectId: string, projectId?: string): string {
    if (projectId === undefined) {
        // Called with just projectId - use 'projects' as subdirectory
        return path.join(WORKSPACE_DIR, 'projects', userIdOrProjectId)
    }
    return path.join(WORKSPACE_DIR, userIdOrProjectId, projectId)
}

export async function cloneRepository(
    repoUrl: string,
    githubToken: string,
    userId: string,
    projectId: string
): Promise<string> {
    const projectPath = getProjectPath(userId, projectId)

    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(projectPath), { recursive: true })

    // Add token to URL for private repos
    const authenticatedUrl = repoUrl.replace(
        'https://github.com/',
        `https://${githubToken}@github.com/`
    )

    const git: SimpleGit = simpleGit()
    await git.clone(authenticatedUrl, projectPath)

    return projectPath
}

export async function pullRepository(projectPath: string): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)
    await git.pull()
}

export async function pushRepository(
    projectPath: string,
    message: string = 'Update from CodeBlocking IDE'
): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)
    await git.add('.')
    await git.commit(message)
    await git.push()
}

export function deleteProject(userId: string, projectId: string): void {
    const projectPath = getProjectPath(userId, projectId)
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true })
    }
}
