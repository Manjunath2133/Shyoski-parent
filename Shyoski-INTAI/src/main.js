const { app, BrowserWindow, ipcMain, globalShortcut, screen, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const crypto = require('crypto');

// Disguise the application name in process lists
app.name = 'Shyoski';
const AIService = require('./ai-service');
const DeepgramService = require('./deepgram-service');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || (isDev ? 'http://localhost:5005' : 'https://shysoki-api.onrender.com');

let mainWindow;
let isGhostMode = false;
let deepgramService;
let voskProcess;
let aiService;
let transcriptHistory = [];
let isOnline = true;
let currentContext = { mode: 'interview' }; // Default context

// Local Config Store (Encrypted Session + Last Sync cache)
const configPath = path.join(app.getPath('userData'), 'billing_config.json');

function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read billing config:', e);
  }
  return { token: null, email: null, last_sync_time: 0 };
}

function writeConfig(data) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write billing config:', e);
  }
}

function encryptToken(token) {
  if (!token) return null;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(token).toString('base64');
    }
  } catch (e) {
    console.error('Token encryption failed:', e);
  }
  return token;
}

function decryptToken(encrypted) {
  if (!encrypted) return null;
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    }
  } catch (e) {
    console.error('Token decryption failed:', e);
  }
  return encrypted;
}

function getDeviceFingerprint() {
  const os = require('os');
  const systemInfo = [
    os.platform(),
    os.arch(),
    os.hostname(),
    os.type(),
    os.release(),
    JSON.stringify(os.networkInterfaces())
  ].join('|');
  return crypto.createHash('sha256').update(systemInfo).digest('hex');
}

// Billing state management
let lastAudioReceivedTime = 0;
let activeListeningSeconds = 0;
let billingSyncTimer = null;
let currentBillingState = {
  status: 'expired',
  type: 'free',
  free_queries_left: 0,
  paid_minutes_left: 0,
  expires_at: null
};

