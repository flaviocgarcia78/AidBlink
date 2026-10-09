use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::{
    constants::*,
    error::ErrorCode,
    state::{Donation, Pool},
};

#[derive(Accounts)]
#[instruction(lamports: u64, memo: String, nonce: u64)]
pub struct Donate<'info> {
    /// The contributing wallet. Also pays rent for the donation record.
    #[account(mut)]
    pub donor: Signer<'info>,

    /// The pool must be declared before the treasury so its fields are loaded
    /// when the `address = pool.treasury` constraint below runs.
    #[account(mut, seeds = [POOL_SEED], bump = pool.bump)]
    pub pool: Account<'info, Pool>,

    /// Must be the treasury recorded when the pool was initialized. Prevents a
    /// caller from redirecting contributions to another wallet.
    /// CHECK: validated against `pool.treasury` by the constraint below.
    #[account(mut, address = pool.treasury)]
    pub treasury: UncheckedAccount<'info>,

    /// One account per contribution; the nonce is chosen by the client.
    #[account(
        init,
        payer = donor,
        space = 8 + Donation::INIT_SPACE,
        seeds = [DONATION_SEED, donor.key().as_ref(), nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub donation: Account<'info, Donation>,

    pub system_program: Program<'info, System>,
}

pub fn handle_donate(
    ctx: Context<Donate>,
    lamports: u64,
    memo: String,
    _nonce: u64,
) -> Result<()> {
    require!(lamports > 0, ErrorCode::InvalidAmount);
    require!(memo.len() <= MAX_MEMO_LEN, ErrorCode::MemoTooLong);

    // Move the funds to the treasury atomically with recording the donation.
    transfer(
        CpiContext::new(
            system_program::ID,
            Transfer {
                from: ctx.accounts.donor.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        lamports,
    )?;

    let pool = &mut ctx.accounts.pool;
    let donation = &mut ctx.accounts.donation;

    donation.donor = ctx.accounts.donor.key();
    donation.lamports = lamports;
    donation.index = pool.donation_count;
    donation.timestamp = Clock::get()?.unix_timestamp;
    donation.memo = memo;
    donation.bump = ctx.bumps.donation;

    pool.total_lamports = pool
        .total_lamports
        .checked_add(lamports)
        .ok_or(ErrorCode::CounterOverflow)?;
    pool.donation_count = pool
        .donation_count
        .checked_add(1)
        .ok_or(ErrorCode::CounterOverflow)?;

    msg!(
        "Donation #{} recorded: {} lamports from {}",
        donation.index,
        lamports,
        donation.donor
    );
    Ok(())
}
