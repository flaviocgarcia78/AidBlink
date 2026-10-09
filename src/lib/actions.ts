import { env } from "./env";
import { formatSol } from "./money";

/**
 * Helpers for the Solana Actions / Blinks specification.
 *
 * @see https://solana.com/docs/advanced/actions
 */

export const ACTIONS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.1.3",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", // devnet
};

export const SOL_AMOUNTS = [0.05, 0.1, 0.25];

export function actionIconUrl(): string {
  return `${env.appUrl}/aidblink-icon.svg`;
}

export function donateActionUrl(amount?: number): string {
  const base = `${env.appUrl}/api/actions/donate`;
  return amount ? `${base}?amount=${amount}` : base;
}

/** Build the Blink metadata document returned by GET. */
export function buildActionGetResponse() {
  return {
    type: "action" as const,
    icon: actionIconUrl(),
    title: "AidBlink — Emergency aid",
    description:
      "Contribute SOL to a transparent aid pool. Funds become one-time food or transport vouchers for people in need. No crypto knowledge required on the receiving side.",
    label: "Contribute",
    links: {
      actions: [
        ...SOL_AMOUNTS.map((amount) => ({
          type: "transaction" as const,
          label: formatSol(amount),
          href: donateActionUrl(amount),
        })),
        {
          type: "transaction" as const,
          label: "Custom amount",
          href: donateActionUrl(),
          parameters: [
            {
              name: "amount",
              label: "Amount in SOL",
              required: true,
              type: "number" as const,
              min: 0.001,
              max: 100,
            },
          ],
        },
      ],
    },
  };
}
