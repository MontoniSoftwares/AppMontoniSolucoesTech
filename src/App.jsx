import { Route, Routes } from "react-router-dom";
import AdminPage from "./AdminPage";
import HomePage from "./HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

export default App;
