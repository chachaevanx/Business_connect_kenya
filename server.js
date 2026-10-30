const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// Your Daraja API Credentials from Safaricom Developer Portal
const CONSUMER_KEY = 'YOUR_DARAJA_CONSUMER_KEY';
const CONSUMER_SECRET = 'YOUR_DARAJA_CONSUMER_SECRET';
const SHORTCODE = '174379'; // Sandbox test shortcode
const PASSKEY = 'YOUR_DARAJA_PASSKEY';
const CALLBACK_URL = 'https://your-backend-url.onrender.com/api/v1/mpesa/callback';

async function getAccessToken(req, res, next) {
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    try {
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` }
        });
        req.token = response.data.access_token;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate M-Pesa token', details: error.message });
    }
}

app.post('/api/stk-push', getAccessToken, async (req, res) => {
    const { phone, amount } = req.body;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
    
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);

    try {
        const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: SHORTCODE,
            PhoneNumber: formattedPhone,
            CallBackURL: CALLBACK_URL,
            AccountReference: 'BiasharaConnect',
            TransactionDesc: 'Seller Registration Fee'
        }, {
            headers: { Authorization: `Bearer ${req.token}` }
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.response ? error.response.data : error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Backend running on port ' + PORT));
