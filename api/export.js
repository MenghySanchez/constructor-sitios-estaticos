import { exportStaticPage, readJsonBody, requireAuth, sendJson, sendMethodNotAllowed } from './_lib/cmsApi.js'

// POST /api/export: genera archivos estaticos temporales en /tmp cuando corre en Vercel.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  if (!requireAuth(req, res)) return

  try {
    const body = await readJsonBody(req)
    const payload = await exportStaticPage(body.projectId, body.site, body.pageId)
    sendJson(res, 200, payload)
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message })
  }
}
