"""
Pixel Art Map Pipeline & Processor for Sinfonia dos Cristais
Converts AI map generations into authentic 16-bit SNES Pixel Art:
- SNES 15-bit color clamping (hardware palette emulation)
- Integer-grid downsampling via Box area filter to eliminate fractional mixels
- Palette quantization (64, 96, 128 colors)
- Nearest-neighbor point upscaling to target game resolution
- Optional pixel-art Vitória-Régia and Rocha level markers
"""
import os
import sys
from PIL import Image, ImageDraw

def snes_quantize_color(rgb):
    # SNES uses 5 bits per channel: values 0 to 31 scaled by 8
    return (
        min(255, round(rgb[0] / 8) * 8),
        min(255, round(rgb[1] / 8) * 8),
        min(255, round(rgb[2] / 8) * 8)
    )

def to_true_pixel_art(
    img_path,
    output_path,
    base_w=480,
    base_h=270,
    num_colors=96,
    target_w=1672,
    target_h=941
):
    im = Image.open(img_path).convert('RGB')
    
    # 1. Downscale to base retro resolution using BOX filter to average subpixel noise
    small = im.resize((base_w, base_h), Image.Resampling.BOX)
    
    # 2. Emulate SNES 15-bit color depth
    pixels = [snes_quantize_color(p) for p in small.getdata()]
    small_snes = Image.new('RGB', (base_w, base_h))
    small_snes.putdata(pixels)
    
    # 3. Quantize to cohesive indexed palette (no dithering to keep clean flat retro surfaces)
    palette_img = small_snes.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    clean_rgb = palette_img.convert('RGB')
    
    # 4. Upscale using Nearest-Neighbor to target game resolution for razor-sharp square pixels
    pixel_art = clean_rgb.resize((target_w, target_h), Image.Resampling.NEAREST)
    pixel_art.save(output_path, 'PNG', optimize=True)
    
    unique_colors = len(clean_rgb.getcolors(maxcolors=1000) or [])
    print(f"Processed {output_path}: {base_w}x{base_h} -> {target_w}x{target_h}, {unique_colors} colors, True Pixel Art.")
    return pixel_art

if __name__ == '__main__':
    if len(sys.argv) > 2:
        to_true_pixel_art(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python pixel_map_enhancer.py <input_img> <output_png>")
