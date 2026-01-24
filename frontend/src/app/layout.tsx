import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import './globals.css';
import '../styles/components.css';

export const metadata: Metadata = {
    title: 'Local Web IDE',
    description: 'Local-first browser-based IDE',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <AppProvider>{children}</AppProvider>
            </body>
        </html>
    );
}
