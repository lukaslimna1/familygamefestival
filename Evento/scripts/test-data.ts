function calculateCpfDigit(base: string) {
  const length = base.length;
  const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function makeTestCpf(seed: string, leadingDigit: string) {
  const digits = seed.replace(/\D/g, '');
  const base = `${leadingDigit}${digits}`.slice(0, 9).padEnd(9, '0');
  return `${base}${calculateCpfDigit(base)}${calculateCpfDigit(`${base}${calculateCpfDigit(base)}`)}`;
}
