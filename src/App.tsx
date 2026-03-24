import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UnifiedAuthProvider, useUnifiedAuth } from "@/contexts/UnifiedAuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientPortalLayout } from "@/components/layout/ClientPortalLayout";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Pages
import { LoginPage } from "@/pages/LoginPage";
import { Dashboard } from "@/pages/Dashboard";
import ClientProfilePage from "@/pages/ClientProfilePage";
import { PayrollPage } from "@/pages/PayrollPage";
import { SchedulePage } from "@/pages/SchedulePage";
import { ClientsPage } from "@/pages/ClientsPage";
import { TimeClockPage } from "@/pages/TimeClockPage";
import { POSPage } from "@/pages/POSPage";
import { ReceiptHistoryPage } from "@/pages/ReceiptHistoryPage";
import { CompetitionPage } from "@/pages/CompetitionPage";
import { StaffManagementPage } from "@/pages/admin/StaffManagementPage";
import { ServicesManagementPage } from "@/pages/admin/ServicesManagementPage";
import { ProductsManagementPage } from "@/pages/admin/ProductsManagementPage";
import { FormsManagementPage } from "@/pages/admin/FormsManagementPage";
import { ClientPhotosManagementPage } from "@/pages/admin/ClientPhotosManagementPage";
import { MembershipsManagementPage } from "@/pages/admin/MembershipsManagementPage";
import { GiftCardsManagementPage } from "@/pages/admin/GiftCardsManagementPage";
import { WaitlistManagementPage } from "@/pages/admin/WaitlistManagementPage";
import { MachinesManagementPage } from "@/pages/admin/MachinesManagementPage";
import { PackagesManagementPage } from "@/pages/admin/PackagesManagementPage";
import NotificationsManagementPage from "@/pages/admin/NotificationsManagementPage";
import MessagesManagementPage from "@/pages/admin/MessagesManagementPage";
import ManagerAnalyticsPage from "@/pages/ManagerAnalyticsPage";
import MyReportsPage from "@/pages/MyReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import { DealsManagementPage } from "@/pages/admin/DealsManagementPage";
import { AftercareTipsManagementPage } from "@/pages/admin/AftercareTipsManagementPage";
import CheckoutRulesPage from "@/pages/admin/CheckoutRulesPage";

// Client Portal Pages
import { ClientAuthPage } from "@/pages/portal/ClientAuthPage";
import { ClientDashboard } from "@/pages/portal/ClientDashboard";
import { ClientPackagesPage } from "@/pages/portal/ClientPackagesPage";
import { ClientPhotosPage } from "@/pages/portal/ClientPhotosPage";
import { ClientRecommendationsPage } from "@/pages/portal/ClientRecommendationsPage";
import { ClientHistoryPage } from "@/pages/portal/ClientHistoryPage";
import { ClientBookingPage } from "@/pages/portal/ClientBookingPage";
import { ClientFormsPage } from "@/pages/portal/ClientFormsPage";
import { ClientMembershipsPage } from "@/pages/portal/ClientMembershipsPage";
import { ClientMessagesPage } from "@/pages/portal/ClientMessagesPage";
import { ClientSkinAnalysisPage } from "@/pages/portal/ClientSkinAnalysisPage";
import { ClientWaitlistPage } from "@/pages/portal/ClientWaitlistPage";
import { ClientRewardsStorePage } from "@/pages/portal/ClientRewardsStorePage";
import { ClientReviewsPage } from "@/pages/portal/ClientReviewsPage";
import { ClientFamilyPage } from "@/pages/portal/ClientFamilyPage";
import NotFound from "./pages/NotFound";
import IntakeFormPage from "./pages/IntakeFormPage";
import { SetupPage } from "./pages/SetupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CheckInKioskPage from "./pages/CheckInKioskPage";
import { ClientPackagesManagementPage } from "./pages/ClientPackagesManagementPage";

const queryClient = new QueryClient();

