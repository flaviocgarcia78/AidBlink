use anchor_lang::prelude::*;

use crate::{constants::*, state::Pool};

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_pool(ctx: Context<InitializePool>, treasury: Pubkey) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.authority = ctx.accounts.authority.key();
    pool.treasury = treasury;
    pool.total_lamports = 0;
    pool.donation_count = 0;
    pool.bump = ctx.bumps.pool;

    msg!("AidBlink pool initialized. treasury={}", treasury);
    Ok(())
}
