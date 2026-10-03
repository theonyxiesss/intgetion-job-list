import { z } from "zod";
import { isValidTimeZone } from "@/lib/tz";

const csv = (schema: z.ZodType<string>) => z.preprocess(
  (value) => typeof value === "string" ? value.split(",").filter(Boolean) : value,
  z.array(schema).max(20).optional(),
);
export const jobSearchQuery = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.enum(["engineering","data","design","product","marketing","sales","support","operations","finance","hr"]).optional(),
  skills: csv(z.string().uuid()),
  workFormat: csv(z.enum(["remote","hybrid","onsite"])),
  employmentType: csv(z.enum(["full_time","part_time","contract"])),
  tzOverlapWith: z.string().refine(isValidTimeZone).optional(),
  minOverlap: z.coerce.number().int().min(0).max(12).default(3),
  salaryMin: z.string().regex(/^(0|[1-9]\d{0,17})$/).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  period: z.enum(["hour","month","year"]).optional(),
  basis: z.enum(["gross","net"]).optional(),
  country: z.string().regex(/^[A-Z]{2}$/).optional(),
  source: z.enum(["internal","imported"]).optional(),
  postedWithin: z.enum(["1","7","30"]).transform(Number).optional(),
  sort: z.enum(["relevance","newest","salary"]).default("newest"),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).superRefine((value, ctx) => {
  if (value.salaryMin && !(value.currency && value.period && value.basis))
    ctx.addIssue({ code: "custom", path: ["currency"], message: "salary_metadata_required" });
});
export type JobSearchQuery = z.infer<typeof jobSearchQuery>;
