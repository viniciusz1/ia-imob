import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.REVALIDATION_SECRET;

function verifySignature(signature: string, body: string): boolean {
    if (!SECRET) return false;

    const expected = createHmac("sha256", SECRET).update(body).digest("hex");

    try {
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!SECRET) {
        return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get("x-revalidation-signature");

    if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    if (!verifySignature(signature, body)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    let payload: { tags?: string[]; tag?: string };
    try {
        payload = JSON.parse(body);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const tags = payload.tags ?? (payload.tag ? [payload.tag] : []);

    if (tags.length === 0) {
        return NextResponse.json({ error: "No tags provided" }, { status: 400 });
    }

    const revalidated: string[] = [];
    const failed: string[] = [];

    for (const tag of tags) {
        try {
            revalidateTag(tag, "default");
            revalidated.push(tag);
        } catch {
            failed.push(tag);
        }
    }

    return NextResponse.json({
        revalidated,
        failed: failed.length > 0 ? failed : undefined,
    });
}
