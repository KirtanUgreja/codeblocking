'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FileNode } from '@/types';

interface FileTreeNodeProps {
    node: FileNode;
    selectedPath: string | null;
    onSelect: (path: string, isDirectory: boolean) => void;
    onDelete: (path: string, name: string) => void;
}

function FileTreeNode({ node, selectedPath, onSelect, onDelete }: FileTreeNodeProps) {
    const { openFile, activeFilePath } = useApp();
    const [hovering, setHovering] = useState(false);
    const [expanded, setExpanded] = useState(true);

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node.isDirectory) {
            openFile(node.path);
        } else {
            setExpanded(!expanded);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.path, node.isDirectory);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(node.path, node.name);
    };

    const icon = node.isDirectory ? (expanded ? '📂' : '📁') : '📄';
    const isOpened = activeFilePath === node.path; // Currently open in editor
    const isSelected = selectedPath === node.path; // Currently selected in tree

    // Calculate indentation
    const depth = node.path.split('/').length - 1;
    const paddingLeft = depth * 16 + 8;

    return (
        <div>
            <div
                className={`file-node ${isSelected ? 'selected' : ''} ${isOpened ? 'active-file' : ''}`}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                    paddingLeft: `${paddingLeft}px`,
                    position: 'relative',
                    background: isSelected ? 'rgba(124, 92, 255, 0.15)' : undefined
                }}
            >
                <span className="file-node-icon" style={{ opacity: node.name.startsWith('.') ? 0.5 : 1 }}>
                    {icon}
                </span>
                <span className="file-node-name" style={{ color: isOpened ? 'var(--accent-primary)' : undefined }}>
                    {node.name}
                </span>
                {hovering && (
                    <button
                        className="delete-file-btn"
                        onClick={handleDelete}
                        title="Delete"
                        style={{
                            position: 'absolute',
                            right: '8px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: 0.8,
                            fontSize: '12px',
                        }}
                    >
                        🗑️
                    </button>
                )}
            </div>
            {node.isDirectory && expanded && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FileExplorer() {
    const { fileTree, loadFileTree, createNewFile, deleteFile } = useApp();
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'file' | 'folder'>('file');
    const [newItemName, setNewItemName] = useState('');

    // Track selected item path for relative creation
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [selectedIsDirectory, setSelectedIsDirectory] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);

    useEffect(() => {
        loadFileTree();
    }, []);

    const handleSelect = (path: string, isDirectory: boolean) => {
        setSelectedPath(path);
        setSelectedIsDirectory(isDirectory);
    };

    const handleCreate = async () => {
        if (!newItemName.trim()) return;

        try {
            // Determine parent directory
            let parentDir = '';
            if (selectedPath) {
                if (selectedIsDirectory) {
                    parentDir = selectedPath; // Create inside selected folder
                } else {
                    // Create in peer directory if file selected
                    const parts = selectedPath.split('/');
                    parts.pop();
                    parentDir = parts.join('/');
                }
            }

            // Construct full path
            const cleanParent = parentDir ? parentDir + '/' : '';
            const fullPath = `${cleanParent}${newItemName}`;

            if (modalType === 'file') {
                await createNewFile(fullPath, '');
            } else {
                await createNewFile(`${fullPath}/.gitkeep`, '');
            }
            setShowModal(false);
            setNewItemName('');
            loadFileTree();
        } catch (error) {
            console.error('Failed to create:', error);
        }
    };

    const handleDelete = (path: string, name: string) => {
        setDeleteTarget({ path, name });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget) {
            try {
                await deleteFile(deleteTarget.path);
                setShowDeleteConfirm(false);
                setDeleteTarget(null);
                if (selectedPath === deleteTarget.path) {
                    setSelectedPath(null);
                }
            } catch (error) {
                console.error('Failed to delete:', error);
            }
        }
    };

    // Calculate display path for modal
    const getCreationPath = () => {
        if (!selectedPath) return 'root';
        if (selectedIsDirectory) return selectedPath;
        const parts = selectedPath.split('/');
        parts.pop();
        return parts.join('/') || 'root';
    };

    return (
        <div className="file-explorer" onClick={() => setSelectedPath(null)}>
            <div className="file-explorer-header" onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>EXPLORER</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        className="icon-button"
                        onClick={() => {
                            setModalType('file');
                            setShowModal(true);
                        }}
                        title="New File"
                    >
                        📄
                    </button>
                    <button
                        className="icon-button"
                        onClick={() => {
                            setModalType('folder');
                            setShowModal(true);
                        }}
                        title="New Folder"
                    >
                        📁
                    </button>
                    <button
                        className="icon-button"
                        onClick={() => loadFileTree()}
                        title="Refresh"
                    >
                        ↻
                    </button>
                </div>
            </div>

            <div className="file-tree">
                {fileTree.length === 0 && (
                    <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                        No files in workspace
                    </div>
                )}
                {fileTree.map((node) => (
                    <FileTreeNode
                        key={node.path}
                        node={node}
                        selectedPath={selectedPath}
                        onSelect={handleSelect}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>New {modalType === 'file' ? 'File' : 'Folder'}</h3>
                        <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Creating in: <code style={{ color: 'var(--accent-primary)' }}>{getCreationPath()}</code>
                        </div>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={modalType === 'file' ? 'filename.ext' : 'folder-name'}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setShowModal(false);
                            }}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button className="modal-button" onClick={handleCreate}>
                                Create
                            </button>
                            <button className="modal-button" onClick={() => setShowModal(false)} style={{ background: 'transparent' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && deleteTarget && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete {deleteTarget.name}?</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                            This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="modal-button"
                                onClick={confirmDelete}
                                style={{ background: 'var(--color-error)', borderColor: 'var(--color-error)' }}
                            >
                                Delete
                            </button>
                            <button className="modal-button" onClick={() => setShowDeleteConfirm(false)} style={{ background: 'transparent' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
