import os
import urllib.request
import zipfile

MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
MODEL_ZIP = "model.zip"
MODEL_DIR = "model"

def download_model():
    if os.path.exists(MODEL_DIR):
        print(f"Model already exists in {MODEL_DIR}")
        return

    print(f"Downloading model from {MODEL_URL}...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_ZIP)
    
    print("Unzipping model...")
    with zipfile.ZipFile(MODEL_ZIP, 'r') as zip_ref:
        zip_ref.extractall(".")
        
    # Rename extracted directory to 'model'
    extracted_dir = MODEL_URL.split("/")[-1].replace(".zip", "")
    os.rename(extracted_dir, MODEL_DIR)
    
    os.remove(MODEL_ZIP)
    print("Model setup complete.")

if __name__ == "__main__":
    download_model()
