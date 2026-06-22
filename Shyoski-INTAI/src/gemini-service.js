const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      },
    });
  }

  async generatePilotSolution(transcript, context, screenshotBase64 = null) {
    const prompt = `
You are Shyoski, an elite Interview Pilot. Your goal is to provide real-time, discreet guidance.

USER CONTEXT:
Resume: ${context.resume || 'Not provided'}
Job Description: ${context.jd || 'Not provided'}

LIVE TRANSCRIPT:
"${transcript}"

${screenshotBase64 ? 'A screenshot of the coding problem or screen is provided.' : ''}

GOALS:
1. If the transcript contains a question from an interviewer, provide a winning answer immediately.
2. If the context suggests a coding test, solve the problem shown in the screenshot or transcript.
3. Keep answers concise, bulleted, and professional.
4. If referring to the resume, highlight specific matching achievements.

OUTPUT FORMAT:
- Title: A short catchy title for the situation.
- Content: The actual answer or guidance.
- Code: (Optional) If it's a technical question, provide optimized code.

Be ultra-fast and precise.`;

    const parts = [{ text: prompt }];
    if (screenshotBase64) {
      parts.push({
        inlineData: {
          data: screenshotBase64,
          mimeType: 'image/png',
        },
      });
    }

    try {
      const result = await this.model.generateContent(parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini Error:', error);
      throw error;
    }
  }

  // More aggressive question detection for speech-to-text
  isQuestion(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?')) return true;

    const questionStarters = [
        'what', 'how', 'why', 'when', 'where', 'describe', 'tell', 'explain', 
        'could', 'would', 'can', 'will', 'do', 'does', 'is', 'are', 'was', 
        'were', 'give', 'share', 'walk'
    ];
    
    const words = lowerText.split(' ');
    if (words.length > 0 && questionStarters.includes(words[0])) {
        return text.length > 15;
    }

    const interviewPhrases = [
        'tell me about', 'experience with', 'background in', 'your approach to',
        'how do you', 'what is your', 'can you explain'
    ];

    return interviewPhrases.some(phrase => lowerText.includes(phrase));
  }
}

module.exports = GeminiService;
