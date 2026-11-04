#!/usr/bin/env python3
"""
Sinfonia dos Cristais — Motor de Síntese Musical Instrumental Hi-Bit (NumPy)
Gera as 6 faixas instrumentais de produção com modelagem física, síntese aditiva harmônica,
percussão orgânica brasileira/mineral, posicionamento estéreo e reverberação de estúdio:

1. Floresta - Fases Normais (90 BPM, Em/G, Harpa Celta, Flauta de Madeira, Violão de Nylon, Marimba, Cordas)
2. Floresta - Especial / Araci (126 BPM, E/A, Tambores Tribais, Maracás, Flautas em Contraponto, Sinos de Esmeralda, Metais)
3. Rio - Fases Normais (88 BPM, C/F-Lídio, Harpa Aquática, Flauta Transversal, Celesta d'Água, Piano Límpido, Cordas)
4. Rio - Especial / Irecê (124 BPM, D, Cristais Sonoros, Marimba Líquida, Flauta Rápida, Tambores d'Água, Cordas Vivas)
5. Caatinga - Fases Normais (94 BPM, D-Mixolídio, Viola Caipira, Rabeca Sertaneja, Litofone de Arenito, Shaker)
6. Caatinga - Especial / Jurema (134 BPM, A/E-Mixolídio, Baião Tradicional, Zabumba, Triângulo, Rabeca Solo, Sanfona)
"""

import sys
import os
import math
import wave
import numpy as np

SR = 44100
TWO_PI = 2.0 * math.pi

# ==============================================================================
# 1. GERADORES DE INSTRUMENTOS MUSICAIS (MODELAGEM FÍSICA & ADITIVA)
# ==============================================================================

def note_to_freq(note_str):
    """Converte nome de nota (ex: 'C4', 'F#5', 'Bb3') em frequência Hertz."""
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
             'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
             'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    letter = note_str[:-1]
    octave = int(note_str[-1])
    semitone = names[letter]
    midi = 12 + octave * 12 + semitone
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def render_wooden_flute(freq, duration, velocity=0.8, vibrato_delay=0.15, breath_noise=0.08):
    """Flauta de madeira / pan flute com sopro de ar, harmônicos ímpares e vibrato natural."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Vibrato LFO que entra suavemente após vibrato_delay
    vib_rate = 5.2
    vib_depth = 0.015 * np.clip((t - vibrato_delay) / 0.4, 0.0, 1.0)
    inst_freq = freq * (1.0 + vib_depth * np.sin(TWO_PI * vib_rate * t))
    phase = np.cumsum(inst_freq / SR) * TWO_PI
    
    # Harmônicos ricos (fundamental dominante + 2º harmônico doce + 3º oco de bambu)
    tone = (1.00 * np.sin(phase) +
            0.35 * np.sin(2.0 * phase) +
            0.18 * np.sin(3.0 * phase) +
            0.06 * np.sin(4.0 * phase))
    
    # Ruído de sopro de ar (filtered breath noise)
    noise = np.random.normal(0, 1, n_samples)
    b_noise = np.convolve(noise, np.ones(8) / 8.0, mode='same')
    
    # Envelope ADSR suave
    att = int(SR * min(0.06, duration * 0.2))
    dec = int(SR * min(0.08, duration * 0.2))
    rel = int(SR * min(0.12, duration * 0.3))
    sus = n_samples - att - dec - rel
    if sus < 0:
        att = int(n_samples * 0.2)
        dec = int(n_samples * 0.2)
        rel = int(n_samples * 0.4)
        sus = n_samples - att - dec - rel
        
    env = np.concatenate([
        np.linspace(0.0, 1.0, att),
        np.linspace(1.0, 0.85, dec),
        np.ones(max(0, sus)) * 0.85,
        np.linspace(0.85, 0.0, rel)
    ])[:n_samples]
    
    sound = (tone + breath_noise * b_noise) * env * velocity
    return sound


def render_harp_pluck(freq, duration, velocity=0.8, brightness=0.6):
    """Harpa celta / Harpa aquática via síntese Karplus-Strong em blocos acelerada com brilho mineral."""
    n_samples = int(SR * duration)
    period = max(2, int(SR / freq))
    
    decay_factor = 0.992 - (freq / 4000.0) * 0.02
    decay_factor = max(0.96, min(0.998, decay_factor))
    
    buffer = np.zeros(n_samples)
    curr = np.random.uniform(-1.0, 1.0, period)
    curr = (curr + np.roll(curr, 1)) * 0.5
    buffer[:period] = curr
    
    pos = period
    w1 = 1.0 - brightness * 0.5
    w2 = brightness * 0.5
    while pos < n_samples:
        chunk = min(period, n_samples - pos)
        next_block = (curr * w1 + np.roll(curr, -1) * w2) * decay_factor
        buffer[pos:pos + chunk] = next_block[:chunk]
        curr = next_block
        pos += chunk
    
    # Adiciona harmônico de oitava cristalina brilhante
    t = np.linspace(0, duration, n_samples, endpoint=False)
    sparkle = 0.15 * np.sin(TWO_PI * freq * 2.0 * t) * np.exp(-t * 6.0)
    env = np.exp(-t * (1.2 + freq / 1000.0))
    return (buffer + sparkle) * env * velocity


def render_acoustic_guitar(freq, duration, velocity=0.75):
    """Violão dedilhado de nylon / Viola caipira em blocos rápidos com ressonância de corpo."""
    n_samples = int(SR * duration)
    period = max(2, int(SR / freq))
    
    decay = 0.994 - (freq / 3500.0) * 0.03
    decay = max(0.96, min(0.998, decay))
    
    buffer = np.zeros(n_samples)
    curr = np.random.uniform(-1.0, 1.0, period)
    buffer[:period] = curr
    
    pos = period
    while pos < n_samples:
        chunk = min(period, n_samples - pos)
        next_block = (curr + np.roll(curr, -1)) * 0.5 * decay
        buffer[pos:pos + chunk] = next_block[:chunk]
        curr = next_block
        pos += chunk
        
    t = np.linspace(0, duration, n_samples, endpoint=False)
    body_res = 0.12 * np.sin(TWO_PI * 110.0 * t) * np.exp(-t * 4.0)
    body_res += 0.08 * np.sin(TWO_PI * 220.0 * t) * np.exp(-t * 5.0)
    
    env = np.exp(-t * (1.8 + freq / 800.0))
    return (buffer + body_res) * env * velocity


def render_crystal_bell(freq, duration, velocity=0.8):
    """Sinos de esmeralda / Celesta d'água / Cristais Sonoros com harmônicos inarmônicos puros."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Modos físicos de barras minerais afinadas (1.0, 2.756, 5.404, 8.93)
    mode1 = 1.00 * np.sin(TWO_PI * freq * 1.000 * t) * np.exp(-t * 2.4)
    mode2 = 0.55 * np.sin(TWO_PI * freq * 2.756 * t) * np.exp(-t * 4.8)
    mode3 = 0.25 * np.sin(TWO_PI * freq * 5.404 * t) * np.exp(-t * 8.2)
    mode4 = 0.12 * np.sin(TWO_PI * freq * 8.930 * t) * np.exp(-t * 14.0)
    # Shimmer de oitava
    octave = 0.35 * np.sin(TWO_PI * freq * 2.000 * t) * np.exp(-t * 3.2)
    
    # Ataque percussivo do martelo cristalino
    click = np.random.normal(0, 1, min(200, n_samples))
    click = np.pad(click, (0, n_samples - len(click))) * np.exp(-t * 200.0) * 0.3
    
    sound = (mode1 + mode2 + mode3 + mode4 + octave + click) * velocity
    return sound


