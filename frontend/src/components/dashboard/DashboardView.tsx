'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Project {
    id: string
    name: string
    repo_url: string
    repo_full_name: string
    environment: string
    is_private: boolean
    created_at: string
    last_opened: string
}

interface GitHubRepo {
    id: number
    name: string
    fullName: string
    description: string | null
    isPrivate: boolean
    htmlUrl: string
    cloneUrl: string
    language: string | null
    updatedAt: string
}

interface DashboardViewProps {
    user: User
}

export default function DashboardView({ user }: DashboardViewProps) {
    const router = useRouter()
    const [projects, setProjects] = useState<Project[]>([])
    const [repos, setRepos] = useState<GitHubRepo[]>([])
    const [loading, setLoading] = useState(true)
    const [showImportModal, setShowImportModal] = useState(false)
    const [showNewProjectModal, setShowNewProjectModal] = useState(false)
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [importing, setImporting] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [newRepoName, setNewRepoName] = useState('')
    const [newRepoDescription, setNewRepoDescription] = useState('')
    const [newRepoPrivate, setNewRepoPrivate] = useState(false)
    const [newRepoEnvironment, setNewRepoEnvironment] = useState('base')

    // Extract user info from GitHub OAuth
    const avatarUrl = user.user_metadata?.avatar_url
    const username = user.user_metadata?.user_name || user.user_metadata?.preferred_username || user.email?.split('@')[0]
    const fullName = user.user_metadata?.full_name || username

    // Get tokens from session
    const getTokens = async () => {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        return {
            accessToken: session?.access_token,
            providerToken: session?.provider_token
        }
    }

    // Fetch projects
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { accessToken } = await getTokens()
                if (!accessToken) return

                const res = await fetch(`${API_URL}/api/projects`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })

                if (res.ok) {
                    const data = await res.json()
                    setProjects(data.projects || [])
                }
            } catch (error) {
                console.error('Error fetching projects:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProjects()
    }, [])

    const fetchRepos = async () => {
        setLoadingRepos(true)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/github/repos`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken || ''
                }
            })

            if (res.ok) {
                const data = await res.json()
                setRepos(data.repos || [])
            }
        } catch (error) {
            console.error('Error fetching repos:', error)
        } finally {
            setLoadingRepos(false)
        }
    }

    // Open import modal
    const handleOpenImport = () => {
        setShowImportModal(true)
        if (repos.length === 0) {
            fetchRepos()
        }
    }

    // Import a repo
    const handleImportRepo = async (repo: GitHubRepo) => {
        setImporting(repo.fullName)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repoUrl: repo.cloneUrl,
                    repoFullName: repo.fullName,
                    name: repo.name,
                    isPrivate: repo.isPrivate
                })
            })

            if (res.ok) {
                const data = await res.json()
                setProjects(prev => [data.project, ...prev])
                setShowImportModal(false)
            } else {
                console.error('Failed to import repo')
            }
        } catch (error) {
            console.error('Error importing repo:', error)
        } finally {
            setImporting(null)
        }
    }

    // Delete project
    const handleDeleteProject = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return

        try {
            const { accessToken } = await getTokens()
            if (!accessToken) return

            const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (res.ok) {
                setProjects(prev => prev.filter(p => p.id !== projectId))
            }
        } catch (error) {
            console.error('Error deleting project:', error)
        }
    }

    // Create new GitHub repo
    const handleCreateRepo = async () => {
        if (!newRepoName.trim()) return
        setCreating(true)
        try {
            const { accessToken, providerToken } = await getTokens()
            if (!accessToken) {
                alert('Not authenticated. Please log in again.')
                return
            }
            if (!providerToken) {
                alert('GitHub token expired. Please log out and log in again to refresh your GitHub access.')
                return
            }

            // Create repo on GitHub
            const createRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${providerToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: newRepoName.trim(),
                    description: newRepoDescription,
                    private: newRepoPrivate,
                    auto_init: true
                })
            })

            if (!createRes.ok) {
                const error = await createRes.json()
                alert(`Failed to create repo: ${error.message || 'Unknown error'}`)
                return
            }

            const newRepo = await createRes.json()

            // Add to projects via backend
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-GitHub-Token': providerToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repoUrl: newRepo.clone_url,
                    repoFullName: newRepo.full_name,
                    name: newRepo.name,
                    isPrivate: newRepo.private,
                    environment: newRepoEnvironment
                })
            })

            if (res.ok) {
                const data = await res.json()
                setProjects(prev => [data.project, ...prev])
                setShowNewProjectModal(false)
                setNewRepoName('')
                setNewRepoDescription('')
                setNewRepoPrivate(false)
                setNewRepoEnvironment('base')
                // Navigate to IDE
                router.push(`/ide/${data.project.id}`)
            } else {
                const errorData = await res.json().catch(() => ({}))
                alert(`Failed to add project: ${errorData.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error creating repo:', error)
            alert(`Error creating repo: ${error instanceof Error ? error.message : 'Unknown error'}`)
        } finally {
            setCreating(false)
        }
    }

    // Logout
    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    // Filter repos by search
    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Environment badge
    const EnvironmentBadge = ({ env }: { env: string }) => {
        const colors: Record<string, string> = {
            python: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            node: 'bg-green-500/20 text-green-300 border-green-500/30',
            java: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            base: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
        }
        return (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${colors[env] || colors.base}`}>
                {env}
            </span>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/5 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-white/10 backdrop-blur-xl bg-gray-900/50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                                        <polyline points="16 18 22 12 16 6"></polyline>
                                        <polyline points="8 6 2 12 8 18"></polyline>
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white">CodeBlocking</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    {avatarUrl && <img src={avatarUrl} alt={username} className="w-9 h-9 rounded-full border-2 border-purple-500/50" />}
                                    <div className="hidden sm:block">
                                        <p className="text-sm font-medium text-white">{fullName}</p>
                                        <p className="text-xs text-gray-400">@{username}</p>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="mb-12">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {fullName?.split(' ')[0]}! 👋</h1>
                        <p className="text-gray-400">Manage your projects and start coding</p>
                    </div>

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                        <button onClick={() => setShowNewProjectModal(true)} className="group p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 text-left">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">New Project</h3>
                            <p className="text-sm text-gray-400">Create a new GitHub repository</p>
                        </button>
                        <button onClick={handleOpenImport} className="group p-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-cyan-500/30 transition-all duration-300 text-left">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-1">Import from GitHub</h3>
                            <p className="text-sm text-gray-400">Import an existing repository</p>
                        </button>
                    </div>

                    {/* Projects */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white">Your Projects ({projects.length})</h2>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                                <p className="text-gray-400 mb-6">Get started by importing a project from GitHub</p>
                                <button onClick={handleOpenImport} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity">
                                    Import from GitHub
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projects.map(project => (
                                    <div key={project.id} className="group p-5 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-white mb-1">{project.name}</h3>
                                                <p className="text-xs text-gray-500">{project.repo_full_name}</p>
                                            </div>
                                            <EnvironmentBadge env={project.environment} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                {new Date(project.last_opened).toLocaleDateString()}
                                            </span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => router.push(`/ide/${project.id}`)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded-lg" title="Open in IDE">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => handleDeleteProject(project.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg" title="Delete">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold text-white">Import from GitHub</h2>
                            <button onClick={() => setShowImportModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 border-b border-white/10">
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        <div className="max-h-96 overflow-y-auto p-4">
                            {loadingRepos ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                                </div>
                            ) : filteredRepos.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No repositories found</p>
                            ) : (
                                <div className="space-y-2">
                                    {filteredRepos.map(repo => (
                                        <button
                                            key={repo.id}
                                            onClick={() => handleImportRepo(repo)}
                                            disabled={importing !== null || projects.some(p => p.repo_full_name === repo.fullName)}
                                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white">{repo.name}</span>
                                                    {repo.isPrivate && (
                                                        <span className="px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-300 rounded">private</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">{repo.fullName}</p>
                                                {repo.description && <p className="text-sm text-gray-400 mt-1 line-clamp-1">{repo.description}</p>}
                                            </div>
                                            {importing === repo.fullName ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                                            ) : projects.some(p => p.repo_full_name === repo.fullName) ? (
                                                <span className="text-sm text-gray-500">Already imported</span>
                                            ) : (
                                                <span className="text-purple-400">Import</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Project Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
                            <button onClick={() => setShowNewProjectModal(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Repository Name *</label>
                                <input
                                    type="text"
                                    value={newRepoName}
                                    onChange={(e) => setNewRepoName(e.target.value)}
                                    placeholder="my-awesome-project"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                                <input
                                    type="text"
                                    value={newRepoDescription}
                                    onChange={(e) => setNewRepoDescription(e.target.value)}
                                    placeholder="A brief description of your project"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setNewRepoPrivate(false)}
                                    className={`flex-1 p-4 rounded-xl border transition-all ${!newRepoPrivate ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-2 justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">Public</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setNewRepoPrivate(true)}
                                    className={`flex-1 p-4 rounded-xl border transition-all ${newRepoPrivate ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-2 justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        <span className="font-medium">Private</span>
                                    </div>
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Environment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'python', label: 'Python', icon: '🐍', color: 'yellow' },
                                        { id: 'node', label: 'Node.js', icon: '⬢', color: 'green' },
                                        { id: 'java', label: 'Java', icon: '☕', color: 'orange' },
                                        { id: 'base', label: 'Base', icon: '📦', color: 'gray' }
                                    ].map(env => (
                                        <button
                                            key={env.id}
                                            onClick={() => setNewRepoEnvironment(env.id)}
                                            className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${newRepoEnvironment === env.id
                                                ? `bg-${env.color}-500/20 border-${env.color}-500/50 text-${env.color}-300`
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                } ${newRepoEnvironment === env.id ? 'ring-1 ring-purple-500/50' : ''}`}
                                        >
                                            <span className="text-xl">{env.icon}</span>
                                            <span className="font-medium">{env.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10">
                            <button
                                onClick={handleCreateRepo}
                                disabled={!newRepoName.trim() || creating}
                                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                        Creating...
                                    </>
                                ) : (
                                    'Create Repository'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
