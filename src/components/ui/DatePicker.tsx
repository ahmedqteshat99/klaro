import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

const MONTHS = [
  { value: "01", label: "Januar" },
  { value: "02", label: "Februar" },
  { value: "03", label: "März" },
  { value: "04", label: "April" },
  { value: "05", label: "Mai" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Dezember" },
];

const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

export const DatePicker = ({ 
  value, 
  onChange, 
  label,
  minYear = 1940,
  maxYear = new Date().getFullYear()
}: DatePickerProps) => {
  const day = value ? String(value.getDate()).padStart(2, "0") : "";
  const month = value ? String(value.getMonth() + 1).padStart(2, "0") : "";
  const year = value ? String(value.getFullYear()) : "";

  const YEARS = Array.from({ length: maxYear - minYear + 1 }, (_, i) => 
    String(maxYear - i)
  );

  const currentMonth = month ? parseInt(month) : 1;
  const currentYear = year ? parseInt(year) : new Date().getFullYear();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => 
    String(i + 1).padStart(2, "0")
  );

  const handleDayChange = (newDay: string) => {
    const newMonth = month || "01";
    const newYear = year || String(new Date().getFullYear());
    const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, parseInt(newDay));
    onChange(date);
  };

  const handleMonthChange = (newMonth: string) => {
    const newYear = year || String(new Date().getFullYear());
    const newDaysInMonth = getDaysInMonth(parseInt(newMonth), parseInt(newYear));
    const newDay = day ? Math.min(parseInt(day), newDaysInMonth) : 1;
    const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, newDay);
    onChange(date);
  };

  const handleYearChange = (newYear: string) => {
    const newMonth = month || "01";
    const newDaysInMonth = getDaysInMonth(parseInt(newMonth), parseInt(newYear));
    const newDay = day ? Math.min(parseInt(day), newDaysInMonth) : 1;
    const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, newDay);
    onChange(date);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <Select value={day} onValueChange={handleDayChange}>
          <SelectTrigger className="w-[80px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Monat" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Jahr" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default DatePicker;
