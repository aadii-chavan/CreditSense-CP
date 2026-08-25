interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder = "Search applicants or IDs" }: Props) {
  return (
    <label className="search-field">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
