// UI Element References
const closeBtn = document.getElementById('close-btn');
const minBtn = document.getElementById('min-btn');
const contextTrigger = document.getElementById('context-trigger');
const contextModal = document.getElementById('context-modal');
const saveContextBtn = document.getElementById('save-context');
const resumeInput = document.getElementById('resume-input');
const jdInput = document.getElementById('jd-input');
const transcriptContainer = document.getElementById('transcript-container');
const solutionsContainer = document.getElementById('solutions-container');
const thinkingIndicator = document.getElementById('thinking-indicator');
const toggleTranscriptionBtn = document.getElementById('toggle-transcription');
const toggleText = document.getElementById('toggle-text');
const toggleIcon = toggleTranscriptionBtn.querySelector('.icon');
const btnMode = document.getElementById('btn-mode');

// Billing UI Element References
const btnBilling = document.getElementById('btn-billing');
const billingModal = document.getElementById('billing-modal');
const billingClose = document.getElementById('billing-close');
const toggleSigninTab = document.getElementById('toggle-signin-tab');
const toggleSignupTab = document.getElementById('toggle-signup-tab');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authErrorMsg = document.getElementById('auth-error-msg');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const billingAuthSection = document.getElementById('billing-auth-section');
const billingDashboardSection = document.getElementById('billing-dashboard-section');
const btnLogout = document.getElementById('btn-logout');
const billingUserEmail = document.getElementById('billing-user-email');
const planBadgeDisplay = document.getElementById('plan-badge-display');
const planDetailsDisplay = document.getElementById('plan-details-display');
const billingStatusMsg = document.getElementById('billing-status-msg');

// Application State
let isTranscriptionActive = true;
let isAppLocked = false; // Lock transcription/AI if expired
let currentAuthMode = 'signin'; // 'signin' or 'signup'

let context = {
    resume: localStorage.getItem('shyoski_resume') || '',
    jd: localStorage.getItem('shyoski_jd') || '',
    mode: localStorage.getItem('shyoski_mode') || 'interview'
};

// Initialize Inputs
resumeInput.value = context.resume;
jdInput.value = context.jd;

// Event Listeners
closeBtn.onclick = () => window.electronAPI.closeApp();
minBtn.onclick = () => window.electronAPI.minimizeApp();

contextTrigger.onclick = () => {
    contextModal.classList.toggle('active');
    billingModal.classList.remove('active'); // Close other modals
};

// Billing Modals Triggers
btnBilling.onclick = () => {
    billingModal.classList.toggle('active');
    contextModal.classList.remove('active'); // Close other modals
    refreshBillingState();
};

billingClose.onclick = () => {
    billingModal.classList.remove('active');
};

// Toggle Signin / Signup Tabs
toggleSigninTab.onclick = () => {
    currentAuthMode = 'signin';
    toggleSigninTab.classList.add('active');
    toggleSignupTab.classList.remove('active');
    authSubmitBtn.innerText = 'Sign In';
    authErrorMsg.style.display = 'none';
};

toggleSignupTab.onclick = () => {
    currentAuthMode = 'signup';
    toggleSignupTab.classList.add('active');
    toggleSigninTab.classList.remove('active');
    authSubmitBtn.innerText = 'Sign Up';
    authErrorMsg.style.display = 'none';
};

function updateModeUI() {
    if (context.mode === 'mcq') {
        btnMode.innerText = 'Mode: MCQ/Exam';
        btnMode.classList.add('exam-mode');
    } else {
        btnMode.innerText = 'Mode: Interview';
        btnMode.classList.remove('exam-mode');
    }
}

btnMode.onclick = () => {
    context.mode = context.mode === 'interview' ? 'mcq' : 'interview';
    localStorage.setItem('shyoski_mode', context.mode);
    updateModeUI();
    window.electronAPI.sendContext(context);
    addTranscriptLine(`System: Mode switched to ${context.mode === 'mcq' ? 'MCQ/Exam' : 'Interview'}.`, true);
};

// Initialize Mode UI
updateModeUI();

