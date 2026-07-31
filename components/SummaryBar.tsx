import type { OverallSummary } from "@/lib/ritcms/types";

export default function SummaryBar({ overall }: { overall: OverallSummary }) {
  const good = overall.percent >= 75;
  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-center font-semibold ${
        good
          ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      Overall: {overall.present}/{overall.total} → {overall.percent.toFixed(2)}%
    </div>
  );
}
