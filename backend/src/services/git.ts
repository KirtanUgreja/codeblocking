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

export async function pullRepository(projectPath: string, githubToken?: string): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)

    try {
        // If token provided, ensure remote is up to date
        if (githubToken) {
            const remotes = await git.getRemotes(true)
            const origin = remotes.find(r => r.name === 'origin')
            if (origin) {
                const url = origin.refs.push;
                const authenticatedUrl = url.replace(
                    /https:\/\/([^@]+@)?github\.com\//,
                    `https://${githubToken}@github.com/`
                )
                await git.remote(['set-url', 'origin', authenticatedUrl])
            }
        }

        // Fetch first to ensure we know about remote changes
        await git.fetch()

        // Then pull with rebase
        await git.pull(['--rebase'])
    } catch (error) {
        console.warn(`[GitService] Standard pull failed, attempting to recover current branch...`)
        try {
            const status = await git.status()
            const currentBranch = status.current
            if (currentBranch) {
                // Force fetch and reset to stay in sync with remote
                await git.fetch('origin', currentBranch)
                await git.reset(['--hard', `origin/${currentBranch}`])
            }
        } catch (recoverError) {
            console.error(`[GitService] Recovery failed:`, recoverError)
            // If it's the very first commit or branch doesn't exist on remote yet, 
            // we don't want to crash.
        }
    }
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

export async function createAndPushBranch(
    projectPath: string,
    branchName: string,
    githubToken?: string,
    message: string = 'Update from CodeBlocking IDE'
): Promise<void> {
    console.log(`[GitService] Starting createAndPushBranch at ${projectPath} for branch ${branchName}`)
    const git: SimpleGit = simpleGit(projectPath)

    try {
        // If token provided, ensure remote is up to date
        if (githubToken) {
            const remotes = await git.getRemotes(true)
            const origin = remotes.find(r => r.name === 'origin')
            if (origin) {
                const url = origin.refs.push;
                // Replace or add token to github.com URLs
                // This regex handles URLs with or without existing tokens
                const authenticatedUrl = url.replace(
                    /https:\/\/([^@]+@)?github\.com\//,
                    `https://${githubToken}@github.com/`
                )
                await git.remote(['set-url', 'origin', authenticatedUrl])
                console.log(`[GitService] Updated origin remote URL with provided token`)
            }
        }

        await git.add('.')

        // Check if there are changes to commit
        const status = await git.status()
        console.log(`[GitService] Status: ${status.files.length} modified files`)

        if (status.files.length === 0) {
            console.log(`[GitService] No changes detected. Skipping push.`)
            return;
        }

        await git.commit(message)
        console.log(`[GitService] Committed changes`)

        // Create and checkout new branch
        // -B creates or resets the branch if it already exists
        await git.checkout(['-B', branchName])
        console.log(`[GitService] Checked out branch ${branchName}`)

        // Push the new branch to origin
        // --force to ensure we can update the auto-save branch if it exists
        await git.push('origin', branchName, ['--set-upstream', '--force'])
        console.log(`[GitService] Successfully pushed to origin`)
    } catch (error: any) {
        console.error(`[GitService] Error in createAndPushBranch:`, error)
        // SimpleGit errors often have details in .message or .stderr
        const details = error.stderr || error.message || String(error)
        throw new Error(`Git sync failed: ${details}`)
    }
}

export async function initAndPushRepo(
    projectPath: string,
    remoteUrl: string,
    githubToken: string,
    message: string = 'Initial commit from CodeForge Hub'
): Promise<void> {
    const git: SimpleGit = simpleGit(projectPath)

    try {
        await git.init()
        await git.branch(['-M', 'main'])

        // Add token to URL for authentication
        const authenticatedUrl = remoteUrl.replace(
            'https://github.com/',
            `https://${githubToken}@github.com/`
        )

        await git.addRemote('origin', authenticatedUrl)
        await git.add('.')
        await git.commit(message)

        // Push initial commit to main branch
        await git.push('origin', 'main', ['--set-upstream'])
    } catch (error: any) {
        console.error(`[GitService] Error in initAndPushRepo:`, error)
        throw new Error(`Git initialization failed: ${error.message || error}`)
    }
}

export function deleteProject(userId: string, projectId: string): void {
    const projectPath = getProjectPath(userId, projectId)
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true })
    }
}
