type Wallet = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/**
 * Empty id keeps the browser wallet (D356). A non-empty id opens the
 * WalletConnect QR modal and does not call `window.ethereum`.
 * The modal loads `@reown/appkit/core`, so that package stays a direct
 * dependency at the provider's version (D406).
 */
export async function connectWallet(projectId: string): Promise<Wallet> {
  const id = projectId.trim();
  if (id) {
    const mod = await import("@walletconnect/ethereum-provider");
    const provider = await mod.EthereumProvider.init({
      projectId: id,
      chains: [1],
      optionalChains: [137, 42161, 8453],
      showQrModal: true,
      metadata: {
        name: "INTGETION JOB LIST",
        description: "Pay for a plan",
        url: window.location.origin,
        icons: [`${window.location.origin}/icon.png`],
      },
    });
    await provider.connect();
    return provider;
  }
  const injected = (window as Window & { ethereum?: Wallet }).ethereum;
  if (!injected?.request) throw new Error("wallet");
  await injected.request({ method: "eth_requestAccounts" });
  return injected;
}
