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

- The browser wallet comes first on a wide screen (D422): EIP-6963 announcements, MetaMask (`io.metamask`) if several, then legacy `window.ethereum`. A found wallet opens without the QR.
- Phone layout (`max-width: 767px`) opens the WalletConnect window even when an extension is installed (D425). The extension popup does not appear on that layout. A page already inside a wallet app (`MetaMaskMobile`, Trust, Coinbase Wallet, Phantom, TokenPocket) still uses that app's provider. The phone sheet covers the header and the tab bar, drops the library blur (it hides the wallet names on iPhone), and puts the search field on its own row so the placeholder is not cut off (D432).
- Empty `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: browser wallet only (D356). Do not open WalletConnect.
- Non-empty id and no browser wallet, the phone layout, or the user pressed "phone wallet (QR)" (`route: "qr"`): `@walletconnect/ethereum-provider` with `showQrModal: true`, `qrModalOptions.enableMobileFullScreen: true`, `chains: [1]`, `optionalChains: [137, 42161, 8453]`. Full screen keeps the sheet above the phone tab bar. That modal lists WalletConnect wallets only, never the extension.
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
- img-src: `blob:`, `https://api.web3modal.org` and `https://walletconnect.org`. AppKit fetches each wallet icon and shows it as a `blob:` URL; without `blob:` the icons are broken (D422)
- style-src is `'self' 'unsafe-inline'` with **no nonce**: AppKit appends its theme `<style>` tags without one, and a browser ignores `'unsafe-inline'` when a nonce sits in the same list (D420). script-src stays nonce-only

Do not add `pulse.walletconnect.org`.

## Stop

Deploy, Vercel env writes, and printing a secret still need the founder's yes in this request (D405). Do not treat a "paid" string in the browser as success.
