# AGRICHAIN Anchor Workspace Notes

This repository keeps the executable Anchor workspace in:

- `solana/`

and exposes a top-level program source mirror in:

- `programs/agrichain_proof_program/lib.rs`

## Build and Deploy (Devnet)

```bash
cd solana
yarn install
anchor build
anchor deploy --provider.cluster devnet
```

After deploy:

1. Copy deployed program id.
2. Update:
   - `solana/Anchor.toml` (`[programs.devnet]`)
   - `solana/programs/agrichain_proof_program/src/lib.rs` (`declare_id!`)
   - frontend env: `VITE_SOLANA_PROGRAM_ID`
