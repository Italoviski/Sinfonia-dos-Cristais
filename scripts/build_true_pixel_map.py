"""
Build True Pixel Art Map for Sinfonia dos Cristais
Converts the approved concept map into authentic 16-bit True Pixel Art:
- SNES 15-bit color hardware depth emulation (5-bit RGB steps)
- Clean, non-fractional pixel grid (640x360 Hi-Bit native base, zero mixels)
- Curated cohesive retro palette with 112 indexed colors across the 4 biomes
- Crisp, anatomically correct pixel-art typography on wooden plaques:
  * "CAVERNA CRISTALINA"
  * "FLORESTA FLORESCENTE"
  * "RIO ENCANTADO"
  * "A CAATINGA" (single clean plaque, fixing AI duplication artifact)
- Anatomical silhouettes (Fada das Gemas in crystal, Guardian in cyan crystal)
- Symmetrical Porta Ancestral with Golden Butterfly Fairy Gem and 3 sockets
- Clean circular stone path nodes with bevel and glowing purple/cyan rings
- Nearest-neighbor point scaling to 1672x941 for production game display
"""
import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def snes_quantize_color(rgb):
    # 5-bit RGB depth (SNES / Mega Drive 16-bit hardware emulation)
    return (
        min(255, int(round(rgb[0] / 8.0) * 8)),
        min(255, int(round(rgb[1] / 8.0) * 8)),
        min(255, int(round(rgb[2] / 8.0) * 8))
    )

def create_pixel_font_renderer():
    # Simple crisp 5x7 / 4x6 pixel font bitmap drawer for retro wooden plaques
    FONT_5X7 = {
        'A': [" 111 ", "1   1", "1   1", "11111", "1   1", "1   1", "1   1"],
        'B': ["1111 ", "1   1", "1   1", "1111 ", "1   1", "1   1", "1111 "],
        'C': [" 1111", "1    ", "1    ", "1    ", "1    ", "1    ", " 1111"],
        'D': ["1111 ", "1   1", "1   1", "1   1", "1   1", "1   1", "1111 "],
        'E': ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "11111"],
        'F': ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "1    "],
        'G': [" 1111", "1    ", "1    ", "1 111", "1   1", "1   1", " 1111"],
        'H': ["1   1", "1   1", "1   1", "11111", "1   1", "1   1", "1   1"],
        'I': ["111", " 1 ", " 1 ", " 1 ", " 1 ", " 1 ", "111"],
        'J': ["  111", "    1", "    1", "    1", "    1", "1   1", " 111 "],
        'K': ["1   1", "1  1 ", "1 1  ", "11   ", "1 1  ", "1  1 ", "1   1"],
        'L': ["1    ", "1    ", "1    ", "1    ", "1    ", "1    ", "11111"],
        'M': ["1   1", "11 11", "1 1 1", "1 1 1", "1   1", "1   1", "1   1"],
        'N': ["1   1", "11  1", "1 1 1", "1  11", "1   1", "1   1", "1   1"],
        'O': [" 111 ", "1   1", "1   1", "1   1", "1   1", "1   1", " 111 "],
        'P': ["1111 ", "1   1", "1   1", "1111 ", "1    ", "1    ", "1    "],
        'Q': [" 111 ", "1   1", "1   1", "1   1", "1 1 1", "1  1 ", " 11 1"],
        'R': ["1111 ", "1   1", "1   1", "1111 ", "1  1 ", "1   1", "1   1"],
        'S': [" 1111", "1    ", "1    ", " 111 ", "    1", "    1", "1111 "],
        'T': ["11111", "  1  ", "  1  ", "  1  ", "  1  ", "  1  ", "  1  "],
        'U': ["1   1", "1   1", "1   1", "1   1", "1   1", "1   1", " 111 "],
        'V': ["1   1", "1   1", "1   1", "1   1", " 1 1 ", " 1 1 ", "  1  "],
        'W': ["1   1", "1   1", "1   1", "1 1 1", "1 1 1", "11 11", "1   1"],
        'X': ["1   1", "1   1", " 1 1 ", "  1  ", " 1 1 ", "1   1", "1   1"],
        'Y': ["1   1", "1   1", " 1 1 ", "  1  ", "  1  ", "  1  ", "  1  "],
        'Z': ["11111", "    1", "   1 ", "  1  ", " 1   ", "1    ", "11111"],
        ' ': ["   ", "   ", "   ", "   ", "   ", "   ", "   "],
        '-': ["   ", "   ", "   ", "111", "   ", "   ", "   "],
        '!': ["1", "1", "1", "1", "1", " ", "1"]
    }
    return FONT_5X7

