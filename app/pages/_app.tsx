import "@/styles/globals.css";
import type { AppProps } from "next/app";
import * as React from "react";
import { HeroUIProvider } from "@heroui/system";

export default function App({ Component, pageProps }: AppProps) {
    return (
        <HeroUIProvider>
            <main className="app-shell dark text-foreground bg-background">
                <Component {...pageProps} />
            </main>
        </HeroUIProvider>
    );
}
