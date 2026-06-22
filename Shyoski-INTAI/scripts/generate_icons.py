import os
import shutil
import subprocess
from PIL import Image

def generate_ico(png_path, ico_path):
    print(f"Generating ICO from {png_path}...")
    img = Image.open(png_path)
    # Standard sizes for ICO
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(ico_path, format="ICO", sizes=sizes)
    print(f"ICO successfully saved to {ico_path}")

def generate_icns(png_path, icns_path):
    print(f"Generating ICNS from {png_path}...")
    iconset_dir = "icon.iconset"
    os.makedirs(iconset_dir, exist_ok=True)
    
    img = Image.open(png_path)
    
    # List of sizes for iconset
    sizes_map = {
        "icon_16x16.png": (16, 16),
        "icon_16x16@2x.png": (32, 32),
        "icon_32x32.png": (32, 32),
        "icon_32x32@2x.png": (64, 64),
        "icon_128x128.png": (128, 128),
        "icon_128x128@2x.png": (256, 256),
        "icon_256x256.png": (256, 256),
        "icon_256x256@2x.png": (512, 512),
        "icon_512x512.png": (512, 512),
        "icon_512x512@2x.png": (1024, 1024)
    }
    
    for filename, size in sizes_map.items():
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(os.path.join(iconset_dir, filename))
        
    try:
        # Run iconutil to compile the iconset into an icns file
        subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_path], check=True)
        print(f"ICNS successfully saved to {icns_path}")
    except Exception as e:
        print(f"Error running iconutil: {e}")
    finally:
        # Clean up iconset directory
        shutil.rmtree(iconset_dir)

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    png_input = os.path.join(base_dir, "assets", "logo.png")
    ico_output = os.path.join(base_dir, "assets", "icon.ico")
    icns_output = os.path.join(base_dir, "assets", "icon.icns")
    
    generate_ico(png_input, ico_output)
    generate_icns(png_input, icns_output)