saveContextBtn.onclick = () => {
    context.resume = resumeInput.value;
    context.jd = jdInput.value;
    localStorage.setItem('shyoski_resume', context.resume);
    localStorage.setItem('shyoski_jd', context.jd);
    contextModal.classList.remove('active');
    
    addSolutionCard('Context Updated', 'AI Pilot will now use your updated resume and job description for all suggestions.');
};

window.electronAPI.onGhostModeToggled((isGhost) => {
    if (isGhost) {
        document.body.classList.add('ghost-active');
        contextModal.classList.remove('active');
        billingModal.classList.remove('active');
    } else {
        document.body.classList.remove('ghost-active');
    }
});

// Transcription Handling
let currentPartialText = '';
const partialElement = document.createElement('div');
partialElement.className = 'transcript-text highlight';
transcriptContainer.appendChild(partialElement);

// Transcription Handlers
toggleTranscriptionBtn.addEventListener('click', () => {
    if (isAppLocked) {
        addTranscriptLine('System: Please log in or add credits to start listening.', false);
        billingModal.classList.add('active');
        return;
    }

    isTranscriptionActive = !isTranscriptionActive;
    if (isTranscriptionActive) {
        toggleTranscriptionBtn.classList.replace('btn-secondary', 'btn-primary');
        toggleText.innerText = 'Listening';
        toggleIcon.innerText = '🟢';
        addTranscriptLine('System: Transcription resumed.', true);
    } else {
        toggleTranscriptionBtn.classList.replace('btn-primary', 'btn-secondary');
        toggleText.innerText = 'Paused';
        toggleIcon.innerText = '🔴';
        addTranscriptLine('System: Transcription paused.', true);
    }
});

window.electronAPI.onTranscriptionUpdate((msg) => {
    if (!isTranscriptionActive || isAppLocked) return;

    if (msg.type === 'partial') {
        partialElement.textContent = msg.text + '...';
        transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    } else if (msg.type === 'final') {
        addTranscriptLine(msg.text, true);
        partialElement.textContent = ''; // Clear partial
    } else if (msg.type === 'error') {
        addTranscriptLine(`Error: ${msg.message}`, false);
    }
});

// AI Handling
window.electronAPI.onAiStatus((status) => {
    setThinking(status === 'thinking');
});

window.electronAPI.onAiSolution((solution) => {
    setThinking(false);
    
    const lines = solution.split('\n');
    let title = 'AI Insight';
    let content = solution;
    let code = null;

    if (solution.includes('Title:')) {
        title = solution.match(/Title:\s*(.*)/)?.[1] || title;
    }
    
    if (solution.includes('```')) {
        const codeMatch = solution.match(/```(?:\w+)?\n([\s\S]*?)```/);
        if (codeMatch) code = codeMatch[1];
    }

    addSolutionCard(title, content, code);
});

window.electronAPI.onAiError((error) => {
    setThinking(false);
    addSolutionCard('AI Error', error);
});

window.electronAPI.onRequestContext(() => {
    window.electronAPI.sendContext(context);
});

// Audio Capture Setup (Deepgram)
async function setupAudioCapture() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
            if (!isTranscriptionActive || isAppLocked) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = convertFloat32ToInt16(inputData);
            window.electronAPI.sendAudio(pcmData);
        };
        
        console.log('🎤 Microphone capture started');
        addTranscriptLine('Microphone active. Streaming to AI...', true);
    } catch (err) {
        console.error('Failed to capture audio:', err);
        addTranscriptLine('Error: Could not access microphone.', false);
    }
}

function convertFloat32ToInt16(buffer) {
    let l = buffer.length;
    let buf = new Int16Array(l);
    while (l--) {
        buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
    }
    return buf.buffer;
}

// Initialize Microphone Capture
setupAudioCapture();