def render_rabeca_fiddle(freq, duration, velocity=0.8, vibrato_delay=0.12):
    """Rabeca sertaneja tradicional com timbre rústico, formantes vocais e vibrato expressivo."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Vibrato da rabeca (~5.5 Hz)
    vib_rate = 5.6
    vib_depth = 0.018 * np.clip((t - vibrato_delay) / 0.3, 0.0, 1.0)
    inst_freq = freq * (1.0 + vib_depth * np.sin(TWO_PI * vib_rate * t))
    phase = np.cumsum(inst_freq / SR) * TWO_PI
    
    # Onda dente-de-serra rica em todos os harmônicos (arco na corda)
    saw = 0.0
    for h in range(1, 12):
        # Formantes sertanejos: ímpar enfatizado, atenuação progressiva
        amp = (1.0 / h) * (1.2 if (h % 2 == 1) else 0.8)
        if h in [3, 4, 5]: # Ressonância na faixa de 1kHz - 2kHz
            amp *= 1.4
        saw += amp * np.sin(h * phase)
        
    # Ruído de atrito do arco de crina de cavalo na corda de tripa
    bow_friction = np.random.normal(0, 0.05, n_samples)
    bow_friction = np.convolve(bow_friction, np.ones(6)/6.0, mode='same')
    
    # Envelope de arco (ataque suave, sustentação firme, soltura)
    att = int(SR * min(0.08, duration * 0.25))
    rel = int(SR * min(0.12, duration * 0.3))
    sus = n_samples - att - rel
    if sus < 0:
        att = int(n_samples * 0.3)
        rel = int(n_samples * 0.4)
        sus = n_samples - att - rel
        
    env = np.concatenate([
        np.linspace(0.0, 1.0, att),
        np.ones(max(0, sus)),
        np.linspace(1.0, 0.0, rel)
    ])[:n_samples]
    
    sound = (saw * 0.45 + bow_friction) * env * velocity
    return sound


def render_sanfona_accordion(freq, duration, velocity=0.8):
    """Sanfona / acordeon brasileiro com palhetas duplas ligeiramente desafinadas (tremolo/chorus)."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Palheta 1 (afinação base) e Palheta 2 (+2.8 cents para o característico batimento forrozeiro)
    f1 = freq
    f2 = freq * (2.0 ** (2.8 / 1200.0))
    f_sub = freq * 0.5 # Oitava inferior encorpada
    
    p1 = np.cumsum(np.ones(n_samples) * f1 / SR) * TWO_PI
    p2 = np.cumsum(np.ones(n_samples) * f2 / SR) * TWO_PI
    ps = np.cumsum(np.ones(n_samples) * f_sub / SR) * TWO_PI
    
    # Síntese das palhetas com mistura de onda quadrada suave e dente-de-serra
    reed1 = (np.sin(p1) + 0.5 * np.sin(2 * p1) + 0.35 * np.sin(3 * p1) + 0.2 * np.sin(4 * p1))
    reed2 = (np.sin(p2) + 0.5 * np.sin(2 * p2) + 0.35 * np.sin(3 * p2) + 0.2 * np.sin(4 * p2))
    sub = 0.35 * (np.sin(ps) + 0.3 * np.sin(3 * ps))
    
    # Envelope do fole da sanfona (ataque rápido, sustentação expressiva)
    att = int(SR * min(0.04, duration * 0.2))
    rel = int(SR * min(0.08, duration * 0.25))
    sus = n_samples - att - rel
    if sus < 0:
        att = int(n_samples * 0.2)
        rel = int(n_samples * 0.3)
        sus = n_samples - att - rel
        
    env = np.concatenate([
        np.linspace(0.0, 1.0, att),
        np.ones(max(0, sus)),
        np.linspace(1.0, 0.0, rel)
    ])[:n_samples]
    
    sound = (0.45 * reed1 + 0.45 * reed2 + sub) * 0.38 * env * velocity
    return sound


def render_strings_pad(freq, duration, velocity=0.6):
    """Cordas de câmara / Pad orquestral suave com detune estéreo para sustentação harmônica."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    f1 = freq * 0.998
    f2 = freq * 1.002
    f3 = freq * 2.0
    
    p1 = np.cumsum(np.ones(n_samples) * f1 / SR) * TWO_PI
    p2 = np.cumsum(np.ones(n_samples) * f2 / SR) * TWO_PI
    p3 = np.cumsum(np.ones(n_samples) * f3 / SR) * TWO_PI
    
    s1 = np.sin(p1) + 0.4 * np.sin(2 * p1) + 0.2 * np.sin(3 * p1)
    s2 = np.sin(p2) + 0.4 * np.sin(2 * p2) + 0.2 * np.sin(3 * p2)
    s3 = 0.25 * np.sin(p3)
    
    att = int(SR * min(0.25, duration * 0.4))
    rel = int(SR * min(0.35, duration * 0.4))
    sus = n_samples - att - rel
    if sus < 0:
        att = int(n_samples * 0.3)
        rel = int(n_samples * 0.4)
        sus = n_samples - att - rel
        
    env = np.concatenate([
        np.linspace(0.0, 1.0, att),
        np.ones(max(0, sus)),
        np.linspace(1.0, 0.0, rel)
    ])[:n_samples]
    
    return (s1 + s2 + s3) * 0.25 * env * velocity


# ==============================================================================
# 2. GERADORES DE PERCUSSÃO E TIMBRES RÍTMICOS
# ==============================================================================

def render_zabumba(duration=0.65, velocity=0.9, pitch_sweep=True):
    """Zabumba tradicional de baião: grave encorpado com variação rápida de afinação + baque oco."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Sweep tonal clássico da zabumba: 95 Hz descendo para 44 Hz
    freq_sweep = 44.0 + 51.0 * np.exp(-t * 22.0) if pitch_sweep else 52.0
    phase = np.cumsum(freq_sweep / SR) * TWO_PI
    sub_boom = np.sin(phase) + 0.3 * np.sin(2.0 * phase)
    
    # Impacto de couro no início
    snap = np.random.normal(0, 1, min(300, n_samples))
    snap = np.pad(snap, (0, n_samples - len(snap))) * np.exp(-t * 120.0) * 0.6
    
    env = np.exp(-t * 7.5)
    return (sub_boom * 0.85 + snap) * env * velocity


