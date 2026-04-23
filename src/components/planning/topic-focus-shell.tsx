// Focus-mode container — listens for Esc to exit.
import { useEffect } from "react";

interface Props {
  active: boolean;
  onExit: () => void;
  children: React.ReactNode;
}

export function TopicFocusShell({ active, onExit, children }: Props) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, onExit]);

  if (!active) return <>{children}</>;
  return (
    <div className="mx-auto w-full max-w-3xl">
      {children}
    </div>
  );
}
