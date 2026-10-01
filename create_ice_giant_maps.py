"""Add subtle small-scale atmospheric detail to public ice-giant maps.

The Solar System Scope maps remain the base. These are visual enhancements, not
higher-resolution observational data or scientifically exact cloud positions.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[1] / 'dist'
W, H = 4096, 2048
rng = np.random.default_rng(42)

def noise(width, height):
    tile = rng.random((height, width), dtype=np.float32)
    picture = Image.fromarray(np.uint8(tile * 255), 'L')
    return np.asarray(picture.resize((W, H), Image.Resampling.BICUBIC), dtype=np.float32) / 255 - .5

for body in ('neptune', 'uranus'):
    base = Image.open(ROOT / f'2k_{body}.jpg').convert('RGB').resize((W, H), Image.Resampling.LANCZOS)
    if body == 'neptune':
        base = ImageEnhance.Contrast(base).enhance(1.16)
        base = ImageEnhance.Color(base).enhance(1.07)
    else:
        base = ImageEnhance.Contrast(base).enhance(1.10)
    atmospheric = noise(38, 36) * .8 + noise(100, 110) * .31 + noise(380, 260) * .10
    x = np.arange(W, dtype=np.float32)[None, :] / W
    y = np.arange(H, dtype=np.float32)[:, None] / H
    shear = y + np.sin(x * np.pi * 6 + y * 17) * .0023 + atmospheric * .0035
    bands = np.sin(shear * np.pi * (96 if body == 'neptune' else 65)) * .48
    bands += np.sin(shear * np.pi * (188 if body == 'neptune' else 126) + .7) * .24
    bands += np.sin(shear * np.pi * 31) * .18
    strength = 8 if body == 'neptune' else 6
    modulation = (bands + atmospheric * 1.05) * strength
    pixels = np.asarray(base, dtype=np.float32)
    pixels += modulation[:, :, None] * np.array([.73, .9, 1.0], dtype=np.float32)
    pixels = np.uint8(np.clip(pixels, 0, 255))
    Image.fromarray(pixels, 'RGB').save(ROOT / f'{body}-detailed-4k.jpg', quality=91, optimize=True, subsampling=0)
    print(body, (ROOT / f'{body}-detailed-4k.jpg').stat().st_size)
