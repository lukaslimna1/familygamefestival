const BRAZIL_COUNTRY_CODE = '55';

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string) {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

/**
 * Armazena telefones brasileiros em E.164 sem pontuação: +55DDDNÚMERO.
 * Aceita tanto o formato nacional com DDD quanto o mesmo número com +55.
 */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+${BRAZIL_COUNTRY_CODE}${digits}`;
  }
  return `+${digits}`;
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)
    ? digits.slice(BRAZIL_COUNTRY_CODE.length)
    : digits;
  if (!/^\d{10,11}$/.test(national)) return false;

  const ddd = national.slice(0, 2);
  const subscriber = national.slice(2);
  if (!/^[1-9]\d$/.test(ddd)) return false;
  return subscriber.length === 8
    ? /^[2-5]\d{7}$/.test(subscriber)
    : /^9\d{8}$/.test(subscriber);
}

export function formatCpf(value: string | null | undefined) {
  const digits = normalizeCpf(value ?? '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value: string | null | undefined) {
  let digits = (value ?? '').replace(/\D/g, '');
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && digits.length > 11) digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const subscriberLength = digits.length > 10 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 2 + subscriberLength)}-${digits.slice(2 + subscriberLength)}`;
}
