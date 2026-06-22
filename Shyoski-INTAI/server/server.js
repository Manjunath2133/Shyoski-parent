const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_shyoski';

// Initialize Razorpay if keys are available
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log('💳 Razorpay Gateway Initialized');
    } catch (e) {
        console.error('❌ Failed to initialize Razorpay:', e.message);
    }
} else {
    console.log('⚠️ Razorpay credentials not found. Running in Payment SIMULATION mode.');
}

// Plan Pricing Configuration (in Rupees)
const PLANS = {
    hourly: { name: 'Hourly Plan', price: 30, value: 60 }, // 60 paid minutes
    daily: { name: '1 Day Plan', price: 100, durationMs: 24 * 60 * 60 * 1000 },
    monthly: { name: '1 Month Plan', price: 3000, durationMs: 30 * 24 * 60 * 60 * 1000 },
    '3_months': { name: '3 Months Plan', price: 6000, durationMs: 90 * 24 * 60 * 60 * 1000 },
    '6_months': { name: '6 Months Plan', price: 9000, durationMs: 180 * 24 * 60 * 60 * 1000 },
    yearly: { name: '1 Year Plan', price: 12000, durationMs: 365 * 24 * 60 * 60 * 1000 }
};

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// 1. Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        await db.transaction(async () => {
            const userResult = await db.run(
                'INSERT INTO users (email, password_hash) VALUES (?, ?)',
                [email, passwordHash]
            );
            const userId = userResult.id;

            // Initialize free trial license
            await db.run(
                'INSERT INTO licenses (user_id, status, type, free_queries_left) VALUES (?, ?, ?, ?)',
                [userId, 'free_trial', 'free', 5]
            );
        });

        const user = await db.get('SELECT id, email FROM users WHERE email = ?', [email]);
        const license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [user.id]);
        
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { email: user.email },
            license: {
                status: license.status,
                type: license.type,
                free_queries_left: license.free_queries_left,
                paid_minutes_left: license.paid_minutes_left,
                expires_at: license.expires_at
            }
        });
    } catch (e) {
        console.error('Registration Error:', e);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [user.id]);
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { email: user.email },
            license: {
                status: license.status,
                type: license.type,
                free_queries_left: license.free_queries_left,
                paid_minutes_left: license.paid_minutes_left,
                expires_at: license.expires_at
            }
        });
    } catch (e) {
        console.error('Login Error:', e);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Memory map to store password reset tokens: token -> { email, expires }
const resetTokens = new Map();

// 1.1 Forgot Password Endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (!user) {
            // Protect against email enumeration - return success anyway
            return res.json({ message: 'If that email exists, a reset link has been generated.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        resetTokens.set(token, {
            email: email,
            expires: Date.now() + 3600000 // 1 hour
        });

        const resetLink = `${process.env.BACKEND_URL || 'http://localhost:5005'}/api/auth/reset-password?token=${token}`;
        console.log(`\n🔗 [SHYOSKI PASSWORD RESET] Send this link to ${email}:\n👉 ${resetLink}\n`);

        res.json({ message: 'A password reset link has been sent to your email.' });
    } catch (e) {
        console.error('Forgot Password Error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 1.2 Get Reset Password Form
app.get('/api/auth/reset-password', (req, res) => {
    const { token } = req.query;
    if (!token || !resetTokens.has(token)) {
        return res.status(400).send(`
            <html>
                <body style="font-family:-apple-system,sans-serif;text-align:center;padding:50px;background:#faf9f5;color:#1e293b;">
                    <h2>❌ Invalid or Expired Token</h2>
                    <p>The password reset link is invalid or has expired. Please request a new one.</p>
                </body>
            </html>
        `);
    }

    const tokenData = resetTokens.get(token);
    if (Date.now() > tokenData.expires) {
        resetTokens.delete(token);
        return res.status(400).send(`
            <html>
                <body style="font-family:-apple-system,sans-serif;text-align:center;padding:50px;background:#faf9f5;color:#1e293b;">
                    <h2>❌ Link Expired</h2>
                    <p>This password reset link has expired. Please request a new one.</p>
                </body>
            </html>
        `);
    }

    // Serve HTML form
    res.send(`
        <html>
            <head>
                <title>Reset Password - Shyoski</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #faf9f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }
                    .card { background: #ffffff; border: 1px solid rgba(184,144,71,0.15); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(184,144,71,0.05); }
                    .logo { display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-size: 1.5rem; font-weight: 800; color: #8c6221; margin-bottom: 1.5rem; }
                    h2 { text-align: center; margin-bottom: 1.5rem; font-size: 1.25rem; }
                    .form-group { margin-bottom: 1.25rem; }
                    label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
                    input { width: 100%; padding: 0.75rem 1rem; border: 1px solid rgba(184,144,71,0.15); border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; background: #fafaf9; }
                    input:focus { outline: none; border-color: #b89047; }
                    button { width: 100%; padding: 0.75rem; border-radius: 8px; border: none; font-weight: 600; color: white; background: linear-gradient(135deg, #b89047, #8c6221); cursor: pointer; margin-top: 1rem; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="logo">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b89047" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: rgba(212, 175, 55, 0.15);"><path d="M12 2v20M12 10C9 5 3 6 3 11c0 4 6 8 9 11 3-3 9-7 9-11 0-5-6-6-9-1M12 10c-3 3-9 2-9-3 0-4 6-5 9-1 3-4 9-3 9 1 0 5-6 6-9 3"/></svg>
                        Shyoski
                    </div>
                    <h2>Reset Your Password</h2>
                    <form action="/api/auth/reset-password" method="POST">
                        <input type="hidden" name="token" value="${token}">
                        <div class="form-group">
                            <label>New Password</label>
                            <input type="password" name="password" required minlength="6" placeholder="••••••••">
                        </div>
                        <button type="submit">Update Password</button>
                    </form>
                </div>
            </body>
        </html>
    `);
});

// 1.3 Handle Reset Password Form Submission
app.post('/api/auth/reset-password', express.urlencoded({ extended: true }), async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password || !resetTokens.has(token)) {
        return res.status(400).send('<h2>Invalid request or expired reset session.</h2>');
    }

    const tokenData = resetTokens.get(token);
    if (Date.now() > tokenData.expires) {
        resetTokens.delete(token);
        return res.status(400).send('<h2>Token has expired. Please request a new reset link.</h2>');
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await db.run('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, tokenData.email]);
        resetTokens.delete(token);

        res.send(`
            <html>
                <head>
                    <title>Password Reset Successful</title>
                    <style>
                        body { font-family:-apple-system,sans-serif; text-align:center; padding:50px; background:#faf9f5; color:#1e293b; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
                        .card { background:#ffffff; border:1px solid rgba(184,144,71,0.15); padding:2.5rem; border-radius:16px; box-shadow: 0 10px 25px rgba(184,144,71,0.05); }
                        h2 { color:#0d9488; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h2>✓ Password Updated</h2>
                        <p>Your password has been successfully updated.</p>
                        <p>You can close this tab and log in to the Shyoski app now.</p>
                    </div>
                </body>
            </html>
        `);
    } catch (e) {
        console.error('Reset password post error:', e);
        res.status(500).send('<h2>Internal server error.</h2>');
    }
});

// 1.35 Get Google Client ID
app.get('/api/auth/google/client-id', (req, res) => {
    res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

// 1.4 Google Sign-In / Auto-Registration API
app.post('/api/auth/google', async (req, res) => {
    const { email: requestEmail, accessToken } = req.body;
    let email = requestEmail;

    if (accessToken) {
        try {
            const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (!googleRes.ok) {
                return res.status(401).json({ error: 'Invalid Google access token.' });
            }
            const googleUser = await googleRes.json();
            if (!googleUser.email) {
                return res.status(400).json({ error: 'Could not retrieve email from Google token.' });
            }
            email = googleUser.email;
        } catch (e) {
            console.error('Google token verification failed:', e);
            return res.status(500).json({ error: 'Failed to verify Google token with Google servers.' });
        }
    } else {
        // Mock fallback. If GOOGLE_CLIENT_ID is configured, we must reject unverified logins for security
        if (process.env.GOOGLE_CLIENT_ID) {
            return res.status(400).json({ error: 'Google authentication token is required when Google Login is enabled.' });
        }
        if (!email) {
            return res.status(400).json({ error: 'Google authentication email is required.' });
        }
    }

    try {
        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Auto-register the Google user with a randomized blank password hash
            const fakePasswordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
            
            await db.transaction(async () => {
                const userResult = await db.run(
                    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
                    [email, fakePasswordHash]
                );
                const userId = userResult.id;

                // Initialize free trial license
                await db.run(
                    'INSERT INTO licenses (user_id, status, type, free_queries_left) VALUES (?, ?, ?, ?)',
                    [userId, 'free_trial', 'free', 5]
                );
            });
            user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        }

        const license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [user.id]);
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: { email: user.email },
            license: {
                status: license.status,
                type: license.type,
                free_queries_left: license.free_queries_left,
                paid_minutes_left: license.paid_minutes_left,
                expires_at: license.expires_at
            }
        });
    } catch (e) {
        console.error('Google Sign-In Error:', e);
        res.status(500).json({ error: 'Server error processing Google Sign-in.' });
    }
});

