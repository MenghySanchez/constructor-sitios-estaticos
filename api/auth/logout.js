import { buildSessionCookie, sendJson, sendMethodNotAllowed } from '../_lib/cmsApi.js'

// POST /api/auth/logout: borra la cookie de sesion.
export default function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  res.setHeader('Set-Cookie', buildSessionCookie('', 0))
  sendJson(res, 200, { ok: true })
}
