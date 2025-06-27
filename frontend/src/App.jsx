import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PopupProvider } from './components/PopupProvider';
import AppBar from './components/AppBar';
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import PendingReviewsPage from './pages/PendingReviewsPage';
import RepositoryPage from './pages/RepositoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  const [processedDataForReview, setProcessedDataForReview] = useState(null);

  return (
    <PopupProvider>
      <Router>
        <TooltipProvider>
          <AppBar />
          <main className="pt-4 px-4 md:pt-6 md:px-6 md:pb-12">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/upload"
                element={
                  <UploadPage
                    setProcessedDataForReview={setProcessedDataForReview}
                  />
                }
              />
              <Route
                path="/review/:id"
                element={
                  <ReviewPage
                    processedData={processedDataForReview}
                    setProcessedDataForReview={setProcessedDataForReview}
                  />
                }
              />
              <Route
                path="/pending-reviews"
                element={<PendingReviewsPage />}
              />
              <Route path="/repository" element={<RepositoryPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Routes>
          </main>
        </TooltipProvider>
      </Router>
    </PopupProvider>
  );
}