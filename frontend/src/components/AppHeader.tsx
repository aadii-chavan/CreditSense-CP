const NAV = [
  { label: "Dashboard", href: "#" },
  { label: "Assess", href: "#", current: true },
  { label: "Records", href: "#" },
  { label: "Rule base", href: "#" },
];

interface Props {
  /** Right-hand status line, e.g. "Draft saved · 09:44". */
  savedLabel: string;
}

export function AppHeader({ savedLabel }: Props) {
  return (
    <header className="app-header">
      <div className="app-brand">
        <div className="app-mark" aria-hidden="true">
          <span />
        </div>
        <span className="app-wordmark">CreditSense</span>
        <span className="app-version">Mamdani v1.2</span>
      </div>

      <nav className="app-nav" aria-label="Primary">
        {NAV.map((item) => (
          <a
            key={item.label}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="app-meta">
        <span className="app-saved">{savedLabel}</span>
        <div className="app-user">
          <div className="app-avatar" aria-hidden="true">RV</div>
          <div className="app-user-text">
            <div className="app-user-name">R. Venkatesan</div>
            <div className="app-user-role">Credit analyst</div>
          </div>
        </div>
      </div>
    </header>
  );
}
