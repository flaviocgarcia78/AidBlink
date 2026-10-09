pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg");

/// AidBlink on-chain contribution ledger.
///
/// Every contribution to the aid pool is registered on Solana as its own
/// `Donation` account, so the "Recent contributions" list is read straight from
/// the chain — no database, no trust in the client. Funds themselves are moved
/// to the treasury wallet in the same atomic instruction.
#[program]
pub mod aidblink {
    use super::*;

    /// Create the singleton pool account that tracks the treasury and totals.
    pub fn initialize_pool(ctx: Context<InitializePool>, treasury: Pubkey) -> Result<()> {
        crate::instructions::initialize_pool::handle_initialize_pool(ctx, treasury)
    }

    /// Record a contribution on-chain and transfer the SOL to the treasury.
    pub fn donate(
        ctx: Context<Donate>,
        lamports: u64,
        memo: String,
        nonce: u64,
    ) -> Result<()> {
        crate::instructions::donate::handle_donate(ctx, lamports, memo, nonce)
    }
}
