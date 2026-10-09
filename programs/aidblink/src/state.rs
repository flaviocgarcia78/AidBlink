use anchor_lang::prelude::*;

/// Singleton state of the aid pool. Address is `[b"pool"]`.
#[account]
#[derive(InitSpace)]
pub struct Pool {
    /// Account allowed to (re)configure the pool.
    pub authority: Pubkey,
    /// Wallet that actually receives contributions.
    pub treasury: Pubkey,
    /// Lifetime lamports contributed through the program.
    pub total_lamports: u64,
    /// Number of contributions recorded.
    pub donation_count: u64,
    pub bump: u8,
}

/// One contribution, stored on-chain and readable with `getProgramAccounts`.
/// Address is `[b"donation", donor, nonce]`.
#[account]
#[derive(InitSpace)]
pub struct Donation {
    pub donor: Pubkey,
    pub lamports: u64,
    /// Monotonic index assigned from the pool counter.
    pub index: u64,
    /// Unix timestamp of the contribution.
    pub timestamp: i64,
    #[max_len(200)]
    pub memo: String,
    pub bump: u8,
}
