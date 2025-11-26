// client/src/components/TrendArrow.tsx
const TrendArrow = ({ delta }: { delta: number }) => {
  if (delta > 0) return <span className="text-green-600 text-xs">▲ {delta}</span>;
  if (delta < 0) return <span className="text-red-600 text-xs">▼ {delta}</span>;
  return <span className="text-slate-500 text-xs">—</span>;
};

export default TrendArrow;
