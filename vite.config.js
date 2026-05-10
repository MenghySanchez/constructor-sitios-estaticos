import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createDefaultSite, createId, normalizeSite, slugify } from './src/cms/siteDefaults.js'
import { buildStaticPage } from './src/exporter/staticExporter.js'

// Este usuario inicial permite entrar al piloto sin base de datos.
// Cambia la clave despues si vas a exponer el admin en una red real.
const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'

// Esta funcion lee el body JSON de un request del middleware de Vite.
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

// Esta funcion envia respuestas JSON desde la API local.
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload, null, 2))
}

// Esta funcion crea hashes tipo CMS flat-file: salt + PBKDF2, sin base de datos.
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const iterations = 310000
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`
}

// Esta funcion valida una clave contra el hash guardado en cms-data/auth.json.
function verifyPassword(password, passwordHash) {
  const [algorithm, iterations, salt, storedHash] = String(passwordHash || '').split('$')

  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !storedHash) return false

  const candidate = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
  const stored = Buffer.from(storedHash, 'hex')

  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate)
}

// Esta funcion parsea cookies del request para leer la sesion firmada.
function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((cookie) => cookie.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  )
}

// Esta funcion firma un token temporal con el secreto local del auth.json.
function createSessionToken(username, secret) {
  const payload = Buffer.from(JSON.stringify({ username, exp: Date.now() + 1000 * 60 * 60 * 8 })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

// Esta funcion comprueba que la cookie no fue manipulada y no expiro.
function verifySessionToken(token, secret) {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return false

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  const validSignature =
    signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  if (!validSignature) return false

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return session.exp > Date.now() ? session : false
  } catch {
    return false
  }
}

// Este plugin agrega endpoints locales solo para desarrollo.
// El navegador no puede escribir archivos por seguridad; por eso usamos Node aqui.
function staticBuilderApiPlugin() {
  return {
    name: 'static-builder-api',
    configureServer(server) {
      const rootDir = server.config.root
      const dataDir = path.join(rootDir, 'cms-data')
      const authFile = path.join(dataDir, 'auth.json')
      const projectsFile = path.join(dataDir, 'projects.json')
      const projectsDir = path.join(dataDir, 'projects')
      const exportDir = path.join(rootDir, 'exports')

      // Esta funcion garantiza que exista el usuario local sin usar base de datos.
      async function loadAuth() {
        try {
          return JSON.parse(await fs.readFile(authFile, 'utf-8'))
        } catch {
          const auth = {
            username: DEFAULT_USERNAME,
            passwordHash: hashPassword(DEFAULT_PASSWORD),
            secret: crypto.randomBytes(32).toString('hex'),
          }

          await fs.mkdir(dataDir, { recursive: true })
          await fs.writeFile(authFile, JSON.stringify(auth, null, 2))
          return auth
        }
      }

      // Esta funcion protege endpoints privados con la cookie firmada.
      async function requireAuth(req, res) {
        const auth = await loadAuth()
        const token = parseCookies(req).sb_session
        const session = verifySessionToken(token, auth.secret)

        if (!session) {
          sendJson(res, 401, { ok: false, error: 'Sesion invalida o expirada' })
          return false
        }

        return true
      }

      // Esta funcion devuelve la ruta fisica donde se guarda el site.json de un proyecto.
      function getProjectSiteFile(project) {
        return path.join(projectsDir, project.slug, 'site.json')
      }

      // Esta funcion crea la metadata de proyecto que se guarda en projects.json.
      function createProjectMeta(name) {
        return {
          id: createId('project'),
          name: name || 'Nuevo proyecto',
          slug: slugify(name || 'nuevo-proyecto'),
          createdAt: new Date().toISOString(),
        }
      }

      // Esta funcion evita slugs repetidos al crear varios proyectos con nombres similares.
      function makeUniqueSlug(projects, baseSlug) {
        let slug = baseSlug
        let counter = 2

        while (projects.some((project) => project.slug === slug)) {
          slug = `${baseSlug}-${counter}`
          counter += 1
        }

        return slug
      }

      // Esta funcion carga el indice de proyectos y migra el site.json viejo si existia.
      async function loadProjectsManifest() {
        try {
          return JSON.parse(await fs.readFile(projectsFile, 'utf-8'))
        } catch {
          await fs.mkdir(dataDir, { recursive: true })
          await fs.mkdir(projectsDir, { recursive: true })

          try {
            const legacyRaw = await fs.readFile(path.join(dataDir, 'site.json'), 'utf-8')
            const legacyProject = createProjectMeta('Proyecto migrado')
            const manifest = { projects: [legacyProject], currentProjectId: legacyProject.id }

            await fs.mkdir(path.dirname(getProjectSiteFile(legacyProject)), { recursive: true })
            await fs.writeFile(getProjectSiteFile(legacyProject), JSON.stringify(normalizeSite(JSON.parse(legacyRaw)), null, 2))
            await fs.writeFile(projectsFile, JSON.stringify(manifest, null, 2))
            return manifest
          } catch {
            const manifest = { projects: [], currentProjectId: '' }
            await fs.writeFile(projectsFile, JSON.stringify(manifest, null, 2))
            return manifest
          }
        }
      }

      // Esta funcion persiste el indice de proyectos.
      async function saveProjectsManifest(manifest) {
        await fs.mkdir(dataDir, { recursive: true })
        await fs.writeFile(projectsFile, JSON.stringify(manifest, null, 2))
        return manifest
      }

      // Esta funcion crea un proyecto con su propia carpeta y site.json inicial.
      async function createProject(name) {
        const manifest = await loadProjectsManifest()
        const project = createProjectMeta(name)
        project.slug = makeUniqueSlug(manifest.projects, project.slug)

        const site = createDefaultSite()
        site.settings.siteName = project.name

        const nextManifest = {
          projects: [...manifest.projects, project],
          currentProjectId: project.id,
        }

        await fs.mkdir(path.dirname(getProjectSiteFile(project)), { recursive: true })
        await fs.writeFile(getProjectSiteFile(project), JSON.stringify(site, null, 2))
        await saveProjectsManifest(nextManifest)
        return { project, manifest: nextManifest }
      }

      // Esta funcion encuentra un proyecto por id y devuelve error claro si no existe.
      async function findProject(projectId) {
        const manifest = await loadProjectsManifest()
        const project = manifest.projects.find((item) => item.id === projectId)

        if (!project) throw new Error('Proyecto no encontrado')

        return { manifest, project }
      }

      // Esta funcion garantiza que exista el site.json del proyecto activo.
      async function loadSite(projectId) {
        const { project } = await findProject(projectId)

        try {
          const raw = await fs.readFile(getProjectSiteFile(project), 'utf-8')
          return normalizeSite(JSON.parse(raw))
        } catch {
          const site = createDefaultSite()
          site.settings.siteName = project.name
          await fs.mkdir(path.dirname(getProjectSiteFile(project)), { recursive: true })
          await fs.writeFile(getProjectSiteFile(project), JSON.stringify(site, null, 2))
          return site
        }
      }

      // Esta funcion persiste el estado completo de un proyecto en disco.
      async function saveSite(projectId, siteInput) {
        const { project } = await findProject(projectId)
        const site = normalizeSite(siteInput)
        await fs.mkdir(path.dirname(getProjectSiteFile(project)), { recursive: true })
        await fs.writeFile(getProjectSiteFile(project), JSON.stringify(site, null, 2))
        return site
      }

      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url || '/', 'http://localhost')
        const requestUrl = parsedUrl.pathname

        if (requestUrl === '/api/auth/status' && req.method === 'GET') {
          const auth = await loadAuth()
          const session = verifySessionToken(parseCookies(req).sb_session, auth.secret)
          sendJson(res, 200, { ok: true, authenticated: Boolean(session), username: auth.username })
          return
        }

        if (requestUrl === '/api/auth/login' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const auth = await loadAuth()

            if (body.username !== auth.username || !verifyPassword(body.password, auth.passwordHash)) {
              sendJson(res, 401, { ok: false, error: 'Usuario o contrasena incorrectos' })
              return
            }

            const token = createSessionToken(auth.username, auth.secret)
            res.setHeader('Set-Cookie', `sb_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`)
            sendJson(res, 200, { ok: true, username: auth.username })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error.message })
          }
          return
        }

        if (requestUrl === '/api/auth/logout' && req.method === 'POST') {
          res.setHeader('Set-Cookie', 'sb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
          sendJson(res, 200, { ok: true })
          return
        }

        if (requestUrl.startsWith('/api/') && !(await requireAuth(req, res))) return

        if (requestUrl === '/api/auth/change-password' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const auth = await loadAuth()

            if (!verifyPassword(body.currentPassword, auth.passwordHash)) {
              sendJson(res, 401, { ok: false, error: 'La contrasena actual no coincide' })
              return
            }

            if (!body.newPassword || String(body.newPassword).length < 8) {
              sendJson(res, 400, { ok: false, error: 'La nueva contrasena debe tener minimo 8 caracteres' })
              return
            }

            const nextAuth = { ...auth, passwordHash: hashPassword(body.newPassword) }
            await fs.writeFile(authFile, JSON.stringify(nextAuth, null, 2))
            sendJson(res, 200, { ok: true })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error.message })
          }
          return
        }

        if (requestUrl === '/api/projects' && req.method === 'GET') {
          const manifest = await loadProjectsManifest()
          sendJson(res, 200, { ok: true, ...manifest })
          return
        }

        if (requestUrl === '/api/projects' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const payload = await createProject(body.name)
            sendJson(res, 200, { ok: true, ...payload })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error.message })
          }
          return
        }

        if (requestUrl === '/api/site' && req.method === 'GET') {
          const site = await loadSite(parsedUrl.searchParams.get('projectId'))
          sendJson(res, 200, { ok: true, site })
          return
        }

        if (requestUrl === '/api/site' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const site = await saveSite(body.projectId, body.site)
            sendJson(res, 200, { ok: true, site })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: error.message })
          }
          return
        }

        if (requestUrl === '/api/export' && req.method === 'POST') {
          try {
            const body = await readJsonBody(req)
            const { project } = await findProject(body.projectId)
            const site = await saveSite(body.projectId, body.site)
            const output = buildStaticPage(site, body.pageId)
            const targetDir = path.join(exportDir, project.slug, output.slug, 'public')

            await fs.mkdir(targetDir, { recursive: true })

            await Promise.all(
              Object.entries(output.files).map(([fileName, content]) =>
                fs.writeFile(path.join(targetDir, fileName), content),
              ),
            )

            sendJson(res, 200, {
              ok: true,
              slug: output.slug,
              path: path.relative(rootDir, targetDir),
              files: Object.keys(output.files),
            })
          } catch (error) {
            sendJson(res, 500, { ok: false, error: error.message })
          }
          return
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), staticBuilderApiPlugin()],
})