// Utility Functions
function addTranscriptLine(text, isHighlight = false) {
    const div = document.createElement('div');
    div.className = `transcript-text ${isHighlight ? 'highlight' : ''}`;
    div.textContent = text;
    transcriptContainer.appendChild(div);
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

function addSolutionCard(title, content, code = null) {
    const card = document.createElement('div');
    card.className = 'solution-card';
    
    let html = `
        <div class="solution-title">${title}</div>
        <div class="solution-content">${content}</div>
    `;
    
    if (code) {
        html += `<pre class="code-block"><code>${code}</code></pre>`;
    }
    
    card.innerHTML = html;
    solutionsContainer.prepend(card);
}

function setThinking(isThinking) {
    thinkingIndicator.style.display = isThinking ? 'inline' : 'none';
}

// Initial Greeting
setTimeout(() => {
    addTranscriptLine('System ready. Listening for audio...', true);
}, 1000);

// --- Commercial Auth & Billing Renderer Logic ---

// Refresh Billing status from Local and API State
async function refreshBillingState() {
    try {
        const data = await window.electronAPI.getBillingState();
        updateBillingUI(data);
    } catch (e) {
        console.error('Failed to get billing state:', e);
    }
}

function updateBillingUI(data) {
    if (!data.loggedIn) {
        billingAuthSection.classList.add('active');
        billingDashboardSection.classList.remove('active');
        return;
    }

    billingAuthSection.classList.remove('active');
    billingDashboardSection.classList.add('active');
    
    billingUserEmail.innerText = data.email;
    
    const state = data.state;
    
    // Set lock flag based on subscription state
    if (state.status === 'expired') {
        isAppLocked = true;
        planBadgeDisplay.innerText = 'Expired / Locked';
        planBadgeDisplay.style.color = '#ef4444';
        planDetailsDisplay.innerText = '0 credits / minutes left';
        
        // Update listening buttons
        toggleTranscriptionBtn.classList.replace('btn-primary', 'btn-secondary');
        toggleText.innerText = 'Paused';
        toggleIcon.innerText = '🔴';
    } else {
        isAppLocked = false;
        planBadgeDisplay.innerText = state.type.toUpperCase();
        planBadgeDisplay.style.color = 'var(--accent-blue)';
        
        if (state.status === 'free_trial') {
            planBadgeDisplay.innerText = 'FREE TRIAL';
            planDetailsDisplay.innerText = `${state.free_queries_left} solutions left`;
        } else if (state.type === 'hourly') {
            planDetailsDisplay.innerText = `${state.paid_minutes_left.toFixed(1)} mins balance`;
        } else {
            // Duration-based
            const dateStr = new Date(state.expires_at).toLocaleDateString();
            planDetailsDisplay.innerText = `Expires: ${dateStr}`;
        }
    }
}

// Authentication Form Submit Handler (Sign In / Sign Up)
authForm.onsubmit = async (e) => {
    e.preventDefault();
    authErrorMsg.style.display = 'none';
    authSubmitBtn.disabled = true;
    authSubmitBtn.innerText = currentAuthMode === 'signin' ? 'Signing In...' : 'Registering...';

    const email = authEmail.value.trim();
    const password = authPassword.value;

    let result;
    if (currentAuthMode === 'signin') {
        result = await window.electronAPI.login({ email, password });
    } else {
        result = await window.electronAPI.register({ email, password });
    }

    authSubmitBtn.disabled = false;
    authSubmitBtn.innerText = currentAuthMode === 'signin' ? 'Sign In' : 'Sign Up';

    if (result.success) {
        authForm.reset();
        refreshBillingState();
        showStatusMessage('Successfully Authenticated!', 'var(--success)');
    } else {
        authErrorMsg.innerText = result.error;
        authErrorMsg.style.display = 'block';
    }
};

// Sign Out button
btnLogout.onclick = async () => {
    await window.electronAPI.logout();
    refreshBillingState();
    showStatusMessage('Signed out successfully.', 'var(--text-secondary)');
};

// Google Sign-In click handler
const btnGoogleSignin = document.getElementById('btn-google-signin');
if (btnGoogleSignin) {
    btnGoogleSignin.onclick = async () => {
        authErrorMsg.style.display = 'none';
        showStatusMessage('Opening Google Sign-In...', 'var(--accent-blue)');
        
        try {
            const result = await window.electronAPI.googleAuth();
            if (result.success) {
                refreshBillingState();
                showStatusMessage('Successfully Authenticated with Google!', 'var(--success)');
            } else {
                authErrorMsg.innerText = result.error || 'Google Authentication failed';
                authErrorMsg.style.display = 'block';
            }
        } catch (err) {
            authErrorMsg.innerText = 'Failed to connect for Google Auth.';
            authErrorMsg.style.display = 'block';
        }
    };
}

// Upgrade Buttons Click Handler
document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.onclick = async () => {
        const plan = btn.getAttribute('data-plan');
        btn.disabled = true;
        btn.innerText = 'Processing...';

        try {
            const result = await window.electronAPI.purchasePlan(plan);
            
            btn.disabled = false;
            btn.innerText = btn.parentElement.querySelector('.btn-buy').innerText; // Restore price label

            if (result.success) {
                if (result.simulated) {
                    showStatusMessage(`Successfully upgraded to ${plan.toUpperCase()}! (Sandbox Simulation)`, 'var(--success)');
                    refreshBillingState();
                } else {
                    // Start real Razorpay checkout overlay
                    const options = {
                        key: result.key_id,
                        amount: result.amount,
                        currency: result.currency,
                        name: "Shyoski",
                        description: `Purchase ${plan.toUpperCase()} Subscription`,
                        order_id: result.order_id,
                        handler: async function (response) {
                            showStatusMessage('Payment completed! Verifying with server...', 'var(--accent-blue)');
                            const verifyRes = await window.electronAPI.verifyPayment({
                                orderId: result.order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature
                            });
                            if (verifyRes.success) {
                                showStatusMessage('Payment verified! Subscription active.', 'var(--success)');
                                refreshBillingState();
                            } else {
                                showStatusMessage(`Verification failed: ${verifyRes.error}`, '#ef4444');
                            }
                        },
                        prefill: {
                            email: billingUserEmail.innerText
                        },
                        theme: {
                            color: "#3b82f6"
                        }
                    };
                    const rzp = new Razorpay(options);
                    rzp.on('payment.failed', function (resp) {
                        showStatusMessage(`Payment failed: ${resp.error.description}`, '#ef4444');
                    });
                    rzp.open();
                }
            } else {
                showStatusMessage(`Upgrade failed: ${result.error}`, '#ef4444');
            }
        } catch (err) {
            btn.disabled = false;
            showStatusMessage('Network error during checkout.', '#ef4444');
        }
    };
});

