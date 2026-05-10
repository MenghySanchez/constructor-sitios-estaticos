import { createProject, loadProjectsManifest, readJsonBody, requireAuth, sendJson, sendMethodNotAllowed } from './_lib/cmsApi.js'

// /api/projects: lista proyectos o crea uno nuevo.
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    const manifest = await loadProjectsManifest()
    sendJson(res, 200, { ok: true, ...manifest })
    return
  }

  if (req.method === 'POST') {
    try {
      const body = await readJsonBody(req)
      const payload = await createProject(body.name)
      sendJson(res, 200, { ok: true, ...payload })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
    return
  }

  sendMethodNotAllowed(res)
}
