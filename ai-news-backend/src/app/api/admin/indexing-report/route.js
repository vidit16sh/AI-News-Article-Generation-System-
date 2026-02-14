import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const QUALITY = {
  minIndexConfidence: 0.75,
  staleDays: 14,
  staleConfidence: 0.85,
  minOriginalityForPublish: 0.6,
};

const daysAgo = (days) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt;
};

const toArticleSummary = (row, baseUrl) => ({
  id: row.id,
  headline: row.headline,
  slug: row.slug,
  status: row.status,
  confidenceScore: row.confidenceScore,
  originalityScore: row.originalityScore,
  priorityScore: row.priorityScore,
  publishAt: row.publishAt,
  updatedAt: row.updatedAt,
  url: `${baseUrl}/news/${row.slug}`,
});

export async function GET(request) {
  try {
    const secret = process.env.API_SECRET_KEY;
    const authHeader = request.headers.get("x-admin-key");

    if (!secret || authHeader !== secret) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
    const staleCutoff = daysAgo(QUALITY.staleDays);

    const [indexableCount, noindexCount, queuedBlockedCount] = await Promise.all([
      prisma.generatedArticle.count({
        where: {
          status: "PUBLISHED",
          confidenceScore: { gte: QUALITY.minIndexConfidence },
          OR: [
            { publishAt: { gte: staleCutoff } },
            { confidenceScore: { gte: QUALITY.staleConfidence } },
          ],
        },
      }),
      prisma.generatedArticle.count({
        where: {
          OR: [
            { status: { not: "PUBLISHED" } },
            { confidenceScore: { lt: QUALITY.minIndexConfidence } },
            {
              AND: [
                { publishAt: { lt: staleCutoff } },
                { confidenceScore: { lt: QUALITY.staleConfidence } },
              ],
            },
          ],
        },
      }),
      prisma.generatedArticle.count({
        where: {
          status: "QUEUED",
          OR: [
            { confidenceScore: { lt: QUALITY.minIndexConfidence } },
            { originalityScore: { lt: QUALITY.minOriginalityForPublish } },
          ],
        },
      }),
    ]);

    const [indexableSamples, noindexSamples, queuedBlockedSamples] = await Promise.all([
      prisma.generatedArticle.findMany({
        where: {
          status: "PUBLISHED",
          confidenceScore: { gte: QUALITY.minIndexConfidence },
          OR: [
            { publishAt: { gte: staleCutoff } },
            { confidenceScore: { gte: QUALITY.staleConfidence } },
          ],
        },
        orderBy: { publishAt: "desc" },
        take: 15,
        select: {
          id: true,
          headline: true,
          slug: true,
          status: true,
          confidenceScore: true,
          originalityScore: true,
          priorityScore: true,
          publishAt: true,
          updatedAt: true,
        },
      }),
      prisma.generatedArticle.findMany({
        where: {
          OR: [
            { status: { not: "PUBLISHED" } },
            { confidenceScore: { lt: QUALITY.minIndexConfidence } },
            {
              AND: [
                { publishAt: { lt: staleCutoff } },
                { confidenceScore: { lt: QUALITY.staleConfidence } },
              ],
            },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: {
          id: true,
          headline: true,
          slug: true,
          status: true,
          confidenceScore: true,
          originalityScore: true,
          priorityScore: true,
          publishAt: true,
          updatedAt: true,
        },
      }),
      prisma.generatedArticle.findMany({
        where: {
          status: "QUEUED",
          OR: [
            { confidenceScore: { lt: QUALITY.minIndexConfidence } },
            { originalityScore: { lt: QUALITY.minOriginalityForPublish } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: {
          id: true,
          headline: true,
          slug: true,
          status: true,
          confidenceScore: true,
          originalityScore: true,
          priorityScore: true,
          publishAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      thresholds: QUALITY,
      summary: {
        indexableStrongPages: indexableCount,
        noindexedWeakOrOldPages: noindexCount,
        queuedBlockedByQuality: queuedBlockedCount,
      },
      samples: {
        indexableStrongPages: indexableSamples.map((row) => toArticleSummary(row, baseUrl)),
        noindexedWeakOrOldPages: noindexSamples.map((row) => toArticleSummary(row, baseUrl)),
        queuedBlockedByQuality: queuedBlockedSamples.map((row) => toArticleSummary(row, baseUrl)),
      },
    });
  } catch (error) {
    console.error("Indexing report error:", error);
    return NextResponse.json({ message: "Error generating indexing report" }, { status: 500 });
  }
}