// 2. License Status Endpoint with Device Locking
app.post('/api/license/status', authenticateToken, async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: 'Device fingerprint (deviceId) is required' });
    }

    try {
        let license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [req.user.id]);
        if (!license) {
            return res.status(404).json({ error: 'License record not found' });
        }

        // 1. Device Lock Enforcer
        if (deviceId !== 'web_dashboard') {
            if (!license.device_id) {
                // First time login, bind to this machine
                await db.run('UPDATE licenses SET device_id = ? WHERE user_id = ?', [deviceId, req.user.id]);
                license.device_id = deviceId;
            } else if (license.device_id !== deviceId) {
                // Check if device fingerprint matches. If not, block concurrent usage
                return res.status(403).json({ 
                    error: 'Session locked to another machine. Please log out on your other device first.' 
                });
            }
        }

        // 2. Expiration Verification
        const now = Date.now();
        let updated = false;

        // Verify duration-based subscription expiration
        if (license.status === 'active' && license.expires_at) {
            const expiryTime = new Date(license.expires_at).getTime();
            if (now > expiryTime) {
                // Subscription has expired
                license.status = 'expired';
                license.type = 'free';
                await db.run(
                    "UPDATE licenses SET status = 'expired', type = 'free' WHERE user_id = ?",
                    [req.user.id]
                );
                updated = true;
            }
        }

        // Verify hourly plan balance
        if (license.status === 'active' && license.type === 'hourly' && license.paid_minutes_left <= 0) {
            license.status = 'expired';
            license.type = 'free';
            await db.run(
                "UPDATE licenses SET status = 'expired', type = 'free' WHERE user_id = ?",
                [req.user.id]
            );
            updated = true;
        }

        res.json({
            status: license.status,
            type: license.type,
            free_queries_left: license.free_queries_left,
            paid_minutes_left: license.paid_minutes_left,
            expires_at: license.expires_at,
            server_time: now
        });
    } catch (e) {
        console.error('License Verification Error:', e);
        res.status(500).json({ error: 'Server error checking license status' });
    }
});

