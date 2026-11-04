#!/usr/bin/env python3
"""
client/scripts/cutout_pieces.py
Removes backgrounds from source chess piece images using rembg and Pillow,
trimming alpha margins and saving pristine transparent PNG and WebP assets.
"""

import os
import sys
from pathlib import Path
from PIL import Image
import rembg

def process_image(src_path: Path, dest_dir: Path, base_name: str):
    print(f"Processing {src_path.name} -> {base_name}...")
    try:
        with Image.open(src_path) as img:
            img_rgba = img.convert("RGBA")
            
            # Remove background using rembg
            cutout = rembg.remove(img_rgba)
            
            # Crop bounding box of non-zero alpha
            bbox = cutout.getbbox()
            if bbox:
                cutout = cutout.crop(bbox)
            
            # Add slight padding around the piece (16px)
            padded = Image.new("RGBA", (cutout.width + 32, cutout.height + 32), (0, 0, 0, 0))
            padded.paste(cutout, (16, 16))
            
            # Save as PNG
            png_out = dest_dir / f"{base_name}.png"
            padded.save(png_out, "PNG", optimize=True)
            print(f"  ✓ Saved PNG: {png_out} ({padded.size})")
            
            # Save as WebP
            webp_out = dest_dir / f"{base_name}.webp"
            padded.save(webp_out, "WEBP", quality=95)
            print(f"  ✓ Saved WebP: {webp_out}")
            return True
    except Exception as e:
        print(f"  ✗ Error processing {src_path}: {e}")
        return False

def main():
    script_dir = Path(__file__).resolve().parent
    client_dir = script_dir.parent
    src_images_dir = client_dir / "public" / "images"
    raw_dir = src_images_dir / "raw"
    dest_dir = src_images_dir / "pieces"
    dest_dir.mkdir(parents=True, exist_ok=True)
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    # Process single target if CLI arguments provided
    if len(sys.argv) > 2:
        src = Path(sys.argv[1])
        name = sys.argv[2]
        process_image(src, dest_dir, name)
        return

    # Process all available raw pieces
    pieces_map = {
        "gold-king-raw.jpg": "king-gold",
        "gold-king-raw.png": "king-gold",
        "rook-raw.jpg": "rook",
        "rook-raw.png": "rook",
        "bishop-raw.jpg": "bishop",
        "bishop-raw.png": "bishop",
        "queen-raw.jpg": "queen",
        "queen-raw.png": "queen",
        "pawn-raw.jpg": "pawn",
        "pawn-raw.png": "pawn",
    }
    
    for filename, out_name in pieces_map.items():
        raw_file = raw_dir / filename
        if raw_file.exists():
            process_image(raw_file, dest_dir, out_name)

    # Process existing legacy core images if not already present
    king_src = src_images_dir / "chess-king-dark.png"
    if king_src.exists() and not (dest_dir / "king-dark.png").exists():
        process_image(king_src, dest_dir, "king-dark")
        
    knight_src = src_images_dir / "chess-knight-dark.png"
    if knight_src.exists() and not (dest_dir / "knight-dark.png").exists():
        process_image(knight_src, dest_dir, "knight-dark")

if __name__ == "__main__":
    main()
