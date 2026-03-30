import React, { Suspense, useMemo } from "react";
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

// Lazy-load PWA components — they're non-critical
const OfflineBanner = React.lazy(() => import("@/components/pwa/OfflineBanner").then(m => ({ default: m.OfflineBanner })));
const InstallPrompt = React.lazy(() => import("@/components/pwa/InstallPrompt").then(m => ({ default: m.InstallPrompt })));

// Pages (lazy-loaded for code splitting)
const LoginPage = React.lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const Dashboard = React.lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const StaffClientProfilePage = React.lazy(() => import("@/pages/ClientProfilePage"));
const PayrollPage = React.lazy(() => import("@/pages/PayrollPage").then(m => ({ default: m.PayrollPage })));
const SchedulePage = React.lazy(() => import("@/pages/SchedulePage").then(m => ({ default: m.SchedulePage })));
const FrontDeskPage = React.lazy(() => import("@/pages/FrontDeskPage").then(m => ({ default: m.FrontDeskPage })));
const ClientsPage = React.lazy(() => import("@/pages/ClientsPage").then(m => ({ default: m.ClientsPage })));
const TimeClockPage = React.lazy(() => import("@/pages/TimeClockPage").then(m => ({ default: m.TimeClockPage })));
const POSPage = React.lazy(() => import("@/pages/POSPage").then(m => ({ default: m.POSPage })));
const ReceiptHistoryPage = React.lazy(() => import("@/pages/ReceiptHistoryPage").then(m => ({ default: m.ReceiptHistoryPage })));
const CompetitionPage = React.lazy(() => import("@/pages/CompetitionPage").then(m => ({ default: m.CompetitionPage })));
const StaffManagementPage = React.lazy(() => import("@/pages/admin/StaffManagementPage").then(m => ({ default: m.StaffManagementPage })));
const ServicesManagementPage = React.lazy(() => import("@/pages/admin/ServicesManagementPage").then(m => ({ default: m.ServicesManagementPage })));
const ProductsManagementPage = React.lazy(() => import("@/pages/admin/ProductsManagementPage").then(m => ({ default: m.ProductsManagementPage })));
const FormsManagementPage = React.lazy(() => import("@/pages/admin/FormsManagementPage").then(m => ({ default: m.FormsManagementPage })));
const ClientPhotosManagementPage = React.lazy(() => import("@/pages/admin/ClientPhotosManagementPage").then(m => ({ default: m.ClientPhotosManagementPage })));
const MembershipsManagementPage = React.lazy(() => import("@/pages/admin/MembershipsManagementPage").then(m => ({ default: m.MembershipsManagementPage })));
const GiftCardsManagementPage = React.lazy(() => import("@/pages/admin/GiftCardsManagementPage").then(m => ({ default: m.GiftCardsManagementPage })));
const WaitlistManagementPage = React.lazy(() => import("@/pages/admin/WaitlistManagementPage").then(m => ({ default: m.WaitlistManagementPage })));
const MachinesManagementPage = React.lazy(() => import("@/pages/admin/MachinesManagementPage").then(m => ({ default: m.MachinesManagementPage })));
const PackagesManagementPage = React.lazy(() => import("@/pages/admin/PackagesManagementPage").then(m => ({ default: m.PackagesManagementPage })));
const NotificationsManagementPage = React.lazy(() => import("@/pages/admin/NotificationsManagementPage"));
const MessagesManagementPage = React.lazy(() => import("@/pages/admin/MessagesManagementPage"));
const ManagerAnalyticsPage = React.lazy(() => import("@/pages/ManagerAnalyticsPage"));
const MyReportsPage = React.lazy(() => import("@/pages/MyReportsPage"));
const StaffReportsPage = React.lazy(() => import("@/pages/StaffReportsPage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const AuditLogPage = React.lazy(() => import("@/pages/AuditLogPage"));
const DealsManagementPage = React.lazy(() => import("@/pages/admin/DealsManagementPage").then(m => ({ default: m.DealsManagementPage })));
const AftercareTipsManagementPage = React.lazy(() => import("@/pages/admin/AftercareTipsManagementPage").then(m => ({ default: m.AftercareTipsManagementPage })));
const CheckoutRulesPage = React.lazy(() => import("@/pages/admin/CheckoutRulesPage"));
const InventoryManagementPage = React.lazy(() => import("@/pages/admin/InventoryManagementPage").then(m => ({ default: m.InventoryManagementPage })));

// Client Portal Pages (lazy-loaded)
const ClientAuthPage = React.lazy(() => import("@/pages/portal/ClientAuthPage").then(m => ({ default: m.ClientAuthPage })));
const ClientDashboard = React.lazy(() => import("@/pages/portal/ClientDashboard").then(m => ({ default: m.ClientDashboard })));
const ClientProfilePage = React.lazy(() => import("@/pages/portal/ClientProfilePage").then(m => ({ default: m.ClientProfilePage })));
const ClientPackagesPage = React.lazy(() => import("@/pages/portal/ClientPackagesPage").then(m => ({ default: m.ClientPackagesPage })));
const ClientPhotosPage = React.lazy(() => import("@/pages/portal/ClientPhotosPage").then(m => ({ default: m.ClientPhotosPage })));
const ClientRecommendationsPage = React.lazy(() => import("@/pages/portal/ClientRecommendationsPage").then(m => ({ default: m.ClientRecommendationsPage })));
const ClientHistoryPage = React.lazy(() => import("@/pages/portal/ClientHistoryPage").then(m => ({ default: m.ClientHistoryPage })));
const ClientBookingPage = React.lazy(() => import("@/pages/portal/ClientBookingPage").then(m => ({ default: m.ClientBookingPage })));
const ClientFormsPage = React.lazy(() => import("@/pages/portal/ClientFormsPage").then(m => ({ default: m.ClientFormsPage })));
const ClientMembershipsPage = React.lazy(() => import("@/pages/portal/ClientMembershipsPage").then(m => ({ default: m.ClientMembershipsPage })));
const ClientMessagesPage = React.lazy(() => import("@/pages/portal/ClientMessagesPage").then(m => ({ default: m.ClientMessagesPage })));
const ClientSkinAnalysisPage = React.lazy(() => import("@/pages/portal/ClientSkinAnalysisPage").then(m => ({ default: m.ClientSkinAnalysisPage })));
const ClientWaitlistPage = React.lazy(() => import("@/pages/portal/ClientWaitlistPage").then(m => ({ default: m.ClientWaitlistPage })));
const ClientRewardsStorePage = React.lazy(() => import("@/pages/portal/ClientRewardsStorePage").then(m => ({ default: m.ClientRewardsStorePage })));
const ClientGiftCardsPage = React.lazy(() => import("@/pages/portal/ClientGiftCardsPage").then(m => ({ default: m.ClientGiftCardsPage })));
const ClientReviewsPage = React.lazy(() => import("@/pages/portal/ClientReviewsPage").then(m => ({ default: m.ClientReviewsPage })));
const ClientFamilyPage = React.lazy(() => import("@/pages/portal/ClientFamilyPage").then(m => ({ default: m.ClientFamilyPage })));
const ClientDealsPage = React.lazy(() => import("@/pages/portal/ClientDealsPage").then(m => ({ default: m.ClientDealsPage })));
const ClientReferralPage = React.lazy(() => import("@/pages/portal/ClientReferralPage").then(m => ({ default: m.ClientReferralPage })));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const IntakeFormPage = React.lazy(() => import("./pages/IntakeFormPage"));
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));
const CheckInKioskPage = React.lazy(() => import("./pages/CheckInKioskPage"));
const ClientPackagesManagementPage = React.lazy(() => import("./pages/ClientPackagesManagementPage").then(m => ({ default: m.ClientPackagesManagementPage })));

