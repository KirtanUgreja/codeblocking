"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
    className,
    ...props
}: React.ComponentProps<typeof Group>) => (
    <Group
        className={cn(
            "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
            className
        )}
        {...props}
    />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
    withHandle,
    className,
    ...props
}: React.ComponentProps<typeof Separator> & {
    withHandle?: boolean;
}) => (
    <Separator
        className={cn(
            "relative flex items-center justify-center bg-transparent transition-all z-50",
            "data-[panel-group-direction=vertical]:h-4 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
            "data-[panel-group-direction=horizontal]:w-4 data-[panel-group-direction=horizontal]:h-full data-[panel-group-direction=horizontal]:cursor-col-resize",
            "after:absolute after:inset-0 after:content-['']",
            "before:absolute before:bg-border",
            "data-[panel-group-direction=vertical]:before:h-px data-[panel-group-direction=vertical]:before:w-full",
            "data-[panel-group-direction=horizontal]:before:w-px data-[panel-group-direction=horizontal]:before:h-full",
            className
        )}
        {...props}
    >
        {withHandle && (
            <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border shadow-sm pointer-events-none">
                <div className="h-2.5 w-2.5 bg-foreground/20" />
            </div>
        )}
    </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
