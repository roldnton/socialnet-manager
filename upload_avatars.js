import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { put } from '@vercel/blob';

// ⚠️ IMPORTANT: Paste your Vercel Blob Read/Write token here!
// You can find this in your Vercel Dashboard -> Storage -> Your Blob -> Settings -> Tokens
const BLOB_TOKEN = "vercel_blob_rw_yAyyB4GE4rEOhScU_6rFa9RIftwHZpTpRscMp4HdTuiwQyb"; 

const IMAGE_DIR = './resources/images/';

async function uploadAvatars() {
    console.log("🚀 Starting batch upload to Vercel Blob...");
    
    if (BLOB_TOKEN === "YOUR_BLOB_READ_WRITE_TOKEN_HERE") {
        console.error("❌ ERROR: You forgot to paste your BLOB_TOKEN at the top of the file!");
        return;
    }

    try {
        // Read all files in the images folder
        const files = await fs.readdir(IMAGE_DIR);
        const imageFiles = files.filter(file => file.match(/\.(png|jpg|jpeg|webp)$/i));

        if (imageFiles.length === 0) {
            console.log(`⚠️ No images found in ${IMAGE_DIR}`);
            return;
        }

        console.log(`📦 Found ${imageFiles.length} images. Processing...\n`);

        for (const file of imageFiles) {
            const filePath = path.join(IMAGE_DIR, file);
            
            // Get the name without the extension (e.g., "abraham_maslow")
            const rawName = path.parse(file).name;
            const baseName = rawName.toLowerCase().replace(/\s+/g, '_'); 
            const newFileName = `avatars/${baseName}.webp`;

            console.log(`⏳ Converting & Uploading: ${file} -> ${newFileName}`);

            // 1. Read and compress the image with Sharp
            const fileBuffer = await fs.readFile(filePath);
            const processedBuffer = await sharp(fileBuffer)
                .rotate()
                .resize(256, 256, { fit: "inside", withoutEnlargement: true })
                .webp({ quality: 80, effort: 6, alphaQuality: 80 })
                .toBuffer();

            // 2. Upload to Vercel Blob
            const blob = await put(newFileName, processedBuffer, {
                access: 'public',
                addRandomSuffix: false, // Forces the URL to match what your database expects
                allowOverwrite: true,
                token: BLOB_TOKEN
            });

            console.log(`✅ Success! Uploaded to: ${blob.url}\n`);
        }
        
        console.log("🎉 All avatars uploaded successfully! Go check your website.");

    } catch (error) {
        console.error("❌ Error during upload:", error.message);
    }
}

// Run the function
uploadAvatars();