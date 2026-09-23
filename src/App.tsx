import { Route, Routes } from "react-router";
import { Shell } from "@/components/Shell";
import Board from "@/pages/Board";
import Agents from "@/pages/Agents";
import Flows from "@/pages/Flows";
import Skills from "@/pages/Skills";
import Crons from "@/pages/Crons";
import Generations from "@/pages/Generations";
import Docs from "@/pages/Docs";
import Sprints from "@/pages/Sprints";
import Links from "@/pages/Links";
import Memory from "@/pages/Memory";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Board />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/crons" element={<Crons />} />
        <Route path="/generations" element={<Generations />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:slug" element={<Docs />} />
        <Route path="/sprints" element={<Sprints />} />
        <Route path="/links" element={<Links />} />
        <Route path="/memory" element={<Memory />} />
        <Route path="*" element={<Board />} />
      </Route>
    </Routes>
  );
}
