const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Groq = require('groq-sdk');
const Tesseract = require('tesseract.js');

class AIService {
  constructor(keySets) {
    this.keySets = keySets;
    this.currentIndices = { openai: 0, gemini: 0, groq: 0, local: 0 };
    this.providerCooldowns = { openai: 0, gemini: 0, groq: 0 };
    this.history = [];

    this._initializeClients();
  }

  _initializeClients() {
    this.clients = {
      openai: (this.keySets.openai || []).map(key => this._isValidKey(key, 'sk-') ? new OpenAI({ apiKey: key.trim() }) : null).filter(Boolean),
      gemini: (this.keySets.gemini || []).map(key => this._isValidKey(key, 'AIza') ? new GoogleGenerativeAI(key.trim()) : null).filter(Boolean),
      groq: (this.keySets.groq || []).map(key => this._isValidKey(key, 'gsk_') ? new Groq({ apiKey: key.trim() }) : null).filter(Boolean),
      local: [new OpenAI({ apiKey: 'ollama', baseURL: 'http://127.0.0.1:11434/v1' })] // Ollama Fallback (IP is more reliable than 'localhost' on some systems when offline)
    };

    console.log(`📡 AI Service Initialized: OpenAI(${this.clients.openai.length}), Gemini(${this.clients.gemini.length}), Groq(${this.clients.groq.length}), Local(1)`);
  }

  _isValidKey(key, prefix) {
    if (!key) return false;
    if (key.includes('your_') || key.includes('your-')) return false; // Filter placeholders
    if (key.length < 10) return false;
    return key.startsWith(prefix);
  }

  async generateSolution(transcriptHistory, context, screenshotBase64 = null) {
    const transcript = transcriptHistory.join('\n');
    const lastQuestion = transcriptHistory[transcriptHistory.length - 1] || '';

    let ocrText = null;
    if (screenshotBase64) {
      console.log('🔍 Processing OCR Fallback...');
      try {
        const { data: { text } } = await Tesseract.recognize(
          Buffer.from(screenshotBase64, 'base64'),
          'eng'
        );
        ocrText = text;
        console.log('✅ OCR Complete');
      } catch (e) {
        console.error('❌ OCR Failed:', e.message);
      }
    }

    const prompt = this._buildPrompt(transcript, lastQuestion, context, screenshotBase64, ocrText);

    const providers = ['openai', 'gemini', 'groq', 'local'];

    for (const providerName of providers) {
      // Check cooldown (skip if provider failed recently)
      if (this.providerCooldowns[providerName] && Date.now() < this.providerCooldowns[providerName]) {
        console.log(`⏳ Skipping ${providerName} (Cooldown active)`);
        continue;
      }

      const clients = this.clients[providerName];
      if (!clients || clients.length === 0) continue;

      let allKeysFailed = true;
      for (let i = 0; i < clients.length; i++) {
        const baseIndex = this.currentIndices[providerName] || 0;
        const currentIndex = (baseIndex + i) % clients.length;
        const client = clients[currentIndex];

        try {
          console.log(`🚀 Attempting with ${providerName} (Key #${currentIndex + 1})...`);
          const response = await this._callProvider(providerName, client, prompt, screenshotBase64);

          this.currentIndices[providerName] = currentIndex;
          console.log(`✅ Success with ${providerName}`);
          allKeysFailed = false;
          return { provider: providerName, text: response };
        } catch (error) {
          const errMsg = error.message || String(error);
          console.error(`❌ ${providerName} Key #${currentIndex + 1} failed:`, errMsg);

          if (providerName === 'local') {
            console.error('🛠️ Local Provider Error Details:', error);
          }

          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Too Many Requests')) {
            console.log(`🔄 Quota exceeded for ${providerName} Key #${currentIndex + 1}, rotating...`);
            continue;
          }

          if (errMsg.includes('401') || errMsg.includes('API key not valid') || errMsg.includes('Invalid API Key')) {
            console.log(`⚠️ Invalid Key detected for ${providerName} Key #${currentIndex + 1}, trying next...`);
            continue;
          }

          continue;
        }
      }

      // If we reach here, all keys for this provider failed. Set a cooldown.
      if (providerName !== 'local') {
        this.providerCooldowns[providerName] = Date.now() + 60000; // 60s cooldown
        console.log(`⏸️ ${providerName} placed on cooldown for 60s.`);
      }
    }

