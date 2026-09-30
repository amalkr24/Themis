import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './utils/trpc.js';
import { useAuth } from './hooks/useAuth.js';

// Pages
import Home from './pages/Home.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Dashboard from './pages/Dashboard.js';
import Search from './pages/Search.js';
import Assessment from './pages/Assessment.js';
import Documents from './pages/Documents.js';
import CaseDetails from './pages/CaseDetails.js';
import Advocates from './pages/Advocates.js';
import MyDocuments from './pages/MyDocuments.js';
import Profile from './pages/Profile.js';
import Notifications from './pages/Notifications.js';
import ConsultationRoom from './pages/ConsultationRoom.js';
import Messages from './pages/Messages.js';

import {
  Scale,
  LogOut,
  LayoutDashboard,
  Search as SearchIcon,
  HelpCircle,
  FileText,
  Users,
  User,
  Bell,
  UserCheck,
  FolderOpen,
  BarChart3,
  MessageSquare,
} from 'lucide-react';

function MessageBell() {
  const { data } = trpc.messages.unreadCount.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const count = data?.count || 0;

  return (
    <Link
      to="/messages"
      className="relative p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all"
      title="Client & Counsel Messages"
    >
      <MessageSquare size={15} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-slate-950 animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function NotificationBell() {
  const { data } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const count = data?.count || 0;

  return (
    <Link
      to="/notifications"
      className="relative p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all"
      title="Notifications"
    >
      <Bell size={15} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-slate-950 animate-pulse">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export default function App() {
  const auth = useAuth();

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { refetchOnWindowFocus: false, retry: false },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:4000/trpc',
          headers() {
            const token = localStorage.getItem('themis_token');
            return {
              Authorization: token ? `Bearer ${token}` : undefined,
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="flex flex-col min-h-screen">
            {/* Header Navigation */}
            <nav className="glass-nav sticky top-0 z-40 px-4 md:px-8 py-3.5 flex justify-between items-center">
              <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white tracking-wide">
                <Scale size={22} className="text-indigo-400" />
                Themis
              </Link>

              {/* Desktop Navigation Links */}
              {auth.isAuthenticated && auth.user?.role === 'admin' ? (
                <div className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-400">
                  <Link to="/dashboard?tab=overview" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  <Link to="/dashboard?tab=users" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <Users size={15} /> Users
                  </Link>
                  <Link to="/dashboard?tab=advocates" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <UserCheck size={15} /> Advocates
                  </Link>
                  <Link to="/dashboard?tab=cases" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <FolderOpen size={15} /> Cases
                  </Link>
                  <Link to="/dashboard?tab=documents" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <FileText size={15} /> Documents
                  </Link>
                  <Link to="/dashboard?tab=reports" className="hover:text-white flex items-center gap-1.5 transition-colors">
                    <BarChart3 size={15} /> Reports
                  </Link>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-400">
                  {auth.isAuthenticated && (
                    <>
                      <Link to="/search" className="hover:text-white flex items-center gap-1.5 transition-colors">
                        <SearchIcon size={15} /> {auth.user?.role === 'advocate' ? 'Legal Research' : 'Legal Search'}
                      </Link>

                      {/* Citizen-Only Navigation Links */}
                      {auth.user?.role === 'citizen' && (
                        <>
                          <Link to="/assessment" className="hover:text-white flex items-center gap-1.5 transition-colors">
                            <HelpCircle size={15} /> Assessment
                          </Link>
                          <Link to="/advocates" className="hover:text-white flex items-center gap-1.5 transition-colors">
                            <Users size={15} /> Find Advocate
                          </Link>
                        </>
                      )}

                      {/* Available for Citizens & Advocates */}
                      <Link to="/documents" className="hover:text-white flex items-center gap-1.5 transition-colors">
                        <FileText size={15} /> Documents
                      </Link>

                      {/* Universal Workspace link */}
                      <Link to="/dashboard" className="hover:text-white flex items-center gap-1.5 transition-colors">
                        <LayoutDashboard size={15} /> Workspace
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* User Actions */}
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                {auth.isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    {auth.user?.role !== 'admin' && (
                      <Link
                        to="/my-documents"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl transition-all text-[11px]"
                      >
                        <FileText size={12} /> My Docs
                      </Link>
                    )}
                    <MessageBell />
                    <NotificationBell />
                    <Link
                      to="/profile"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all text-[11px]"
                    >
                      <User size={12} /> {auth.user?.name?.split(' ')[0]}
                    </Link>
                    <button
                      onClick={auth.logout}
                      className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
                      title="Log Out"
                    >
                      <LogOut size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" className="px-4 py-2 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all">
                      Sign In
                    </Link>
                    <Link to="/register" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {/* Main Page Area */}
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home auth={auth} />} />
                <Route path="/login" element={auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={auth.login} />} />
                <Route path="/register" element={auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register onRegisterSuccess={auth.login} />} />
                <Route path="/dashboard" element={auth.isAuthenticated ? <Dashboard user={auth.user} onUpdateStatus={auth.updateAdvocateStatus} /> : <Navigate to="/login" replace />} />
                <Route path="/search" element={<Search />} />
                
                {/* Citizen-only protected routes */}
                <Route
                  path="/assessment"
                  element={
                    !auth.isAuthenticated ? (
                      <Navigate to="/login" replace />
                    ) : auth.user?.role === 'advocate' ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <Assessment />
                    )
                  }
                />
                <Route
                  path="/advocates"
                  element={
                    !auth.isAuthenticated ? (
                      <Navigate to="/login" replace />
                    ) : auth.user?.role === 'advocate' ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <Advocates />
                    )
                  }
                />

                <Route path="/documents" element={auth.isAuthenticated ? <Documents /> : <Navigate to="/login" replace />} />
                <Route path="/my-documents" element={auth.isAuthenticated ? <MyDocuments /> : <Navigate to="/login" replace />} />
                <Route path="/messages" element={auth.isAuthenticated ? <Messages /> : <Navigate to="/login" replace />} />
                <Route path="/profile" element={auth.isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
                <Route path="/notifications" element={auth.isAuthenticated ? <Notifications /> : <Navigate to="/login" replace />} />
                <Route path="/consultation/:id" element={auth.isAuthenticated ? <ConsultationRoom /> : <Navigate to="/login" replace />} />
                <Route path="/cases/:id" element={auth.isAuthenticated ? <CaseDetails /> : <Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-900/80 mt-auto">
              <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-500">
                  <Scale size={16} className="text-indigo-500" />
                  Themis Digital Legal Aid Platform
                </div>
                {auth.isAuthenticated && (
                  <div className="flex gap-6 font-medium">
                    <Link to="/search" className="hover:text-slate-400 transition-colors">Legal Search</Link>
                    {auth.user?.role === 'citizen' && (
                      <Link to="/advocates" className="hover:text-slate-400 transition-colors">Find Advocate</Link>
                    )}
                  </div>
                )}
                <span>&copy; {new Date().getFullYear()} Themis. All rights reserved.</span>
              </div>
            </footer>
          </div>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
