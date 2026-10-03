/**
 * One job as a source delivers it, before normalization. Adapters only
 * reshape fields; every rule lives in normalize/dedup (13.1, D70).
 */
export type RawImportedJob = {
  externalId: string;
  companyName: string;
  companyDomain: string | null;
  title: string;
  description: string;
  category: string;
  employmentType: string | null;
  timeZone: string | null;
  skills: string[];
  applyUrl: string;
  expiresAt: string | null;
};

export interface ImportAdapter {
  readonly sourceName: string;
  readonly kind: "api" | "rss";
  /** 8A reads fixtures only; there is no network fetch (D18). */
  loadFixture(): Promise<RawImportedJob[]>;
}
