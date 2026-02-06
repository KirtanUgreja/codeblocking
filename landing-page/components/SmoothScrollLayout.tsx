"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

export default function SmoothScrollLayout({ children }: { children: React.ReactNode }) {
    useLayoutEffect(() => {
        gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

        // Create the smooth scroller
        const smoother = ScrollSmoother.create({
            wrapper: "#smooth-wrapper",
            content: "#smooth-content",
            smooth: 1.5, // Smoothness intensity
            effects: true,
            normalizeScroll: true,
        });

        return () => {
            // Cleanup if needed (though ScrollSmoother is usually global)
            if (smoother) smoother.kill();
        };
    }, []);

    return (
        <div id="smooth-wrapper">
            <div id="smooth-content">
                {children}
            </div>
        </div>
    );
}