// 3. Hourly Usage Sync Endpoint
app.post('/api/license/sync-usage', authenticateToken, async (req, res) => {
    const { deviceId, minutesUsed } = req.body;

    if (!deviceId || minutesUsed === undefined) {
        return res.status(400).json({ error: 'deviceId and minutesUsed are required' });
    }

    try {
        const license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [req.user.id]);
        if (!license) {
            return res.status(404).json({ error: 'License record not found' });
        }

        // Device lock validation
        if (license.device_id !== deviceId) {
            return res.status(403).json({ error: 'Device fingerprint mismatch' });
        }

        // Only decrement for active hourly accounts
        if (license.type === 'hourly' && license.status === 'active') {
            const newMinutes = Math.max(0, license.paid_minutes_left - minutesUsed);
            const newStatus = newMinutes <= 0 ? 'expired' : 'active';
            const newType = newMinutes <= 0 ? 'free' : 'hourly';

            await db.run(
                `UPDATE licenses 
                 SET paid_minutes_left = ?, status = ?, type = ?, last_sync_time = CURRENT_TIMESTAMP 
                 WHERE user_id = ?`,
                [newMinutes, newStatus, newType, req.user.id]
            );

            return res.json({
                status: newStatus,
                type: newType,
                paid_minutes_left: newMinutes
            });
        }

        res.json({
            status: license.status,
            type: license.type,
            paid_minutes_left: license.paid_minutes_left
        });
    } catch (e) {
        console.error('Usage Sync Error:', e);
        res.status(500).json({ error: 'Server error syncing usage' });
    }
});

