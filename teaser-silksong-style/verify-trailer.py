#!/usr/bin/env python3
"""
Mandatory verification suite for:
  teaser-silksong-style/Sinfonia-dos-Cristais-Trailer-Silksong-90s-1080p60.mp4

Checks:
  1. ffprobe stream & container metrics (1920x1080, 60/1 CFR, 5400 frames, H.264 yuv420p, AAC 48kHz stereo, ~90.0s)
  2. FFmpeg ebur128=peak=true loudness (-15.0 to -13.0 LUFS) and True Peak (<= -1.0 dBTP)
  3. Extracts full-res frames at t=75s, t=80s, t=87s + 24-tile contact-sheet-90s.png across all 4 acts
  4. Decodes QR Code directly from the t=87s video frame via cv2.QRCodeDetector
  5. Reports git status --short for scope confirmation
"""
import glob
import json
import os
import re
import subprocess
import sys
import cv2
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VERIFY_DIR = os.path.join(os.path.dirname(__file__), 'verify')
os.makedirs(VERIFY_DIR, exist_ok=True)
MP4_PATH = os.path.join(os.path.dirname(__file__), 'Sinfonia-dos-Cristais-Trailer-Silksong-90s-1080p60.mp4')

def find_tool(exe_name: str) -> str:
    pattern = os.path.expandvars(rf'%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\**\{exe_name}')
    hits = glob.glob(pattern, recursive=True)
    if hits:
        return hits[0]
    return exe_name

FFMPEG = find_tool('ffmpeg.exe')
FFPROBE = find_tool('ffprobe.exe')

