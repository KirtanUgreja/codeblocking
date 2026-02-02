// CodeBlocking High-End Landing Page
// Powered by GSAP & ScrollTrigger & Lenis

document.addEventListener("DOMContentLoaded", () => {
    // 0. Initialize Lenis (Smooth Scroll) - ONLY ON DESKTOP
    // Mobile touch scroll is naturally smooth, and Lenis can cause blocking issues
    let lenis = null;

    if (window.innerWidth > 768) {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // Register GSAP plugins
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.refresh();

    // --- 1. Hero Animations (Entry) ---
    const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });

    heroTl
        .to(".loading", { opacity: 1, duration: 0.1 })
        .from(".announce-pill", { y: -20, opacity: 0, duration: 0.8 }, 0.5)
        .from(".title-line span", { y: 100, opacity: 0, duration: 1, stagger: 0.2 }, 0.6)
        .from(".hero-desc", { y: 20, opacity: 0, duration: 0.8 }, 1.0)
        .from(".hero-btns", { y: 20, opacity: 0, duration: 0.8 }, 1.2)
        .from(".main-card", { y: 100, opacity: 0, rotateX: 20, duration: 1.5, ease: "power2.out" }, 0.8)
        .from(".floating-card", { y: 100, opacity: 0, duration: 1, stagger: 0.2 }, 1.2);


    // --- 2. Hero Parallax (Scroll & Mouse) ---
    gsap.to(".hero-visual", {
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: true
        },
        y: 100,
        ease: "none"
    });

    gsap.to(".floating-card.card-1", {
        scrollTrigger: {
            trigger: ".hero-section",
            start: "top top",
            end: "bottom top",
            scrub: true
        },
        y: -50,
        ease: "none"
    });

    // Mouse Parallax for ALL cards
    document.querySelector(".hero-section").addEventListener("mousemove", (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        gsap.to(".main-card", { rotationY: x, rotationX: -y + 5, duration: 1 });
        gsap.to(".card-1", { x: x * 1.5, y: y * 1.5, duration: 1 });
        gsap.to(".card-2", { x: x * 1.2, y: y * 1.2, duration: 1 });
        gsap.to(".card-3", { x: x * 0.8, y: y * 0.8, duration: 1 });
        gsap.to(".card-4", { x: x * 1.1, y: y * 1.1, duration: 1 });
    });


    // --- 3. Spotlight Effect (Bento Grid) ---
    const cards = document.querySelectorAll("[data-spotlight]");
    cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);
        });
    });

    // --- 4. Section Reveals ---
    gsap.utils.toArray('section').forEach(section => {
        if (section.id === 'hero') return;

        gsap.from(section.querySelectorAll('h2, .bento-card, .section-header p'), {
            scrollTrigger: {
                trigger: section,
                start: "top 80%",
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out"
        });
    });


    // --- 5. Pinned Scroll Section (Workflow) ---
    // --- 5. Pinned Scroll Section (Workflow) ---
    // Use matchMedia for robust responsive behavior (handles resize automatically)
    let mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
        // Desktop: Pin the visual column
        ScrollTrigger.create({
            trigger: ".pinned-section",
            start: "top top",
            end: "bottom bottom",
            pin: ".pinned-visual-col",
            pinSpacing: false,
        });
    });

    const steps = document.querySelectorAll(".step-trigger");
    const screenSteps = document.querySelectorAll(".screen-step");

    steps.forEach((step, index) => {
        ScrollTrigger.create({
            trigger: step,
            start: "top center", // Trigger when step hits center of viewport
            end: "bottom center",
            onToggle: (self) => {
                if (self.isActive) {
                    setActiveStep(index);
                }
            }
        });
    });

    function setActiveStep(index) {
        steps.forEach((s, i) => s.classList.toggle("active", i === index));
        screenSteps.forEach((s, i) => {
            if (i === index) {
                s.classList.add("active");
            } else {
                s.classList.remove("active");
            }
        });
    }

    setActiveStep(0);


    // --- Theme Toggle ---
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const icon = themeToggle.querySelector('i');

    const savedTheme = localStorage.getItem('theme') || 'dark';
    htmlElement.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    function updateIcon(theme) {
        icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
});
