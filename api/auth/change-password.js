import { requireAuth, sendJson, sendMethodNotAllowed } from '../_lib/cmsApi.js'

// POST /api/auth/change-password: en Vercel no puede modificar auth.json persistente.
export default function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  if (!requireAuth(req, res)) return

  sendJson(res, 501, {
    ok: false,
    error: 'En Vercel cambia la clave desde Environment Variables: SB_ADMIN_PASSWORD o SB_ADMIN_PASSWORD_HASH.',
  })
}
