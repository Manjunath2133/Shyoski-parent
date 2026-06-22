const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');

class DeepgramService {
  constructor(apiKey, onTranscript) {
    this.apiKey = apiKey;
    this.deepgram = createClient(apiKey);
    this.onTranscript = onTranscript;
    this.connection = null;
    this.keepAliveInterval = null;
  }

  async start() {
    if (this.connection) return;

    this.connection = this.deepgram.listen.live({
      model: 'nova-2',
      smart_format: true,
      interim_results: true,
      language: 'en-US',
      encoding: 'linear16',
      sample_rate: 16000,
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('🔗 Deepgram Connection Opened');
      this._startKeepAlive();
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript && transcript.trim()) {
        this.onTranscript({
          type: data.is_final ? 'final' : 'partial',
          text: transcript
        });
      }
    });

    this.connection.on(LiveTranscriptionEvents.Error, (err) => {
      console.error('❌ Deepgram Error:', err);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('🔌 Deepgram Connection Closed');
      this.connection = null;
      this._stopKeepAlive();
    });
  }

  _startKeepAlive() {
    this._stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (this.connection) {
        // Send a small empty buffer to keep the connection alive
        this.connection.send(Buffer.alloc(0));
      }
    }, 5000);
  }

  _stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  isConnected() {
    return this.connection && this.connection.getReadyState() === 1;
  }

  async sendAudio(chunk) {
    if (!this.connection) {
        // Only try to reconnect if we haven't just failed
        this.start();
    }
    
    if (this.isConnected()) {
      this.connection.send(chunk);
    }
  }

  stop() {
    this._stopKeepAlive();
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
    }
  }
}

module.exports = DeepgramService;
