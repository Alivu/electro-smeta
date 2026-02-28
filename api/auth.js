// api/auth.js
const axios = require('axios');
console.log('✅ Axios loaded successfully');
console.log('🔧 Node version:', process.version);
console.log('🔑 GOOGLE_CLIENT_ID present:', !!process.env.GOOGLE_CLIENT_ID);
console.log('🔑 GOOGLE_CLIENT_SECRET present:', !!process.env.GOOGLE_CLIENT_SECRET);
export default async function handler(req, res) {
    // Разрешаем запросы с ваших доменов
    const allowedOrigins = [
        'https://alivu.github.io',
        'https://electro-smeta.vercel.app'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    try {
        console.log('🔄 Обмен кода на токены...');
        
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: 'https://electro-smeta.vercel.app/oauth-callback.html',
            grant_type: 'authorization_code'
        });

        console.log('✅ Токены получены успешно');
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Ошибка:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to exchange code',
            details: error.response?.data || error.message 
        });
    }
}
