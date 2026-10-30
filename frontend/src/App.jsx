import { Route, Routes } from "react-router-dom";

import Navbar from "./components/layout/Navbar";
import BackButton from "./components/layout/BackButton";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PlaceholderPage from "./pages/PlaceholderPage";

import StayPage from "./pages/StayPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import FoodPage from "./pages/FoodPage";
import FoodDetailPage from "./pages/FoodDetailPage";
import MarketplacePage from "./pages/MarketplacePage";
import MarketplaceDetailPage from "./pages/MarketplaceDetailPage";
import ComparePage from "./pages/ComparePage";

import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import OwnerApplicationPage from "./pages/OwnerApplicationPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import CreateListingPage from "./pages/CreateListingPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import "./App.css";
import "./showcase.css";

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <BackButton />
        <Routes>
          {/* Public discovery */}
          <Route path="/" element={<HomePage />} />
          <Route path="/stay" element={<StayPage />} />
          <Route path="/stay/:propertyId" element={<PropertyDetailPage />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/food/:foodPlaceId" element={<FoodDetailPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:itemId" element={<MarketplaceDetailPage />} />
          <Route
            path="/marketplace/sell"
            element={
              <ProtectedRoute>
                <CreateListingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/compare" element={<ComparePage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated user */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/apply"
            element={
              <ProtectedRoute>
                <OwnerApplicationPage />
              </ProtectedRoute>
            }
          />

          {/* Owner / admin */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/create"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <CreateListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <PlaceholderPage
                eyebrow="404"
                title="Page not found."
                description="The page you requested does not exist."
                showHomeButton
              />
            }
          />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">CityNest</div>
            <p>A smarter way to settle into a new city.</p>
          </div>
          <div className="footer-meta">Chhatrapati Sambhajinagar</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
