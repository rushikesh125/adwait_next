import { requireAuthenticatedUser } from "@/lib/serverAuth";

export async function POST(req) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  let requester;
  try {
    requester = await requireAuthenticatedUser(req);
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status || 401 });
  }

  // ── 2. Parse multipart form ───────────────────────────────────────────────
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const image = formData.get("image");
  if (!image) {
    return Response.json({ error: "image field is required." }, { status: 400 });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Image upload service is not configured." }, { status: 503 });
  }

  // ── 3. Forward to ImgBB ───────────────────────────────────────────────────
  const imgbbForm = new FormData();
  imgbbForm.append("image", image);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: imgbbForm,
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