def render_crystal_triangle(duration=0.5, velocity=0.8, open_ring=True):
    """Triângulo cristalino de baião com brilho metálico estalado."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    # Frequências agudas metálicas
    f1, f2, f3 = 4250.0, 7820.0, 11450.0
    decay_rate = 6.0 if open_ring else 45.0
    ring = (1.0 * np.sin(TWO_PI * f1 * t) +
            0.6 * np.sin(TWO_PI * f2 * t) +
            0.3 * np.sin(TWO_PI * f3 * t))
    
    click = np.random.normal(0, 1, min(150, n_samples))
    click = np.pad(click, (0, n_samples - len(click))) * np.exp(-t * 300.0) * 0.5
    
    env = np.exp(-t * decay_rate)
    return (ring * 0.4 + click) * env * velocity


def render_seed_shaker(duration=0.22, velocity=0.7):
    """Chocalho de sementes / maracá indígena orgânico."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    noise = np.random.normal(0, 1, n_samples)
    # Filtro passa-faixa simples
    noise = np.convolve(noise, np.array([0.1, -0.2, 0.4, -0.2, 0.1]), mode='same')
    
    env = np.sin(np.pi * (t / duration) ** 0.6) * np.exp(-t * 9.0)
    return noise * env * 0.55 * velocity


def render_forest_drum(duration=0.55, velocity=0.85):
    """Tambor tribal de madeira / tambor da mata ancestral."""
    n_samples = int(SR * duration)
    t = np.linspace(0, duration, n_samples, endpoint=False)
    
    f_env = 85.0 + 90.0 * np.exp(-t * 32.0)
    phase = np.cumsum(f_env / SR) * TWO_PI
    tone = np.sin(phase) + 0.25 * np.sin(2.0 * phase)
    
    impact = np.random.normal(0, 1, min(400, n_samples))
    impact = np.pad(impact, (0, n_samples - len(impact))) * np.exp(-t * 90.0) * 0.5
    
    env = np.exp(-t * 9.0)
    return (tone * 0.8 + impact) * env * velocity


# ==============================================================================
# 3. MESA DE MIXAGEM MULTITRACK, PANORAMA ESTÉREO E REVERBERAÇÃO
# ==============================================================================

class MultiTrackMixer:
    def __init__(self, duration_sec):
        self.n_samples = int(SR * duration_sec)
        self.duration_sec = duration_sec
        self.left = np.zeros(self.n_samples, dtype=np.float32)
        self.right = np.zeros(self.n_samples, dtype=np.float32)

    def add_clip(self, sound, start_sec, pan=0.0, gain=1.0):
        """Adiciona um clipe de áudio na trilha com posicionamento estéreo (-1.0 esq .. +1.0 dir)."""
        idx = int(SR * start_sec)
        if idx >= self.n_samples or len(sound) == 0:
            return
            
        sound_len = min(len(sound), self.n_samples - idx)
        s = sound[:sound_len] * gain
        
        # Pan law de potência constante
        pan = max(-1.0, min(1.0, pan))
        angle = (pan + 1.0) * 0.25 * np.pi
        gain_l = math.cos(angle)
        gain_r = math.sin(angle)
        
        self.left[idx:idx + sound_len] += s * gain_l
        self.right[idx:idx + sound_len] += s * gain_r

    def apply_reverb(self, room_size=0.75, damping=0.35, wet=0.28):
        """Reverberador estéreo ultra-rápido via convolução FFT de resposta ao impulso multicamada."""
        ir_dur = 1.6
        ir_len = int(SR * ir_dur)
        t_ir = np.linspace(0, ir_dur, ir_len, endpoint=False)
        
        # Resposta ao impulso com decaimento exponencial, reflexões iniciais e cauda difusa
        decay = np.exp(-t_ir * (3.8 / max(0.2, room_size)))
        ir_l = np.random.normal(0, 1, ir_len) * decay
        ir_r = np.random.normal(0, 1, ir_len) * decay
        
        # Reflexões iniciais discretas (early reflections)
        early_delays = [0.015, 0.028, 0.042, 0.065, 0.088, 0.115]
        for ed in early_delays:
            idx = int(SR * ed)
            if idx < ir_len:
                ir_l[idx] += 0.5 * decay[idx]
                ir_r[idx + 12] += 0.5 * decay[idx]
                
        # Filtro suave de altas frequências (damping)
        d_len = max(2, int(damping * 12))
        ir_l = np.convolve(ir_l, np.ones(d_len) / float(d_len), mode='same')
        ir_r = np.convolve(ir_r, np.ones(d_len) / float(d_len), mode='same')
        
        # Convolução FFT em bloco
        n_conv = self.n_samples + ir_len - 1
        n_fft = 1 << (n_conv - 1).bit_length()
        
        L_fft = np.fft.rfft(self.left, n_fft)
        R_fft = np.fft.rfft(self.right, n_fft)
        IR_L_fft = np.fft.rfft(ir_l, n_fft)
        IR_R_fft = np.fft.rfft(ir_r, n_fft)
        
        rev_l = np.fft.irfft(L_fft * IR_L_fft)[:self.n_samples]
        rev_r = np.fft.irfft(R_fft * IR_R_fft)[:self.n_samples]
        
        # Normalização do ganho do wet
        rev_scale = 0.18 / (np.max(np.abs(ir_l)) + 1e-6)
        self.left = (1.0 - wet) * self.left + wet * rev_l * rev_scale
        self.right = (1.0 - wet) * self.right + wet * rev_r * rev_scale

    def finalize_and_save_wav(self, wav_path):
        """Aplica soft limiting, normalização e salva como WAV PCM 16-bit estéreo 44.1kHz."""
        # Suave fade-in nos primeiros 0.08s e fade-out nos últimos 0.4s
        fade_in_len = int(SR * 0.08)
        fade_out_len = int(SR * 0.4)
        
        self.left[:fade_in_len] *= np.linspace(0, 1, fade_in_len)
        self.right[:fade_in_len] *= np.linspace(0, 1, fade_in_len)
        
        self.left[-fade_out_len:] *= np.linspace(1, 0, fade_out_len)
        self.right[-fade_out_len:] *= np.linspace(1, 0, fade_out_len)
        
        # Soft limiter com tangente hiperbólica para prevenir qualquer ceifamento (clipping)
        max_peak = max(np.max(np.abs(self.left)), np.max(np.abs(self.right)), 1e-6)
        target_peak = 0.94
        scale = target_peak / max_peak if max_peak > target_peak else 1.0
        
        l_out = np.tanh(self.left * scale * 1.05) * 0.94
        r_out = np.tanh(self.right * scale * 1.05) * 0.94
        
        pcm_l = (l_out * 32767).astype(np.int16)
        pcm_r = (r_out * 32767).astype(np.int16)
        
        # Intercala os canais esquerdo e direito
        interleaved = np.empty((self.n_samples, 2), dtype=np.int16)
        interleaved[:, 0] = pcm_l
        interleaved[:, 1] = pcm_r
        
        os.makedirs(os.path.dirname(os.path.abspath(wav_path)), exist_ok=True)
        with wave.open(wav_path, 'wb') as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SR)
            wf.writeframes(interleaved.tobytes())
        print(f"  [OK] WAV gerado: {wav_path} ({self.duration_sec:.1f}s)")


