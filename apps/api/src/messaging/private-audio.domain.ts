import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

export const PRIVATE_AUDIO_MAX_BYTES = 4 * 1024 * 1024;
export const PRIVATE_AUDIO_ACCOUNT_BYTES = 32 * 1024 * 1024;
export const PRIVATE_AUDIO_MAX_SECONDS = 120;

// Accept canonical PCM WAV only. Container metadata and client duration alone
// never establish that a payload is audio: every sample must fit this PCM layout.
export function inspectPrivateAudio(input: { mimeType?: unknown; base64?: unknown; consent?: unknown; requestKey?: unknown }) {
  if (input.consent !== true) throw new BadRequestException('Recording/upload consent is required.');
  if (input.mimeType !== 'audio/wav') throw new BadRequestException('Only PCM WAV audio is supported.');
  if (typeof input.requestKey !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(input.requestKey)) throw new BadRequestException('A stable upload request key is required.');
  if (typeof input.base64 !== 'string' || input.base64.length > Math.ceil(PRIVATE_AUDIO_MAX_BYTES / 3) * 4 || input.base64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(input.base64)) throw new BadRequestException('Invalid or oversized audio.');
  const bytes = Buffer.from(input.base64, 'base64');
  if (bytes.length < 46 || bytes.length > PRIVATE_AUDIO_MAX_BYTES || bytes.toString('base64') !== input.base64) throw new BadRequestException('Invalid audio bytes.');
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE' || bytes.readUInt32LE(4) !== bytes.length - 8) throw new BadRequestException('Invalid WAV container.');
  if (bytes.toString('ascii', 12, 16) !== 'fmt ' || bytes.readUInt32LE(16) !== 16 || bytes.readUInt16LE(20) !== 1 || bytes.toString('ascii', 36, 40) !== 'data') throw new BadRequestException('A canonical uncompressed PCM WAV file is required.');
  const channels = bytes.readUInt16LE(22), rate = bytes.readUInt32LE(24), byteRate = bytes.readUInt32LE(28), align = bytes.readUInt16LE(32), bits = bytes.readUInt16LE(34), dataSize = bytes.readUInt32LE(40);
  if (![1, 2].includes(channels) || rate < 8000 || rate > 48000 || bits !== 16 || align !== channels * 2 || byteRate !== rate * align || dataSize !== bytes.length - 44 || dataSize % align !== 0) throw new BadRequestException('Invalid PCM sample layout.');
  const durationMs = Math.ceil(dataSize * 1000 / byteRate);
  if (durationMs < 1 || durationMs > PRIVATE_AUDIO_MAX_SECONDS * 1000) throw new BadRequestException('Audio must not exceed two minutes.');
  return { bytes, durationMs, durationSec: Math.ceil(durationMs / 1000), sha256: createHash('sha256').update(bytes).digest('hex'), requestKey: input.requestKey };
}
