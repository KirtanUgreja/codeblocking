import { FileNode } from "@/store/ide-store";

export const initialFileTree: FileNode[] = [
    {
        id: "root",
        name: "root",
        type: "folder",
        children: [
            {
                id: "src",
                name: "src",
                type: "folder",
                children: [
                    {
                        id: "components",
                        name: "components",
                        type: "folder",
                        children: [
                            { id: "Button.tsx", name: "Button.tsx", type: "file", language: "typescript" },
                            { id: "Header.tsx", name: "Header.tsx", type: "file", language: "typescript" },
                        ]
                    },
                    { id: "App.tsx", name: "App.tsx", type: "file", language: "typescript" },
                    { id: "main.tsx", name: "main.tsx", type: "file", language: "typescript" },
                    { id: "index.css", name: "index.css", type: "file", language: "css" },
                ]
            },
            {
                id: "public",
                name: "public",
                type: "folder",
                children: [
                    { id: "vite.svg", name: "vite.svg", type: "file", language: "xml" }
                ]
            },
            { id: "package.json", name: "package.json", type: "file", language: "json" },
            { id: "tsconfig.json", name: "tsconfig.json", type: "file", language: "json" },
            { id: "README.md", name: "README.md", type: "file", language: "markdown" },
        ]
    }
];
