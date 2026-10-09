import { NextRequest } from "next/server";
import { ApiError, fail, json } from "@/lib/api";
import { effectiveStatus } from "@/lib/aid";
import { requireRole } from "@/lib/auth";
import { createRequest, snapshot, update } from "@/lib/store";
import type { AidCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: AidCategory[] = ["food", "transport"];

export async function GET() {
  try {
    const data = await snapshot();
    const requests = [...data.requests]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((request) => {
        const voucher = data.vouchers.find((v) => v.id === request.voucherId);
        return {
          ...request,
          voucher: voucher
            ? { ...voucher, status: effectiveStatus(voucher) }
            : undefined,
        };
      });
    return json({ requests });
  } catch (error) {
    return fail(error);
  }
}

/** Create a new aid request. Accepts only pseudonymous beneficiary references. */
export async function POST(req: NextRequest) {
  try {
    await requireRole("org");
    const body = (await req.json().catch(() => ({}))) as {
      beneficiaryRef?: string;
      category?: string;
      amountUsd?: number;
      note?: string;
    };

    const beneficiaryRef = (body.beneficiaryRef ?? "").trim();
    if (beneficiaryRef.length < 2 || beneficiaryRef.length > 40) {
      throw new ApiError("beneficiaryRef must be 2-40 characters", 400);
    }

    const category = body.category as AidCategory;
    if (!CATEGORIES.includes(category)) {
      throw new ApiError("category must be 'food' or 'transport'", 400);
    }

    const amountUsd = Number(body.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 500) {
      throw new ApiError("amountUsd must be between 0 and 500", 400);
    }

    const note = body.note?.trim();
    if (note && note.length > 200) {
      throw new ApiError("note must be at most 200 characters", 400);
    }

    const request = await update((data) =>
      createRequest(data, { beneficiaryRef, category, amountUsd, note }),
    );

    return json({ request }, 201);
  } catch (error) {
    return fail(error);
  }
}
