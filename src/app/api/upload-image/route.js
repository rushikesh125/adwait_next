import { requireAuthenticatedUser } from "@/lib/serverAuth";

export async function POST(req) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (err) {
    console.error("[upload-image] Auth failed:", err.message);
    return Response.json({ error: err.message }, { status: err.status || 401 });
  }

  // ── 2. Parse multipart form ───────────────────────────────────────────────
  let formData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("[upload-image] Failed to parse form data:", err.message);
    return Response.json({ error: "Invalid form data.", details: err.message }, { status: 400 });
  }

  const image = formData.get("image");
  if (!image) {
    console.error("[upload-image] No image field in form data. Fields received:", [...formData.keys()]);
    return Response.json({ error: "image field is required." }, { status: 400 });
  }

  console.log("[upload-image] File received:", {
    name: image.name,
    type: image.type,
    size: `${(image.size / 1024).toFixed(1)} KB`,
  });

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    console.error("[upload-image] IMGBB_API_KEY is not set in environment variables.");
    return Response.json({ error: "Image upload service is not configured." }, { status: 503 });
  }

  // ── 3. Convert File → base64 ──────────────────────────────────────────────
  let base64;
  try {
    const arrayBuffer = await image.arrayBuffer();
    base64 = Buffer.from(arrayBuffer).toString("base64");
    console.log("[upload-image] Converted to base64, length:", base64.length);
  } catch (err) {
    console.error("[upload-image] Failed to convert image to base64:", err.message);
    return Response.json({ error: "Failed to process image.", details: err.message }, { status: 500 });
  }

  // ── 4. Forward to ImgBB ───────────────────────────────────────────────────
  let res;
  let data;
  try {
    const imgbbForm = new FormData();
    imgbbForm.append("image", base64);

    console.log("[upload-image] Sending request to ImgBB...");
    res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: imgbbForm,
    });

    data = await res.json();

    console.log("[upload-image] ImgBB response:", {
      status: res.status,
      ok: res.ok,
      success: data?.success,
      error: data?.error ?? null,
      url: data?.data?.display_url ?? null,
    });
  } catch (err) {
    console.error("[upload-image] Network error calling ImgBB:", err.message);
    return Response.json(
      { error: "Failed to reach image upload service.", details: err.message },
      { status: 502 }
    );
  }

  // ── 5. Handle ImgBB error response ───────────────────────────────────────
  if (!res.ok || !data?.success) {
    const imgbbError = data?.error?.message || data?.error || "Unknown ImgBB error";
    console.error("[upload-image] ImgBB rejected the upload:", {
      httpStatus: res.status,
      imgbbError,
      fullResponse: data,
    });
    return Response.json(
      { error: "Image upload rejected.", details: imgbbError, raw: data },
      { status: res.status }
    );
  }

  console.log("[upload-image] Upload successful:", data.data.display_url);
  return Response.json(data, { status: 200 });
}