import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && supabase) {
      fetchNotifications();
      
      const sub = supabase
        .channel('public:notification_queue')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notification_queue',
            filter: `recipient_id=eq.${user.id}`
          }, 
          (payload: any) => {
             if (payload.new.channel === 'in_app') {
               setNotifications(prev => [payload.new, ...prev].slice(0, 20));
               setUnreadCount(prev => prev + 1);
             }
          }
        ).subscribe();

      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [user, supabase]);

  const fetchNotifications = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(20);
      
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read_at).length);
    }
  };

  const markAsRead = async (id: string, refType: string, refId: string) => {
    if (!supabase) return;
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase.from('notification_queue').update({ read_at: new Date().toISOString() }).eq('id', id);

    setIsOpen(false);

    if (refType === 'delivery_assignment') {
      // Navigate to Rider's available jobs
      navigate('/merchant-dashboard/staff'); // Individual mode rider goes to /merchant-dashboard/staff which is My Profile tab
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center transform translate-x-1/4 -translate-y-1/4 border-2 border-white dark:border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden z-50">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                onClick={async () => {
                  if(!supabase || !user) return;
                  setUnreadCount(0);
                  setNotifications(prev => prev.map(n => ({...n, read_at: new Date().toISOString()})));
                  await supabase.from('notification_queue').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).eq('channel', 'in_app').is('read_at', null);
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markAsRead(n.id, n.reference_type, n.reference_id)}
                    className={`p-4 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read_at ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <p className={`text-sm ${!n.read_at ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                      {n.rendered_body}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