# ==============================================================================
# 4. COMPOSIÇÕES MUSICAIS DOS 3 BIOMAS (FASES NORMAIS E ESPECIAIS)
# ==============================================================================

def compose_forest_regular(wav_path):
    """Floresta - Fases Normais: 'Sussurros da Mata Ancestral' (90 BPM, Mi menor / Sol Maior)."""
    bpm = 90.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 20
    dur = measure * n_measures # 53.33s
    mixer = MultiTrackMixer(dur)
    
    # Progressão harmônica dos 20 compassos:
    # 1-8:   Em - C - G - D  |  Em - C - G - D
    # 9-16:  Am - Em - D - B7 |  Em - C - G - Em
    # 17-20: C - G - D - Em
    chords = [
        ['E2', 'B2', 'E3', 'G3', 'B3'], # Em
        ['C2', 'G2', 'C3', 'E3', 'G3'], # C
        ['G1', 'D2', 'G2', 'B2', 'D3'], # G
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['E2', 'B2', 'E3', 'G3', 'B3'],
        ['C2', 'G2', 'C3', 'E3', 'G3'],
        ['G1', 'D2', 'G2', 'B2', 'D3'],
        ['D2', 'A2', 'D3', 'F#3', 'A3'],
        ['A1', 'E2', 'A2', 'C3', 'E3'], # Am
        ['E2', 'B2', 'E3', 'G3', 'B3'], # Em
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['B1', 'F#2', 'B2', 'D#3', 'F#3'], # B7
        ['E2', 'B2', 'E3', 'G3', 'B3'],
        ['C2', 'G2', 'C3', 'E3', 'G3'],
        ['G1', 'D2', 'G2', 'B2', 'D3'],
        ['E2', 'B2', 'E3', 'G3', 'B3'],
        ['C2', 'G2', 'C3', 'E3', 'G3'],
        ['G1', 'D2', 'G2', 'B2', 'D3'],
        ['D2', 'A2', 'D3', 'F#3', 'A3'],
        ['E2', 'B2', 'E3', 'G3', 'B3']
    ]
    
    # 1. Trilha de Harpa Celta de Esmeralda (arpejos contínuos de 16 avos)
    for m in range(n_measures):
        m_start = m * measure
        ch_notes = chords[m]
        # Arpejo ascendente e descendente
        arp_pattern = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1]
        for step, note_idx in enumerate(arp_pattern):
            n_name = ch_notes[note_idx % len(ch_notes)]
            f = note_to_freq(n_name) * 2.0 # Oitava superior
            harp_sound = render_harp_pluck(f, beat * 0.85, velocity=0.65, brightness=0.6)
            pan = -0.45 + (step % 4) * 0.08
            mixer.add_clip(harp_sound, m_start + step * (beat * 0.25), pan=pan, gain=0.6)
            
    # 2. Trilha de Violão Dedilhado (baixo e acordes de nylon)
    for m in range(n_measures):
        m_start = m * measure
        root_f = note_to_freq(chords[m][0]) * 2.0
        fifth_f = note_to_freq(chords[m][1]) * 2.0
        # Baixo no tempo 1 e 3
        b1 = render_acoustic_guitar(root_f, beat * 1.5, velocity=0.8)
        b2 = render_acoustic_guitar(fifth_f, beat * 1.5, velocity=0.75)
        mixer.add_clip(b1, m_start, pan=-0.25, gain=0.75)
        mixer.add_clip(b2, m_start + beat * 2.0, pan=-0.25, gain=0.7)
        # Acorde dedilhado nos tempos 2 e 4
        for sub_step in [1, 3]:
            for n_name in chords[m][2:5]:
                f = note_to_freq(n_name) * 2.0
                g_strum = render_acoustic_guitar(f, beat * 0.9, velocity=0.55)
                mixer.add_clip(g_strum, m_start + sub_step * beat, pan=0.25, gain=0.45)
                
    # 3. Trilha de Cordas de Câmara (pad de sustentação legato)
    for m in range(n_measures):
        m_start = m * measure
        root_f = note_to_freq(chords[m][0]) * 2.0
        fifth_f = note_to_freq(chords[m][1]) * 2.0
        pad1 = render_strings_pad(root_f, measure + 0.3, velocity=0.6)
        pad2 = render_strings_pad(fifth_f, measure + 0.3, velocity=0.5)
        mixer.add_clip(pad1, m_start, pan=-0.5, gain=0.45)
        mixer.add_clip(pad2, m_start, pan=0.5, gain=0.45)
        
    # 4. Trilha de Flauta de Madeira Nativa (Melodia principal)
    flute_melody = [
        # Compasso 1-4: Tema A
        (0.0, 'B4', 1.5), (1.5, 'G4', 1.0), (2.5, 'A4', 1.5),
        (4.0, 'B4', 2.0), (6.0, 'D5', 1.0), (7.0, 'B4', 1.0),
        (8.0, 'A4', 2.5), (10.5, 'G4', 1.5),
        (12.0, 'E4', 3.5),
        # Compasso 5-8: Variação ascendente
        (16.0, 'B4', 1.5), (17.5, 'D5', 1.0), (18.5, 'E5', 1.5),
        (20.0, 'G5', 2.0), (22.0, 'F#5', 1.0), (23.0, 'E5', 1.0),
        (24.0, 'D5', 2.0), (26.0, 'B4', 1.0), (27.0, 'A4', 1.0),
        (28.0, 'B4', 3.5),
        # Compasso 9-12: Contraponto místico
        (32.0, 'C5', 1.5), (33.5, 'B4', 1.0), (34.5, 'A4', 1.5),
        (36.0, 'G4', 2.0), (38.0, 'F#4', 1.0), (39.0, 'G4', 1.0),
        (40.0, 'A4', 2.0), (42.0, 'B4', 1.0), (43.0, 'A4', 1.0),
        (44.0, 'F#4', 3.0),
        # Compasso 13-16: Resolução suave
        (48.0, 'G4', 1.5), (49.5, 'A4', 1.0), (50.5, 'B4', 1.5),
        (52.0, 'E4', 3.5)
    ]
    for b_offset, note, dur_beats in flute_melody:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            flute_clip = render_wooden_flute(f, dur_beats * beat, velocity=0.85)
            mixer.add_clip(flute_clip, t_sec, pan=0.05, gain=0.85)
            
    # 5. Percussão de Sementes e Litofone Cristalino
    for m in range(n_measures):
        m_start = m * measure
        for b in range(4):
            # Shaker em colcheias
            sh1 = render_seed_shaker(beat * 0.45, velocity=0.6)
            sh2 = render_seed_shaker(beat * 0.45, velocity=0.45)
            mixer.add_clip(sh1, m_start + b * beat, pan=0.35, gain=0.4)
            mixer.add_clip(sh2, m_start + (b + 0.5) * beat, pan=0.35, gain=0.35)
        # Toque de litofone no compasso
        if m % 2 == 1:
            chime = render_crystal_bell(note_to_freq('E6'), beat * 1.5, velocity=0.6)
            mixer.add_clip(chime, m_start + beat * 3.0, pan=0.55, gain=0.5)

    mixer.apply_reverb(room_size=0.78, damping=0.3, wet=0.28)
    mixer.finalize_and_save_wav(wav_path)


