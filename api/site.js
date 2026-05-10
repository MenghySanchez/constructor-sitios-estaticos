import { loadSite, readJsonBody, requireAuth, saveSite, sendJson, sendMethodNotAllowed } from './_lib/cmsApi.js'

// /api/site: carga o guarda el JSON del proyecto activo.
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    try {
      const projectId = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).searchParams.get('projectId')
      const site = await loadSite(projectId)
      sendJson(res, 200, { ok: true, site })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const site = await saveSite(body.projectId, body.site)
      sendJson(res, 200, { ok: true, site })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
    return
  }

  sendMethodNotAllowed(res)
}
