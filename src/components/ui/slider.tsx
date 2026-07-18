import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue'> & {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
  }
>(({ className, value, defaultValue, min = 0, max = 100, onValueChange, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(
    value?.[0] ?? defaultValue?.[0] ?? Number(min)
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value[0]);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setInternalValue(val);
    onValueChange?.([val]);
  };

  // Calculate percentage for styling the track
  const percentage = ((internalValue - Number(min)) / (Number(max) - Number(min))) * 100;

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center h-4", className)}>
      <div className="absolute w-full h-1.5 bg-muted rounded-full overflow-hidden pointer-events-none">
        <div 
          className="h-full bg-primary transition-all duration-75" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        value={internalValue}
        onChange={handleChange}
        className="w-full absolute opacity-0 cursor-pointer h-full"
        {...props}
      />
      <div 
        className="absolute w-3 h-3 bg-white border border-primary rounded-full shadow-sm pointer-events-none transition-transform"
        style={{ left: `calc(${percentage}% - 6px)` }}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }
