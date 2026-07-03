import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      return res.status(400).json({ error: "Expected 'users' array in body" });
    }

    const createdUsers = [];
    for (const u of users) {
      const { email, name, password, role } = u;
      if (!email || !password) continue;
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        createdUsers.push({ id: existingUser.id, email: existingUser.email, name: existingUser.name, role: existingUser.role, status: "already_exists" });
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashedPassword,
          role: role || "USER",
        }
      });
      createdUsers.push({ id: user.id, email: user.email, name: user.name, role: user.role, status: "created" });
    }

    return res.status(200).json({ success: true, users: createdUsers });
  } catch (error: any) {
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
