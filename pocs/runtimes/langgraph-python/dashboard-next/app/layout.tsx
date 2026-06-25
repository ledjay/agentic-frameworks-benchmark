import "./styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AnSu · LangGraph Runtime",
  description: "Dashboard de test LangGraph/LangChain pour AnSu v5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