function startBillingTracking() {
  if (billingSyncTimer) return;
  
  billingSyncTimer = setInterval(async () => {
    const now = Date.now();
    const config = readConfig();
    const token = decryptToken(config.token);
    
    // 1. Clock Tampering Check (Anti-Spoofing)
    const lastSync = parseInt(config.last_sync_time || '0', 10);
    if (lastSync > 0 && now < lastSync) {
      console.error('⚠️ Clock tampering detected! Local system time is behind last sync time.');
      if (mainWindow) {
        mainWindow.webContents.send('billing:expired', 'ClockTamper');
      }
      return;
    }

    // 2. Active Audio Usage Tracking
    const isAudioActive = (now - lastAudioReceivedTime) < 2500; // Received audio chunk within last 2.5s
    
    if (isAudioActive) {
      activeListeningSeconds++;
      
      // Every 30 seconds of active listening, sync with the server
      if (activeListeningSeconds >= 30) {
        activeListeningSeconds = 0;
        
        if (token) {
          try {
            const deviceId = getDeviceFingerprint();
            const response = await axios.post(`${BACKEND_URL}/api/license/sync-usage`, {
              deviceId,
              minutesUsed: 0.5
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            currentBillingState = response.data;
            config.last_sync_time = now;
            writeConfig(config);
            
            if (mainWindow) {
              mainWindow.webContents.send('billing:state-updated', currentBillingState);
            }
            
            if (currentBillingState.status === 'expired') {
              console.log('🛑 Subscription expired during active use.');
              if (mainWindow) {
                mainWindow.webContents.send('billing:expired', 'Expired');
              }
            }
          } catch (e) {
            console.error('Failed to sync hourly usage:', e.message);
          }
        }
      }
    }
  }, 1000);
}

async function syncBillingState() {
  const config = readConfig();
  const token = decryptToken(config.token);
  
  if (!token) {
    currentBillingState = {
      status: 'expired',
      type: 'free',
      free_queries_left: 0,
      paid_minutes_left: 0,
      expires_at: null
    };
    if (mainWindow) mainWindow.webContents.send('billing:state-updated', currentBillingState);
    return;
  }

  try {
    const deviceId = getDeviceFingerprint();
    const response = await axios.post(`${BACKEND_URL}/api/license/status`, {
      deviceId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    currentBillingState = response.data;
    config.last_sync_time = Date.now();
    writeConfig(config);
    
    if (mainWindow) {
      mainWindow.webContents.send('billing:state-updated', currentBillingState);
    }
    
    if (currentBillingState.status === 'expired') {
      if (mainWindow) mainWindow.webContents.send('billing:expired', 'Expired');
    }
  } catch (e) {
    console.error('Failed to sync initial billing state:', e.message);
    if (mainWindow) mainWindow.webContents.send('billing:state-updated', currentBillingState);
  }
}

async function verifyAndChargeQuery(screenshotBase64 = null) {
  const config = readConfig();
  const token = decryptToken(config.token);
  if (!token) {
    throw new Error('Please log in or purchase a subscription to generate AI solutions.');
  }
  
  const deviceId = getDeviceFingerprint();
  
  try {
    const response = await axios.post(`${BACKEND_URL}/api/ai/solve`, {
      transcriptHistory,
      context: currentContext,
      screenshotBase64,
      deviceId
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.data.authorized) {
      throw new Error('Payment Required. Out of credits or subscription expired.');
    }
    
    // Sync current credit counts in background
    syncBillingState();
    return true;
  } catch (error) {
    if (error.response) {
      const errMsg = error.response.data.error || 'Authorization failed';
      if (error.response.status === 402) {
        if (mainWindow) mainWindow.webContents.send('billing:expired', 'OutOfCredits');
        throw new Error('Insufficient balance or expired subscription. Please purchase a plan.');
      }
      throw new Error(errMsg);
    }
    throw new Error('Licensing server unavailable. Please check your internet connection.');
  }
}

function createStealthWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    x: Math.floor((width - 1000) / 2),
    y: 50,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    icon: path.join(__dirname, 'assets', 'logo.png'),
    focusable: true, // Allow focus for context input initially
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // CRITICAL STEALTH FEATURE: Hide from screenshots and screen sharing
  mainWindow.setContentProtection(true);
  
  if (process.platform === 'darwin') {
    // macOS specific: hide from dock and exclude from capture
    app.dock.hide();
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // Set to a higher level to stay above system overlays
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    
    if (mainWindow.setExcludesFromCapture) {
        mainWindow.setExcludesFromCapture(true);
    }
  } else {
    // Windows/Linux protection
    mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Initialize AI Service with failover and backup keys
  aiService = new AIService({
    openai: [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY_2],
    gemini: [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2],
    groq: [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2]
  });

  // Initialize Deepgram if key exists
  if (process.env.DEEPGRAM_API_KEY) {
    deepgramService = new DeepgramService(process.env.DEEPGRAM_API_KEY, (msg) => {
        if (msg.type === 'final') {
            handleFinalTranscript(msg.text);
        }
        mainWindow.webContents.send('transcription-update', msg);
    });
    deepgramService.start();
  }

  // Ghost Mode Toggle
  globalShortcut.register('Alt+Shift+G', () => {
    isGhostMode = !isGhostMode;
    mainWindow.setOpacity(isGhostMode ? 0.05 : 1.0);
    mainWindow.setIgnoreMouseEvents(isGhostMode, { forward: true });
    
    // Disable focus in ghost mode to prevent detection by window-switching monitors
    if (mainWindow.setFocusable) {
        mainWindow.setFocusable(!isGhostMode);
    }
    
    mainWindow.webContents.send('ghost-mode-toggled', isGhostMode);
  });

  // Panic Key: Immediate Exit
  globalShortcut.register('Alt+Shift+X', () => {
    if (deepgramService) deepgramService.stop();
    app.quit();
  });

  // Emergency Hide
  globalShortcut.register('Alt+Shift+H', () => {
    mainWindow.setOpacity(0.01);
    setTimeout(() => {
        mainWindow.setOpacity(isGhostMode ? 0.05 : 1.0);
    }, 2000);
  });

  // Manual Screenshot & Analyze
  globalShortcut.register('Alt+Shift+S', async () => {
    await analyzeScreen();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createStealthWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createStealthWindow();
  });

  // Initialize Offline Engine early so it can download models while online
  startVoskService();

  // Periodic Internet Check
  setInterval(checkConnectivity, 5000);
  checkConnectivity();

  // Start Licensing & Billing Checks
  startBillingTracking();
  setTimeout(syncBillingState, 1500);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

async function checkConnectivity() {
    try {
        require('dns').lookup('google.com', (err) => {
            const wasOnline = isOnline;
            isOnline = !err;
            
            if (isOnline !== wasOnline) {
                console.log(`🌐 Internet Status Changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
            }
        });
    } catch (e) {
        isOnline = false;
    }
}

function startVoskService() {
    if (voskProcess) return;
    
    console.log('🎙️ Starting Offline Transcription (Whisper)...');
    
    let pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const venvPath = process.platform === 'win32' 
        ? path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
        : path.join(__dirname, '..', '.venv', 'bin', 'python');
    
    if (fs.existsSync(venvPath)) {
        pythonPath = venvPath;
        console.log(`🐍 Using virtual environment Python: ${pythonPath}`);
    }
    
    const scriptPath = path.join(__dirname, '..', 'scripts', 'vosk_service.py');
    
    voskProcess = spawn(pythonPath, [scriptPath]);
    
    voskProcess.stdout.on('data', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'final') {
                handleFinalTranscript(msg.text);
            }
            if (mainWindow) mainWindow.webContents.send('transcription-update', msg);
        } catch (e) {
            // Not JSON
        }
    });

    voskProcess.stderr.on('data', (data) => {
        console.error(`Vosk Error: ${data}`);
    });
}

function stopVoskService() {
    if (voskProcess) {
        voskProcess.kill();
        voskProcess = null;
        console.log('🛑 Vosk Service Stopped');
    }
}

async function handleFinalTranscript(text) {
  if (!text || text.trim().length < 5) return;
  
  transcriptHistory.push(text);
  if (transcriptHistory.length > 15) transcriptHistory.shift();

  if (aiService && aiService.isQuestion(text)) {
    console.log('🤖 AI Triggered by Question:', text);
    mainWindow.webContents.send('ai-status', 'thinking');
    
    // Auto-trigger analysis with context
    mainWindow.webContents.send('request-context');
  }
}

async function analyzeScreen() {
  try {
    console.log('📸 Analyzing Screen...');
    mainWindow.webContents.send('ai-status', 'thinking');
    
    // Stealth: Temporarily hide window for screenshot
    const currentOpacity = mainWindow.getOpacity();
    mainWindow.setOpacity(0);
    
    await new Promise(r => setTimeout(r, 100));
    const imgBuffer = await screenshot();
    mainWindow.setOpacity(currentOpacity);

    const base64Img = imgBuffer.toString('base64');
    
    // Verify credits/subscription before executing AI query
    await verifyAndChargeQuery(base64Img);
    
    console.log('🚀 Sending to AI Pilot (Multimodal)...');
    const response = await aiService.generateSolution(transcriptHistory, currentContext, base64Img);
    console.log(`✅ ${response.provider} Response Received`);
    mainWindow.webContents.send('ai-solution', response.text);
  } catch (error) {
    console.error('❌ Analysis Error:', error);
    mainWindow.webContents.send('ai-error', error.message);
  }
}

// IPC Handlers
ipcMain.handle('get-env', (event, key) => process.env[key]);

ipcMain.on('send-context', async (event, context) => {
    currentContext = context;
    console.log('🚀 Context Updated:', context.mode);
    
    console.log('🚀 Sending to AI Pilot (Text-only)...');
    mainWindow.webContents.send('ai-status', 'thinking');
    try {
        // Verify credits/subscription before executing AI query
        await verifyAndChargeQuery(null);

        const response = await aiService.generateSolution(transcriptHistory, context);
        console.log(`✅ ${response.provider} Response Received`);
        mainWindow.webContents.send('ai-solution', response.text);
    } catch (e) {
        console.error('❌ AI Error:', e);
        mainWindow.webContents.send('ai-error', e.message);
    }
});

ipcMain.on('audio-data', (event, chunk) => {
    // Record timestamp of audio packet for active usage tracking
    lastAudioReceivedTime = Date.now();

    // If Deepgram is connected, use it. Otherwise, fallback to Local Whisper.
    if (deepgramService && deepgramService.isConnected()) {
        deepgramService.sendAudio(chunk);
    } else if (voskProcess) {
        try {
            voskProcess.stdin.write(Buffer.from(chunk));
        } catch (e) {
            console.error('❌ Error piping audio to Local Whisper:', e);
        }
    }
});

ipcMain.on('close-app', () => {
    if (deepgramService) deepgramService.stop();
    app.quit();
});

ipcMain.on('minimize-app', () => mainWindow.minimize());

// Commercial Billing & Auth Handlers
ipcMain.handle('auth:login', async (event, credentials) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials);
        const { token, user, license } = response.data;
        
        const config = readConfig();
        config.token = encryptToken(token);
        config.email = user.email;
        config.last_sync_time = Date.now();
        writeConfig(config);
        
        currentBillingState = license;
        return { success: true, user, license };
    } catch (e) {
        console.error('Auth Login Error:', e.message);
        const errorMsg = e.response?.data?.error || 'Could not connect to auth server.';
        return { success: false, error: errorMsg };
    }
});

ipcMain.handle('auth:register', async (event, credentials) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, credentials);
        const { token, user, license } = response.data;
        
        const config = readConfig();
        config.token = encryptToken(token);
        config.email = user.email;
        config.last_sync_time = Date.now();
        writeConfig(config);
        
        currentBillingState = license;
        return { success: true, user, license };
    } catch (e) {
        console.error('Auth Register Error:', e.message);
        const errorMsg = e.response?.data?.error || 'Could not complete registration.';
        return { success: false, error: errorMsg };
    }
});

ipcMain.handle('auth:google', async (event) => {
    let clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        try {
            const clientRes = await axios.get(`${BACKEND_URL}/api/auth/google/client-id`);
            clientId = clientRes.data.clientId;
        } catch (err) {
            console.error('Failed to fetch Google Client ID from server:', err.message);
        }
    }
    
    return new Promise((resolve) => {
        const authWindow = new BrowserWindow({
            width: 500,
            height: 600,
            parent: mainWindow,
            modal: true,
            title: 'Sign in with Google',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        let resolved = false;

        const cleanup = (errorMsg) => {
            if (!resolved) {
                resolved = true;
                if (!authWindow.isDestroyed()) {
                    authWindow.destroy();
                }
                resolve({ success: false, error: errorMsg || 'Google login cancelled' });
            }
        };

        authWindow.on('closed', () => {
            cleanup('Google login window was closed');
        });

        const handleAuthRedirect = async (url) => {
            try {
                if (clientId) {
                    // Real Google OAuth Flow: Look for access_token in the redirect fragment
                    if (url.includes('access_token=')) {
                        const fragment = url.split('#')[1];
                        const params = new URLSearchParams(fragment);
                        const accessToken = params.get('access_token');
                        
                        if (accessToken) {
                            resolved = true;
                            authWindow.destroy();
                            
                            const response = await axios.post(`${BACKEND_URL}/api/auth/google`, { accessToken });
                            const { token, user, license } = response.data;
                            
                            const config = readConfig();
                            config.token = encryptToken(token);
                            config.email = user.email;
                            config.last_sync_time = Date.now();
                            writeConfig(config);
                            
                            currentBillingState = license;
                            resolve({ success: true, user, license });
                        }
                    }
                } else {
                    // Mock Flow: Look for query parameters on local success navigation
                    if (url.startsWith('http://localhost/success')) {
                        const parsedUrl = new URL(url);
                        const email = parsedUrl.searchParams.get('email');
                        
                        if (email) {
                            resolved = true;
                            authWindow.destroy();
                            
                            const response = await axios.post(`${BACKEND_URL}/api/auth/google`, { email });
                            const { token, user, license } = response.data;
                            
                            const config = readConfig();
                            config.token = encryptToken(token);
                            config.email = user.email;
                            config.last_sync_time = Date.now();
                            writeConfig(config);
                            
                            currentBillingState = license;
                            resolve({ success: true, user, license });
                        }
                    }
                }
            } catch (e) {
                console.error('Google Auth Handler Error:', e.message);
                const errorMsg = e.response?.data?.error || 'Could not complete Google authentication.';
                cleanup(errorMsg);
            }
        };

        authWindow.webContents.on('will-navigate', (e, url) => {
            handleAuthRedirect(url);
        });

        authWindow.webContents.on('did-navigate', (e, url) => {
            handleAuthRedirect(url);
        });

        if (clientId) {
            // Load real Google OAuth 2.0 endpoint
            const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid`;
            authWindow.loadURL(authUrl);
        } else {
            // Load self-contained mock page using data URL
            const mockHtml = `
                <html>
                    <head>
                        <title>Sign in with Google</title>
                        <style>
                            body { font-family: -apple-system, sans-serif; background: #11111b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #f8fafc; }
                            .card { background: #1e1e2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
                            input { width: 100%; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); border-radius: 8px; margin: 1.25rem 0; font-size: 0.95rem; box-sizing: border-box; color: white; }
                            input:focus { outline: none; border-color: #3b82f6; }
                            button { width: 100%; padding: 0.75rem; background: #4285f4; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
                            button:hover { background: #357ae8; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <svg width="40" height="40" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path fill="#ea4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.63 14.97 1 12 1 7.37 1 3.4 3.73 1.58 7.72l3.81 2.95C6.28 7.35 8.9 5.04 12 5.04z"/><path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.43 3.56l3.77 2.92c2.2-2.03 3.49-5.02 3.49-8.64z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-1.09 7.28-2.95l-3.77-2.92c-1.04.7-2.38 1.12-3.51 1.12-3.1 0-5.72-2.31-6.61-5.63l-3.81 2.95C3.4 20.27 7.37 23 12 23z"/><path fill="#fbbc05" d="M5.39 12.62a7.1 7.1 0 0 1 0-4.24l-3.81-2.95A11.96 11.96 0 0 0 1 12c0 2.45.74 4.74 2.01 6.66l3.81-2.95a7.1 7.1 0 0 1-.43-3.09z"/></svg>
                            <h2 style="font-size:1.25rem; margin-bottom: 0.25rem;">Sign in with Google</h2>
                            <p style="color:#94a3b8; font-size:0.85rem; margin:0;">to continue to Shyoski App</p>
                            <input type="email" id="google-email" value="googleuser@gmail.com" required>
                            <button id="btn-google-auth">Continue</button>
                        </div>
                        <script>
                            document.getElementById('btn-google-auth').onclick = function() {
                                const email = document.getElementById('google-email').value;
                                if (email) {
                                    window.location.href = 'http://localhost/success?email=' + encodeURIComponent(email);
                                }
                            };
                        </script>
                    </body>
                </html>
            `;
            authWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(mockHtml));
        }
    });
});

ipcMain.handle('auth:logout', async (event) => {
    const config = readConfig();
    config.token = null;
    config.email = null;
    config.last_sync_time = 0;
    writeConfig(config);
    
    currentBillingState = {
        status: 'expired',
        type: 'free',
        free_queries_left: 0,
        paid_minutes_left: 0,
        expires_at: null
    };
    return { success: true };
});

ipcMain.handle('billing:get-state', async (event) => {
    const config = readConfig();
    const token = decryptToken(config.token);
    
    if (token) {
        syncBillingState();
    }
    
    return {
        email: config.email,
        loggedIn: !!token,
        state: currentBillingState
    };
});

ipcMain.handle('billing:purchase-plan', async (event, plan) => {
    const config = readConfig();
    const token = decryptToken(config.token);
    if (!token) return { success: false, error: 'User session not found. Please log in.' };
    
    try {
        const orderRes = await axios.post(`${BACKEND_URL}/api/payments/create-order`, { plan }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const { order_id, amount, currency, simulated } = orderRes.data;
        
        if (simulated) {
            console.log('💸 Processing Simulated Payment:', order_id);
            const verifyRes = await axios.post(`${BACKEND_URL}/api/payments/verify`, {
                orderId: order_id,
                paymentId: `pay_mock_${crypto.randomBytes(6).toString('hex')}`
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            currentBillingState = verifyRes.data.license;
            if (mainWindow) mainWindow.webContents.send('billing:state-updated', currentBillingState);
            return { success: true, license: currentBillingState, simulated: true };
        } else {
            return { success: true, order_id, amount, currency, simulated: false };
        }
    } catch (e) {
        console.error('Purchase Plan Error:', e.message);
        const errorMsg = e.response?.data?.error || 'Payment order generation failed.';
        return { success: false, error: errorMsg };
    }
});

ipcMain.handle('billing:verify-payment', async (event, details) => {
    const config = readConfig();
    const token = decryptToken(config.token);
    if (!token) return { success: false, error: 'User session not found. Please log in.' };
    
    try {
        const response = await axios.post(`${BACKEND_URL}/api/payments/verify`, details, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        currentBillingState = response.data.license;
        if (mainWindow) mainWindow.webContents.send('billing:state-updated', currentBillingState);
        return { success: true, license: currentBillingState };
    } catch (e) {
        console.error('Verify Payment IPC Error:', e.message);
        const errorMsg = e.response?.data?.error || 'Payment verification failed.';
        return { success: false, error: errorMsg };
    }
});
