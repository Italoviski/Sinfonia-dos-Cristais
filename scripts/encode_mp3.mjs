import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Load self-contained lame.min.js
const lameMinPath = path.join(ROOT, 'node_modules', 'lamejs', 'lame.min.js');
const lameCode = fs.readFileSync(lameMinPath, 'utf8');
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(lameCode, sandbox);
const lamejs = sandbox.lamejs;

export function encodeWavToMp3(wavPath, mp3Path, bitrate = 192) {
  const wavBuf = fs.readFileSync(wavPath);
  
  // Parse WAV header (RIFF format)
  const numChannels = wavBuf.readUInt16LE(22);
  const sampleRate = wavBuf.readUInt32LE(24);
  const bitsPerSample = wavBuf.readUInt16LE(34);
  
  // Find data chunk
  let dataOffset = 12;
  while (dataOffset < wavBuf.length) {
    const chunkId = wavBuf.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuf.readUInt32LE(dataOffset + 4);
    if (chunkId === 'data') {
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }
  
  const rawPcm = wavBuf.subarray(dataOffset);
  const totalSamples = Math.floor(rawPcm.length / (numChannels * (bitsPerSample / 8)));
  
  const left = new Int16Array(totalSamples);
  const right = numChannels > 1 ? new Int16Array(totalSamples) : left;
  
  if (bitsPerSample === 16) {
    if (numChannels === 1) {
      for (let i = 0; i < totalSamples; i++) {
        left[i] = rawPcm.readInt16LE(i * 2);
      }
    } else {
      for (let i = 0; i < totalSamples; i++) {
        left[i] = rawPcm.readInt16LE(i * 4);
        right[i] = rawPcm.readInt16LE(i * 4 + 2);
      }
    }
  } else {
    throw new Error(`Unsupported bitsPerSample: ${bitsPerSample}`);
  }
  
  const mp3encoder = new lamejs.Mp3Encoder(numChannels > 1 ? 2 : 1, sampleRate, bitrate);
  const mp3Data = [];
  
  // Process in chunks of 1152 samples
  const blockSize = 1152;
  for (let i = 0; i < totalSamples; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = numChannels > 1 ? right.subarray(i, i + blockSize) : leftChunk;
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(Buffer.from(mp3buf));
    }
  }
  
  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(Buffer.from(endBuf));
  }
  
  const finalBuf = Buffer.concat(mp3Data);
  fs.writeFileSync(mp3Path, finalBuf);
  return finalBuf;
}

if (process.argv[1] && process.argv[1].endsWith('encode_mp3.mjs')) {
  const wavArg = process.argv[2];
  const mp3Arg = process.argv[3];
  if (wavArg && mp3Arg) {
    const buf = encodeWavToMp3(wavArg, mp3Arg);
    console.log(`Encoded ${wavArg} -> ${mp3Arg} (${(buf.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log('Usage: node scripts/encode_mp3.mjs <input.wav> <output.mp3>');
  }
}
