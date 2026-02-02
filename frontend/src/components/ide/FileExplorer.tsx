"use client";

import { useEffect, useState } from "react";
import {
    ChevronRight,
    ChevronDown,
    File,
    Folder,
    FolderOpen,
    FileCode2,
    FileJson,
    FileType,
    RefreshCw,
    Loader2,
    FilePlus,
    FolderPlus,
    Trash2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdeStore, FileNode } from "@/store/ide-store";
import { api } from "@/lib/api";

const FileIcon = ({ name, className }: { name: string; className?: string }) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode2 className={cn("text-blue-400", className)} />;
    if (name.endsWith(".py")) return <FileCode2 className={cn("text-yellow-400", className)} />;
    if (name.endsWith(".java")) return <FileCode2 className={cn("text-orange-400", className)} />;
    if (name.endsWith(".css")) return <FileType className={cn("text-blue-300", className)} />;
    if (name.endsWith(".json")) return <FileJson className={cn("text-yellow-400", className)} />;
    if (name.endsWith(".md")) return <File className={cn("text-sky-300", className)} />;
    return <File className={cn("text-[#cccccc]", className)} />;
};

interface FileTreeItemProps {
    node: FileNode;
    level: number;
    onSelect: (node: FileNode) => void;
    onDelete: (node: FileNode) => void;
    onAddFile: (parentPath: string) => void;
    onAddFolder: (parentPath: string) => void;
}

