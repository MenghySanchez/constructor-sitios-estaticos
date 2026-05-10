import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createDefaultSite, createId, normalizeSite, slugify } from '../../src/cms/siteDefaults.js'
import { buildStaticPage } from '../../src/exporter/staticExporter.js'

// Esta libreria comparte la logica de las API Routes de Vercel.
// Evita depender de un catch-all y hace que cada endpoint sea una ruta real.

const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'
const RUNTIME_DATA_DIR = path.join('/tmp', 'static-builder-cms')

// Esta funcion lee JSON en Vercel. Vercel a veces ya entrega req.body parseado.
export async function readJsonBody(req) {
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

// Esta funcion responde siempre JSON para que el frontend no intente parsear HTML.
export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload, null, 2))
}

// Esta funcion envia 405 cuando el metodo HTTP no corresponde.
export function sendMethodNotAllowed(res) {
  sendJson(res, 405, { ok: false, error: 'Metodo no permitido' })
}

// Esta funcion lee cookies de forma defensiva para evitar errores de formato.
function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf('=')
        const key = index >= 0 ? cookie.slice(0, index) : cookie
        const value = index >= 0 ? cookie.slice(index + 1) : ''

        try {
          return [key, decodeURIComponent(value)]
        } catch {
          return [key, value]
        }
      }),
  )
}

// Esta funcion valida un password contra un hash PBKDF2 si se usa SB_ADMIN_PASSWORD_HASH.
function verifyPasswordHash(password, passwordHash) {
  const [algorithm, iterations, salt, storedHash] = String(passwordHash || '').split('$')

  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !storedHash) return false

  const candidate = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, 'sha256')
  const stored = Buffer.from(storedHash, 'hex')

  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate)
}

// Esta funcion valida el password plano de entorno o el password inicial del piloto.
export function verifyPassword(password) {
  if (process.env.SB_ADMIN_PASSWORD_HASH) {
    return verifyPasswordHash(password, process.env.SB_ADMIN_PASSWORD_HASH)
  }

  const expectedPassword = process.env.SB_ADMIN_PASSWORD || DEFAULT_PASSWORD
  const expected = Buffer.from(expectedPassword)
  const received = Buffer.from(String(password || ''))

  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

// Esta funcion devuelve el usuario configurado para Vercel.
export function getAdminUsername() {
  return process.env.SB_ADMIN_USERNAME || DEFAULT_USERNAME
}

// Esta funcion firma una sesion temporal de 8 horas.
export function createSessionToken(username) {
  const secret = process.env.SB_SESSION_SECRET || 'static-builder-vercel-dev-secret'
  const payload = Buffer.from(JSON.stringify({ username, exp: Date.now() + 1000 * 60 * 60 * 8 })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

// Esta funcion valida la cookie firmada.
export function verifySessionToken(token) {
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

// Esta funcion revisa si el request tiene sesion valida.
export function getSession(req) {
  return verifySessionToken(parseCookies(req).sb_session)
}

// Esta funcion bloquea endpoints privados sin sesion.
export function requireAuth(req, res) {
  if (!getSession(req)) {
    sendJson(res, 401, { ok: false, error: 'Sesion invalida o expirada' })
    return false
  }

  return true
}

// Esta funcion arma cookies compatibles con Vercel.
export function buildSessionCookie(token, maxAge) {
  const secure = process.env.VERCEL ? '; Secure' : ''
  return `sb_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
}

// Esta funcion apunta al almacenamiento temporal de Vercel.
function runtimePath(...segments) {
  return path.join(RUNTIME_DATA_DIR, ...segments)
}

// Esta funcion lee JSON temporal.
async function readRuntimeJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf-8'))
}

// Esta funcion escribe JSON temporal.
async function writeRuntimeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// Esta funcion crea metadata de proyecto.
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

// Esta funcion carga proyectos desde /tmp o desde cms-data incluido en el deploy.
export async function loadProjectsManifest() {
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

// Esta funcion guarda el indice de proyectos temporal.
async function saveProjectsManifest(manifest) {
  await writeRuntimeJson(runtimePath('projects.json'), manifest)
  return manifest
}

// Esta funcion encuentra un proyecto por id.
export async function findProject(projectId) {
  const manifest = await loadProjectsManifest()
  const project = manifest.projects.find((item) => item.id === projectId)

  if (!project) throw new Error('Proyecto no encontrado')

  return { manifest, project }
}

// Esta funcion carga el site.json de un proyecto.
export async function loadSite(projectId) {
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
export async function saveSite(projectId, siteInput) {
  const { project } = await findProject(projectId)
  const site = normalizeSite(siteInput)
  await writeRuntimeJson(runtimePath('projects', project.slug, 'site.json'), site)
  return site
}

// Esta funcion crea un proyecto temporal en Vercel.
export async function createProject(name) {
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

// Esta funcion exporta una landing a /tmp en Vercel.
export async function exportStaticPage(projectId, siteInput, pageId) {
  const { project } = await findProject(projectId)
  const site = await saveSite(projectId, siteInput)
  const output = buildStaticPage(site, pageId)
  const targetDir = runtimePath('exports', project.slug, output.slug, 'public')

  await fs.mkdir(targetDir, { recursive: true })

  await Promise.all(
    Object.entries(output.files).map(([fileName, content]) => fs.writeFile(path.join(targetDir, fileName), content)),
  )

  return {
    ok: true,
    slug: output.slug,
    path: `/tmp/static-builder-cms/exports/${project.slug}/${output.slug}/public`,
    files: Object.keys(output.files),
    warning: 'En Vercel esta exportacion queda en /tmp y no es persistente. Para archivos finales usa npm run dev localmente.',
  }
}
