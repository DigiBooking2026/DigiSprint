import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Profile password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
