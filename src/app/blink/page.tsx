import BlinkClient from "./BlinkClient";

export const dynamic = "force-dynamic";

/**
 * Minimal, self-contained Blink client.
 *
 * Public clients (dial.to, X, wallets) may be unreachable or cannot open a
 * localhost/LAN action URL, so the demo ships its own renderer for the same
 * Solana Action defined at /api/actions/donate.
 */
export default function BlinkPage() {
  return <BlinkClient />;
}
