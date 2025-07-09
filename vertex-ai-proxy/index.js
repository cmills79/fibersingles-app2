const express = require('express');
const { VertexAI } = require('@google-cloud/aiplatform');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const PROXY_SECRET = process.env.PROXY_SECRET;

app.post('/generate-image', async (req, res) => {
    if (!PROXY_SECRET || req.headers.authorization !== `Bearer ${PROXY_SECRET}`) {
        return res.status(401).send('Unauthorized');
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).send('Missing `prompt` in request body.');
    }

    try {
        if (!PROJECT_ID) {
            throw new Error('Server configuration error: GCLOUD_PROJECT is not defined.');
        }

        const vertex_ai = new VertexAI({ project: PROJECT_ID, location: 'us-central1' });
        const generativeModel = vertex_ai.getGenerativeModel({
            model: 'imagegeneration@0.0.1',
        });

        const resp = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const imageData = resp.response.candidates[0].content.parts[0].fileData;
        if (!imageData || !imageData.fileUri) {
            throw new Error('Image URI not found in Vertex AI response.');
        }

        return res.status(200).json({ success: true, imageUrl: imageData.fileUri });

    } catch (error) {
        console.error('Error generating image with Vertex AI:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Vertex AI proxy listening on port ${PORT}`);
    if (!PROJECT_ID || !PROXY_SECRET) {
      console.error('CRITICAL: Missing GCLOUD_PROJECT or PROXY_SECRET at startup!');
    }
});