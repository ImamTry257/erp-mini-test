const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function DateText({ date }: { date: string | Date }) {
  return <span>{formatter.format(new Date(date))}</span>;
}
