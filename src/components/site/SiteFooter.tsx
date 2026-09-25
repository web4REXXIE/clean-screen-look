import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">
            WEB3 is a digital identity and card-management platform. Card activation
            is an account-management service and is not a deposit, investment, or
            fund-release product.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link to="/card" className="hover:text-foreground">
            Digital card
          </Link>
          <Link to="/how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link to="/security" className="hover:text-foreground">
            Security
          </Link>
          <Link to="/support" className="hover:text-foreground">
            Support
          </Link>
          <Link to="/auth" className="hover:text-foreground">
            Login
          </Link>
        </nav>
      </div>
      <div className="border-t border-border/70 px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} WEB3 Card Activation. Service fees are disclosed
        before payment.
      </div>
    </footer>
  );
}
