export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateOnly(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const CARD_STATUS_LABEL: Record<string, string> = {
  pending_activation: "Pending activation",
  activation_pending: "Activation pending",
  active: "Active",
  suspended: "Suspended",
  expired: "Expired",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  payment_pending: "Payment pending",
  paid: "Paid",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};
