"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; index: number }[];
}

export default function HandicapChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8f5e8" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} reversed />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e8f5e8" }}
          formatter={(v) => [Number(v).toFixed(1), "Handicap Index"]}
        />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#2d6b2d"
          strokeWidth={2}
          dot={{ fill: "#2d6b2d", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
