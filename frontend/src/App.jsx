import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LogoProvider } from './contexts/LogoContext';
import { useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy-loaded Pages
const LoginEnhanced = lazy(() => import('./pages/LoginEnhanced'));
const Register = lazy(() => import('./pages/Register'));
const WelcomeScreen = lazy(() => import('./pages/WelcomeScreen'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Partners = lazy(() => import('./pages/Partners'));
const PartnerDetail = lazy(() => import('./pages/PartnerDetail'));
const PartnerCreate = lazy(() => import('./pages/PartnerCreate'));
const PartnerEdit = lazy(() => import('./pages/PartnerEdit'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Sales = lazy(() => import('./pages/Sales'));
const SalesOrders = lazy(() => import('./pages/SalesOrders'));
const SalesOrderDetail = lazy(() => import('./pages/SalesOrderDetail'));
const SalesOrderCreate = lazy(() => import('./pages/SalesOrderCreate'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'));
const PurchaseOrders = lazy(() => import('./pages/PurchaseOrders'));
const PurchaseOrderCreate = lazy(() => import('./pages/PurchaseOrderCreate'));
const PurchaseOrderDetail = lazy(() => import('./pages/PurchaseOrderDetail'));
const PurchaseOrderView = lazy(() => import('./pages/PurchaseOrderView'));
const APInvoices = lazy(() => import('./pages/APInvoices'));
const APInvoiceDetail = lazy(() => import('./pages/APInvoiceDetail'));
const InvoiceDetailUltimate = lazy(() => import('./pages/InvoiceDetailUltimate'));
const Expenses = lazy(() => import('./pages/Expenses'));
const ExpenseDetail = lazy(() => import('./pages/ExpenseDetail'));
const ExpenseCreate = lazy(() => import('./pages/ExpenseCreate'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const WarehouseDetail = lazy(() => import('./pages/WarehouseDetail'));
const WarehouseCreate = lazy(() => import('./pages/WarehouseCreate'));
const WarehouseEdit = lazy(() => import('./pages/WarehouseEdit'));
const StockMovements = lazy(() => import('./pages/StockMovements'));
const StockMovementDetail = lazy(() => import('./pages/StockMovementDetail'));
const InventoryMovements = lazy(() => import('./pages/InventoryMovements'));
const ServiceTickets = lazy(() => import('./pages/ServiceTickets'));
const ServiceTicketDetail = lazy(() => import('./pages/ServiceTicketDetail'));
const ServiceLogs = lazy(() => import('./pages/ServiceLogs'));
const ServiceLogDetail = lazy(() => import('./pages/ServiceLogDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const ProfitLossReport = lazy(() => import('./pages/ProfitLossReport'));
const PartnerDistributionReport = lazy(() => import('./pages/PartnerDistributionReport'));
const InventoryReport = lazy(() => import('./pages/InventoryReport'));
const InventorySalesReport = lazy(() => import('./pages/InventorySalesReport'));
const BalanceSheetReport = lazy(() => import('./pages/BalanceSheetReport'));
const SystemIntegrationReport = lazy(() => import('./pages/SystemIntegrationReport'));
const CapitalMovements = lazy(() => import('./pages/CapitalMovements'));
const OwnershipSnapshots = lazy(() => import('./pages/OwnershipSnapshots'));
const ProfitDistribution = lazy(() => import('./pages/ProfitDistribution'));
const ProfitDistributionReport = lazy(() => import('./pages/ProfitDistributionReport'));
const MonthlyRetirementReport = lazy(() => import('./pages/MonthlyRetirementReport'));
const ProfitTimeComparison = lazy(() => import('./pages/ProfitTimeComparison'));
const ExceptionReports = lazy(() => import('./pages/ExceptionReports'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const RecentActivity = lazy(() => import('./pages/RecentActivity'));
const Quotations = lazy(() => import('./pages/Quotations'));
const QuotationCreate = lazy(() => import('./pages/QuotationCreate'));
const QuotationDetail = lazy(() => import('./pages/QuotationDetail'));
const Contracts = lazy(() => import('./pages/Contracts'));
const ContractCreate = lazy(() => import('./pages/ContractCreate'));
const ContractDetail = lazy(() => import('./pages/ContractDetail'));
const ElevatorContractNew = lazy(() => import('./pages/ElevatorContractNew'));
const BeneficiaryOperations = lazy(() => import('./pages/BeneficiaryOperations'));
const BeneficiaryDetail = lazy(() => import('./pages/BeneficiaryDetail'));

// Loading Fallback
const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Fallback />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Main app component
const AppContent = () => {
  const AuthenticatedApp = () => (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/partners/new" element={<PartnerCreate />} />
        <Route path="/partners/:id" element={<PartnerDetail />} />
        <Route path="/partners/:id/edit" element={<PartnerEdit />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/new" element={<CustomerDetail />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/create" element={<QuotationCreate />} />
        <Route path="/quotations/:id" element={<QuotationDetail />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/contracts/create" element={<ContractCreate />} />
        <Route path="/contracts/create/new" element={<ElevatorContractNew />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
        <Route path="/contracts/:id/edit" element={<ElevatorContractNew />} />
        <Route path="/sales-orders" element={<SalesOrders />} />
        <Route path="/sales-orders/new" element={<SalesOrderCreate />} />
        <Route path="/sales-orders/:id" element={<SalesOrderDetail />} />
        <Route path="/sales-orders/:id/edit" element={<SalesOrderDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<InvoiceDetailUltimate />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoices/:id/edit" element={<InvoiceDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductDetail />} />
        <Route path="/products/:id/edit" element={<ProductDetail />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/suppliers/:id" element={<SupplierDetail />} />
        <Route path="/purchase-orders" element={<ErrorBoundary><PurchaseOrders /></ErrorBoundary>} />
        <Route path="/purchase-orders/new" element={<ErrorBoundary><PurchaseOrderCreate /></ErrorBoundary>} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderView />} />
        <Route path="/purchase-orders/:id/view" element={<PurchaseOrderView />} />
        <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderDetail />} />
        <Route path="/ap-invoices" element={<APInvoices />} />
        <Route path="/ap-invoices/new" element={<APInvoiceDetail />} />
        <Route path="/ap-invoices/:id" element={<APInvoiceDetail />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/expenses/new" element={<ExpenseCreate />} />
        <Route path="/expenses/:id" element={<ExpenseDetail />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/warehouses/new" element={<WarehouseCreate />} />
        <Route path="/warehouses/:id" element={<WarehouseDetail />} />
        <Route path="/warehouses/:id/edit" element={<WarehouseEdit />} />
        <Route path="/stock-movements" element={<StockMovements />} />
        <Route path="/stock-movements/:id" element={<StockMovementDetail />} />
        <Route path="/inventory-movements" element={<InventoryMovements />} />
        <Route path="/inventory-log" element={<StockMovements />} />
        <Route path="/service-tickets" element={<ServiceTickets />} />
        <Route path="/service-tickets/:id" element={<ServiceTicketDetail />} />
        <Route path="/service-logs" element={<ServiceLogs />} />
        <Route path="/service-logs/:id" element={<ServiceLogDetail />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/profit-loss" element={<ProfitLossReport />} />
        <Route path="/reports/partner-distributions" element={<PartnerDistributionReport />} />
        <Route path="/reports/inventory" element={<InventoryReport />} />
        <Route path="/reports/inventory-sales" element={<InventorySalesReport />} />
        <Route path="/reports/balance-sheet" element={<BalanceSheetReport />} />
        <Route path="/reports/profit-distribution" element={<ProfitDistributionReport />} />
        <Route path="/reports/monthly-retirement" element={<MonthlyRetirementReport />} />
        <Route path="/reports/profit-time-comparison" element={<ProfitTimeComparison />} />
        <Route path="/reports/exceptions" element={<ExceptionReports />} />
        <Route path="/reports/system-integration" element={<SystemIntegrationReport />} />
        <Route path="/capital-movements" element={<CapitalMovements />} />
        <Route path="/ownership-snapshots" element={<OwnershipSnapshots />} />
        <Route path="/profit-distribution" element={<ProfitDistribution />} />
        <Route path="/beneficiary-operations" element={<BeneficiaryOperations />} />
        <Route path="/beneficiaries/:id" element={<BeneficiaryDetail />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/recent-activity" element={<RecentActivity />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/login" element={<LoginEnhanced />} />
            <Route path="/register" element={<Register />} />
            <Route path="/welcome" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <WelcomeScreen />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AuthenticatedApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LogoProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AppContent />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </LogoProvider>
    </ThemeProvider>
  );
}

export default App;
