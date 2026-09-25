import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-7 w-7", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="web3-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="oklch(0.78 0.126 208)" />
          <stop offset="100%" stopColor="oklch(0.58 0.2 258)" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        stroke="url(#web3-mark)"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M7 10.5L11.4 21.5L16 13.2L20.6 21.5L25 10.5"
        stroke="url(#web3-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-[0.14em] text-foreground">
        WEB3
      </span>
    </span>
  );
}
