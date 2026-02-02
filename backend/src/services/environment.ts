import * as fs from 'fs'
import * as path from 'path'

type ProjectEnvironment = 'python' | 'node' | 'multi' | 'base'

interface EnvironmentResult {
    environment: ProjectEnvironment
    reason: string
}

export function detectEnvironment(projectPath: string): EnvironmentResult {
    const files = fs.readdirSync(projectPath)

    const hasPython =
        files.includes('requirements.txt') ||
        files.includes('setup.py') ||
        files.includes('pyproject.toml') ||
        files.includes('Pipfile') ||
        files.some(f => f.endsWith('.py'))

    const hasNode =
        files.includes('package.json') ||
        files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'))

    if (hasPython && hasNode) {
        return { environment: 'multi', reason: 'Found both Python and Node.js files' }
    }

    if (hasPython) {
        return { environment: 'python', reason: 'Found Python files' }
    }

    if (hasNode) {
        return { environment: 'node', reason: 'Found Node.js/JavaScript files' }
    }

    return { environment: 'base', reason: 'No specific environment detected' }
}

export function getContainerImage(environment: ProjectEnvironment): string {
    const images: Record<ProjectEnvironment, string> = {
        python: 'codeblocking/python',
        node: 'codeblocking/node',
        multi: 'codeblocking/multi',
        base: 'codeblocking/base'
    }
    return images[environment]
}
