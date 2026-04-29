import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { ok: true, service: "simap", db: "up" },
      { status: 200 },
    );
  } catch {
    return Response.json(
      { ok: false, service: "simap", db: "down" },
      { status: 503 },
    );
  }
}
