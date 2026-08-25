import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { AssessPage } from "./pages/AssessPage";
import { RecordsPage } from "./pages/RecordsPage";
import { RuleBasePage } from "./pages/RuleBasePage";

export function App() {
  const location = useLocation();

  // Keyed on the path so the entrance animation replays on each navigation.
  return (
    <div className="route-enter" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/assess" element={<AssessPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/rules" element={<RuleBasePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
