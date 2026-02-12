import { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart, X } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ChartViewProps {
  columns: string[];
  rows: Record<string, any>[];
}

function detectChartableData(columns: string[], rows: Record<string, any>[]) {
  if (rows.length < 2 || columns.length < 2 || columns.length > 5) return null;

  const labelCandidates: string[] = [];
  const numericCandidates: string[] = [];

  for (const col of columns) {
    let numericCount = 0;
    let textCount = 0;
    for (const row of rows.slice(0, 20)) {
      const val = row[col];
      if (val === null || val === undefined) continue;
      if (typeof val === "number" || (!isNaN(Number(val)) && val !== "")) {
        numericCount++;
      } else {
        textCount++;
      }
    }
    if (numericCount > textCount && numericCount > 0) {
      numericCandidates.push(col);
    } else {
      labelCandidates.push(col);
    }
  }

  if (numericCandidates.length === 0) return null;

  const labelCol = labelCandidates[0] || columns[0];
  const valueCols = numericCandidates.filter((c) => c !== labelCol);

  if (valueCols.length === 0) return null;

  return { labelCol, valueCols };
}

const CHART_COLORS = [
  "rgba(59, 130, 246, 0.7)",
  "rgba(239, 68, 68, 0.7)",
  "rgba(34, 197, 94, 0.7)",
  "rgba(168, 85, 247, 0.7)",
  "rgba(249, 115, 22, 0.7)",
];

const CHART_BORDERS = [
  "rgba(59, 130, 246, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(34, 197, 94, 1)",
  "rgba(168, 85, 247, 1)",
  "rgba(249, 115, 22, 1)",
];

export default function ChartView({ columns, rows }: ChartViewProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | null>(null);

  const chartInfo = useMemo(() => detectChartableData(columns, rows), [columns, rows]);

  if (!chartInfo) return null;

  const labels = rows.map((row) => String(row[chartInfo.labelCol] ?? ""));
  const datasets = chartInfo.valueCols.map((col, idx) => ({
    label: col,
    data: rows.map((row) => Number(row[col]) || 0),
    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
    borderColor: CHART_BORDERS[idx % CHART_BORDERS.length],
    borderWidth: 1,
  }));

  const chartData: ChartData<"bar" | "line"> = { labels, datasets };

  const options: ChartOptions<"bar" | "line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 20,
        },
      },
    },
  };

  if (!chartType) {
    return (
      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setChartType("bar")}
          data-testid="button-show-bar-chart"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Столбчатая диаграмма</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setChartType("line")}
          data-testid="button-show-line-chart"
        >
          <LineChart className="w-4 h-4" />
          <span>Линейный график</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-2 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={chartType === "bar" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setChartType("bar")}
          data-testid="button-switch-bar-chart"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Столбцы</span>
        </Button>
        <Button
          variant={chartType === "line" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setChartType("line")}
          data-testid="button-switch-line-chart"
        >
          <LineChart className="w-4 h-4" />
          <span>Линия</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setChartType(null)}
          data-testid="button-close-chart"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="h-72 w-full">
        {chartType === "bar" ? (
          <Bar data={chartData as ChartData<"bar">} options={options as ChartOptions<"bar">} />
        ) : (
          <Line data={chartData as ChartData<"line">} options={options as ChartOptions<"line">} />
        )}
      </div>
    </div>
  );
}
