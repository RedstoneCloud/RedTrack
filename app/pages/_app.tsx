import "@/styles/globals.css";
import type { AppProps } from "next/app";
import * as React from "react";
import { useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import { CursorGlow } from "@/components/CursorGlow";

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        const block = (e: Event) => e.preventDefault();
        document.addEventListener("contextmenu", block);
        document.addEventListener("dragstart", block);
        return () => {
            document.removeEventListener("contextmenu", block);
            document.removeEventListener("dragstart", block);
        };
    }, []);

    return (
        <HeroUIProvider>
            <main className="app-shell dark text-foreground bg-background">
                <CursorGlow />
                <Component {...pageProps} />
            </main>
        </HeroUIProvider>
    );
}