def compose_forest_special(wav_path):
    """Floresta - Fase 10 Especial: 'O Despertar da Esmeralda / Araci' (126 BPM, Mi Maior / Lá Maior)."""
    bpm = 126.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 30
    dur = measure * n_measures # 57.14s
    mixer = MultiTrackMixer(dur)
    
    # Progressão triunfante e épica:
    # 1-4:   Intro tribal (pedal E)
    # 5-12:  E - B - C#m - A  |  E - B - A - B
    # 13-20: C#m - G#m - A - E  |  F#m - B - E - E
    # 21-26: C#m - B - A - G#m  |  F#m - B7sus4
    # 27-30: E - A - B - E (Clímax de Esmeralda)
    
    # 1. Tambores Tribais e Percussão Enérgica
    for m in range(n_measures):
        m_start = m * measure
        # Bumbo tribal nos tempos 1, 2.5, 3
        d1 = render_forest_drum(beat * 0.8, velocity=0.9)
        d2 = render_forest_drum(beat * 0.7, velocity=0.8)
        d3 = render_forest_drum(beat * 0.85, velocity=0.95)
        mixer.add_clip(d1, m_start, pan=-0.1, gain=0.85)
        mixer.add_clip(d2, m_start + beat * 1.5, pan=-0.1, gain=0.75)
        mixer.add_clip(d3, m_start + beat * 2.0, pan=-0.1, gain=0.85)
        
        # Maracás acelerados em semicolcheias
        for step in range(8):
            vel = 0.7 if step % 2 == 0 else 0.5
            maraca = render_seed_shaker(beat * 0.35, velocity=vel)
            mixer.add_clip(maraca, m_start + step * (beat * 0.5), pan=0.4, gain=0.5)
            
    # 2. Base Rítmica de Violão e Metais
    e_chords = [
        ['E2', 'B2', 'E3', 'G#3', 'B3'],
        ['B1', 'F#2', 'B2', 'D#3', 'F#3'],
        ['C#2', 'G#2', 'C#3', 'E3', 'G#3'],
        ['A1', 'E2', 'A2', 'C#3', 'E3']
    ]
    for m in range(4, n_measures):
        m_start = m * measure
        ch = e_chords[m % 4]
        # Palhetada rítmica cortada (chops)
        for b in [0, 1, 2, 3]:
            for n_name in ch[2:]:
                f = note_to_freq(n_name) * 2.0
                g_strum = render_acoustic_guitar(f, beat * 0.4, velocity=0.7)
                mixer.add_clip(g_strum, m_start + b * beat, pan=-0.3, gain=0.55)
                
    # 3. Flautas Gêmeas da Floresta em Contraponto Virtuoso
    flute_theme = [
        # Frase 1 (Compassos 5-8)
        (16.0, 'E5', 0.8), (17.0, 'F#5', 0.8), (18.0, 'G#5', 1.0), (19.0, 'B5', 1.0),
        (20.0, 'G#5', 1.5), (21.5, 'F#5', 0.8), (22.5, 'E5', 1.2),
        (24.0, 'F#5', 1.5), (26.0, 'G#5', 1.0), (27.0, 'A5', 1.0),
        (28.0, 'G#5', 2.0), (30.0, 'F#5', 1.5),
        # Frase 2 (Compassos 9-12)
        (32.0, 'E5', 0.8), (33.0, 'G#5', 0.8), (34.0, 'B5', 1.5), (36.0, 'E6', 2.0),
        (38.0, 'D#6', 1.0), (39.0, 'C#6', 1.0), (40.0, 'B5', 2.0),
        (42.0, 'A5', 1.0), (43.0, 'G#5', 1.0), (44.0, 'F#5', 2.5),
        # Clímax (Compassos 17-24)
        (64.0, 'G#5', 0.8), (65.0, 'A5', 0.8), (66.0, 'B5', 1.0), (67.0, 'E6', 1.5),
        (69.0, 'D#6', 0.8), (70.0, 'C#6', 1.0), (71.0, 'B5', 1.5),
        (73.0, 'C#6', 1.0), (74.0, 'B5', 1.0), (75.0, 'A5', 1.0), (76.0, 'G#5', 1.0),
        (77.0, 'F#5', 2.0), (79.0, 'E5', 3.0)
    ]
    for b_offset, note, dur_beats in flute_theme:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            f_main = render_wooden_flute(f, dur_beats * beat, velocity=0.9)
            # Segunda flauta em terça inferior harmônica
            f_harm = render_wooden_flute(f * 0.8, dur_beats * beat, velocity=0.7)
            mixer.add_clip(f_main, t_sec, pan=-0.2, gain=0.8)
            mixer.add_clip(f_harm, t_sec, pan=0.25, gain=0.6)
            
    # 4. Sinos de Esmeralda em Cascata Radiante
    emerald_arps = ['E6', 'G#6', 'B6', 'E7', 'B6', 'G#6']
    for m in range(8, n_measures):
        m_start = m * measure
        for step, n_name in enumerate(emerald_arps):
            f = note_to_freq(n_name)
            bell = render_crystal_bell(f, beat * 0.9, velocity=0.75)
            mixer.add_clip(bell, m_start + step * (beat * 0.5), pan=0.5, gain=0.55)

    mixer.apply_reverb(room_size=0.72, damping=0.25, wet=0.26)
    mixer.finalize_and_save_wav(wav_path)