// Protected route wrapper for staff (owner + employee)
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useUnifiedAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect clients to portal
  if (role === 'client') {
    return <Navigate to="/portal" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

// Owner-only route wrapper
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOwner, isLoading } = useUnifiedAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isOwner) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ========== PUBLIC FORMS ========== */}
      <Route path="/intake" element={<IntakeFormPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/kiosk" element={<CheckInKioskPage />} />
      
      {/* ========== STAFF LOGIN ========== */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* ========== HOME (All Staff) ========== */}
      <Route path="/dashboard" element={<StaffRoute><Dashboard /></StaffRoute>} />
      <Route path="/competition" element={<StaffRoute><CompetitionPage /></StaffRoute>} />
      
      {/* ========== SCHEDULING (All Staff) ========== */}
      <Route path="/schedule" element={<StaffRoute><SchedulePage /></StaffRoute>} />
      <Route path="/schedule/:id" element={<StaffRoute><SchedulePage /></StaffRoute>} />
      <Route path="/waitlist" element={<StaffRoute><WaitlistManagementPage /></StaffRoute>} />
      
      {/* ========== CLIENTS (All Staff) ========== */}
      <Route path="/clients" element={<StaffRoute><ClientsPage /></StaffRoute>} />
      <Route path="/clients/:id" element={<StaffRoute><ClientProfilePage /></StaffRoute>} />
      <Route path="/client-packages" element={<StaffRoute><ClientPackagesManagementPage /></StaffRoute>} />
      <Route path="/photos" element={<StaffRoute><ClientPhotosManagementPage /></StaffRoute>} />
      <Route path="/messages" element={<OwnerRoute><MessagesManagementPage /></OwnerRoute>} />
      
      {/* ========== POS (All Staff) ========== */}
      <Route path="/pos" element={<StaffRoute><POSPage /></StaffRoute>} />
      <Route path="/pos/:appointmentId" element={<StaffRoute><POSPage /></StaffRoute>} />
      <Route path="/receipts" element={<StaffRoute><ReceiptHistoryPage /></StaffRoute>} />
      
      {/* ========== SERVICES (Owner Only) ========== */}
      <Route path="/services" element={<OwnerRoute><ServicesManagementPage /></OwnerRoute>} />
      <Route path="/packages" element={<OwnerRoute><PackagesManagementPage /></OwnerRoute>} />
      <Route path="/memberships" element={<OwnerRoute><MembershipsManagementPage /></OwnerRoute>} />
      <Route path="/gift-cards" element={<OwnerRoute><GiftCardsManagementPage /></OwnerRoute>} />
      
      {/* ========== OPERATIONS (Owner Only) ========== */}
      <Route path="/machines" element={<OwnerRoute><MachinesManagementPage /></OwnerRoute>} />
      <Route path="/products" element={<OwnerRoute><ProductsManagementPage /></OwnerRoute>} />
      <Route path="/forms" element={<OwnerRoute><FormsManagementPage /></OwnerRoute>} />
      <Route path="/notifications" element={<OwnerRoute><NotificationsManagementPage /></OwnerRoute>} />
      <Route path="/deals" element={<OwnerRoute><DealsManagementPage /></OwnerRoute>} />
      <Route path="/aftercare-tips" element={<OwnerRoute><AftercareTipsManagementPage /></OwnerRoute>} />
      
      {/* ========== TEAM ========== */}
      <Route path="/staff" element={<OwnerRoute><StaffManagementPage /></OwnerRoute>} />
      <Route path="/admin/staff" element={<OwnerRoute><StaffManagementPage /></OwnerRoute>} />
      <Route path="/timeclock" element={<StaffRoute><TimeClockPage /></StaffRoute>} />
      <Route path="/payroll" element={<OwnerRoute><PayrollPage /></OwnerRoute>} />
      
      {/* ========== REPORTS ========== */}
      <Route path="/my-reports" element={<StaffRoute><MyReportsPage /></StaffRoute>} />
      <Route path="/analytics" element={<OwnerRoute><ManagerAnalyticsPage /></OwnerRoute>} />
      
      {/* ========== SETTINGS (Owner Only) ========== */}
      <Route path="/settings" element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
      <Route path="/audit-log" element={<OwnerRoute><AuditLogPage /></OwnerRoute>} />
      
      {/* ========== CLIENT PORTAL (Separate Auth) ========== */}
      <Route path="/portal/auth" element={<ClientAuthPage />} />
      <Route path="/portal" element={<ClientPortalLayout />}>
        <Route index element={<ClientDashboard />} />
        <Route path="packages" element={<ClientPackagesPage />} />
        <Route path="photos" element={<ClientPhotosPage />} />
        <Route path="recommendations" element={<ClientRecommendationsPage />} />
        <Route path="history" element={<ClientHistoryPage />} />
        <Route path="book" element={<ClientBookingPage />} />
        <Route path="forms" element={<ClientFormsPage />} />
        <Route path="memberships" element={<ClientMembershipsPage />} />
        <Route path="appointments" element={<ClientHistoryPage />} />
        <Route path="benefits" element={<ClientMembershipsPage />} />
        <Route path="payments" element={<ClientHistoryPage />} />
        <Route path="gift-cards" element={<ClientPackagesPage />} />
        <Route path="profile" element={<ClientDashboard />} />
        <Route path="messages" element={<ClientMessagesPage />} />
        <Route path="skin-analysis" element={<ClientSkinAnalysisPage />} />
        <Route path="waitlist" element={<ClientWaitlistPage />} />
        <Route path="rewards" element={<ClientRewardsStorePage />} />
        <Route path="reviews" element={<ClientReviewsPage />} />
        <Route path="family" element={<ClientFamilyPage />} />
      </Route>
      
      {/* ========== 404 ========== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = React.forwardRef<HTMLDivElement>(function App(_props, _ref) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <UnifiedAuthProvider>
            <ClientAuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ErrorBoundary>
                  <AppRoutes />
                </ErrorBoundary>
              </BrowserRouter>
            </ClientAuthProvider>
          </UnifiedAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
});

export default App;
