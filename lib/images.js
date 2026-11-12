import "server-only";
import { NextResponse } from "next/server";
import { httpError } from "./kv";

// Pictures are uploaded as small data URLs (the admin's browser resizes them first)
// and kept in the database, so there's no separate file storage to set up.
export const MAX_IMAGE_BYTES = 450 * 1024;

export function checkDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    throw httpError("Pictures must be JPEG, PNG or WebP", 400);
  }
  if (dataUrl.length > MAX_IMAGE_BYTES * 1.37) throw httpError("That picture is too large", 413);
  return dataUrl;
}

export function imageResponse(dataUrl, { cache = true } = {}) {
  const [, mime, b64] = dataUrl.match(/^data:([^;]+);base64,(.*)$/) || [];
  if (!mime) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const headers = { "Content-Type": mime };
  if (cache) {
    // URLs carry a version, so a picture never changes under the same URL.
    headers["Cache-Control"] = "public, max-age=86400, immutable";
    headers["CDN-Cache-Control"] = "public, max-age=86400";
  } else {
    headers["Cache-Control"] = "no-store";
  }
  return new NextResponse(Buffer.from(b64, "base64"), { headers });
}

export const version = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