const FileTreeItem = ({ node, level, onSelect, onDelete, onAddFile, onAddFolder }: FileTreeItemProps) => {
    const [isOpen, setIsOpen] = useState(level === 0);
    const [showActions, setShowActions] = useState(false);
    const { activeFile } = useIdeStore();
    const isSelected = activeFile === node.path;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (node.type === "folder") {
            setIsOpen(!isOpen);
        } else {
            onSelect(node);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(node);
    };

    const handleAddFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddFile(node.path);
        if (!isOpen) setIsOpen(true);
    };

    const handleAddFolder = (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddFolder(node.path);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center py-1 px-2 cursor-pointer select-none text-sm transition-colors hover:bg-[#2a2d2e]",
                    isSelected && "bg-[#094771] text-white"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={handleClick}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                <span className="mr-1.5 opacity-70">
                    {node.type === "folder" ? (
                        isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <span className="w-3.5 inline-block" />
                    )}
                </span>

                <span className="mr-2">
                    {node.type === "folder" ? (
                        isOpen ? (
                            <FolderOpen className="w-4 h-4 text-[#dcb67a]" />
                        ) : (
                            <Folder className="w-4 h-4 text-[#dcb67a]" />
                        )
                    ) : (
                        <FileIcon name={node.name} className="w-4 h-4" />
                    )}
                </span>

                <span className="truncate flex-1">{node.name}</span>

                {/* Action buttons - show on hover */}
                <div className={cn(
                    "flex items-center gap-0.5 opacity-0 transition-opacity",
                    showActions && "opacity-100"
                )}>
                    {node.type === "folder" && (
                        <>
                            <button
                                onClick={handleAddFile}
                                className="p-0.5 hover:bg-[#3c3c3c] rounded"
                                title="New File"
                            >
                                <FilePlus className="w-3 h-3" />
                            </button>
                            <button
                                onClick={handleAddFolder}
                                className="p-0.5 hover:bg-[#3c3c3c] rounded"
                                title="New Folder"
                            >
                                <FolderPlus className="w-3 h-3" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded"
                        title="Delete"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTreeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onAddFile={onAddFile}
                            onAddFolder={onAddFolder}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Input dialog for creating new files/folders
const InputDialog = ({
    isOpen,
    title,
    placeholder,
    onSubmit,
    onClose
}: {
    isOpen: boolean;
    title: string;
    placeholder: string;
    onSubmit: (value: string) => void;
    onClose: () => void;
}) => {
    const [value, setValue] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSubmit(value.trim());
            setValue("");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 w-80 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-[#3c3c3c] rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#007acc]/50"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-1.5 text-xs bg-[#007acc] text-white hover:bg-[#0066b8] rounded"
                        >
                            Create
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Confirm dialog for delete
const ConfirmDialog = ({
    isOpen,
    title,
    message,
    onConfirm,
    onClose
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 w-80 shadow-xl"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-sm font-medium mb-2 text-white">{title}</h3>
                <p className="text-xs text-[#cccccc] mb-4">{message}</p>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white hover:bg-red-700 rounded"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function FileExplorer() {
    const { fileTree, openFile, fetchFileTree, fetchFileContent, isLoadingFiles, isBackendConnected, closeFile, projectId } = useIdeStore();

    // Dialog states
    const [showNewFileDialog, setShowNewFileDialog] = useState(false);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [currentPath, setCurrentPath] = useState("");
    const [itemToDelete, setItemToDelete] = useState<FileNode | null>(null);

    useEffect(() => {
        if (projectId) {
            fetchFileTree();
        }
    }, [fetchFileTree, projectId]);

    const handleFileSelect = async (node: FileNode) => {
        openFile(node.path);
        await fetchFileContent(node.path);
    };

    const handleAddFile = (parentPath: string) => {
        setCurrentPath(parentPath);
        setShowNewFileDialog(true);
    };

    const handleAddFolder = (parentPath: string) => {
        setCurrentPath(parentPath);
        setShowNewFolderDialog(true);
    };

    const handleDelete = (node: FileNode) => {
        setItemToDelete(node);
        setShowDeleteDialog(true);
    };

    const createFile = async (name: string) => {
        if (!projectId) return;
        const path = currentPath ? `${currentPath}/${name}` : name;
        const response = await api.createFile(projectId, path);
        if (response.success) {
            fetchFileTree();
        }
        setShowNewFileDialog(false);
    };

    const createFolder = async (name: string) => {
        if (!projectId) return;
        const path = currentPath ? `${currentPath}/${name}` : name;
        const response = await api.createFolder(projectId, path);
        if (response.success) {
            fetchFileTree();
        }
        setShowNewFolderDialog(false);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !projectId) return;
        const response = await api.deleteItem(projectId, itemToDelete.path);
        if (response.success) {
            closeFile(itemToDelete.path);
            fetchFileTree();
        }
        setItemToDelete(null);
    };

    const handleRootAddFile = () => {
        setCurrentPath("");
        setShowNewFileDialog(true);
    };

    const handleRootAddFolder = () => {
        setCurrentPath("");
        setShowNewFolderDialog(true);
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#252526] min-w-0">
            {/* Header with toolbar */}
            <div className="p-3 text-xs font-semibold text-[#cccccc] uppercase tracking-wider border-b border-[#3c3c3c] flex items-center justify-between">
                <span>EXPLORER</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleRootAddFile}
                        className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                        title="New File"
                    >
                        <FilePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleRootAddFolder}
                        className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => fetchFileTree()}
                        className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
                        title="Refresh"
                    >
                        {isLoadingFiles ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* File tree */}
            <div className="flex-1 overflow-auto py-2">
                {!isBackendConnected && fileTree.length === 0 ? (
                    <div className="p-4 text-xs text-[#6b6b6b] text-center">
                        <p>Connecting to backend...</p>
                        <p className="mt-1 opacity-50">Make sure the server is running on port 3001</p>
                    </div>
                ) : fileTree.length === 0 ? (
                    <div className="p-4 text-xs text-[#6b6b6b] text-center">
                        <p>No files found</p>
                        <button
                            onClick={handleRootAddFile}
                            className="mt-2 px-3 py-1 bg-[#007acc]/20 hover:bg-[#007acc]/30 text-[#007acc] rounded text-xs"
                        >
                            Create first file
                        </button>
                    </div>
                ) : (
                    fileTree.map((node) => (
                        <FileTreeItem
                            key={node.id}
                            node={node}
                            level={0}
                            onSelect={handleFileSelect}
                            onDelete={handleDelete}
                            onAddFile={handleAddFile}
                            onAddFolder={handleAddFolder}
                        />
                    ))
                )}
            </div>

            {/* Dialogs */}
            <InputDialog
                isOpen={showNewFileDialog}
                title="New File"
                placeholder="filename.ts"
                onSubmit={createFile}
                onClose={() => setShowNewFileDialog(false)}
            />
            <InputDialog
                isOpen={showNewFolderDialog}
                title="New Folder"
                placeholder="folder-name"
                onSubmit={createFolder}
                onClose={() => setShowNewFolderDialog(false)}
            />
            <ConfirmDialog
                isOpen={showDeleteDialog}
                title="Delete Item"
                message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
                onConfirm={confirmDelete}
                onClose={() => { setShowDeleteDialog(false); setItemToDelete(null); }}
            />
        </div>
    );
}
