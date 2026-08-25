import type { Applicant } from "../types/score";

interface Props {
  value: Applicant;
  onChange: (next: Applicant) => void;
}

/**
 * Section 01 — carried with the assessment for the record. These fields are sent
 * to the backend on commit but take no part in inference, so editing them does
 * not trigger a rescore.
 */
export function IdentityFields({ value, onChange }: Props) {
  const set = <K extends keyof Applicant>(key: K, next: Applicant[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <>
      <div className="section-label">01 · Identity</div>
      <div className="identity-grid">
        <div className="field">
          <label htmlFor="applicant-name">Applicant name</label>
          <input
            id="applicant-name"
            className="input"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="applicant-location">Location</label>
          <input
            id="applicant-location"
            className="input"
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="applicant-purpose">Loan purpose</label>
          <input
            id="applicant-purpose"
            className="input"
            value={value.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="applicant-amount">Amount requested (₹)</label>
          <input
            id="applicant-amount"
            className="input"
            inputMode="numeric"
            value={value.amountRequested.toLocaleString("en-IN")}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "");
              set("amountRequested", digits ? Number(digits) : 0);
            }}
          />
        </div>
      </div>
    </>
  );
}