// Shared loading spinner — extracted to avoid re-creation
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Protected route wrapper for staff (owner + employee)
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useUnifiedAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  if (role === 'client') return <Navigate to="/portal" replace />;
  return <AppLayout>{children}</AppLayout>;
}

// Owner-only route wrapper
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOwner, role, isLoading } = useUnifiedAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function DashboardRoute() {
  const { isFrontDesk } = useUnifiedAuth();
  if (isFrontDesk) return <Navigate to="/front-desk" replace />;
  return <Dashboard />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      {/* ========== PUBLIC FORMS ========== */}
      <Route path="/intake" element={<IntakeFormPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/kiosk" element={<CheckInKioskPage />} />
      
      {/* ========== STAFF LOGIN ========== */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* ========== HOME (All Staff) ========== */}
      <Route path="/dashboard" element={<StaffRoute><DashboardRoute /></StaffRoute>} />
      <Route path="/competition" element={<StaffRoute><CompetitionPage /></StaffRoute>} />
      
      {/* ========== SCHEDULING (All Staff) ========== */}
      <Route path="/schedule" element={<StaffRoute><SchedulePage /></StaffRoute>} />
      <Route path="/schedule/:id" element={<StaffRoute><SchedulePage /></StaffRoute>} />
      <Route path="/front-desk" element={<StaffRoute><FrontDeskPage /></StaffRoute>} />
      <Route path="/waitlist" element={<StaffRoute><WaitlistManagementPage /></StaffRoute>} />
      
      {/* ========== CLIENTS (All Staff) ========== */}
      <Route path="/clients" element={<StaffRoute><ClientsPage /></StaffRoute>} />
      <Route path="/clients/:id" element={<StaffRoute><StaffClientProfilePage /></StaffRoute>} />
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
      <Route path="/inventory" element={<OwnerRoute><InventoryManagementPage /></OwnerRoute>} />
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
      <Route path="/reports" element={<StaffRoute><StaffReportsPage /></StaffRoute>} />
      <Route path="/analytics" element={<OwnerRoute><ManagerAnalyticsPage /></OwnerRoute>} />
      
      {/* ========== SETTINGS (Owner Only) ========== */}
      <Route path="/settings" element={<OwnerRoute><SettingsPage /></OwnerRoute>} />
      <Route path="/checkout-rules" element={<OwnerRoute><CheckoutRulesPage /></OwnerRoute>} />
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
        <Route path="benefits" element={<Navigate to="/portal/memberships" replace />} />
        <Route path="payments" element={<ClientHistoryPage defaultTab="payments" />} />
        <Route path="gift-cards" element={<ClientGiftCardsPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
        <Route path="messages" element={<ClientMessagesPage />} />
        <Route path="skin-analysis" element={<ClientSkinAnalysisPage />} />
        <Route path="waitlist" element={<ClientWaitlistPage />} />
        <Route path="rewards" element={<ClientRewardsStorePage />} />
        <Route path="reviews" element={<ClientReviewsPage />} />
        <Route path="family" element={<ClientFamilyPage />} />
        <Route path="deals" element={<ClientDealsPage />} />
        <Route path="refer" element={<ClientReferralPage />} />
      </Route>
      
      {/* ========== 404 ========== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

// Stable QueryClient — survives HMR by living outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — avoids refetching on every mount
      retry: 1,
      refetchOnWindowFocus: false, // prevent unnecessary refetches in preview
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UnifiedAuthProvider>
          <ClientAuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={null}>
                <OfflineBanner />
              </Suspense>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </BrowserRouter>
            <Suspense fallback={null}>
              <InstallPrompt />
            </Suspense>
          </ClientAuthProvider>
        </UnifiedAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
