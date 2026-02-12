import { useEffect, useRef, useCallback } from "react";

export function CursorGlow() {
    const glowRef = useRef<HTMLDivElement>(null);
    const pulseRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef({ x: 0, y: 0 });
    const currentRef = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number>(0);
    const visibleRef = useRef(false);
    const animatingRef = useRef(false);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = useCallback(() => {
        const el = glowRef.current;
        if (!el) return;

        const dx = targetRef.current.x - currentRef.current.x;
        const dy = targetRef.current.y - currentRef.current.y;

        // Stop animating when close enough
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            currentRef.current = { ...targetRef.current };
            el.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px)`;
            animatingRef.current = false;
            return;
        }

        currentRef.current.x = lerp(currentRef.current.x, targetRef.current.x, 0.04);
        currentRef.current.y = lerp(currentRef.current.y, targetRef.current.y, 0.04);
        el.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px)`;

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    const startAnimation = useCallback(() => {
        if (!animatingRef.current) {
            animatingRef.current = true;
            rafRef.current = requestAnimationFrame(tick);
        }
    }, [tick]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            targetRef.current = { x: e.clientX, y: e.clientY };

            if (!visibleRef.current && glowRef.current) {
                // Jump to position on first appearance (no lerp lag)
                currentRef.current = { x: e.clientX, y: e.clientY };
                glowRef.current.style.opacity = "1";
                visibleRef.current = true;
            }

            startAnimation();
        };

        const handleMouseLeave = () => {
            if (glowRef.current) {
                glowRef.current.style.opacity = "0";
                visibleRef.current = false;
            }
        };

        const handleClick = (e: MouseEvent) => {
            const el = pulseRef.current;
            if (!el) return;

            el.style.left = `${e.clientX}px`;
            el.style.top = `${e.clientY}px`;

            el.classList.remove("cursor-pulse-animate");
            void el.offsetWidth;
            el.classList.add("cursor-pulse-animate");
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        document.documentElement.addEventListener("mouseleave", handleMouseLeave);
        window.addEventListener("click", handleClick, { passive: true });

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
            window.removeEventListener("click", handleClick);
            cancelAnimationFrame(rafRef.current);
        };
    }, [startAnimation]);

    return (
        <>
            <div
                ref={glowRef}
                aria-hidden
                className="cursor-glow"
                style={{ opacity: 0 }}
            />
            <div
                ref={pulseRef}
                aria-hidden
                className="cursor-pulse"
            />
        </>
    );
}
