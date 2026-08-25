import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { AssessPage } from "./pages/AssessPage";
import { RecordsPage } from "./pages/RecordsPage";
import { RuleBasePage } from "./pages/RuleBasePage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/assess" element={<AssessPage />} />
      <Route path="/records" element={<RecordsPage />} />
      <Route path="/rules" element={<RuleBasePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
