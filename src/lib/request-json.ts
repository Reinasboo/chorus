export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 16_384) return { ok: false };

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 16_384) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(body) as unknown };
  } catch (error) {
    if (error instanceof SyntaxError) return { ok: false };
    throw error;
  }
}
