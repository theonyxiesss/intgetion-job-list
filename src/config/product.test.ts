import { describe, expect, it } from "vitest";
import { flags } from "@/config/flags";
import { PRODUCT_NAME } from "@/config/product";

describe("product", () => {
  it("keeps the official product name", () => {
    expect(PRODUCT_NAME).toBe("INTGETION JOB LIST");
  });

  it("keeps embeddings and live import off unless the env value is true", () => {
    expect(flags.embeddingsEnabled).toBe(false);
    expect(flags.importLiveEnabled).toBe(false);
  });
});
