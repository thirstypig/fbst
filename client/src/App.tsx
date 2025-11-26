import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import Standings from "@/pages/Standings";
import CategoryStandings from "@/pages/CategoryStandings";
import SeasonStandings from "@/pages/SeasonStandings";
import Teams from "@/pages/Teams";
import Auction from "@/pages/Auction";
import Periods from "@/pages/Periods";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/standings" replace />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/standings/season" element={<SeasonStandings />} />
          <Route
            path="/standings/categories"
            element={<CategoryStandings />}
          />
          <Route path="/teams" element={<Teams />} />
          <Route path="/auction" element={<Auction />} />
          <Route path="/periods" element={<Periods />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
