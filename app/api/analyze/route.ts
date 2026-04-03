import { analyzeClaim } from "@/lib/pipeline";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawClaim = body?.claim;

    if (!rawClaim || typeof rawClaim !== "string" || !rawClaim.trim()) {
      return Response.json({ error: "claim is required" }, { status: 400 });
    }

    const result = await analyzeClaim(rawClaim.trim());
    return Response.json(result);
  } catch {
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