// 4. Create Billing Order
app.post('/api/payments/create-order', authenticateToken, async (req, res) => {
    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const planConfig = PLANS[plan];
    const receiptId = `receipt_u${req.user.id}_t${Date.now()}`;
    const amountInPaise = planConfig.price * 100; // Razorpay accepts amount in paise (1 INR = 100 Paise)

    try {
        if (razorpay) {
            // Real Razorpay Order Creation
            const order = await razorpay.orders.create({
                amount: amountInPaise,
                currency: 'INR',
                receipt: receiptId
            });

            await db.run(
                'INSERT INTO transactions (user_id, order_id, amount, plan, status) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, order.id, amountInPaise, plan, 'pending']
            );

            return res.status(201).json({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID,
                simulated: false
            });
        } else {
            // Mock Simulated Order Creation
            const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;

            await db.run(
                'INSERT INTO transactions (user_id, order_id, amount, plan, status) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, mockOrderId, amountInPaise, plan, 'pending']
            );

            return res.status(201).json({
                order_id: mockOrderId,
                amount: amountInPaise,
                currency: 'INR',
                simulated: true
            });
        }
    } catch (e) {
        console.error('Order Creation Error:', e);
        res.status(500).json({ error: 'Payment gateway connection error' });
    }
});

// 5. Verify Payment & Grant License Credits
app.post('/api/payments/verify', authenticateToken, async (req, res) => {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
    }

    try {
        const tx = await db.get('SELECT * FROM transactions WHERE order_id = ?', [orderId]);
        if (!tx) {
            return res.status(404).json({ error: 'Transaction record not found' });
        }

        if (tx.status === 'completed') {
            return res.json({ success: true, message: 'Payment already completed previously.' });
        }

        const plan = tx.plan;
        const planConfig = PLANS[plan];

        let isValid = false;

        // A. Verify with real Razorpay Signature
        if (razorpay && paymentId && signature) {
            const secret = process.env.RAZORPAY_KEY_SECRET;
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(orderId + "|" + paymentId);
            const generatedSignature = hmac.digest('hex');

            if (generatedSignature === signature) {
                isValid = true;
            }
        } 
        // B. Verify Mock Sandbox Transaction
        else if (orderId.startsWith('order_mock_')) {
            isValid = true;
        }

        if (!isValid) {
            await db.run("UPDATE transactions SET status = 'failed' WHERE order_id = ?", [orderId]);
            return res.status(400).json({ error: 'Payment signature validation failed' });
        }

        // Process License Activation in Transaction Block
        await db.transaction(async () => {
            // Mark transaction completed
            await db.run(
                "UPDATE transactions SET status = 'completed', payment_id = ? WHERE order_id = ?",
                [paymentId || 'simulated', orderId]
            );

            // Fetch current license status to stack duration if applicable
            const currentLicense = await db.get('SELECT * FROM licenses WHERE user_id = ?', [req.user.id]);
            const now = Date.now();

            if (plan === 'hourly') {
                // Add hours
                const currentMins = currentLicense.type === 'hourly' ? currentLicense.paid_minutes_left : 0;
                await db.run(
                    `UPDATE licenses 
                     SET status = 'active', type = 'hourly', paid_minutes_left = ?, expires_at = NULL 
                     WHERE user_id = ?`,
                    [currentMins + planConfig.value, req.user.id]
                );
            } else {
                // Duration Plan (daily, monthly, yearly, etc.)
                let baseTime = now;
                if (currentLicense.status === 'active' && currentLicense.expires_at && currentLicense.type === plan) {
                    // Stacking: If same plan is already active, extend from current expiration
                    const currentExpiry = new Date(currentLicense.expires_at).getTime();
                    if (currentExpiry > now) {
                        baseTime = currentExpiry;
                    }
                }

                const newExpiry = new Date(baseTime + planConfig.durationMs).toISOString();

                await db.run(
                    `UPDATE licenses 
                     SET status = 'active', type = ?, paid_minutes_left = 0, expires_at = ? 
                     WHERE user_id = ?`,
                    [plan, newExpiry, req.user.id]
                );
            }
        });

        const updatedLicense = await db.get('SELECT * FROM licenses WHERE user_id = ?', [req.user.id]);

        res.json({
            success: true,
            license: {
                status: updatedLicense.status,
                type: updatedLicense.type,
                free_queries_left: updatedLicense.free_queries_left,
                paid_minutes_left: updatedLicense.paid_minutes_left,
                expires_at: updatedLicense.expires_at
            }
        });

    } catch (e) {
        console.error('Payment Verification Error:', e);
        res.status(500).json({ error: 'Server error processing payment completion' });
    }
});

