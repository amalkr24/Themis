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
      className="relative p-2.5 neo-btn text-slate-700 hover:text-black rounded-xl flex items-center justify-center"
      title="Client & Counsel Messages"
    >
      <MessageSquare size={16} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
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
      className="relative p-2.5 neo-btn text-slate-700 hover:text-black rounded-xl flex items-center justify-center"
      title="Notifications"
    >
      <Bell size={16} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-black px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
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
          <div className="flex flex-col min-h-screen bg-[#edf0f5] text-[#0f172a]">
            {/* Header Navigation with Monochrome Neomorphism */}
            <nav className="neo-header sticky top-0 z-40 px-4 md:px-8 py-3 flex justify-between items-center">
              <Link to="/" className="flex items-center gap-2.5 text-xl font-extrabold text-black tracking-tight group">
                <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shadow-[4px_4px_10px_rgba(0,0,0,0.18),-2px_-2px_6px_rgba(255,255,255,0.9)] group-hover:scale-105 transition-transform">
                  <Scale size={20} />
                </div>
                <span>Themis</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 text-slate-600 border border-black/5">
                  Legal Aid
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              {auth.isAuthenticated && auth.user?.role === 'admin' ? (
                <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-slate-600">
                  <Link to="/dashboard?tab=overview" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Dashboard
                  </Link>
                  <Link to="/dashboard?tab=users" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Users
                  </Link>
                  <Link to="/dashboard?tab=advocates" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Advocates
                  </Link>
                  <Link to="/dashboard?tab=cases" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Cases
                  </Link>
                  <Link to="/dashboard?tab=documents" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Documents
                  </Link>
                  <Link to="/dashboard?tab=reports" className="px-3 py-1.5 rounded-xl hover:text-black transition-all">
                    Reports
                  </Link>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3 text-xs font-bold text-slate-600">
                  {auth.isAuthenticated && (
                    <>
                      <Link to="/search" className="px-3 py-1.5 rounded-xl hover:text-black transition-all flex items-center gap-1.5">
                        <SearchIcon size={14} /> {auth.user?.role === 'advocate' ? 'Legal Research' : 'Search Laws'}
                      </Link>

                      {/* Citizen-Only Navigation Links */}
                      {auth.user?.role === 'citizen' && (
                        <>
                          <Link to="/assessment" className="px-3 py-1.5 rounded-xl hover:text-black transition-all flex items-center gap-1.5">
                            <HelpCircle size={14} /> Assessment
                          </Link>
                          <Link to="/advocates" className="px-3 py-1.5 rounded-xl hover:text-black transition-all flex items-center gap-1.5">
                            <Users size={14} /> Find Advocate
                          </Link>
                        </>
                      )}

                      {/* Available for Citizens & Advocates */}
                      <Link to="/documents" className="px-3 py-1.5 rounded-xl hover:text-black transition-all flex items-center gap-1.5">
                        <FileText size={14} /> Documents
                      </Link>

                      {/* Universal Workspace link */}
                      <Link to="/dashboard" className="px-3 py-1.5 rounded-xl hover:text-black transition-all flex items-center gap-1.5">
                        <LayoutDashboard size={14} /> Workspace
                      </Link>
                    </>
                  )}
                </div>
              )}

              {/* User Actions */}
              <div className="flex items-center gap-2.5 text-xs font-semibold">
                {auth.isAuthenticated ? (
                  <div className="flex items-center gap-2.5">
                    {auth.user?.role !== 'admin' && (
                      <Link
                        to="/my-documents"
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 neo-pill hover:text-black rounded-xl text-[11px] font-bold"
                      >
                        <FileText size={13} /> My Docs
                      </Link>
                    )}
                    <MessageBell />
                    <NotificationBell />
                    <Link
                      to="/profile"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 neo-pill hover:text-black rounded-xl text-[11px] font-bold"
                    >
                      <User size={13} /> {auth.user?.name?.split(' ')[0]}
                    </Link>
                    <button
                      onClick={auth.logout}
                      className="p-2 neo-btn text-slate-500 hover:text-rose-600 rounded-xl"
                      title="Log Out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link to="/login" className="px-4 py-2 neo-btn text-slate-800 font-bold rounded-xl text-xs">
                      Sign In
                    </Link>
                    <Link to="/register" className="px-4 py-2 neo-btn-black font-bold rounded-xl text-xs">
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

            {/* Footer with Neomorphic styling */}
            <footer className="py-8 mt-auto border-t border-black/5 bg-[#e9edf3]">
              <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <div className="w-5 h-5 rounded-md bg-black text-white flex items-center justify-center text-[10px]">
                    <Scale size={12} />
                  </div>
                  Themis Digital Legal Aid Platform
                </div>
                {auth.isAuthenticated && (
                  <div className="flex gap-6 font-semibold">
                    <Link to="/search" className="hover:text-black transition-colors">Legal Search</Link>
                    {auth.user?.role === 'citizen' && (
                      <Link to="/advocates" className="hover:text-black transition-colors">Find Advocate</Link>
                    )}
                  </div>
                )}
                <span>&copy; {new Date().getFullYear()} Themis. Monochrome Neomorphic Edition.</span>
              </div>
            </footer>
          </div>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
