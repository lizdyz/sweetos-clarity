import { useEffect, useState, useRef } from "react";

export type SeedQuestion = {
  id: string;
  code: string;
  prompt: string;
  hint: string | null;
  question_type: string;
  badge: string;
};

type Props = {
  question: SeedQuestion;
  initialValue?: string;
  onSave: (value: string) => Promise<void> | void;
};

export function SeedQuestionRenderer({ question, initialValue = "", onSave }: Props) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === initialValue) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(async () => {
      await onSave(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const isUpload = question.question_type === "upload" || question.badge === "upload";
  const isShort = question.question_type === "short_text";

  return (
    <div className="sp-question">
      <div className="flex items-center justify-between">
        <span className="sp-code">{question.code}</span>
        <span className={`sp-badge ${question.badge}`}>{question.badge}</span>
      </div>
      <p className="sp-prompt">{question.prompt}</p>
      {question.hint && <p className="sp-hint">{question.hint}</p>}
      {isUpload ? (
        <input
          type="text"
          placeholder="Paste a link, or describe what you'd attach (uploads coming soon)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : isShort ? (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your answer…"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Take your time. There's no wrong answer."
        />
      )}
      <div className="sp-saving" style={{ marginTop: 6, minHeight: 14 }}>
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved ✓"}
      </div>
    </div>
  );
}
