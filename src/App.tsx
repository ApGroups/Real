import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/auth/AuthPage';
import Layout from './components/Layout';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import NewRequest from './pages/customer/NewRequest';
import MyRequests from './pages/customer/MyRequests';
import BidComparison from './pages/customer/BidComparison';
import Orders from './pages/customer/Orders';

// Chef Pages
import ChefDashboard from './pages/chef/ChefDashboard';
import Marketplace from './pages/chef/Marketplace';
import SubmitBid from './pages/chef/SubmitBid';
import MyBids from './pages/chef/MyBids';
import Earnings from './pages/chef/Earnings';
import ChefProfile from './pages/chef/ChefProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ChefApprovals from './pages/admin/ChefApprovals';
import UserManagement from './pages/admin/UserManagement';
import Disputes from './pages/admin/Disputes';
import Payments from './pages/admin/Payments';

// Shared Pages
import ChatPage from './pages/shared/ChatPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import OrderDetail from './pages/shared/OrderDetail';
import ProfilePage from './pages/shared/ProfilePage';

import { FoodRequest, Order } from './lib/supabase';

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [pageData, setPageData] = useState<unknown>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-stone-500 text-sm">Loading ChefBid...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) return <AuthPage />;

  function handleNavigate(page: string, data?: unknown) {
    setActivePage(page);
    setPageData(data !== undefined ? data : null);
  }

  function renderPage() {
    const role = profile!.role;

    if (activePage === 'messages') {
      const chatData = pageData as { conversationId?: string } | null;
      return <ChatPage initialConversationId={chatData?.conversationId} />;
    }
    if (activePage === 'notifications') return <NotificationsPage onNavigate={handleNavigate} />;
    if (activePage === 'profile') {
      if (role === 'chef') return <ChefProfile onNavigate={handleNavigate} />;
      return <ProfilePage />;
    }
    if (activePage === 'order-detail' && pageData) {
      return <OrderDetail order={pageData as Order} onNavigate={handleNavigate} />;
    }

    if (role === 'customer') {
      switch (activePage) {
        case 'dashboard': return <CustomerDashboard onNavigate={handleNavigate} />;
        case 'new-request': return <NewRequest onNavigate={handleNavigate} />;
        case 'my-requests': return <MyRequests onNavigate={handleNavigate} />;
        case 'request-detail':
          return pageData ? <BidComparison request={pageData as FoodRequest} onNavigate={handleNavigate} /> : <MyRequests onNavigate={handleNavigate} />;
        case 'orders': return <Orders onNavigate={handleNavigate} />;
        default: return <CustomerDashboard onNavigate={handleNavigate} />;
      }
    }

    if (role === 'chef') {
      switch (activePage) {
        case 'dashboard': return <ChefDashboard onNavigate={handleNavigate} />;
        case 'marketplace': return <Marketplace onNavigate={handleNavigate} />;
        case 'submit-bid':
          return pageData ? <SubmitBid request={pageData as FoodRequest} onNavigate={handleNavigate} /> : <Marketplace onNavigate={handleNavigate} />;
        case 'my-bids': return <MyBids onNavigate={handleNavigate} />;
        case 'orders': return <Orders onNavigate={handleNavigate} />;
        case 'earnings': return <Earnings />;
        default: return <ChefDashboard onNavigate={handleNavigate} />;
      }
    }

    if (role === 'admin') {
      switch (activePage) {
        case 'dashboard': return <AdminDashboard onNavigate={handleNavigate} />;
        case 'users': return <UserManagement />;
        case 'chefs': return <ChefApprovals />;
        case 'orders': return <Orders onNavigate={handleNavigate} />;
        case 'disputes': return <Disputes />;
        case 'payments': return <Payments onNavigate={handleNavigate} />;
        case 'analytics': return <AdminDashboard onNavigate={handleNavigate} />;
        default: return <AdminDashboard onNavigate={handleNavigate} />;
      }
    }

    return null;
  }

  return (
    <Layout activePage={activePage} onNavigate={handleNavigate}>
      <div className={activePage === 'messages' ? 'h-full' : ''}>
        {renderPage()}
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
