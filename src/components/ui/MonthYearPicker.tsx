import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface MonthYearPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  allowPresent?: boolean;
  presentLabel?: string;
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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => (currentYear - i).toString());

export const MonthYearPicker = ({ 
  value, 
  onChange, 
  label, 
  allowPresent = false,
  presentLabel = "Bis heute"
}: MonthYearPickerProps) => {
  const [isPresent, setIsPresent] = useState(allowPresent && !value);

  const month = value ? String(value.getMonth() + 1).padStart(2, "0") : "";
  const year = value ? String(value.getFullYear()) : "";

  const handleMonthChange = (newMonth: string) => {
    if (isPresent) return;
    const newYear = year || String(currentYear);
    const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, 1);
    onChange(date);
  };

  const handleYearChange = (newYear: string) => {
    if (isPresent) return;
    const newMonth = month || "01";
    const date = new Date(parseInt(newYear), parseInt(newMonth) - 1, 1);
    onChange(date);
  };

  const handlePresentChange = (checked: boolean) => {
    setIsPresent(checked);
    if (checked) {
      onChange(null);
    } else {
      onChange(new Date());
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2 items-center">
        <Select 
          value={month} 
          onValueChange={handleMonthChange}
          disabled={isPresent}
        >
          <SelectTrigger className="w-[120px]">
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
        <Select 
          value={year} 
          onValueChange={handleYearChange}
          disabled={isPresent}
        >
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
        {allowPresent && (
          <div className="flex items-center gap-2 ml-2">
            <Checkbox
              id={`present-${label}`}
              checked={isPresent}
              onCheckedChange={handlePresentChange}
            />
            <Label htmlFor={`present-${label}`} className="text-sm font-normal cursor-pointer">
              {presentLabel}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthYearPicker;