def compose_river_regular(wav_path):
    """Rio - Fases Normais: 'Correnteza Turquesa' (88 BPM, Dó Maior / Fá Lídio)."""
    bpm = 88.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 20
    dur = measure * n_measures # 54.55s
    mixer = MultiTrackMixer(dur)
    
    # Progressão harmônica cristalina e límpida (Cmaj9 - Fmaj7#11 - Cmaj9 - Gsus4)
    river_chords = [
        ['C2', 'G2', 'C3', 'E3', 'G3', 'B3', 'D4'], # Cmaj9
        ['F2', 'C3', 'F3', 'A3', 'C4', 'E4', 'B4'], # Fmaj7#11 (B natural = Lídio aquático)
        ['C2', 'G2', 'C3', 'E3', 'G3', 'B3', 'D4'],
        ['G2', 'D3', 'G3', 'C4', 'D4', 'G4'],       # Gsus4
        ['A2', 'E3', 'A3', 'C4', 'E4', 'G4'],       # Am7
        ['F2', 'C3', 'F3', 'A3', 'C4', 'E4'],       # Fmaj7
        ['D2', 'A2', 'D3', 'F3', 'A3', 'C4'],       # Dm7
        ['G2', 'D3', 'G3', 'B3', 'D4', 'F4']        # G7
    ]
    
    # 1. Harpa Aquática em Ondulações Fluidas
    for m in range(n_measures):
        m_start = m * measure
        ch = river_chords[m % len(river_chords)]
        # Arpejo ondulante de 16 notas
        wave_pattern = [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5]
        for step, note_idx in enumerate(wave_pattern):
            n_name = ch[note_idx % len(ch)]
            f = note_to_freq(n_name) * 2.0
            harp = render_harp_pluck(f, beat * 0.9, velocity=0.6, brightness=0.7)
            pan = math.sin(step * 0.4) * 0.6
            mixer.add_clip(harp, m_start + step * (beat * 0.25), pan=pan, gain=0.65)
            
    # 2. Celesta d'Água / Gotas Cristalinas
    drop_notes = ['E6', 'G6', 'A6', 'B6', 'D7', 'E7']
    for m in range(n_measures):
        m_start = m * measure
        for d_idx, n_name in enumerate(drop_notes):
            if (m + d_idx) % 3 == 0:
                f = note_to_freq(n_name)
                drop = render_crystal_bell(f, beat * 1.2, velocity=0.55)
                mixer.add_clip(drop, m_start + d_idx * (beat * 0.65), pan=0.45, gain=0.45)
                
    # 3. Flauta Transversal Límpida (Melodia das Águas Claras)
    flute_river = [
        # Compasso 1-4
        (0.0, 'E5', 2.0), (2.0, 'G5', 1.5), (3.5, 'A5', 0.8),
        (4.0, 'B5', 2.5), (6.5, 'A5', 1.0), (7.5, 'G5', 0.8),
        (8.0, 'E5', 2.0), (10.0, 'D5', 1.5), (11.5, 'C5', 0.8),
        (12.0, 'D5', 3.5),
        # Compasso 5-8
        (16.0, 'G5', 2.0), (18.0, 'A5', 1.5), (19.5, 'B5', 0.8),
        (20.0, 'C6', 2.5), (22.5, 'B5', 1.0), (23.5, 'A5', 0.8),
        (24.0, 'G5', 2.0), (26.0, 'E5', 1.5), (27.5, 'D5', 0.8),
        (28.0, 'C5', 3.5),
        # Compasso 9-12 (Correnteza serena)
        (32.0, 'A5', 1.5), (33.5, 'C6', 1.5), (35.0, 'B5', 1.0),
        (36.0, 'G5', 2.0), (38.0, 'E5', 1.5),
        (40.0, 'F5', 1.5), (41.5, 'A5', 1.5), (43.0, 'G5', 1.0),
        (44.0, 'C5', 3.5)
    ]
    for b_offset, note, dur_beats in flute_river:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            flute = render_wooden_flute(f, dur_beats * beat, velocity=0.85, vibrato_delay=0.1)
            mixer.add_clip(flute, t_sec, pan=-0.1, gain=0.85)
            
    # 4. Cordas Suaves e Tambor d'Água Leve
    for m in range(n_measures):
        m_start = m * measure
        root_f = note_to_freq(river_chords[m % len(river_chords)][0]) * 2.0
        strings = render_strings_pad(root_f, measure + 0.2, velocity=0.55)
        mixer.add_clip(strings, m_start, pan=-0.4, gain=0.45)
        # Toque de água suave
        w_drum = render_forest_drum(beat * 0.9, velocity=0.5)
        mixer.add_clip(w_drum, m_start + beat * 2.0, pan=0.2, gain=0.4)

    mixer.apply_reverb(room_size=0.82, damping=0.25, wet=0.32)
    mixer.finalize_and_save_wav(wav_path)


def compose_river_special(wav_path):
    """Rio - Fase 15 Especial: 'A Dança das Cascatas / Irecê' (124 BPM, Ré Maior)."""
    bpm = 124.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 30
    dur = measure * n_measures # 58.06s
    mixer = MultiTrackMixer(dur)
    
    # Tema dos 5 Cristais Sonoros (Dó, Ré, Mi, Sol, Lá transposto para Ré Maior: D, E, F#, A, B)
    crystal_scale = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6']
    
    # 1. Minigame Melódico dos Cristais Sonoros (Sinos de Turmalina Paraíba)
    for m in range(n_measures):
        m_start = m * measure
        # Padrão rítmico saltitante de cristais
        pattern = [0, 2, 4, 3, 1, 3, 5, 4]
        for step, idx in enumerate(pattern):
            n_name = crystal_scale[idx]
            f = note_to_freq(n_name)
            bell = render_crystal_bell(f, beat * 0.6, velocity=0.8)
            pan = -0.5 + step * 0.14
            mixer.add_clip(bell, m_start + step * (beat * 0.5), pan=pan, gain=0.7)
            
    # 2. Percussão de Água e Tambores em Corredeira
    for m in range(n_measures):
        m_start = m * measure
        # Groove rápido
        d1 = render_forest_drum(beat * 0.7, velocity=0.85)
        d2 = render_forest_drum(beat * 0.6, velocity=0.75)
        mixer.add_clip(d1, m_start, pan=-0.2, gain=0.8)
        mixer.add_clip(d2, m_start + beat * 2.0, pan=0.2, gain=0.8)
        for b in range(4):
            sh = render_seed_shaker(beat * 0.4, velocity=0.6)
            mixer.add_clip(sh, m_start + b * beat + beat * 0.5, pan=0.35, gain=0.45)
            
    # 3. Flauta Saltitante e Virtuosa de Irecê
    flute_dance = [
        # Frase 1 (Compassos 5-8)
        (16.0, 'D5', 0.8), (17.0, 'F#5', 0.8), (18.0, 'A5', 1.0), (19.0, 'B5', 1.0),
        (20.0, 'A5', 1.5), (21.5, 'F#5', 0.8), (22.5, 'E5', 1.2),
        (24.0, 'D5', 0.8), (25.0, 'E5', 0.8), (26.0, 'F#5', 1.0), (27.0, 'A5', 1.0),
        (28.0, 'B5', 2.0), (30.0, 'A5', 1.5),
        # Frase 2 (Compassos 9-12)
        (32.0, 'F#5', 0.8), (33.0, 'A5', 0.8), (34.0, 'D6', 1.5), (36.0, 'C#6', 1.0),
        (37.0, 'B5', 1.0), (38.0, 'A5', 1.5), (40.0, 'F#5', 1.0), (41.0, 'E5', 1.0),
        (42.0, 'D5', 3.5),
        # Cascata triunfante (Compassos 17-24)
        (64.0, 'D6', 0.8), (65.0, 'C#6', 0.8), (66.0, 'B5', 1.0), (67.0, 'A5', 1.0),
        (68.0, 'F#5', 1.5), (70.0, 'A5', 1.0), (71.0, 'B5', 1.5),
        (73.0, 'D6', 1.0), (74.0, 'E6', 1.0), (75.0, 'F#6', 2.0),
        (77.0, 'E6', 1.0), (78.0, 'D6', 2.5)
    ]
    for b_offset, note, dur_beats in flute_dance:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            fl = render_wooden_flute(f, dur_beats * beat, velocity=0.9)
            mixer.add_clip(fl, t_sec, pan=0.1, gain=0.85)

    mixer.apply_reverb(room_size=0.76, damping=0.28, wet=0.28)
    mixer.finalize_and_save_wav(wav_path)


