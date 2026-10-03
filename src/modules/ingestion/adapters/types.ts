export type RawImportedJob = {
  externalId: string;
  companyName: string;
  companyDomain: string | null;
  title: string;
  description: string;
  category: string;
  skills: string[];
  applyUrl: string;
  expiresAt: string | null;
};

export interface ImportAdapter {
  readonly sourceName: string;
  readonly kind: "api" | "rss";
  loadFixture(): Promise<RawImportedJob[]>;
}
