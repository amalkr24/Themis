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
        return <UserPlus size={18} className="text-indigo-400" />;
      case 'connection_accepted':
        return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'connection_rejected':
        return <XCircle size={18} className="text-rose-400" />;
      case 'hearing_scheduled':
        return <Calendar size={18} className="text-amber-400" />;
      case 'case_update':
        return <FolderOpen size={18} className="text-blue-400" />;
      default:
        return <Bell size={18} className="text-slate-400" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'connection_request':
        return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
      case 'connection_accepted':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'connection_rejected':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'hearing_scheduled':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'case_update':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
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
      <div className="absolute top-0 right-1/4 w-[350px] h-[350px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} /> Activity Stream
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2.5 mt-1">
            <Bell className="text-indigo-400" size={26} />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time updates regarding representation requests, court hearings, and case status changes.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Check size={14} className="text-emerald-400" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          All Activity ({notificationsList?.length || 0})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl animate-pulse">
          <Clock className="mx-auto text-slate-600 mb-3" size={32} />
          <p className="text-slate-400 text-sm">Loading activity updates...</p>
        </div>
      ) : filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.isRead === 'false';
            return (
              <div
                key={notif.id}
                onClick={() => handleMarkRead(notif.id, notif.relatedId, notif.type)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer group flex items-start gap-4 ${
                  isUnread
                    ? 'bg-slate-900/90 border-indigo-500/40 shadow-lg shadow-indigo-500/5 hover:border-indigo-500/70'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Icon avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${getBadgeStyle(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className={`text-sm font-bold truncate ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-[11px] text-slate-500 flex-shrink-0 font-medium">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getBadgeStyle(notif.type)}`}>
                      {notif.type.replace('_', ' ')}
                    </span>

                    {notif.relatedId && (
                      <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 font-semibold flex items-center gap-1">
                        View item <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    )}

                    {isUnread && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-indigo-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
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
        <div className="text-center py-20 bg-slate-900/40 border border-slate-800 rounded-3xl">
          <Inbox className="mx-auto text-slate-600 mb-3" size={40} />
          <h3 className="text-base font-bold text-white mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto mb-5">
            {filter === 'unread'
              ? "You're all caught up! Switch to 'All Activity' to see previous alerts."
              : 'Updates about your cases, advocate representation requests, and hearing schedules will appear here.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Go to Workspace <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
