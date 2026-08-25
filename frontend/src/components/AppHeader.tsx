import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { label: "Dashboard", to: "/" },
  { label: "Assess", to: "/assess" },
  { label: "Records", to: "/records" },
  { label: "Rule base", to: "/rules" },
];

interface Props {
  /** Page-specific controls shown to the left of the user block. */
  children?: ReactNode;
}

export function AppHeader({ children }: Props) {
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
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            aria-current={undefined}
            className={({ isActive }) => (isActive ? "is-active" : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="app-meta">
        {children}
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
