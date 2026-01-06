export const obfuscateAddress = (address: string) => {
    const startLength = 3;
    const endLength = 5;
    const str = address.slice(0, startLength) + "..." + address.slice(-endLength);
    if (str.length <= startLength + endLength) return str;
    return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
};

export const cutNumber = (num: any, decimals = 2) => {
  let str = String(num);

  if (str.includes('.')) {
    let [int, frac] = str.split('.');
    frac = frac.slice(0, decimals);
    return decimals > 0 ? int + '.' + frac.padEnd(decimals, '0') : int;
  } else {
    return decimals > 0 ? str + '.' + '0'.repeat(decimals) : str;
  }
}

export const cutNumberNano = (num: any, decimals = 2) => {
  // если прилетает ref/computed из Vue — аккуратно берём .value
  if (num && typeof num === "object" && "value" in num) {
    num = (num as any).value;
  }

  // нормализуем количество знаков после запятой
  if (decimals < 0) decimals = 0;
  if (decimals > 9) decimals = 9;

  // BigInt обрабатываем без преобразования в float
  if (typeof num === "bigint") {
    const s = num.toString();
    const len = s.length;

    let intPart: string;
    let fracPart: string;

    if (len <= 9) {
      intPart = "0";
      fracPart = s.padStart(9, "0");
    } else {
      intPart = s.slice(0, len - 9);
      fracPart = s.slice(len - 9);
    }

    const frac = fracPart.slice(0, decimals).padEnd(decimals, "0");
    return decimals > 0 ? `${intPart}.${frac}` : intPart;
  }

  // для number / string можно использовать обычную математику
  const n = Number(num);
  if (!Number.isFinite(n) || n < 0) return (0).toFixed(decimals);

  const ton = n / 1e9;
  return ton.toFixed(decimals);
};

export const tonToNano = (amount: string | number): bigint => {
  const s0 = typeof amount === 'number' ? String(amount) : String(amount).trim();
  const s  = s0.replace(',', '.').replace(/[^\d.]/g, '');
  const n  = Number(s);
  if (!Number.isFinite(n) || n < 0.1) return 0n;

  const [i = '0', f = ''] = s.split('.');
  const frac = (f.replace(/\D/g, '') + '000000000').slice(0, 9);
  return BigInt(i) * 1_000_000_000n + BigInt(frac);
};

export const cutNumberNanoTrunc = (num: any, decimals = 2) => {
  if (num && typeof num === "object" && "value" in num) num = num.value;

  const n = Number(num);
  if (!Number.isFinite(n) || n < 0) return (0).toFixed(decimals);

  const ton = n / 1e9;
  const k = 10 ** decimals;
  const trunc = Math.floor(ton * k) / k;
  return trunc.toFixed(decimals);
};