// Helper to show temporary notification inside billing modal
function showStatusMessage(msg, color) {
    billingStatusMsg.innerText = msg;
    billingStatusMsg.style.color = color;
    billingStatusMsg.style.display = 'block';
    setTimeout(() => {
        billingStatusMsg.style.display = 'none';
    }, 4000);
}

// IPC Billing Listeners
window.electronAPI.onBillingStateUpdated((state) => {
    // If billing state changes dynamically (e.g. from background task timer)
    updateBillingUI({ loggedIn: true, state });
});

window.electronAPI.onBillingExpired((reason) => {
    isAppLocked = true;
    isTranscriptionActive = false;
    
    toggleTranscriptionBtn.classList.replace('btn-primary', 'btn-secondary');
    toggleText.innerText = 'Paused';
    toggleIcon.innerText = '🔴';
    
    if (reason === 'ClockTamper') {
        addTranscriptLine('🛑 System: Clock Tampering Detected. App has been locked.', false);
        addSolutionCard('Security Violation', 'System time drift detected. Please correct your laptop clock and connect online to unlock features.');
    } else {
        addTranscriptLine('🛑 System: Subscription expired or out of credits.', false);
        addSolutionCard('Credits Expired', 'Your trial queries or paid listening balance has expired. Please open Billing (Account button) to refill.');
    }
    
    billingModal.classList.add('active');
    refreshBillingState();
});

// Run Initial Check on Startup
refreshBillingState();
