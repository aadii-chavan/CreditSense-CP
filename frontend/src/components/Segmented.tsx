interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
}

/** The design system's segmented control, as a controlled radio group. */
export function Segmented<T extends string>({ name, value, options, onChange, ariaLabel }: Props<T>) {
  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => (
        <label key={option.value} className="seg-opt">
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
