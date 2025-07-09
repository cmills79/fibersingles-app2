const express = require('express');
// Correct import for the specified version
const { VertexAI } = require('@google-cloud/aiplatform');

const app = express();
app.use(express.json());

// --- Configuration ---
const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const PROXY_SECRET = process.env.PROXY_SECRET;

// --- Routes ---
app.post('/generate-image', async (req, res) => {
    // 1. Authenticate the request from Supabase
    if (!PROXY_SECRET || req.headers.authorization !== `Bearer ${PROXY_SECRET}`) {
        return res.status(401).send('Unauthorized');
    }

    // 2. Validate the incoming data
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).send('Missing `prompt` in request body.');
    }

    // 3. Call Vertex AI
    try {
        if (!PROJECT_ID) {
            throw new Error('Server configuration error: GCLOUD_PROJECT is not defined.');
        }

        // --- Initialize Vertex AI Client ---
        const vertex_ai = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
        const generativeModel = vertex_ai.getGenerativeModel({
            model: 'imagegeneration@0.0.1', // Correct model name for image generation
        });

        const resp = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // The image data is in a different location in this version
        const imageData = resp.response.candidates[0].content.parts[0].fileData;
        if (!imageData || !imageData.fileUri) {
            throw new Error('Image URI not found in Vertex AI response.');
        }

        return res.status(200).json({ success: true, imageUrl: imageData.fileUri });

    } catch (error) {
        console.error('Error generating image with Vertex AI:', error);
        const errorMessage = error.message || 'Failed to generate image.';
        return res.status(500).json({ success: false, error: errorMessage });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Vertex AI proxy listening on port ${PORT}`);
    if (!PROJECT_ID || !PROXY_SECRET) {
      console.error('CRITICAL: Missing GCLOUD_PROJECT or PROXY_SECRET at startup!');
      // Note: The process will exit if the variables are missing in a real scenario,
      // but we log here as well for clarity during deployment.
    }
});