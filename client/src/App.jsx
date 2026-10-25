import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CreatePage from './pages/CreatePage';
import InvestigationPage from './pages/InvestigationPage';
import AccusePage from './pages/AccusePage';
import ResultPage from './pages/ResultPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/case/:id" element={<InvestigationPage />} />
      <Route path="/case/:id/accuse" element={<AccusePage />} />
      <Route path="/case/:id/result" element={<ResultPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}