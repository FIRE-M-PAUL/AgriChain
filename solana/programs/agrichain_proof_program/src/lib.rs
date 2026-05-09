use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZQ6v8hF7s1M4fP7fJ8k7m");

#[program]
pub mod agrichain_proof_program {
    use super::*;

    pub fn record_product_proof(
        ctx: Context<RecordProductProof>,
        product_id: String,
        crop_hash: [u8; 32],
    ) -> Result<()> {
        require!(!product_id.is_empty(), AgrichainError::InvalidProductId);
        require!(product_id.len() <= ProofRecord::MAX_PRODUCT_ID_LEN, AgrichainError::ProductIdTooLong);

        let proof = &mut ctx.accounts.proof_record;
        proof.product_id = product_id;
        proof.farmer_wallet = ctx.accounts.farmer.key();
        proof.crop_hash = crop_hash;
        proof.timestamp = Clock::get()?.unix_timestamp;
        proof.verification_status = true;
        proof.bump = ctx.bumps.proof_record;
        Ok(())
    }

    pub fn verify_product(_ctx: Context<VerifyProduct>, _product_id: String) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(product_id: String)]
pub struct RecordProductProof<'info> {
    #[account(
        init_if_needed,
        payer = farmer,
        space = ProofRecord::LEN,
        seeds = [b"proof", product_id.as_bytes()],
        bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
    #[account(mut)]
    pub farmer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(product_id: String)]
pub struct VerifyProduct<'info> {
    #[account(
        seeds = [b"proof", product_id.as_bytes()],
        bump = proof_record.bump
    )]
    pub proof_record: Account<'info, ProofRecord>,
}

#[account]
pub struct ProofRecord {
    pub product_id: String,
    pub farmer_wallet: Pubkey,
    pub crop_hash: [u8; 32],
    pub timestamp: i64,
    pub verification_status: bool,
    pub bump: u8,
}

impl ProofRecord {
    pub const MAX_PRODUCT_ID_LEN: usize = 64;
    pub const LEN: usize =
        8 + // discriminator
        4 + Self::MAX_PRODUCT_ID_LEN + // string
        32 + // farmer wallet
        32 + // crop hash
        8 + // timestamp
        1 + // verification_status
        1; // bump
}

#[error_code]
pub enum AgrichainError {
    #[msg("Product id must not be empty.")]
    InvalidProductId,
    #[msg("Product id is too long.")]
    ProductIdTooLong,
}
