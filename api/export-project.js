import { Buffer } from 'node:buffer'
import { findProject, loadSite, readJsonBody, requireAuth, sendJson, sendMethodNotAllowed } from './_lib/cmsApi.js'
import { buildStaticPage } from '../src/exporter/staticExporter.js'

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  }
  return (value ^ 0xffffffff) >>> 0
}

function getDosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = Math.max(date.getFullYear() - 1980, 0)
  const dosDate = (year << 9) | (month << 5) | day

  return { dosDate, time }
}

function uint16(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function uint32(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value >>> 0)
  return buffer
}

function createZip(files) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const { dosDate, time } = getDosDateTime()

  for (const file of files) {
    const name = Buffer.from(file.name)
    const content = Buffer.from(file.content)
    const checksum = crc32(content)

    const localHeader = Buffer.concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(time),
      uint16(dosDate),
      uint32(checksum),
      uint32(content.length),
      uint32(content.length),
      uint16(name.length),
      uint16(0),
      name,
    ])

    localParts.push(localHeader, content)
    centralParts.push(
      Buffer.concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(time),
        uint16(dosDate),
        uint32(checksum),
        uint32(content.length),
        uint32(content.length),
        uint16(name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        name,
      ]),
    )

    offset += localHeader.length + content.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const endRecord = Buffer.concat([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0),
  ])

  return Buffer.concat([...localParts, centralDirectory, endRecord])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendMethodNotAllowed(res)
    return
  }

  if (!requireAuth(req, res)) return

  try {
    const body = await readJsonBody(req)
    const { project } = await findProject(body.projectId)
    const site = await loadSite(body.projectId)
    const files = []

    for (const page of site.pages) {
      const output = buildStaticPage(site, page.id)
      for (const [fileName, content] of Object.entries(output.files)) {
        files.push({ name: `${output.slug}/public/${fileName}`, content })
      }
    }

    const zip = createZip(files)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${project.slug}.zip"`)
    res.end(zip)
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message })
  }
}
