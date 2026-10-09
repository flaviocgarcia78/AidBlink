export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/60">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">
          AidBlink — emergency aid in a single link
        </p>
        <p className="mt-2 max-w-3xl">
          Hackathon prototype. Contributions are real Solana Devnet
          transactions; benefit vouchers and partner redemption are simulated.
          No personally identifiable information is written on-chain.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Not a financial product. Not affiliated with any real aid
          organization. Built on Solana Blinks / Actions.
        </p>
      </div>
    </footer>
  );
}
