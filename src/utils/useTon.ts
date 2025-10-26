export const obfuscateAddress = (address: string) => {
    const startLength = 3;
    const endLength = 5;
    const str = address.slice(0, startLength) + "..." + address.slice(-endLength);
    if (str.length <= startLength + endLength) return str;
    return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
};

export const cutNumber = (num: string, decimals = 2) => {
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
  if (isNaN(n)) return (0).toFixed(decimals);

  const ton = n / 1e9;
  return ton.toFixed(decimals); // ← гарантирует "9598.00"
};