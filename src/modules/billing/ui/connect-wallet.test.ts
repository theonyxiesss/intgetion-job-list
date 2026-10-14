import { afterEach, describe, expect, it, vi } from "vitest";
import { connectWallet } from "./connect-wallet";

const { init, connect } = vi.hoisted(() => ({
  init: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("@walletconnect/ethereum-provider", () => ({
  EthereumProvider: {
    init: (...args: unknown[]) => init(...args),
  },
}));

describe("connectWallet", () => {
  afterEach(() => {
    init.mockReset();
    connect.mockReset();
    vi.unstubAllGlobals();
  });

  it("uses the injected wallet when the project id is empty", async () => {
    const request = vi.fn(async () => ["0xabc"]);
    vi.stubGlobal("window", { ethereum: { request } });

    const wallet = await connectWallet("");

    expect(init).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    expect(wallet).toEqual({ request });
  });

  it("opens the WalletConnect QR modal when the project id is set", async () => {
    const provider = { connect, request: vi.fn() };
    init.mockResolvedValue(provider);
    connect.mockResolvedValue(undefined);
    vi.stubGlobal("window", {
      location: { origin: "https://intgetion.com" },
    });

    const wallet = await connectWallet("project-id");

    expect(init).toHaveBeenCalledWith({
      projectId: "project-id",
      chains: [1],
      optionalChains: [137, 42161, 8453],
      showQrModal: true,
      metadata: {
        name: "INTGETION JOB LIST",
        description: "Pay for a plan",
        url: "https://intgetion.com",
        icons: ["https://intgetion.com/icon.png"],
      },
    });
    expect(connect).toHaveBeenCalledOnce();
    expect(wallet).toBe(provider);
  });
});