    throw new Error('All AI providers and backup keys failed. Please check your .env file and ensure keys are valid.');
  }

  async _callProvider(name, client, prompt, screenshotBase64) {
    if (name === 'openai' || name === 'local') return await this._callOpenAI(client, prompt, screenshotBase64, name === 'local');
    if (name === 'gemini') return await this._callGemini(client, prompt, screenshotBase64);
    if (name === 'groq') return await this._callGroq(client, prompt);
  }

  async _callGemini(client, prompt, screenshotBase64) {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const parts = [{ text: prompt }];
    if (screenshotBase64) {
      parts.push({
        inlineData: {
          data: screenshotBase64,
          mimeType: 'image/png',
        },
      });
    }
    const result = await model.generateContent(parts);
    const response = await result.response;
    return response.text();
  }

  async _callGroq(client, prompt) {
    const chatCompletion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    return chatCompletion.choices[0].message.content;
  }

  async _callOpenAI(client, prompt, screenshotBase64, isLocal = false) {
    if (isLocal) {
      const axios = require('axios');
      console.log('🔗 Calling Ollama via Axios (Direct Local)...');
      try {
        const response = await axios.post('http://127.0.0.1:11434/api/chat', {
          model: 'llama3',
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }, { timeout: 30000 });

        return response.data.message.content;
      } catch (e) {
        console.error('❌ Ollama Direct Call Failed:', e.message);
        throw e;
      }
    }

    const messages = [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ];

    if (screenshotBase64) {
      messages[0].content.push({
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${screenshotBase64}` },
      });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    });
    return response.choices[0].message.content;
  }

  _buildPrompt(transcript, lastQuestion, context, screenshotBase64, ocrText) {
    let mode = screenshotBase64 ? 'MULTIMODAL ANALYSIS' : 'CONVERSATIONAL ANALYSIS';
    const isExamMode = context.mode === 'mcq';

    return `
You are Shyoski, an elite Interview Pilot. 

MODE: ${mode}
${isExamMode ? 'EXAM MODE: ACTIVE (Direct answers only)' : 'INTERVIEW MODE: ACTIVE (Detailed strategy)'}

CRITICAL RULE: Focus ONLY on answering the "CURRENT TARGET QUESTION" or solving the "SCREENSHOT PROBLEM" below.

${isExamMode ? `
EXAM MODE RULES:
1. If the question is an MCQ, provide ONLY the correct option and a very brief reason (e.g., "Answer: C").
2. If the question is a coding problem, provide ONLY the full code solution. 
3. DO NOT provide lengthy explanations, strategy talking points, or introductions.
4. Be as concise as possible.
` : `
INTERVIEW MODE RULES:
1. Solve the problem IMMEDIATELY with the MOST OPTIMIZED code.
2. Provide strategy and talking points for the candidate to use.
3. Explain the logic in 3-4 quick bullet points.
`}

${screenshotBase64 ? `
SCREENSHOT ANALYSIS:
OCR EXTRACTED TEXT: 
"${ocrText || 'N/A'}"
` : ''}

USER CONTEXT:
Resume: ${context.resume || 'Not provided'}
Job Description: ${context.jd || 'Not provided'}

CONVERSATION HISTORY:
${transcript}

CURRENT TARGET QUESTION:
"${lastQuestion}"

OUTPUT FORMAT:
- Title: Problem Name / Question Title.
- Content: ${isExamMode ? 'Direct Answer / Brief logic.' : 'Strategy and talking points.'}
- Code: Full solution (if applicable).

Be ultra-fast.
PHONETIC CORRECTION RULE: If the transcription looks like nonsense (e.g., "belly drums"), interpret it phonetically based on common interview topics (e.g., "palindrome"). Use the "USER CONTEXT" to guide your correction.`;
  }

  isQuestion(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('?')) return true;
    const questionStarters = ['what', 'how', 'why', 'when', 'where', 'describe', 'tell', 'explain', 'could', 'would', 'can', 'will', 'do', 'does', 'is', 'are', 'was', 'were', 'give', 'share', 'walk'];
    const words = lowerText.split(' ');
    if (words.length > 0 && questionStarters.includes(words[0])) return text.length > 8;
    const interviewPhrases = ['tell me about', 'experience with', 'background in', 'your approach to', 'how do you', 'what is your', 'can you explain', 'beloved yourself', 'tell about yourself', 'tell us about yourself', 'what are your strengths', 'what are your string', 'where do you see', 'why should we hire', 'react experience'];
    return interviewPhrases.some(phrase => lowerText.includes(phrase));
  }
}

module.exports = AIService;
