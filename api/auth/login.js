import { buildSessionCookie, createSessionToken, getAdminUsername, readJsonBody, sendJson, sendMethodNotAllowed, verifyPassword } from '../_lib/cmsApi.js'

// POST /api/auth/login: valida credenciales y crea cookie HttpOnly.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  try {
    const body = await readJsonBody(req)
    const username = getAdminUsername()

    if (body.username !== username || !verifyPassword(body.password)) {
      sendJson(res, 401, { ok: false, error: 'Usuario o contrasena incorrectos' })
      return
    }

    res.setHeader('Set-Cookie', buildSessionCookie(createSessionToken(username), 28800))
    sendJson(res, 200, { ok: true, username })
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message })
  }
}
