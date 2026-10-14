---
name: walletconnect
description: >-
  INTGETION JOB LIST crypto checkout with WalletConnect and the AppKit QR modal.
  Use when the task mentions WalletConnect, Reown, AppKit, the pay QR, crypto
  checkout, /billing/crypto, COMPANY_WALLET, or the pay-page content security policy.
---

# WalletConnect checkout

USDT or USDC goes to one company EVM address. The server checks the receipt. The browser never marks a plan paid.

`AGENTS.md` and `docs/tz/23-billing.md` win if they disagree with this skill.

## How the modal opens

`src/modules/billing/ui/connect-wallet.ts`

- Empty `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: `window.ethereum` only (D356). Do not open WalletConnect.
- Non-empty id: `@walletconnect/ethereum-provider` with `showQrModal: true`, `chains: [1]`, `optionalChains: [137, 42161, 8453]`.
- That call imports `@reown/appkit/core`. `@reown/appkit` stays a direct dependency at the version the provider already uses (1.8.19). Do not bump it alone.
- Do not add wagmi, RainbowKit, or AppKit React.

## Env

Names only. Never print values, and never commit `.env.local`.

Checkout is on only when `BILLING_ENABLED` is `true`, `BILLING_CRYPTO_PROVIDER` is `walletconnect`, and `COMPANY_WALLET_ADDRESS` is set. Also required: `BILLING_TOKEN_CONTRACTS`, `RPC_URL_ETHEREUM`, `RPC_URL_POLYGON`, `RPC_URL_ARBITRUM`, `RPC_URL_BASE`, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.

On localhost, `NEXT_PUBLIC_SITE_URL` stays `http://localhost:3000`. Another origin breaks CSRF and login.

Do not invent Tron or Solana recipient addresses. Production stores those as secrets the CLI does not return. Base has official USDC only, no official USDT.

A payment from localhost is a real transfer to the same company wallet as the live site.

## CSP

Only `isCryptoPayPath` (`src/lib/crypto-pay-path.ts`) may allow these hosts (D403, D406). Every other page must not mention walletconnect, web3modal, or reown.

On the pay page:

- connect-src: `wss://relay.walletconnect.org`, both verify hosts, `https://rpc.walletconnect.org`, `https://api.web3modal.org`, `https://secure.walletconnect.org`
- frame-src: the two verify hosts
- font-src: `https://fonts.reown.com`
- img-src: `https://api.web3modal.org` and `https://walletconnect.org`
- style-src adds `'unsafe-inline'` because AppKit's Lit sheets have no nonce. script-src stays nonce-only

Do not add `pulse.walletconnect.org`.

## Stop

Deploy, Vercel env writes, and printing a secret still need the founder's yes in this request (D405). Do not treat a "paid" string in the browser as success.
