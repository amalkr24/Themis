import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc.js';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Calendar,
  FolderOpen,
  UserPlus,
  Check,
  ArrowRight,
  Clock,
  Sparkles,
  Inbox,
} from 'lucide-react';

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notificationsList, refetch, isLoading } = trpc.notifications.list.useQuery();
  const markReadMutation = trpc.notifications.markRead.useMutation();
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation();

  const handleMarkRead = async (id: string, relatedId?: string | null, type?: string) => {
    try {
      await markReadMutation.mutateAsync({ id });
      refetch();
      
      // Navigate if relatedId is present
      if (relatedId) {
        if (type?.startsWith('case') || type === 'hearing_scheduled') {
          navigate(`/cases/${relatedId}`);
        } else if (type?.startsWith('connection')) {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      refetch();
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const filteredNotifications = (notificationsList || []).filter((n) => {
    if (filter === 'unread') return n.isRead === 'false';
    return true;
  });

  const unreadCount = (notificationsList || []).filter((n) => n.isRead === 'false').length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus size={18} className="text-[#111317]" />;
      case 'connection_accepted':
        return <CheckCircle2 size={18} className="text-[#111317]" />;
      case 'connection_rejected':
        return <XCircle size={18} className="text-rose-600" />;
      case 'hearing_scheduled':
        return <Calendar size={18} className="text-[#111317]" />;
      case 'case_update':
        return <FolderOpen size={18} className="text-[#111317]" />;
      default:
        return <Bell size={18} className="text-slate-600" />;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-[#111317]" /> Activity Stream
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[#111317] flex items-center gap-2.5 mt-1">
            <Bell className="text-[#111317]" size={26} />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full neo-btn-black text-xs font-bold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-600 text-xs mt-1 font-medium">
            Real-time updates regarding representation requests, court hearings, and case status changes.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 neo-btn text-slate-800 hover:text-black rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Check size={14} className="text-black" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'neo-pill-active'
              : 'neo-pill'
          }`}
        >
          All Activity ({notificationsList?.length || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'neo-pill-active'
              : 'neo-pill'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-20 neo-card animate-pulse">
          <Clock className="mx-auto text-slate-400 mb-3" size={32} />
          <p className="text-slate-600 text-sm font-semibold">Loading activity updates...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-4">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.isRead === 'false';
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id, notif.relatedId, notif.type)}
                className={`p-5 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 ${
                  isUnread
                    ? 'neo-card border-black/10'
                    : 'neo-card-sm opacity-90 hover:opacity-100'
                }`}
              >
                {/* Icon avatar */}
                <div className="w-10 h-10 rounded-xl neo-inset-sm flex items-center justify-center flex-shrink-0">
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[#111317] truncate">
                      {notif.title}
                    </h3>
                    <span className="text-[11px] text-slate-500 flex-shrink-0 font-semibold">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg neo-inset-sm text-slate-700">
                      {notif.type.replace('_', ' ')}
                    </span>

                    {notif.relatedId && (
                      <span className="text-[11px] text-[#111317] font-bold flex items-center gap-1 group-hover:underline">
                        View item <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    )}

                    {isUnread && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#111317] font-bold">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                        Unread
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 neo-card">
          <Inbox className="mx-auto text-slate-400 mb-3" size={40} />
          <h3 className="text-base font-black text-[#111317] mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-slate-600 text-xs max-w-sm mx-auto mb-5 font-medium">
            {filter === 'unread'
              ? "You're all caught up! Switch to 'All Activity' to see previous alerts."
              : 'Updates about your cases, advocate representation requests, and hearing schedules will appear here.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 neo-btn-black font-bold text-xs rounded-xl transition-colors"
          >
            Go to Workspace <ArrowRight size={13} className="text-white" />
          </Link>
        </div>
      )}
    </div>
  );
}
