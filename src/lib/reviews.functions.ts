import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
  .validator((d?: { status?: "pending" | "approved" | "rejected" | "all" }) => d)
  .handler(async ({ data }): Promise<ReviewRecord[]> => {
    const { adminGetReviews } = await import("./reviews.server");
    return adminGetReviews(data?.status);
  });

export const adminModerateReview = createServerFn({ method: "POST" })
  .validator(
    (d: {
      reviewId: string;
      action: "approve" | "reject" | "delete";
      adminId?: string;
    }) => d
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { adminModerateReview: moderate } = await import("./reviews.server");
    return moderate(data.reviewId, data.action, data.adminId);
  });
