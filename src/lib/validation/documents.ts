import { z } from "zod";

export const DOCUMENT_TYPES = ["asset", "register"] as const;
export const GENERATION_STATUSES = ["pending", "generating", "ready", "failed"] as const;

export const documentSearchSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().slice(0, 100) : ""),
    z.string().transform((value) => (value === "" ? null : value)),
  ),
  document_type: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(DOCUMENT_TYPES)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
  ),
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(GENERATION_STATUSES)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
  ),
  page: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? 1 : value),
    z.coerce.number().int().min(1),
  ),
  per_page: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? 25 : value),
    z.coerce.number().int().min(1).max(100),
  ),
});

export type DocumentSearchInput = z.infer<typeof documentSearchSchema>;

/** Parses URL search params; invalid input falls back to defaults instead of throwing. */
export function parseDocumentSearch(
  params: Record<string, string | string[] | undefined>,
): DocumentSearchInput {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value.length > 0) flat[key] = value[0];
  }

  const parsed = documentSearchSchema.safeParse(flat);
  return parsed.success ? parsed.data : documentSearchSchema.parse({});
}
