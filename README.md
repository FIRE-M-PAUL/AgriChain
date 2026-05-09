# AGRICHAIN - Solana Proof-of-Origin MVP

AGRICHAIN is a lightweight hackathon-ready agricultural traceability app:
- farmer records crop
- metadata stored off-chain (Supabase PostgreSQL + Storage)
- immutable proof stored on Solana Devnet (Anchor program)
- buyer verifies using QR scan + on-chain proof check

This repo is optimized for a 3-minute Solana demo.

## Solana-First Architecture

### Off-chain (Supabase)
Fast application data:
- crop name
- quantity
- QR link
- product display data

### On-chain (Solana Devnet)
Immutable trust layer:
- `product_id`
- `farmer_wallet`
- `crop_hash`
- `timestamp`
- `verification_status`

## Project Structure

- `frontend/` React + Vite + Tailwind MVP app (`/`, `/farmer`, `/scan`)
- `solana/` Anchor workspace and deployment config
- `programs/agrichain_proof_program/lib.rs` top-level program mirror
- `anchor/` Anchor setup/deployment notes

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, `@solana/web3.js`
- Wallet: Phantom
- Data: Supabase (Postgres + Storage + Realtime)
- Blockchain: Solana Devnet + Anchor Rust program
- Voice Input: browser speech recognition + ElevenLabs-ready config hook
- QR: `react-qr-code`, `@yudiel/react-qr-scanner`

## Solana Program

- Name: `agrichain_proof_program`
- Source: `solana/programs/agrichain_proof_program/src/lib.rs`
- Instructions:
  - `record_product_proof(product_id, crop_hash)`
  - `verify_product(product_id)`
- PDA seeds:
  - `["proof", product_id]`

### Program ID workflow

The repo ships with a placeholder devnet-compatible ID for local wiring.
After your real deploy, replace it in:
- `solana/programs/agrichain_proof_program/src/lib.rs` (`declare_id!`)
- `solana/Anchor.toml` (`[programs.devnet].agrichain_proof_program`)
- frontend env (`VITE_SOLANA_PROGRAM_ID`)

```bash
VITE_SOLANA_PROGRAM_ID=<DEPLOYED_DEVNET_PROGRAM_ID>
```

## Local Setup

### 1) Frontend

```bash
cd frontend
npm install
copy .env.example .env.development
npm run dev
```

### 2) Solana + Anchor

```bash
cd solana
yarn install
anchor build
anchor deploy --provider.cluster devnet
```

Then paste the deployed program ID into:
- `frontend/.env.development`
- `frontend/.env.production.example`

### 3) Supabase

1. Create a Supabase project and open **SQL Editor**.
2. Run `supabase/migrations/20250509120000_agrichain_mvp.sql` (schema, RLS, RPC, buckets).
3. In **Database → Replication**, enable realtime for tables `products` (and optionally `farmers`).
4. Set keys in frontend env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## Required Frontend Environment Variables

```bash
VITE_APP_ENV=development

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=

VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_SOLANA_PROGRAM_ID=
VITE_SOLANA_EXPLORER_BASE_URL=https://explorer.solana.com

VITE_ELEVENLABS_API_KEY=
```

## Note

This MVP runs without a Python/Django backend. Data flow is:
- Supabase (Postgres + Storage + Realtime) for metadata and marketplace state
- Solana Devnet for immutable proof

## Demo Flow (3 minutes)

1. Open landing page (`/`)
2. Connect Phantom wallet
3. Go to `/farmer`
4. Speak: "10 bags of maize" (voice input)
5. Generate QR
6. Submit proof to Solana Devnet (transaction signed in Phantom)
7. Open `/scan`
8. Scan QR (or paste product ID)
9. Show:
   - crop metadata (Supabase)
   - Solana proof status
   - wallet verified
   - timestamp verified
   - explorer transaction link

## Solana Devnet Deployment Checklist

```bash
# 1) Install Solana + Anchor first
solana --version
anchor --version

# 2) Point Solana to devnet
solana config set --url https://api.devnet.solana.com

# 3) Ensure wallet has SOL for deploy
solana airdrop 2

# 4) Build + deploy
cd solana
anchor build
anchor deploy --provider.cluster devnet
```

Save these in README/screenshots for judges:
- deployed Program ID
- a devnet explorer tx hash from `record_product_proof`
- a screenshot of scan page showing `Solana Verified`

## Solana Judging Alignment

- Real Rust + Anchor program included
- Wallet-based signing with Phantom
- Devnet-ready on-chain proof storage
- Meaningful SDK usage in frontend (`@solana/web3.js`)
- Clear hybrid architecture (Supabase + Solana)
- Live demo-friendly UX

## Hackathon Submission Pack

### What judges should verify

1. `solana/programs/agrichain_proof_program/src/lib.rs` exists and compiles with Anchor.
2. Program is deployed on Devnet and Program ID is configured in frontend env.
3. Farmer can connect Phantom and submit `record_product_proof`.
4. Buyer scan flow reads Supabase metadata and validates on-chain proof.
5. Explorer tx link is visible after proof submission.

### Required screenshots for submission

1. Landing page (AGRICHAIN branding + CTA buttons).
2. Farmer page with connected Phantom wallet.
3. Product creation + generated QR code.
4. Phantom transaction approval popup.
5. Solana explorer transaction confirmation (Devnet).
6. Scan page showing:
   - `Solana Verified`
   - wallet verified
   - timestamp verified

### 3-minute live demo script

**0:00 - 0:30 | Problem + architecture**
- "AGRICHAIN solves fake crop traceability records by splitting data:
  Supabase for metadata speed, Solana for immutable trust."

**0:30 - 1:20 | Farmer flow**
- Connect Phantom wallet.
- Enter or speak: "10 bags of maize".
- Generate record and QR.
- Submit proof transaction to Solana Devnet.

**1:20 - 2:10 | On-chain trust proof**
- Show transaction confirmation.
- Open explorer link and show proof tx.
- Highlight product hash + farmer wallet ownership.

**2:10 - 3:00 | Buyer verification**
- Scan QR.
- Retrieve metadata.
- Verify proof against Solana PDA record.
- Show final status: `Solana Verified`.

### Solana prize qualification mapping

- **Real Solana program**: Anchor Rust program in `solana/programs/.../lib.rs`.
- **Wallet integration**: Phantom wallet signs proof submission transactions.
- **Meaningful chain usage**: immutable product proof hash + wallet + timestamp.
- **Live utility**: buyer scan verifies authenticity from on-chain record.
- **Demo readiness**: single-flow UX from farmer recording to buyer verification.

### Submission note template

Use this text in your hackathon form:

> AGRICHAIN is a Solana-powered proof-of-origin MVP for agriculture.  
> We store crop metadata in Supabase for fast UX and anchor immutable proof
> records on Solana Devnet via a custom Anchor Rust program
> (`record_product_proof`, `verify_product`).  
> Farmers connect Phantom, record crops, sign proof transactions, and generate QR codes.
> Buyers scan and instantly verify authenticity through on-chain proof matching.
