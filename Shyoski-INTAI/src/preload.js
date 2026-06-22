const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getEnv: (key) => ipcRenderer.invoke('get-env', key),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onGhostModeToggled: (callback) => ipcRenderer.on('ghost-mode-toggled', (event, value) => callback(value)),
  onTranscriptionUpdate: (callback) => ipcRenderer.on('transcription-update', (event, msg) => callback(msg)),
  onAiSolution: (callback) => ipcRenderer.on('ai-solution', (event, solution) => callback(solution)),
  onAiStatus: (callback) => ipcRenderer.on('ai-status', (event, status) => callback(status)),
  onAiError: (callback) => ipcRenderer.on('ai-error', (event, error) => callback(error)),
  onRequestContext: (callback) => ipcRenderer.on('request-context', () => callback()),
  sendContext: (context) => ipcRenderer.send('send-context', context),
  sendAudio: (chunk) => ipcRenderer.send('audio-data', chunk),

  // Commercial Licensing & Authentication
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  register: (credentials) => ipcRenderer.invoke('auth:register', credentials),
  googleAuth: (clientId) => ipcRenderer.invoke('auth:google', { clientId }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getBillingState: () => ipcRenderer.invoke('billing:get-state'),
  purchasePlan: (plan) => ipcRenderer.invoke('billing:purchase-plan', plan),
  verifyPayment: (details) => ipcRenderer.invoke('billing:verify-payment', details),
  onBillingStateUpdated: (callback) => ipcRenderer.on('billing:state-updated', (event, state) => callback(state)),
  onBillingExpired: (callback) => ipcRenderer.on('billing:expired', (event, reason) => callback(reason))
});

