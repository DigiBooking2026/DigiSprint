import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const attachments = await prisma.attachment.findMany({
      include: { comment: true }
    });

    const deletedAttachments = [];
    const deletedComments = [];

    for (const attachment of attachments) {
      const relativePath = attachment.url.replace(/^\/+/, '');
      const filePath = path.join(process.cwd(), 'public', relativePath);

      if (!fs.existsSync(filePath)) {
        // File does not exist on disk, delete the attachment record
        await prisma.attachment.delete({ where: { id: attachment.id } });
        deletedAttachments.push({ id: attachment.id, name: attachment.name, url: attachment.url });

        // If it was linked to a comment, check if the comment should be deleted
        if (attachment.commentId) {
          const comment = await prisma.comment.findUnique({
            where: { id: attachment.commentId },
            include: { attachments: true }
          });

          if (comment && comment.attachments.length === 0) {
            // Check if comment has no actual text content
            const cleanContent = comment.content.replace(/<[^>]*>?/gm, '').trim();
            if (cleanContent === '' || cleanContent === '&nbsp;') {
              await prisma.comment.delete({ where: { id: comment.id } });
              deletedComments.push(comment.id);
            }
          }
        }
      }
    }

    return res.status(200).json({
      message: "Cleanup complete",
      deletedAttachmentsCount: deletedAttachments.length,
      deletedCommentsCount: deletedComments.length,
      deletedAttachments,
      deletedComments,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return res.status(500).json({ error: "Cleanup failed" });
  }
}
