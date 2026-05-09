# AGRICHAIN Solana Program (Anchor)

Program name: `agrichain_proof_program`

## Instructions

1. `record_product_proof(product_id, crop_hash)`
   - Stores:
     - `product_id`
     - `farmer_wallet`
     - `crop_hash`
     - `timestamp`
     - `verification_status`

2. `verify_product(product_id)`
   - Read-only validation against PDA.

## PDA

`proof_record` PDA seeds:
- `"proof"`
- `product_id.as_bytes()`

## Build and deploy (devnet)

```bash
cd solana
yarn install
anchor build
anchor deploy --provider.cluster devnet
```

After deployment, update frontend env:

```bash
VITE_SOLANA_PROGRAM_ID=<your-devnet-program-id>
```
