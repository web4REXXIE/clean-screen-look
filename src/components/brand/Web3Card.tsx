import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

type Props = {
  holder?: string;
  last4?: string;
  expiry?: string;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED";
  className?: string;
  tilt?: boolean;
};

function Chip() {
  return (
    <div className="relative h-9 w-12 overflow-hidden rounded-[6px] bg-[linear-gradient(135deg,oklch(0.88_0.09_92),oklch(0.72_0.11_82))] shadow-inner">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-0 right-0 top-1/3 h-px bg-background/50" />
        <div className="absolute left-0 right-0 top-2/3 h-px bg-background/50" />
        <div className="absolute bottom-0 left-1/3 top-0 w-px bg-background/50" />
        <div className="absolute bottom-0 right-1/3 top-0 w-px bg-background/50" />
      </div>
    </div>
  );
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-foreground/70" fill="none" aria-hidden="true">
      <path d="M7 8a7 7 0 0 1 0 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M11 6a11 11 0 0 1 0 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15 4a15 15 0 0 1 0 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function Web3Card({
  holder = "WEB3 CARDHOLDER",
  last4 = "1234",
  expiry = "12/28",
  status = "PENDING",
  className,
  tilt = false,
}: Props) {
  const statusTone =
    status === "ACTIVE"
      ? "border-success/40 bg-success/15 text-success"
      : status === "SUSPENDED"
        ? "border-destructive/40 bg-destructive/15 text-destructive"
        : "border-warning/40 bg-warning/15 text-warning";

  return (
    <div className={cn("group [perspective:1600px]", className)}>
      <div
        className={cn(
          "relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl border border-border/70 p-5 transition-transform duration-500 will-change-transform sm:p-7",
          "bg-[linear-gradient(145deg,oklch(0.30_0.06_262),oklch(0.19_0.05_263)_52%,oklch(0.24_0.07_246))]",
          "shadow-[0_30px_80px_-30px_oklch(0.10_0.05_262/0.9)]",
          tilt &&
            "[transform:rotateX(9deg)_rotateY(-14deg)] group-hover:[transform:rotateX(4deg)_rotateY(-7deg)]",
        )}
      >
        {/* holographic sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px opacity-70 mix-blend-screen"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 18%, color-mix(in oklab, var(--accent) 30%, transparent) 38%, transparent 52%, color-mix(in oklab, var(--primary) 34%, transparent) 66%, transparent 82%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(120deg, transparent 0 9px, color-mix(in oklab, var(--accent) 22%, transparent) 9px 10px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-foreground/10"
        />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <LogoMark className="h-6 w-6" />
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-[0.16em]">WEB3</p>
                <p className="text-[9px] tracking-[0.28em] text-muted-foreground">
                  DIGITAL CARD
                </p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-semibold tracking-[0.16em]",
                statusTone,
              )}
            >
              {status}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Chip />
            <Contactless />
          </div>

          <div>
            <p className="mono text-base tracking-[0.18em] text-foreground/90 sm:text-xl">
              •••• •••• •••• {last4}
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[8px] tracking-[0.22em] text-muted-foreground">
                  CARDHOLDER
                </p>
                <p className="truncate text-xs font-medium tracking-[0.1em] sm:text-sm">
                  {holder}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] tracking-[0.22em] text-muted-foreground">
                  VALID THRU
                </p>
                <p className="mono text-xs sm:text-sm">{expiry}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
