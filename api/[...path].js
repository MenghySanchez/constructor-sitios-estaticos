import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createDefaultSite, createId, normalizeSite, slugify } from '../src/cms/siteDefaults.js'
import { buildStaticPage } from '../src/exporter/staticExporter.js'

// Esta API existe para produccion en Vercel.
// El middleware de vite.config.js solo funciona en desarrollo local con npm run dev.

const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'
const RUNTIME_DATA_DIR = path.join('/tmp', 'static-builder-cms')

// Esta funcion lee JSON desde requests de Vercel o desde el stream crudo.
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')

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

// Esta funcion responde siempre en JSON para que el frontend no reciba HTML de error.
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload, null, 2))
}

// Esta funcion lee cookies del request para validar la sesion.
function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((cookie) => cookie.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  )
}

// Esta funcion valida un hash PBKDF2 con el mismo formato usado localmente.
function verifyPasswordHash(password, passwordHash) {
  const [algorithm, iterations, salt, storedHash] = String(passwordHash || '').split('$')

  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !storedHash) return false

  const candidate = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
  const stored = Buffer.from(storedHash, 'hex')

  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate)
}

// Esta funcion permite usar password hasheado en Vercel o una variable plana temporal.
function verifyPassword(password) {
  if (process.env.SB_ADMIN_PASSWORD_HASH) {
    return verifyPasswordHash(password, process.env.SB_ADMIN_PASSWORD_HASH)
  }

  const expectedPassword = process.env.SB_ADMIN_PASSWORD || DEFAULT_PASSWORD
  const expected = Buffer.from(expectedPassword)
  const received = Buffer.from(String(password || ''))

  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

// Esta funcion firma una sesion de 8 horas con un secreto estable.
function createSessionToken(username) {
  const secret = process.env.SB_SESSION_SECRET || 'static-builder-vercel-dev-secret'
  const payload = Buffer.from(JSON.stringify({ username, exp: Date.now() + 1000 * 60 * 60 * 8 })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

// Esta funcion valida que la cookie no haya sido manipulada y que no haya expirado.
function verifySessionToken(token) {
  const secret = process.env.SB_SESSION_SECRET || 'static-builder-vercel-dev-secret'
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return false

  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return session.exp > Date.now() ? session : false
  } catch {
    return false
  }
}

// Esta funcion bloquea endpoints privados cuando no hay sesion valida.
function requireAuth(req, res) {
  const session = verifySessionToken(parseCookies(req).sb_session)

  if (!session) {
    sendJson(res, 401, { ok: false, error: 'Sesion invalida o expirada' })
    return false
  }

  return true
}

// Esta funcion devuelve la ruta editable en /tmp.
// En Vercel el filesystem del deploy es de solo lectura, por eso se usa /tmp.
function runtimePath(...segments) {
  return path.join(RUNTIME_DATA_DIR, ...segments)
}

// Esta funcion intenta leer datos persistidos durante la vida del serverless function.
async function readRuntimeJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf-8'))
}

// Esta funcion escribe datos temporales en /tmp.
async function writeRuntimeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// Esta funcion crea metadata de un proyecto nuevo.
function createProjectMeta(name) {
  return {
    id: createId('project'),
    name: name || 'Nuevo proyecto',
    slug: slugify(name || 'nuevo-proyecto'),
    createdAt: new Date().toISOString(),
  }
}

// Esta funcion evita slugs repetidos.
function makeUniqueSlug(projects, baseSlug) {
  let slug = baseSlug
  let counter = 2

  while (projects.some((project) => project.slug === slug)) {
    slug = `${baseSlug}-${counter}`
    counter += 1
  }

  return slug
}

// Esta funcion carga proyectos desde /tmp o desde cms-data si fue incluido en GitHub.
async function loadProjectsManifest() {
  const runtimeFile = runtimePath('projects.json')

  try {
    return await readRuntimeJson(runtimeFile)
  } catch {
    try {
      const sourceFile = path.join(process.cwd(), 'cms-data', 'projects.json')
      const manifest = JSON.parse(await fs.readFile(sourceFile, 'utf-8'))
      await writeRuntimeJson(runtimeFile, manifest)
      return manifest
    } catch {
      const manifest = { projects: [], currentProjectId: '' }
      await writeRuntimeJson(runtimeFile, manifest)
      return manifest
    }
  }
}

// Esta funcion guarda el indice temporal de proyectos en Vercel.
async function saveProjectsManifest(manifest) {
  await writeRuntimeJson(runtimePath('projects.json'), manifest)
  return manifest
}

// Esta funcion localiza un proyecto dentro del manifest.
async function findProject(projectId) {
  const manifest = await loadProjectsManifest()
  const project = manifest.projects.find((item) => item.id === projectId)

  if (!project) throw new Error('Proyecto no encontrado')

  return { manifest, project }
}

// Esta funcion carga el site.json del proyecto desde /tmp o desde cms-data.
async function loadSite(projectId) {
  const { project } = await findProject(projectId)
  const runtimeFile = runtimePath('projects', project.slug, 'site.json')

  try {
    return normalizeSite(await readRuntimeJson(runtimeFile))
  } catch {
    try {
      const sourceFile = path.join(process.cwd(), 'cms-data', 'projects', project.slug, 'site.json')
      const site = normalizeSite(JSON.parse(await fs.readFile(sourceFile, 'utf-8')))
      await writeRuntimeJson(runtimeFile, site)
      return site
    } catch {
      const site = createDefaultSite()
      site.settings.siteName = project.name
      await writeRuntimeJson(runtimeFile, site)
      return site
    }
  }
}

// Esta funcion guarda cambios del proyecto en /tmp.
async function saveSite(projectId, siteInput) {
  const { project } = await findProject(projectId)
  const site = normalizeSite(siteInput)
  await writeRuntimeJson(runtimePath('projects', project.slug, 'site.json'), site)
  return site
}

// Esta funcion crea un proyecto temporal para Vercel.
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

  await saveProjectsManifest(nextManifest)
  await saveSite(project.id, site)
  return { project, manifest: nextManifest }
}

