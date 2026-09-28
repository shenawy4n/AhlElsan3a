import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicReview, ProviderRatingSummary, ReviewRecord } from "./reviews.server";

export const getProviderReviews = createServerFn({ method: "GET" })
  .validator((d: { providerId: string }) => d)
  .handler(async ({ data }): Promise<PublicReview[]> => {
    const { getProviderApprovedReviews } = await import("./reviews.server");
    return getProviderApprovedReviews(data.providerId);
  });

export const getProviderRatingSummary = createServerFn({ method: "GET" })
  .validator((d: { providerId: string }) => d)
  .handler(async ({ data }): Promise<ProviderRatingSummary> => {
    const { getProviderRatingSummary: getSummary } = await import("./reviews.server");
    return getSummary(data.providerId);
  });

export const getAllProvidersRatingSummaries = createServerFn({ method: "GET" })
  .handler(async (): Promise<Record<string, ProviderRatingSummary>> => {
    const { getAllRatingSummaries } = await import("./reviews.server");
    return getAllRatingSummaries();
  });

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d?: { status?: "pending" | "approved" | "rejected" | "all" }) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).optional() }).optional().parse(d)
  )
  .handler(async ({ data, context }): Promise<ReviewRecord[]> => {
    const { data: level } = await context.supabase.rpc("my_admin_level");
    if (!level) throw new Error("Forbidden");
    const { adminGetReviews } = await import("./reviews.server");
    return adminGetReviews(data?.status);
  });

export const adminModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { reviewId: string; action: "approve" | "reject" | "delete"; adminId?: string }) =>
    z.object({ reviewId: z.string().uuid(), action: z.enum(["approve", "reject", "delete"]) }).parse(d)
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    // Database functions verify the caller is an admin and write the audit log.
    const fn = data.action === "approve" ? "approve_review" : data.action === "reject" ? "reject_review" : "delete_review";
    const { error } = await context.supabase.rpc(fn, { _review_id: data.reviewId });
    return { ok: !error };
  });
