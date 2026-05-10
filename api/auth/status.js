import { getAdminUsername, getSession, sendJson, sendMethodNotAllowed } from '../_lib/cmsApi.js'

// GET /api/auth/status: informa si la cookie de sesion es valida.
export default function handler(req, res) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res)
    return
  }

  sendJson(res, 200, { ok: true, authenticated: Boolean(getSession(req)), username: getAdminUsername() })
}
