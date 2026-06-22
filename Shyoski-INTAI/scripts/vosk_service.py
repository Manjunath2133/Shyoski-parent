import os
import sys
import json
import numpy as np
from faster_whisper import WhisperModel
import io

# Configuration
# 'small' is the sweet spot for laptops. Fast and accurate.
MODEL_SIZE = "small"
SAMPLE_RATE = 16000

def main():
    try:
        # Initialize Whisper Model
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        
        print(json.dumps({"type": "status", "message": f"Whisper {MODEL_SIZE} initialized successfully"}))
        sys.stdout.flush()

        audio_accumulator = []
        
        # Read from stdin buffer
        while True:
            # Read small chunks to avoid blocking
            data = sys.stdin.buffer.read(4000)
            if not data:
                break
            
            # Convert bytes to numpy float32 array
            audio_int16 = np.frombuffer(data, dtype=np.int16)
            audio_float32 = audio_int16.astype(np.float32) / 32768.0
            audio_accumulator.extend(audio_float32)

            # Transcribe when we have at least 1.5 seconds of new audio for better context
            if len(audio_accumulator) >= 24000:
                current_audio = np.array(audio_accumulator)
                # Keep a small overlap (0.5s)
                audio_accumulator = audio_accumulator[16000:] 
                
                # Beam size 1 is much faster
                segments, info = model.transcribe(current_audio, beam_size=1, vad_filter=True)
                
                for segment in segments:
                    if segment.text.strip():
                        print(json.dumps({"type": "final", "text": segment.text.strip()}))
                        sys.stdout.flush()

    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.stdout.flush()

if __name__ == "__main__":
    main()
