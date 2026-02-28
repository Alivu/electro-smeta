// api/refresh.js
const axios = require('axios');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { refresh_token } = req.body;
    
    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            refresh_token,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token'
        });

        res.json(response.data);
        
    } catch (error) {
        console.error('Ошибка обновления токена:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
}
