import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const { file } = req.query;
  if (!file || !Array.isArray(file)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  // Prevent directory traversal attacks
  const safePath = path.normalize(path.join(...file)).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(process.cwd(), 'public', 'uploads', safePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const stat = fs.statSync(filePath);
    
    // Basic content type inference
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.txt') contentType = 'text/plain';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    // Cache control to help with performance
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
