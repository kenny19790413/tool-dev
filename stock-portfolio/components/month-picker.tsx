'use client';

interface Props {
  value: number[];
  onChange: (months: number[]) => void;
}

export function MonthPicker({ value, onChange }: Props) {
  function toggle(month: number) {
    onChange(value.includes(month) ? value.filter((m) => m !== month) : [...value, month].sort((a, b) => a - b));
  }

  return (
    <div className="grid grid-cols-6 gap-1.5">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
        <button
          key={month}
          type="button"
          onClick={() => toggle(month)}
          className={`px-2 py-1.5 rounded-md text-sm border transition-colors ${
            value.includes(month)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {month}月
        </button>
      ))}
    </div>
  );
}
