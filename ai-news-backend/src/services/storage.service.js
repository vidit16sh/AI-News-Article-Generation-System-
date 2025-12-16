import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

export const downloadAndSaveImage = async (externalUrl, slug) => {
  try {
    if (!externalUrl) return null;

    // 1. Create strict folder structure: public/uploads/YYYY/MM
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Path relative to project root
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(year), String(month));
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 2. Generate filename (slug + timestamp to ensure uniqueness)
    const filename = `${slug}-${Date.now()}.jpg`;
    const localFilePath = path.join(uploadDir, filename);

    // 3. Download the image
    const response = await fetch(externalUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    // 4. Save to disk
    // We access the body stream and pipe it to a file
    const fileStream = fs.createWriteStream(localFilePath);
    
    // Node.js fetch body is a readable stream
    if (response.body) {
        // @ts-ignore
        await streamPipeline(response.body, fileStream);
    }

    console.log(`   💾 Image Saved Locally: /uploads/${year}/${month}/${filename}`);

    // 5. Return the PUBLIC URL path (relative)
    return `/uploads/${year}/${month}/${filename}`;

  } catch (error) {
    console.error("   ❌ Image Download Failed:", error.message);
    return null; // Fallback to default image logic if download fails
  }
};