def compose_caatinga_regular(wav_path):
    """Caatinga - Fases Normais: 'Sol Sobre o Arenito' (94 BPM, Ré Mixolídio)."""
    bpm = 94.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 20
    dur = measure * n_measures # 51.06s
    mixer = MultiTrackMixer(dur)
    
    # Progressão sertaneja modal: D - C - D - G - Am - C - D - D
    caat_chords = [
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['C2', 'G2', 'C3', 'E3', 'G3'],   # C
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['G1', 'D2', 'G2', 'B2', 'D3'],   # G
        ['A1', 'E2', 'A2', 'C3', 'E3'],   # Am
        ['C2', 'G2', 'C3', 'E3', 'G3'],   # C
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['D2', 'A2', 'D3', 'F#3', 'A3']  # D
    ]
    
    # 1. Viola Caipira / Violão de 12 Cordas (Dedilhado Rústico com bordão característico)
    for m in range(n_measures):
        m_start = m * measure
        ch = caat_chords[m % len(caat_chords)]
        root_f = note_to_freq(ch[0]) * 2.0
        # Bordão no tempo 1
        b_root = render_acoustic_guitar(root_f, beat * 1.5, velocity=0.85)
        mixer.add_clip(b_root, m_start, pan=-0.3, gain=0.8)
        # Ponteado da viola caipira
        viola_steps = [1, 2, 3]
        for s in viola_steps:
            n_name = ch[(s + 1) % len(ch)]
            f = note_to_freq(n_name) * 2.0
            p = render_acoustic_guitar(f, beat * 0.8, velocity=0.7)
            mixer.add_clip(p, m_start + s * beat, pan=0.3, gain=0.65)
            
    # 2. Rabeca Sertaneja (Melodia expressiva, contemplativa e lírica)
    rabeca_melody = [
        # Frase 1: O calor do sertão (Compasso 1-4)
        (0.0, 'D4', 1.5), (1.5, 'F#4', 1.0), (2.5, 'A4', 1.5),
        (4.0, 'C5', 2.0), (6.0, 'B4', 1.0), (7.0, 'A4', 1.0),
        (8.0, 'F#4', 2.5), (10.5, 'E4', 1.5),
        (12.0, 'D4', 3.5),
        # Frase 2: As chapadas douradas (Compasso 5-8)
        (16.0, 'A4', 1.5), (17.5, 'C5', 1.0), (18.5, 'D5', 2.0),
        (20.5, 'E5', 1.5), (22.0, 'D5', 1.0), (23.0, 'C5', 1.0),
        (24.0, 'A4', 2.0), (26.0, 'F#4', 1.5),
        (28.0, 'D4', 3.5),
        # Frase 3: A brisa da tarde (Compasso 9-12)
        (32.0, 'C5', 1.5), (33.5, 'B4', 1.0), (34.5, 'A4', 1.5),
        (36.0, 'F#4', 2.0), (38.0, 'E4', 1.5),
        (40.0, 'G4', 1.5), (41.5, 'F#4', 1.0), (42.5, 'E4', 1.5),
        (44.0, 'D4', 3.5)
    ]
    for b_offset, note, dur_beats in rabeca_melody:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            rabeca = render_rabeca_fiddle(f, dur_beats * beat, velocity=0.88)
            mixer.add_clip(rabeca, t_sec, pan=-0.08, gain=0.85)
            
    # 3. Litofone de Arenito e Shaker de Cabaça
    for m in range(n_measures):
        m_start = m * measure
        for b in range(4):
            sh = render_seed_shaker(beat * 0.45, velocity=0.5)
            mixer.add_clip(sh, m_start + b * beat + beat * 0.5, pan=0.4, gain=0.4)
        if m % 2 == 0:
            chime = render_crystal_bell(note_to_freq('D5'), beat * 1.5, velocity=0.55)
            mixer.add_clip(chime, m_start + beat * 1.0, pan=-0.45, gain=0.5)

    mixer.apply_reverb(room_size=0.68, damping=0.4, wet=0.24)
    mixer.finalize_and_save_wav(wav_path)


