import type { Metadata } from "next";
import "./globals.css";
import { CopilotKitProvider } from "@/components/CopilotKitProvider";

export const metadata: Metadata = {
  title: "Memorang Learning Agent",
  description: "AI-powered interactive learning from PDF documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CopilotKitProvider>{children}</CopilotKitProvider>
      </body>
    </html>
  );
}
