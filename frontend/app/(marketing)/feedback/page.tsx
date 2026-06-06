import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata = {
  title: "Feedback — Code Arena",
  description: "Report a bug, suggest a feature, or share an idea.",
};

export default function FeedbackPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-2 font-mono text-[10px] tracking-[0.3em] text-[var(--color-neon-pink)]">
        // FEEDBACK
      </div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--color-text-1)]">
        Send Feedback
      </h1>
      <p className="mb-10 text-sm text-[var(--color-text-3)]">
        Bug, suggestion, or idea — anything helps. All fields are optional.
      </p>
      <FeedbackForm />
    </main>
  );
}