def compose_caatinga_special(wav_path):
    """Caatinga - Fase 20 Especial: 'O Baião da Opala de Fogo / Jurema' (134 BPM, Lá Maior / Baião Tradicional)."""
    bpm = 134.0
    beat = 60.0 / bpm
    measure = beat * 4.0
    n_measures = 32
    dur = measure * n_measures # 57.31s
    mixer = MultiTrackMixer(dur)
    
    # Progressão festiva de Baião:
    # A - E7 - A - D - A - E7 - A - A
    
    # 1. Zabumba Tradicional de Baião (Tum... tum-CÁ!)
    for m in range(n_measures):
        m_start = m * measure
        # Tempo 1: batida grave cheia
        z1 = render_zabumba(beat * 0.85, velocity=0.95, pitch_sweep=True)
        # Upbeat do tempo 2: batida de passagem
        z2 = render_zabumba(beat * 0.55, velocity=0.75, pitch_sweep=False)
        # Tempo 2 (o "CÁ!" agudo do bacalhau da zabumba):
        z_slap = render_forest_drum(beat * 0.4, velocity=0.9)
        # Tempo 3: batida grave
        z3 = render_zabumba(beat * 0.75, velocity=0.9, pitch_sweep=True)
        
        mixer.add_clip(z1, m_start, pan=0.0, gain=0.9)
        mixer.add_clip(z2, m_start + beat * 0.75, pan=0.0, gain=0.75)
        mixer.add_clip(z_slap, m_start + beat * 1.0, pan=-0.15, gain=0.8)
        mixer.add_clip(z3, m_start + beat * 2.0, pan=0.0, gain=0.85)
        
    # 2. Triângulo Cristalino Marcante (ding-ding-TI-ding!)
    for m in range(n_measures):
        m_start = m * measure
        # 16 avos do triângulo
        for s in range(8):
            is_open = (s == 2 or s == 6)
            vel = 0.85 if is_open else 0.5
            tri = render_crystal_triangle(beat * 0.4, velocity=vel, open_ring=is_open)
            mixer.add_clip(tri, m_start + s * (beat * 0.5), pan=0.45, gain=0.6)
            
    # 3. Sanfona / Acordeon Brasileiro (Base rítmica e acordes rasgados)
    baiao_chords = [
        ['A2', 'E3', 'A3', 'C#4', 'E4'], # A
        ['E2', 'B2', 'E3', 'G#3', 'D4'], # E7
        ['A2', 'E3', 'A3', 'C#4', 'E4'], # A
        ['D2', 'A2', 'D3', 'F#3', 'A3'], # D
        ['A2', 'E3', 'A3', 'C#4', 'E4'], # A
        ['E2', 'B2', 'E3', 'G#3', 'D4'], # E7
        ['A2', 'E3', 'A3', 'C#4', 'E4'], # A
        ['A2', 'E3', 'A3', 'C#4', 'E4']  # A
    ]
    for m in range(4, n_measures):
        m_start = m * measure
        ch = baiao_chords[m % len(baiao_chords)]
        # Sanfona dando cortes rítmicos no contratempo
        for s in [0.5, 1.5, 2.5, 3.5]:
            for n_name in ch[2:]:
                f = note_to_freq(n_name) * 2.0
                stab = render_sanfona_accordion(f, beat * 0.45, velocity=0.75)
                mixer.add_clip(stab, m_start + s * beat, pan=-0.35, gain=0.55)
                
    # 4. Rabeca Solo Virtuosística Faceira (Melodia frenética do Baião)
    rabeca_baiao = [
        # Tema A (Compassos 5-8)
        (16.0, 'E5', 0.5), (16.5, 'F#5', 0.5), (17.0, 'G#5', 0.5), (17.5, 'A5', 0.5),
        (18.0, 'C#6', 1.0), (19.0, 'B5', 0.5), (19.5, 'A5', 0.5),
        (20.0, 'G#5', 1.0), (21.0, 'F#5', 0.5), (21.5, 'G#5', 0.5),
        (22.0, 'E5', 1.5),
        (24.0, 'F#5', 0.5), (24.5, 'G#5', 0.5), (25.0, 'A5', 1.0),
        (26.0, 'B5', 0.5), (26.5, 'C#6', 0.5), (27.0, 'D6', 1.0),
        (28.0, 'C#6', 1.0), (29.0, 'B5', 1.0), (30.0, 'A5', 1.5),
        # Variação rápida (Compassos 9-12)
        (32.0, 'C#6', 0.5), (32.5, 'D6', 0.5), (33.0, 'E6', 1.0),
        (34.0, 'F#6', 0.5), (34.5, 'E6', 0.5), (35.0, 'D6', 0.5), (35.5, 'C#6', 0.5),
        (36.0, 'B5', 1.0), (37.0, 'C#6', 0.5), (37.5, 'B5', 0.5),
        (38.0, 'A5', 1.5),
        (40.0, 'G#5', 0.5), (40.5, 'A5', 0.5), (41.0, 'B5', 1.0),
        (42.0, 'E5', 1.0), (43.0, 'G#5', 1.0), (44.0, 'A5', 2.0),
        # Clímax da Opala de Fogo (Compassos 17-24)
        (64.0, 'A5', 0.5), (64.5, 'C#6', 0.5), (65.0, 'E6', 1.0),
        (66.0, 'F#6', 1.0), (67.0, 'E6', 1.0),
        (68.0, 'D6', 0.5), (68.5, 'C#6', 0.5), (69.0, 'B5', 1.0),
        (70.0, 'C#6', 1.0), (71.0, 'A5', 1.5),
        (72.0, 'B5', 0.5), (72.5, 'C#6', 0.5), (73.0, 'D6', 1.0),
        (74.0, 'E6', 1.0), (75.0, 'C#6', 1.0), (76.0, 'A5', 2.0)
    ]
    for b_offset, note, dur_beats in rabeca_baiao:
        t_sec = b_offset * beat
        if t_sec < dur:
            f = note_to_freq(note)
            rabeca = render_rabeca_fiddle(f, dur_beats * beat, velocity=0.92)
            mixer.add_clip(rabeca, t_sec, pan=-0.12, gain=0.88)
            
    # 5. Sinos da Opala de Fogo (Estalos cristalinos e dourados)
    for m in range(8, n_measures):
        m_start = m * measure
        if m % 2 == 1:
            chime1 = render_crystal_bell(note_to_freq('A6'), beat * 0.8, velocity=0.7)
            chime2 = render_crystal_bell(note_to_freq('E6'), beat * 0.8, velocity=0.65)
            mixer.add_clip(chime1, m_start + beat * 3.0, pan=0.5, gain=0.55)
            mixer.add_clip(chime2, m_start + beat * 3.5, pan=-0.5, gain=0.5)

    mixer.apply_reverb(room_size=0.65, damping=0.35, wet=0.22)
    mixer.finalize_and_save_wav(wav_path)


# ==============================================================================
# 5. PONTO DE ENTRADA PRINCIPAL
# ==============================================================================

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    audio_dir = os.path.join(root, 'assets', 'audio')
    os.makedirs(audio_dir, exist_ok=True)
    
    tracks = [
        ('musica-floresta-fases.wav', compose_forest_regular, 'Floresta - Fases Normais'),
        ('musica-floresta-especial.wav', compose_forest_special, 'Floresta - Fase 10 Especial (Araci)'),
        ('musica-rio-fases.wav', compose_river_regular, 'Rio - Fases Normais'),
        ('musica-rio-especial.wav', compose_river_special, 'Rio - Fase 15 Especial (Irecê)'),
        ('musica-caatinga-fases.wav', compose_caatinga_regular, 'Caatinga - Fases Normais'),
        ('musica-caatinga-especial.wav', compose_caatinga_special, 'Caatinga - Fase 20 Especial (Jurema)')
    ]
    
    print("=== Síntese Sonora Instrumental — Sinfonia dos Cristais ===")
    print(f"Total de faixas a sintetizar: {len(tracks)}")
    
    for i, (fname, composer_fn, title) in enumerate(tracks, 1):
        wav_path = os.path.join(audio_dir, fname)
        print(f"\n[{i}/{len(tracks)}] Sintetizando: {title}...")
        composer_fn(wav_path)
        
    print("\n[OK] Todas as 6 faixas WAV foram sintetizadas com sucesso!")

if __name__ == '__main__':
    main()