export default async function handler(req, res) {
  const parsedUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`)
  const requestUrl = parsedUrl.pathname.startsWith('/api/') ? parsedUrl.pathname : `/api${parsedUrl.pathname}`
  const username = process.env.SB_ADMIN_USERNAME || DEFAULT_USERNAME

  if (requestUrl === '/api/auth/status' && req.method === 'GET') {
    const session = verifySessionToken(parseCookies(req).sb_session)
    sendJson(res, 200, { ok: true, authenticated: Boolean(session), username })
    return
  }

  if (requestUrl === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req)

      if (body.username !== username || !verifyPassword(body.password)) {
        sendJson(res, 401, { ok: false, error: 'Usuario o contrasena incorrectos' })
        return
      }

      const secure = process.env.VERCEL ? '; Secure' : ''
      const token = createSessionToken(username)
      res.setHeader('Set-Cookie', `sb_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${secure}`)
      sendJson(res, 200, { ok: true, username })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
    return
  }

  if (requestUrl === '/api/auth/logout' && req.method === 'POST') {
    const secure = process.env.VERCEL ? '; Secure' : ''
    res.setHeader('Set-Cookie', `sb_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
    sendJson(res, 200, { ok: true })
    return
  }

  if (requestUrl.startsWith('/api/') && !requireAuth(req, res)) return

  if (requestUrl === '/api/auth/change-password' && req.method === 'POST') {
    sendJson(res, 501, {
      ok: false,
      error: 'En Vercel no se puede cambiar auth.json. Configura SB_ADMIN_PASSWORD_HASH o SB_ADMIN_PASSWORD en Environment Variables.',
    })
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
    try {
      const site = await loadSite(parsedUrl.searchParams.get('projectId'))
      sendJson(res, 200, { ok: true, site })
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message })
    }
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
      const targetDir = runtimePath('exports', project.slug, output.slug, 'public')

      await fs.mkdir(targetDir, { recursive: true })

      await Promise.all(
        Object.entries(output.files).map(([fileName, content]) => fs.writeFile(path.join(targetDir, fileName), content)),
      )

      sendJson(res, 200, {
        ok: true,
        slug: output.slug,
        path: `/tmp/static-builder-cms/exports/${project.slug}/${output.slug}/public`,
        files: Object.keys(output.files),
        warning: 'En Vercel esta exportacion queda en /tmp y no es persistente. Para archivos finales usa npm run dev localmente.',
      })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message })
    }
    return
  }

  sendJson(res, 404, { ok: false, error: 'Endpoint no encontrado' })
}
