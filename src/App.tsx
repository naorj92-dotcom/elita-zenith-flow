import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClientPortalLayout } from "@/components/layout/ClientPortalLayout";
import { LoginPage } from "@/pages/LoginPage";
import { Dashboard } from "@/pages/Dashboard";
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
import ManagerAnalyticsPage from "@/pages/ManagerAnalyticsPage";
import MyReportsPage from "@/pages/MyReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import { ClientAuthPage } from "@/pages/portal/ClientAuthPage";
import { ClientDashboard } from "@/pages/portal/ClientDashboard";
import { ClientPackagesPage } from "@/pages/portal/ClientPackagesPage";
import { ClientPhotosPage } from "@/pages/portal/ClientPhotosPage";
import { ClientRecommendationsPage } from "@/pages/portal/ClientRecommendationsPage";
import { ClientHistoryPage } from "@/pages/portal/ClientHistoryPage";
import { ClientBookingPage } from "@/pages/portal/ClientBookingPage";
import { ClientFormsPage } from "@/pages/portal/ClientFormsPage";
import { ClientMembershipsPage } from "@/pages/portal/ClientMembershipsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Staff Portal */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Home */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/competition" element={<ProtectedRoute><CompetitionPage /></ProtectedRoute>} />
      
      {/* Scheduling */}
      <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
      <Route path="/schedule/:id" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
      <Route path="/waitlist" element={<ProtectedRoute><WaitlistManagementPage /></ProtectedRoute>} />
      
      {/* Clients */}
      <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
      <Route path="/clients/:id" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><ClientPhotosManagementPage /></ProtectedRoute>} />
      
      {/* Services */}
      <Route path="/services" element={<ProtectedRoute><ServicesManagementPage /></ProtectedRoute>} />
      <Route path="/packages" element={<ProtectedRoute><PackagesManagementPage /></ProtectedRoute>} />
      <Route path="/memberships" element={<ProtectedRoute><MembershipsManagementPage /></ProtectedRoute>} />
      <Route path="/gift-cards" element={<ProtectedRoute><GiftCardsManagementPage /></ProtectedRoute>} />
      
      {/* POS */}
      <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
      <Route path="/receipts" element={<ProtectedRoute><ReceiptHistoryPage /></ProtectedRoute>} />
      
      {/* Operations */}
      <Route path="/machines" element={<ProtectedRoute><MachinesManagementPage /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsManagementPage /></ProtectedRoute>} />
      <Route path="/forms" element={<ProtectedRoute><FormsManagementPage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsManagementPage /></ProtectedRoute>} />
      
      {/* Team */}
      <Route path="/admin/staff" element={<ProtectedRoute><StaffManagementPage /></ProtectedRoute>} />
      <Route path="/timeclock" element={<ProtectedRoute><TimeClockPage /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><PayrollPage /></ProtectedRoute>} />
      
      {/* Reports */}
      <Route path="/my-reports" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><ManagerAnalyticsPage /></ProtectedRoute>} />
      
      {/* Settings */}
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      
      {/* Client Portal */}
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
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ClientAuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ClientAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
