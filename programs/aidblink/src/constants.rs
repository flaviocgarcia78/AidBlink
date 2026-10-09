use anchor_lang::prelude::*;

#[constant]
pub const POOL_SEED: &[u8] = b"pool";

#[constant]
pub const DONATION_SEED: &[u8] = b"donation";

/// Upper bound for a contribution note. Keeps the account size predictable and
/// prevents users from bloating the ledger.
pub const MAX_MEMO_LEN: usize = 200;
