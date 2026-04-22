import { cn } from "@/lib/utils";

interface BizzybotAvatarProps {
  emoji?: string | null;
  accentColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-3xl",
};

export function BizzybotAvatar({
  emoji,
  accentColor,
  size = "md",
  className,
}: BizzybotAvatarProps) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-2xl shadow-[var(--shadow-glass)] ring-1 ring-white/40",
        sizeClasses[size],
        className,
      )}
      style={{
        background: accentColor
          ? `linear-gradient(135deg, ${accentColor}, color-mix(in oklab, ${accentColor} 60%, white))`
          : "linear-gradient(135deg, var(--iris-violet), var(--iris-pink))",
      }}
    >
      <span className="drop-shadow-sm">{emoji ?? "✨"}</span>
    </div>
  );
}
