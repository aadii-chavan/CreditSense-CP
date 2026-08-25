import type { CSSProperties, ReactNode } from "react";
import type { MembershipDegree } from "../types/score";
import { MembershipBars } from "./MembershipBars";

interface Props {
  name: string;
  /** Formatted crisp value, e.g. "₹26,000". */
  displayValue: ReactNode;
  /** Unit suffix rendered small next to the value, e.g. "/mo". */
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  /** Three labels under the track: start, middle, end. */
  scale: [string, string, string];
  degrees?: MembershipDegree[];
  placeholders: string[];
  /** Extra classes on the wrapper, used for entrance animations. */
  className?: string;
  style?: CSSProperties;
}

/** One antecedent: crisp value, slider, and its fuzzification. */
export function AntecedentSlider({
  name,
  displayValue,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  scale,
  degrees,
  placeholders,
  className,
  style,
}: Props) {
  const id = `antecedent-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`;

  return (
    <div className={`antecedent${className ? ` ${className}` : ""}`} style={style}>
      <div className="antecedent-head">
        <label className="antecedent-name" htmlFor={id}>{name}</label>
        <div className="antecedent-value">
          {displayValue}
          <span className="antecedent-unit">{unit}</span>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="antecedent-scale">
        {scale.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <MembershipBars degrees={degrees} placeholders={placeholders} />
    </div>
  );
}