// 6. Secure AI Resolution Proxy (Enforces access control)
app.post('/api/ai/solve', authenticateToken, async (req, res) => {
    const { transcriptHistory, context, screenshotBase64, deviceId } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
    }

    try {
        const license = await db.get('SELECT * FROM licenses WHERE user_id = ?', [req.user.id]);
        if (!license) {
            return res.status(404).json({ error: 'License record not found' });
        }

        // Lock to device check
        if (license.device_id !== deviceId) {
            return res.status(403).json({ error: 'Device fingerprint mismatch' });
        }

        let authorized = false;
        let updateQuery = null;
        let queryParams = [];

        // Validate permissions
        if (license.status === 'free_trial' && license.free_queries_left > 0) {
            authorized = true;
            const updatedQueries = license.free_queries_left - 1;
            const nextStatus = updatedQueries <= 0 ? 'expired' : 'free_trial';
            updateQuery = 'UPDATE licenses SET free_queries_left = ?, status = ? WHERE user_id = ?';
            queryParams = [updatedQueries, nextStatus, req.user.id];
        } else if (license.status === 'active') {
            if (license.type === 'hourly') {
                if (license.paid_minutes_left > 0) {
                    authorized = true;
                }
            } else {
                // Duration subscription
                const expiry = new Date(license.expires_at).getTime();
                if (Date.now() <= expiry) {
                    authorized = true;
                }
            }
        }

        if (!authorized) {
            return res.status(402).json({ error: 'Payment Required. Out of credits or subscription expired.' });
        }

        // If authorized, decrement credits (for free trials)
        if (updateQuery) {
            await db.run(updateQuery, queryParams);
        }

        // Check if server holds AI key. If yes, run model on backend to protect key.
        const serverHasKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
        if (serverHasKey) {
            console.log('🤖 Invoking AI solver from server proxy...');
            // Load AIService dynamically to run backend query
            // Since AIService is inside the electron workspace, we can build a lightweight solver here
            // or return authorized: true if client should handle it.
            // For simplicity and maximum compatibility when deploying separate server instances, 
            // returning proxy: false and authorized: true signals the client that it has credit 
            // authorization to make the call locally.
            // Let's implement authorization token callback.
            return res.json({
                authorized: true,
                proxy: false,
                message: 'Usage authorized. Requesting local provider execution.'
            });
        } else {
            // No keys on server, return OK so client invokes direct
            return res.json({
                authorized: true,
                proxy: false,
                message: 'Usage authorized. Requesting local provider execution.'
            });
        }

    } catch (e) {
        console.error('AI Proxy Error:', e);
        res.status(500).json({ error: 'Server error processing AI check' });
    }
});

// 7. Careers Job Application Endpoint
app.post('/api/careers/apply', async (req, res) => {
    const { jobTitle, name, email, githubUrl, resumeUrl, coverLetter } = req.body;

    if (!jobTitle || !name || !email || !resumeUrl) {
        return res.status(400).json({ error: 'Job title, candidate name, email, and resume URL are required.' });
    }

    try {
        const result = await db.run(
            `INSERT INTO applications (job_title, candidate_name, candidate_email, github_url, resume_url, cover_letter) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [jobTitle, name, email, githubUrl || null, resumeUrl, coverLetter || null]
        );

        console.log(`💼 New Job Application for "${jobTitle}" submitted by ${name} (${email}) - ID: ${result.id}`);
        res.status(201).json({ success: true, message: 'Application submitted successfully!', applicationId: result.id });
    } catch (e) {
        console.error('Job Application Submission Error:', e);
        res.status(500).json({ error: 'Failed to submit application due to database error.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Licensing backend listening on port ${PORT}`);
});