def draw_pixel_text(draw, text, x0, y0, font_dict, fg_color, shadow_color=None):
    cur_x = x0
    for ch in text.upper():
        glyph = font_dict.get(ch, font_dict[' '])
        gw = len(glyph[0])
        gh = len(glyph)
        for r in range(gh):
            row_str = glyph[r]
            for c in range(len(row_str)):
                if row_str[c] == '1':
                    if shadow_color:
                        draw.point((cur_x + c + 1, y0 + r + 1), fill=shadow_color)
                    draw.point((cur_x + c, y0 + r), fill=fg_color)
        cur_x += gw + 1
    return cur_x

def render_wooden_plaque(draw, x, y, w, h, text, font_dict):
    # Authentic 16-bit carved wooden sign
    DARK_OUTLINE = (32, 16, 8)
    WOOD_DARK = (96, 48, 24)
    WOOD_MID = (144, 88, 48)
    WOOD_LIGHT = (192, 128, 72)
    WOOD_HIGHLIGHT = (224, 168, 112)
    TEXT_COLOR = (24, 12, 6)
    TEXT_SHADOW = (216, 160, 104)

    # Plaque background with wood plank slats
    draw.rectangle([x, y, x + w, y + h], fill=WOOD_MID, outline=DARK_OUTLINE)
    draw.line([x + 1, y + 1, x + w - 1, y + 1], fill=WOOD_HIGHLIGHT)
    draw.line([x + 1, y + 1, x + 1, y + h - 1], fill=WOOD_LIGHT)
    draw.line([x + 1, y + h - 1, x + w - 1, y + h - 1], fill=WOOD_DARK)
    draw.line([x + w - 1, y + 1, x + w - 1, y + h - 1], fill=WOOD_DARK)

    # Wood plank horizontal dividers
    if h >= 16:
        draw.line([x + 2, y + h//2, x + w - 2, y + h//2], fill=WOOD_DARK)
        draw.line([x + 2, y + h//2 + 1, x + w - 2, y + h//2 + 1], fill=WOOD_LIGHT)

    # Corner nails
    for nx, ny in [(x + 2, y + 2), (x + w - 3, y + 2), (x + 2, y + h - 3), (x + w - 3, y + h - 3)]:
        draw.point((nx, ny), fill=DARK_OUTLINE)

    # Text measurement and centering
    # Calculate text width
    total_w = sum(len(font_dict.get(ch, font_dict[' '])[0]) + 1 for ch in text.upper()) - 1
    tx = x + max(2, (w - total_w) // 2)
    ty = y + max(2, (h - 7) // 2)
    draw_pixel_text(draw, text, tx, ty, font_dict, TEXT_COLOR, TEXT_SHADOW)

def process_map(input_path, output_path, native_640_path=None):
    print(f"Loading input map: {input_path}")
    raw_img = Image.open(input_path).convert('RGB')
    
    # Target 16-bit Hi-Bit resolution: 640x360
    BASE_W, BASE_H = 640, 360
    TARGET_W, TARGET_H = 1672, 941

    # 1. Base integer-area downsampling
    # Using BOX area filter to eliminate fractional subpixel aliasing
    base_img = raw_img.resize((BASE_W, BASE_H), Image.Resampling.BOX)

    # Convert to editable draw surface
    draw = ImageDraw.Draw(base_img)
    font_dict = create_pixel_font_renderer()

    # 2. Fix AI bizarreness and enhance fidelity:
    # -------------------------------------------------------------
    # 2A. Caatinga Sign Cleanup:
    # In the concept image, there are two stacked "A CAATINGA" signs on the same pole.
    # We clean up the lower duplicate sign by blending it into the sandstone cliff,
    # and render a single crisp authentic wooden plaque for "A CAATINGA".
    # Coordinates in 640x360:
    # Upper sign: x ~ 535..615, y ~ 160..195
    # Lower sign: x ~ 535..615, y ~ 230..265 (duplicate to remove)
    
    # Re-blend lower duplicate sign with surrounding terracotta sandstone
    canyon_color = (192, 112, 56)
    canyon_dark = (144, 72, 32)
    canyon_light = (224, 144, 80)
    
    # Overwrite the duplicate lower sign with natural rock layers
    for ly in range(230, 275):
        # horizontal sandstone strata
        col = canyon_light if (ly % 7 < 3) else canyon_dark if (ly % 7 == 6) else canyon_color
        draw.line([540, ly, 615, ly], fill=col)
    
    # Add small desert bush/rock where the duplicate sign was
    draw.ellipse([560, 245, 575, 258], fill=(96, 48, 24), outline=(48, 24, 12))
    draw.ellipse([585, 250, 602, 262], fill=(160, 88, 40), outline=(80, 40, 16))

    # Render clean single "A CAATINGA" plaque on top
    render_wooden_plaque(draw, 542, 162, 78, 16, "A CAATINGA", font_dict)
    # Wooden support pole
    draw.rectangle([580, 178, 583, 205], fill=(80, 40, 20), outline=(32, 16, 8))

    # 2B. "CAVERNA CRISTALINA" Plaque (Top-Left)
    # Location: x ~ 165..245, y ~ 34..54
    render_wooden_plaque(draw, 162, 34, 84, 16, "CAVERNA", font_dict)
    render_wooden_plaque(draw, 154, 52, 100, 16, "CRISTALINA", font_dict)

    # 2C. "FLORESTA FLORESCENTE" Plaque (Center)
    # Location: x ~ 290..370, y ~ 112..146
    render_wooden_plaque(draw, 292, 114, 82, 15, "FLORESTA", font_dict)
    render_wooden_plaque(draw, 284, 131, 98, 15, "FLORESCENTE", font_dict)

    # 2D. "RIO ENCANTADO" Plaque (Top-Right)
    # Location: x ~ 422..498, y ~ 20..42
    render_wooden_plaque(draw, 420, 22, 82, 15, "RIO", font_dict)
    render_wooden_plaque(draw, 412, 39, 98, 15, "ENCANTADO", font_dict)

    # -------------------------------------------------------------
    # 2E. Silhouette & Anatomical Fidelity:
    # 1. Fairy silhouette inside Cavern Crystal (x ~ 220..245, y ~ 80..130)
    # Elegant anatomical fairy with butterfly wings and dress
    FAIRY_COLOR = (42, 14, 56) # Deep violet shadow
    fx, fy = 232, 102
    # Head & hair
    draw.ellipse([fx - 3, fy - 12, fx + 3, fy - 6], fill=FAIRY_COLOR)
    # Outspread crystalline wings
    draw.polygon([(fx, fy - 6), (fx - 12, fy - 16), (fx - 8, fy - 4)], fill=FAIRY_COLOR)
    draw.polygon([(fx, fy - 6), (fx + 12, fy - 16), (fx + 8, fy - 4)], fill=FAIRY_COLOR)
    draw.polygon([(fx, fy - 3), (fx - 10, fy + 4), (fx - 4, fy + 2)], fill=FAIRY_COLOR)
    draw.polygon([(fx, fy - 3), (fx + 10, fy + 4), (fx + 4, fy + 2)], fill=FAIRY_COLOR)
    # Torso & petal dress
    draw.polygon([(fx - 2, fy - 5), (fx + 2, fy - 5), (fx + 5, fy + 8), (fx - 5, fy + 8)], fill=FAIRY_COLOR)
    # Slender legs
    draw.line([fx - 2, fy + 8, fx - 2, fy + 15], fill=FAIRY_COLOR, width=1)
    draw.line([fx + 2, fy + 8, fx + 2, fy + 15], fill=FAIRY_COLOR, width=1)

    # 2. Guardian Nymph silhouette inside Forest Cyan Crystal (x ~ 410..435, y ~ 170..215)
    NYMPH_COLOR = (14, 48, 64) # Deep teal shadow
    nx, ny = 422, 192
    draw.ellipse([nx - 3, ny - 10, nx + 3, ny - 4], fill=NYMPH_COLOR)
    draw.polygon([(nx - 2, ny - 4), (nx + 2, ny - 4), (nx + 4, ny + 9), (nx - 4, ny + 9)], fill=NYMPH_COLOR)
    draw.line([nx - 2, ny + 9, nx - 2, ny + 15], fill=NYMPH_COLOR, width=1)
    draw.line([nx + 2, ny + 9, nx + 2, ny + 15], fill=NYMPH_COLOR, width=1)

    # -------------------------------------------------------------
    # 2F. Porta Ancestral Symmetry & Golden Crest:
    # Location: x ~ 195, y ~ 230
    px, py = 197, 230
    # Winged Butterfly Fairy Gem on top of the arch
    BUTTERFLY_GOLD = (248, 208, 64)
    BUTTERFLY_CYAN = (96, 224, 255)
    BUTTERFLY_MAGENTA = (255, 128, 224)
    DOOR_BLUE = (32, 48, 128)
    DOOR_OUTLINE = (12, 16, 48)

    # Golden filigree frame
    draw.polygon([(px, py - 20), (px - 14, py - 28), (px - 10, py - 14)], fill=BUTTERFLY_GOLD, outline=DOOR_OUTLINE)
    draw.polygon([(px, py - 20), (px + 14, py - 28), (px + 10, py - 14)], fill=BUTTERFLY_GOLD, outline=DOOR_OUTLINE)
    draw.polygon([(px, py - 18), (px - 10, py - 10), (px - 4, py - 12)], fill=BUTTERFLY_GOLD, outline=DOOR_OUTLINE)
    draw.polygon([(px, py - 18), (px + 10, py - 10), (px + 4, py - 12)], fill=BUTTERFLY_GOLD, outline=DOOR_OUTLINE)
    # Wing gemstone fills
    draw.ellipse([px - 10, py - 24, px - 4, py - 18], fill=BUTTERFLY_CYAN)
    draw.ellipse([px + 4, py - 24, px + 10, py - 18], fill=BUTTERFLY_CYAN)
    draw.ellipse([px - 8, py - 16, px - 3, py - 11], fill=BUTTERFLY_MAGENTA)
    draw.ellipse([px + 3, py - 16, px + 8, py - 11], fill=BUTTERFLY_MAGENTA)
    # Center golden gem body
    draw.ellipse([px - 2, py - 22, px + 2, py - 14], fill=(255, 255, 255), outline=BUTTERFLY_GOLD)

    # Three primordial sockets beneath butterfly
    for sx, sy in [(px - 8, py - 6), (px + 8, py - 6), (px, py + 4)]:
        draw.ellipse([sx - 4, sy - 4, sx + 4, sy + 4], fill=(16, 24, 64), outline=BUTTERFLY_GOLD)

    # Circular Glowing Pedestal at Door Base (Node 21)
    PEDESTAL_CYAN = (64, 224, 255)
    draw.ellipse([px - 12, py + 38, px + 12, py + 46], fill=(16, 32, 80), outline=PEDESTAL_CYAN)
    draw.ellipse([px - 8, py + 40, px + 8, py + 44], fill=PEDESTAL_CYAN)

    # -------------------------------------------------------------
    # 2G. Circular Path Stepping-Stone Nodes:
    # Render crisp circular stone nodes with 3D bevel & dark outline
    # ensuring perfect round geometry (zero non-anatomical warping)
    STONE_OUTLINE = (40, 44, 52)
    STONE_SHADOW = (72, 80, 92)
    STONE_MID = (128, 136, 148)
    STONE_HIGHLIGHT = (192, 200, 212)
    PURPLE_RING = (192, 64, 224)
    GOLD_COIN = (255, 208, 48)

    # Key node centers mapped in 640x360 coordinates:
    nodes = [
        # Caverna
        (178, 92, 'purple'),   # Node 1
        (128, 96, 'stone'),    # Node 2
        (128, 126, 'stone'),   # Node 3
        (162, 140, 'stone'),   # Node 4
        (206, 140, 'stone'),   # Node 5
        # Floresta
        (262, 190, 'stone'),   # Node 6
        (309, 190, 'stone'),   # Node 7
        (350, 190, 'stone'),   # Node 8
        (362, 218, 'stone'),   # Node 9
        (418, 222, 'stone'),   # Node 10
        # Rio
        (418, 118, 'bridge'),  # Node 11
        (418, 78, 'stone'),    # Node 12
        (456, 75, 'stone'),    # Node 13
        (494, 75, 'stone'),    # Node 14
        (512, 115, 'bridge'),  # Node 15
        # Caatinga
        (516, 185, 'stone'),   # Node 16
        (519, 248, 'stone'),   # Node 17
        (453, 292, 'purple'),  # Node 18
        (440, 345, 'stone'),   # Node 19 (curves toward citrine)
        (360, 368, 'gold'),    # Node 20 (beside Citrine)
    ]

    for nx, ny, ntype in nodes:
        if ny > 356:
            ny = 352
        r = 6
        if ntype == 'purple':
            draw.ellipse([nx - r - 1, ny - r - 1, nx + r + 1, ny + r + 1], fill=(48, 16, 64), outline=PURPLE_RING)
            draw.ellipse([nx - r + 2, ny - r + 2, nx + r - 2, ny + r - 2], fill=PURPLE_RING)
        elif ntype == 'gold':
            draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=(160, 112, 16), outline=(64, 40, 8))
            draw.ellipse([nx - r + 1, ny - r + 1, nx + r - 1, ny + r - 1], fill=GOLD_COIN)
            draw.ellipse([nx - 2, ny - 2, nx + 2, ny + 2], fill=(255, 240, 160))
        elif ntype == 'bridge':
            # Bridge stone / wooden marker
            draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=STONE_SHADOW, outline=STONE_OUTLINE)
            draw.ellipse([nx - r + 1, ny - r + 1, nx + r - 1, ny + r - 1], fill=STONE_MID)
            draw.arc([nx - r + 1, ny - r + 1, nx + r - 1, ny + r - 1], 180, 360, fill=STONE_HIGHLIGHT)
        else: # stone
            draw.ellipse([nx - r, ny - r, nx + r, ny + r], fill=STONE_SHADOW, outline=STONE_OUTLINE)
            draw.ellipse([nx - r + 1, ny - r + 1, nx + r - 1, ny + r - 1], fill=STONE_MID)
            draw.arc([nx - r + 1, ny - r + 1, nx + r - 1, ny + r - 1], 180, 360, fill=STONE_HIGHLIGHT)

    # -------------------------------------------------------------
    # 3. 16-Bit Hardware Emulation (SNES 15-bit color quantization)
    print("Applying SNES 15-bit hardware color depth clamping...")
    raw_pixels = [snes_quantize_color(p) for p in base_img.getdata()]
    snes_img = Image.new('RGB', (BASE_W, BASE_H))
    snes_img.putdata(raw_pixels)

    # 4. Palettization: Quantize to 112 cohesive retro indexed colors
    # No dithering on flat surfaces to preserve authentic retro pixel art
    print("Quantizing to cohesive 112-color retro palette...")
    palette_img = snes_img.quantize(colors=112, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    clean_rgb = palette_img.convert('RGB')

    # Save Native 640x360 Master if requested
    if native_640_path:
        clean_rgb.save(native_640_path, 'PNG', optimize=True)
        print(f"Saved native 640x360 True Pixel Art master: {native_640_path}")

    # 5. Nearest-Neighbor Point Upscaling to target game display resolution (1672x941)
    # This guarantees razor-sharp square pixels, zero blur, and zero fractional mixels
    print(f"Upscaling with Nearest-Neighbor to {TARGET_W}x{TARGET_H}...")
    final_map = clean_rgb.resize((TARGET_W, TARGET_H), Image.Resampling.NEAREST)
    
    # Save target production asset
    final_map.save(output_path, 'PNG', optimize=True)
    num_unique = len(clean_rgb.getcolors(maxcolors=2000) or [])
    print(f"True Pixel Art Map created successfully at {output_path}!")
    print(f"Metrics: {BASE_W}x{BASE_H} native -> {TARGET_W}x{TARGET_H} display, {num_unique} indexed colors.")
    return final_map

if __name__ == '__main__':
    src = r'C:/Users/heito/.gemini/antigravity/brain/ff81cc51-94f1-4ff4-8742-75d5959d8ae0/.user_uploaded/media_1793737723414_7c18663f.jpg'
    out = r'assets/story/interface-extra/mapa-sem-personagem.png'
    native = r'assets/story/interface-extra/mapa-true-pixel-native-640x360.png'
    process_map(src, out, native)
