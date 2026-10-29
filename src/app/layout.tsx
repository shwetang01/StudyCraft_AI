import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyCraft AI | Interactive AI Study Assistant & Adaptive Quiz Engine',
  description:
    'Turn notes and topics into 3D interactive flashcards, adaptive quizzes with wrong-answer re-testing, and concept mastery checklists with resilient AI structured output.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div className="ambient-glow" />
        <div className="ambient-glow-secondary" />
        {children}
      </body>
    </html>
  );
}