def main():
    if not os.path.exists(MP4_PATH):
        raise FileNotFoundError(f'Trailer MP4 not found: {MP4_PATH}')

    print('=== 1. FFPROBE STREAM & CONTAINER CHECK ===')
    probe_raw = subprocess.check_output([
        FFPROBE, '-v', 'error', '-count_frames',
        '-show_entries', 'format=duration,size,bit_rate:stream=index,codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,avg_frame_rate,nb_read_frames,sample_rate,channels,channel_layout',
        '-of', 'json', MP4_PATH
    ], text=True)
    probe = json.loads(probe_raw)
    fmt = probe['format']
    v_stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    a_stream = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
    dur = float(fmt['duration'])
    size_mb = int(fmt['size']) / (1024 * 1024)
    print(f'Duration: {dur:.3f}s | Size: {size_mb:.2f} MB')
    print('Video:', json.dumps(v_stream))
    print('Audio:', json.dumps(a_stream))

    assert int(v_stream['width']) == 1920 and int(v_stream['height']) == 1080, 'Resolution mismatch'
    assert v_stream['codec_name'] == 'h264', 'Video codec must be h264'
    assert v_stream['pix_fmt'] == 'yuv420p', 'Pixel format must be yuv420p'
    assert v_stream['r_frame_rate'] == '60/1', f"r_frame_rate {v_stream['r_frame_rate']} != 60/1"
    assert v_stream['avg_frame_rate'] == '60/1', f"avg_frame_rate {v_stream['avg_frame_rate']} != 60/1"
    assert int(v_stream['nb_read_frames']) == 5400, f"Frame count {v_stream['nb_read_frames']} != 5400"
    assert a_stream['codec_name'] == 'aac', 'Audio codec must be aac'
    assert str(a_stream['sample_rate']) == '48000', 'Sample rate must be 48000'
    assert int(a_stream['channels']) == 2, 'Audio must be stereo'
    assert 89.95 <= dur <= 90.05, f'Duration {dur} out of [89.95, 90.05]'

    print('\n=== 2. EBU R128 LOUDNESS & TRUE PEAK CHECK ===')
    ebur_proc = subprocess.run(
        [FFMPEG, '-hide_banner', '-nostats', '-i', MP4_PATH, '-filter_complex', 'ebur128=peak=true', '-f', 'null', 'NUL'],
        capture_output=True, text=True, check=True
    )
    stderr = ebur_proc.stderr
    summary_idx = stderr.rfind('Summary:')
    summary_text = stderr[summary_idx:] if summary_idx != -1 else stderr[-1200:]
    print(summary_text.strip())

    m_i = re.search(r'Integrated loudness:\s*[\r\n]+\s*I:\s*([-\d.]+)\s*LUFS', summary_text)
    m_tp = re.search(r'True peak:\s*[\r\n]+\s*Peak:\s*([-\d.]+)\s*dBFS', summary_text)
    assert m_i and m_tp, 'Failed to parse ebur128 Integrated loudness or True peak'
    i_lufs = float(m_i.group(1))
    tp_db = float(m_tp.group(1))
    print(f'Parsed Integrated Loudness: {i_lufs:.2f} LUFS | True Peak: {tp_db:.2f} dBTP')
    assert -15.0 <= i_lufs <= -13.0, f'Loudness {i_lufs} outside [-15.0, -13.0] LUFS'
    assert tp_db <= -1.0, f'True Peak {tp_db} exceeds -1.0 dBTP'

    print('\n=== 3. EXTRACT FULL-RES KEY FRAMES & 24-FRAME CONTACT SHEET ===')
    full_frames = [
        (75.0, os.path.join(VERIFY_DIR, 'frame-75s-reveal.png')),
        (80.0, os.path.join(VERIFY_DIR, 'frame-80s-creditos.png')),
        (87.0, os.path.join(VERIFY_DIR, 'frame-87s-card-qr.png')),
    ]
    for ts, out_png in full_frames:
        subprocess.run(
            [FFMPEG, '-hide_banner', '-y', '-ss', str(ts), '-i', MP4_PATH, '-frames:v', '1', out_png],
            check=True, capture_output=True
        )
        im = cv2.imread(out_png)
        assert im is not None and im.shape == (1080, 1920, 3), f'Invalid frame {out_png}'
        print(f'Extracted full-res {out_png} ({im.shape[1]}x{im.shape[0]})')

    # 24 timestamps spanning Act 1, Act 2, Act 3A, Act 3B, Climax, Breath, and Act 4
    sheet_times = [
        1.5, 5.5, 9.8, 13.5,
        16.5, 19.5, 22.8, 26.2,
        30.5, 34.2, 37.5, 41.2,
        43.4, 46.5, 50.0, 54.0,
        59.5, 63.0, 68.0, 71.0,
        72.3, 75.0, 80.0, 87.0
    ]
    cap = cv2.VideoCapture(MP4_PATH)
    tiles = []
    for ts in sheet_times:
        frame_idx = int(round(ts * 60))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, frame = cap.read()
        if not ok:
            raise RuntimeError(f'Failed reading frame at t={ts}s')
        tile = cv2.resize(frame, (480, 270), interpolation=cv2.INTER_NEAREST)
        cv2.rectangle(tile, (8, 8), (132, 42), (8, 6, 26), -1)
        cv2.putText(tile, f'{ts:05.1f}s', (14, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.78, (122, 234, 255), 2)
        tiles.append(tile)
    cap.release()
    rows = [np.hstack(tiles[i:i+4]) for i in range(0, 24, 4)]
    sheet_path = os.path.join(VERIFY_DIR, 'contact-sheet-90s.png')
    cv2.imwrite(sheet_path, np.vstack(rows))
    print(f'Wrote 4x6 contact sheet: {sheet_path} (1920x1620)')

    print('\n=== 4. QR CODE DECODING VERIFICATION FROM t=87s FRAME ===')
    qr_img = cv2.imread(os.path.join(VERIFY_DIR, 'frame-87s-card-qr.png'))
    detector = cv2.QRCodeDetector()
    decoded, pts, _ = detector.detectAndDecode(qr_img)
    expected_url = 'https://brinqueaprenda.com.br/jogo/sinfonia-dos-cristais'
    print(f'Decoded QR payload from t=87s video frame: {decoded!r}')
    assert decoded == expected_url, f'QR payload {decoded!r} != {expected_url!r}'

    print('\n=== 5. GIT STATUS CHECK ===')
    gs = subprocess.check_output(['git', 'status', '--short'], cwd=ROOT, text=True)
    print(gs.strip())
    print('\nALL VERIFICATIONS PASSED!')

if __name__ == '__main__':
    main()
