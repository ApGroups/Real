interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'orange' | 'blue' | 'green' | 'red' | 'amber' | 'teal';
  trend?: string;
}

const colorMap = {
  orange: 'bg-[#F7E5C0] text-[#8A5B12]',
  blue: 'bg-[#E8F1FF] text-[#1B3D6F]',
  green: 'bg-[#E6F4EA] text-[#0F5132]',
  red: 'bg-[#F5E2E2] text-[#8A2F2F]',
  amber: 'bg-[#F9F0DB] text-[#8C6614]',
  teal: 'bg-[#E6F6F4] text-[#0F5A53]',
};

export default function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="premium-card p-6 hover:-translate-y-0.5 transition-transform duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-3xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#0F5132] bg-[#E6F4EA] px-3 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <p className="text-3xl font-semibold text-[#0B0B0B]">{value}</p>
      <p className="text-sm text-[#5E5A53] mt-1 uppercase tracking-[0.12em]">{label}</p>
    </div>
  );
}
