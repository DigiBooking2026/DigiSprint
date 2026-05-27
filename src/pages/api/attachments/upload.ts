import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req)
  if (!session) return res.status(401).json({ error: "Unauthorized" })

  if (req.method !== 'POST') return res.status(405).end()

  const form = formidable({
    uploadDir: path.join(process.cwd(), 'public', 'uploads'),
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  })

  try {
    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const projectId = fields.projectId ? String(fields.projectId) : null
    const taskId = fields.taskId ? String(fields.taskId) : null

    const relativePath = `/uploads/${path.basename(file.filepath)}`

    const attachment = await prisma.attachment.create({
      data: {
        name: file.originalFilename || 'unnamed',
        url: relativePath,
        size: Number(file.size),
        type: file.mimetype || 'application/octet-stream',
        projectId,
        taskId,
      },
    })

    return res.status(200).json(attachment)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Upload failed" })
  }
}
