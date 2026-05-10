import { createProject, deleteProject, loadProjectsManifest, loadSite, readJsonBody, requireAuth, sendJson, sendMethodNotAllowed } from './_lib/cmsApi.js'

// /api/projects: lista proyectos o crea uno nuevo.
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    const manifest = await loadProjectsManifest()
    const projects = await Promise.all(
      manifest.projects.map(async (project) => {
        try {
          const site = await loadSite(project.id)
          return { ...project, pageCount: site.pages.length }
        } catch {
          return { ...project, pageCount: 0 }
        }
      }),
    )

    sendJson(res, 200, { ok: true, ...manifest, projects })
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

  if (req.method === 'DELETE') {
    try {
      const body = await readJsonBody(req)
      const payload = await deleteProject(body.projectId)
      sendJson(res, 200, { ok: true, ...payload })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
    return
  }

  sendMethodNotAllowed(res)
}
