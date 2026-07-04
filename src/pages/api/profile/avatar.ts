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
    maxFileSize: 5 * 1024 * 1024, // 5MB limit for profile picture
  })

  try {
    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const relativePath = `/uploads/${path.basename(file.filepath)}`

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: relativePath },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true }
    })

    return res.status(200).json(updatedUser)
  } catch (error) {
    console.error("Avatar upload error:", error)
    return res.status(500).json({ error: "Failed to upload avatar" })
  }
}
