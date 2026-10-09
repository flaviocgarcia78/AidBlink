use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Donation amount must be greater than zero")]
    InvalidAmount,
    #[msg("Memo exceeds the maximum length")]
    MemoTooLong,
    #[msg("Arithmetic overflow while updating pool totals")]
    CounterOverflow,
}
