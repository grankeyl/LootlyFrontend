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
  const n = parseFloat(num);
  if (isNaN(n) || n < 0) return (0).toFixed(decimals);

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