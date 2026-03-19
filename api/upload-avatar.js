export const config = {
    api: {
        bodyParser: false, // REQUIRED: Vercel must not pre-parse the body.
        // busboy reads the raw stream. If bodyParser is on,
        // Vercel consumes the stream first and busboy gets nothing.
        sizeLimit: "10mb", // Must be a plain string literal, not a template expression.
    },
};

const processedBuffer = await sharp(fileBuffer)
.rotate() // Fix EXIF orientation (phone portrait photos)
.resize(256, 256, {
    fit: "inside", // Fit within 256x256, keep aspect ratio
    withoutEnlargement: true, // Never scale up a small image
})
.webp({ quality: 80, effort: 6, alphaQuality: 80 })
.toBuffer(); // Result stays in memory, never written to disk

// Read as plain text first
const rawText = await response.text();
let result;
try {
    result = JSON.parse(rawText);
} catch {
    // Server returned HTML — show the status code and body preview
    const preview = rawText.slice(0, 200).replace(/\s+/g, " ").trim();
    const hint = diagnoseUploadStatus(response.status);
    throw new Error("HTTP " + response.status + " (not JSON). " + hint +
        
        ' | Response: "' + preview + '"')
    }

