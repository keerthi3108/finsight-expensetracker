/** Fast health check — no Express/MongoDB (avoids cold-start timeout). */
export default function handler(req, res) {
  res.status(200).json({ ok: true, platform: "vercel" });
}
