const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function Currency({ amount }: { amount: number }) {
  return <span>{formatter.format(amount)}</span>;
}
