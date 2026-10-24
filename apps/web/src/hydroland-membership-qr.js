// QR Model 2, version 12 / error correction M / byte mode / mask 0.
// Bounded local encoder: no network service receives membership references.
// Fixed-version output is regression-compared against an independent encoder.
function membershipQr(text) {
  if (typeof text !== 'string') throw new TypeError('QR input must be text');
  const input = new TextEncoder().encode(text);
  if (!input.length || input.length > 287) throw new RangeError('QR payload must be 1-287 UTF-8 bytes');
  const bits = [];
  const append = (value, count) => { for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  append(4, 4); append(input.length, 16);
  for (const byte of input) append(byte, 8);
  append(0, Math.min(4, 2320 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((v, b) => v * 2 + b, 0));
  for (let pad = 0; data.length < 290; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  const multiply = (x, y) => {
    let result = 0;
    while (y) { if (y & 1) result ^= x; y >>>= 1; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    return result;
  };
  let generator = [1], root = 1;
  for (let i = 0; i < 22; i++) {
    const next = Array(generator.length + 1).fill(0);
    generator.forEach((v, j) => { next[j] ^= v; next[j + 1] ^= multiply(v, root); });
    generator = next; root = multiply(root, 2);
  }
  const blocks = [], parity = []; let offset = 0;
  for (let i = 0; i < 8; i++) {
    const length = i < 6 ? 36 : 37, block = data.slice(offset, offset + length);
    offset += length; blocks.push(block);
    const work = [...block, ...Array(22).fill(0)];
    for (let j = 0; j < length; j++) { const factor = work[j]; generator.forEach((g, k) => { work[j + k] ^= multiply(g, factor); }); }
    parity.push(work.slice(length));
  }
  const codewords = [];
  for (let i = 0; i < 37; i++) for (const block of blocks) if (i < block.length) codewords.push(block[i]);
  for (let i = 0; i < 22; i++) for (const block of parity) codewords.push(block[i]);
  const size = 65, matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      if (row + r < 0 || row + r >= size || col + c < 0 || col + c >= size) continue;
      matrix[row + r][col + c] = r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (const row of [6, 32, 58]) for (const col of [6, 32, 58]) {
    if (matrix[row][col] !== null) continue;
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) matrix[row + r][col + c] = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
  }
  for (let i = 8; i < size - 8; i++) { if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0; if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0; }
  const format = 0x5412; // BCH encoded M/0, XOR format mask.
  for (let i = 0; i < 15; i++) {
    const value = Boolean((format >>> i) & 1);
    matrix[i < 6 ? i : i < 8 ? i + 1 : size - 15 + i][8] = value;
    matrix[8][i < 8 ? size - i - 1 : i < 9 ? 15 - i : 14 - i] = value;
  }
  matrix[size - 8][8] = true;
  let remainder = 12 << 12;
  const bitLength = value => value ? 32 - Math.clz32(value) : 0;
  while (bitLength(remainder) >= bitLength(0x1f25)) remainder ^= 0x1f25 << (bitLength(remainder) - bitLength(0x1f25));
  const version = (12 << 12) | remainder;
  for (let i = 0; i < 18; i++) { const value = Boolean((version >>> i) & 1); matrix[Math.floor(i / 3)][i % 3 + size - 11] = value; matrix[i % 3 + size - 11][Math.floor(i / 3)] = value; }
  let row = size - 1, direction = -1, bit = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    while (true) {
      for (let side = 0; side < 2; side++) if (matrix[row][col - side] === null) {
        let value = Boolean((codewords[Math.floor(bit / 8)] >>> (7 - bit % 8)) & 1); bit++;
        if ((row + col - side) % 2 === 0) value = !value;
        matrix[row][col - side] = value;
      }
      row += direction;
      if (row < 0 || row >= size) { row -= direction; direction = -direction; break; }
    }
  }
  return matrix;
}

export { membershipQr };
