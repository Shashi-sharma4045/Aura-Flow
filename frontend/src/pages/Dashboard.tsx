// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { audioEngine, SoundType } from '../utils/audioEngine';
import { generateSecureId, isValidPassword, sanitizeAuthError } from '../utils/security';

export interface TaskItem {
  id: string;
  title: string;
  project: string;
  logged: string;
  total: string;
  priority: 'High' | 'Medium' | 'Done';
  completed: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'streak' | 'session' | 'audio';
}

interface DashboardProps {
  userEmail?: string;
  onSignOut?: () => void;
  onNavigateLogin?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userEmail, onSignOut, onNavigateLogin }) => {
  // Timer configuration
  const [focusDuration, setFocusDuration] = useState(25); // minutes
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Timer runtime state
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const totalTime = (mode === 'focus' ? focusDuration : mode === 'short' ? shortBreakDuration : longBreakDuration) * 60;
  const [time, setTime] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [intervalCount, setIntervalCount] = useState(3);
  const [dailySessions, setDailySessions] = useState(4);
  const [dailyGoal, setDailyGoal] = useState(8);
  const [activeTab, setActiveTab] = useState<'timer' | 'tasks' | 'analytics' | 'sounds' | 'settings'>('timer');

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // In-dashboard password management
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateDashboardPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    const pwCheck = isValidPassword(newPassword);
    if (!pwCheck.valid) {
      setPasswordStatus({ type: 'error', message: pwCheck.reason || 'Password must be at least 8 characters with letters & numbers.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setIsUpdatingPassword(false);
      if (error) {
        setPasswordStatus({ type: 'error', message: sanitizeAuthError(error) });
      } else {
        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordStatus({ type: 'error', message: sanitizeAuthError(err) });
    }
  };

  // Soundscape state
  const [currentSoundId, setCurrentSoundId] = useState<SoundType>('rain');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [volume, setVolume] = useState(65);

  const soundList: { id: SoundType; label: string; name: string; desc: string; icon: string }[] = [
    { id: 'rain', label: 'Rain', icon: 'water_drop', name: 'Atmospheric Rain', desc: '400Hz–1100Hz filtered rain with micro-droplet resonance' },
    { id: 'waves', label: 'Waves', icon: 'waves', name: 'Deep Ocean Swell', desc: '8-second sinusoidal low-frequency ocean swells' },
    { id: 'cafe', label: 'Cafe', icon: 'coffee', name: 'Nocturnal Cafe', desc: 'Warm acoustic brownian ambient drone with subtle harmony' },
    { id: 'forest', label: 'Forest', icon: 'forest', name: 'Alpine Canopy', desc: 'Canopy breeze with procedural periodic birdsong' },
    { id: 'binaural', label: '432Hz', icon: 'bolt', name: 'Binaural Alpha Beat', desc: '432Hz carrier tone with 10Hz cognitive flow beat' },
  ];

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Designing UI Components', project: 'Design System', logged: '45m', total: '50m', priority: 'High', completed: false },
    { id: '2', title: 'Design System Documentation', project: 'Architecture', logged: '0m', total: '25m', priority: 'High', completed: false },
    { id: '3', title: 'Review PR & Animation Timing', project: 'Frontend', logged: '0m', total: '25m', priority: 'Medium', completed: false },
    { id: '4', title: 'Morning Email Triage & Planning', project: 'Operations', logged: '25m', total: '25m', priority: 'Done', completed: true },
  ]);
  const [activeTaskId, setActiveTaskId] = useState<string>('1');
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Task creation form
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('Frontend');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium'>('High');

  // Velocity chart state
  const [chartTimeframe, setChartTimeframe] = useState<'this_week' | 'last_week'>('this_week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(2); // Wednesday

  const daysData = [
    { label: 'Mon', full: 'Monday', pct: 45, hours: '2h 15m', sessions: 3 },
    { label: 'Tue', full: 'Tuesday', pct: 65, hours: '3h 15m', sessions: 4 },
    { label: 'Wed', full: 'Wednesday', pct: 95, hours: '4h 30m', sessions: 6 },
    { label: 'Thu', full: 'Thursday', pct: 55, hours: '2h 45m', sessions: 3 },
    { label: 'Fri', full: 'Friday', pct: 75, hours: '3h 45m', sessions: 5 },
    { label: 'Sat', full: 'Saturday', pct: 30, hours: '1h 30m', sessions: 2 },
    { label: 'Sun', full: 'Sunday', pct: 20, hours: '1h 00m', sessions: 1 },
  ];

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 'n1', title: '7-Day Focus Streak Active', message: 'You are currently in the top 4% of consistent deep workers.', time: '12m ago', read: false, type: 'streak' },
    { id: 'n2', title: 'Interval 3 Logged', message: '25 minutes recorded on Designing UI Components.', time: '45m ago', read: false, type: 'session' },
    { id: 'n3', title: 'Binaural Audio Engine Calibrated', message: '10Hz Alpha wave state primed for cognitive concentration.', time: '1h ago', read: true, type: 'audio' },
  ]);

  const firstName = userEmail ? userEmail.split('@')[0] : 'Alex';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Volume sync
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // Countdown timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          setRunning(false);
          audioEngine.playSessionChime();
          setDailySessions(s => Math.min(dailyGoal, s + 1));
          setIntervalCount(i => (i % 4) + 1);

          setNotifications(prev => [
            {
              id: Date.now().toString(),
              title: mode === 'focus' ? 'Focus Interval Completed' : 'Break Finished',
              message: mode === 'focus' ? 'Session successfully logged. Time for a brief recovery break.' : 'Ready for your next deep focus block?',
              time: 'Just now',
              read: false,
              type: 'session',
            },
            ...prev,
          ]);

          if (autoStartBreaks) {
            const nextMode = mode === 'focus' ? 'short' : 'focus';
            setMode(nextMode);
            return (nextMode === 'focus' ? focusDuration : shortBreakDuration) * 60;
          }

          return (mode === 'focus' ? focusDuration : mode === 'short' ? shortBreakDuration : longBreakDuration) * 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, mode, focusDuration, shortBreakDuration, longBreakDuration, autoStartBreaks, dailyGoal]);

  const handleStartTimer = () => {
    if (!running) {
      setRunning(true);
      if (autoPlayAudio && !isPlayingAudio) {
        audioEngine.playSound(currentSoundId);
        setIsPlayingAudio(true);
      }
    } else {
      setRunning(false);
    }
  };

  const handleResetTimer = () => {
    setRunning(false);
    setTime(totalTime);
  };

  const handleSkipInterval = () => {
    setRunning(false);
    setIntervalCount(i => (i % 4) + 1);
    setTime(totalTime);
    audioEngine.playSessionChime();
  };

  const handleModeChange = (newMode: 'focus' | 'short' | 'long') => {
    setMode(newMode);
    setRunning(false);
    const mins = newMode === 'focus' ? focusDuration : newMode === 'short' ? shortBreakDuration : longBreakDuration;
    setTime(mins * 60);
  };

  const handleSoundSelect = (id: SoundType) => {
    setCurrentSoundId(id);
    audioEngine.playSound(id);
    setIsPlayingAudio(true);
  };

  const handleToggleAudio = () => {
    const isNowPlaying = audioEngine.togglePlay(currentSoundId);
    setIsPlayingAudio(isNowPlaying);
  };

  const handleToggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: !t.completed, priority: !t.completed ? 'Done' : 'High' } : t
      )
    );
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) {
      const remaining = tasks.filter(t => t.id !== id);
      if (remaining.length > 0) setActiveTaskId(remaining[0].id);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: TaskItem = {
      // Fixed: Use high-entropy random UUID to prevent IDOR and object ID enumeration
      id: generateSecureId(),
      title: newTaskTitle.trim(),
      project: newTaskProject.trim() || 'General',
      logged: '0m',
      total: '25m',
      priority: newTaskPriority,
      completed: false,
    };
    setTasks(prev => [newTask, ...prev]);
    setActiveTaskId(newTask.id);
    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const handleSignOut = async () => {
    audioEngine.stopCurrentSound();
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out:', e);
    }
    if (onSignOut) onSignOut();
    else if (onNavigateLogin) onNavigateLogin();
  };

  const activeTask = tasks.find(t => t.id === activeTaskId) || tasks.find(t => !t.completed) || tasks[0];
  const activeSoundObj = soundList.find(s => s.id === currentSoundId) || soundList[0];

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Gauge calculations
  const r = 108;
  const circ = 2 * Math.PI * r;
  const progressRatio = (totalTime - time) / totalTime;
  const offset = circ * (1 - progressRatio);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const completedCount = tasks.filter(t => t.completed).length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  const filteredTasks = tasks.filter(t => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (taskFilter === 'active') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <>
      <style>{`
        /* Reset & Base Fonts */
        *, *::before, *::after { box-sizing: border-box; }
        .dash-root {
          display: flex;
          min-height: 100vh;
          background: #090A0F;
          color: #E2E8F0;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* Ambient Lighting Mesh */
        .ambient-mesh {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 15% 10%, rgba(244, 63, 94, 0.05) 0%, transparent 45%),
            radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.05) 0%, transparent 45%);
          pointer-events: none;
          z-index: 0;
        }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.15); border-radius: 9999px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.3); }

        /* Sidebar */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 240px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #0D1017;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          z-index: 40;
          padding: 1.25rem 0.875rem;
          overflow-y: auto;
        }

        .brand-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #F43F5E, #FB7185);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          box-shadow: 0 2px 10px rgba(244, 63, 94, 0.35);
          flex-shrink: 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          border-radius: 8px;
          color: #94A3B8;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          background: transparent;
          width: 100%;
          text-align: left;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #F8FAFC;
        }
        .nav-item.active {
          background: rgba(244, 63, 94, 0.1);
          color: #FB7185;
          font-weight: 600;
        }

        /* Topbar */
        .main {
          margin-left: 240px;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          position: relative;
          z-index: 10;
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(13, 16, 23, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.875rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* Glassmorphism Cards */
        .glass-card {
          background: #111420;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        /* Segmented Mode Control */
        .seg-bar {
          display: inline-flex;
          padding: 3px;
          border-radius: 10px;
          background: rgba(15, 18, 28, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .seg-btn {
          padding: 0.375rem 0.875rem;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #94A3B8;
          border: none;
          background: transparent;
        }
        .seg-btn:hover { color: #F1F5F9; }
        .seg-btn.active {
          background: rgba(244, 63, 94, 0.15);
          color: #FB7185;
          border: 1px solid rgba(244, 63, 94, 0.3);
          font-weight: 600;
        }

        /* Action Buttons */
        .btn-primary {
          background: linear-gradient(135deg, #F43F5E, #E11D48);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          box-shadow: 0 2px 14px rgba(244, 63, 94, 0.35);
          transition: all 0.15s ease;
        }
        .btn-primary:hover {
          box-shadow: 0 4px 20px rgba(244, 63, 94, 0.5);
          transform: translateY(-1px);
        }
        .btn-primary:active { transform: translateY(0); }

        .btn-icon {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #94A3B8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #F8FAFC;
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Waveform Animation */
        @keyframes wavePulse {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
        .wave-bar {
          width: 3px;
          border-radius: 9999px;
          background: #FB7185;
          display: inline-block;
          animation: wavePulse 1.2s ease-in-out infinite;
        }

        /* Modals */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(9, 10, 15, 0.75);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
      `}</style>

      <div className="dash-root">
        <div className="ambient-mesh" />

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Workspace Brand */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div className="brand-logo">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>timer</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#F8FAFC', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    Aura Flow
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(244,63,94,0.15)', color: '#FB7185', fontWeight: 600 }}>PRO</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Deep Work Space</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {[
                { id: 'timer', icon: 'timer', label: 'Pomodoro Timer', badge: null },
                { id: 'tasks', icon: 'check_circle', label: 'Focus Tasks', badge: String(tasks.filter(t => !t.completed).length) },
                { id: 'analytics', icon: 'bar_chart', label: 'Focus Velocity', badge: null },
                { id: 'sounds', icon: 'graphic_eq', label: 'Soundscapes', badge: isPlayingAudio ? 'ON' : null },
                { id: 'settings', icon: 'tune', label: 'Preferences', badge: null },
              ].map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      if (item.id === 'settings') setIsSettingsOpen(true);
                    }}
                    className={`nav-item${isActive ? ' active' : ''}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: isActive ? '#FB7185' : '#64748B' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: 9999,
                          background: item.badge === 'ON' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          color: item.badge === 'ON' ? '#10B981' : '#94A3B8',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User profile & Sign Out */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F1F5F9', fontWeight: 600, fontSize: 12 }}>
                  {firstName[0].toUpperCase()}
                </div>
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#10B981', border: '1.5px solid #0D1017' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F8FAFC', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{firstName}</div>
                <div style={{ fontSize: 10, color: '#64748B' }}>7-Day Streak 🔥</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2, display: 'flex' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
                onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="main">
          {/* Topbar */}
          <header className="topbar">
            {/* Breadcrumb & Date */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 13, color: '#64748B', fontWeight: 500 }}>
                <span>Workspace</span>
                <span>/</span>
                <span style={{ color: '#F1F5F9', fontWeight: 600 }}>Deep Focus Session</span>
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{today} • {greeting}, {firstName}</div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '160px' }}>
              {/* Daily Goal Pill */}
              <button
                onClick={() => setIsGoalModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: 9999,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#E2E8F0',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F43F5E', display: 'inline-block' }} />
                <span>{dailySessions}/{dailyGoal} Sessions</span>
              </button>

              {/* Sound status pill */}
              <button
                onClick={handleToggleAudio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  borderRadius: 9999,
                  background: isPlayingAudio ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: isPlayingAudio ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isPlayingAudio ? '#FB7185' : '#94A3B8',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isPlayingAudio ? 'graphic_eq' : 'music_note'}</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>{activeSoundObj.label}</span>
                {isPlayingAudio && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
                    <span className="wave-bar" style={{ animationDelay: '0s' }} />
                    <span className="wave-bar" style={{ animationDelay: '0.2s' }} />
                    <span className="wave-bar" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </button>

              {/* Notifications */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    cursor: 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
                  {unreadNotifications > 0 && (
                    <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#F43F5E' }} />
                  )}
                </button>

                {isNotificationsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '115%',
                      right: 0,
                      width: 300,
                      background: '#111420',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                      padding: '0.875rem',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>Notifications</span>
                      <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 11, cursor: 'pointer' }}>Clear</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{ padding: '0.5rem', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#E2E8F0' }}>{n.title}</div>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{n.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
              </button>
            </div>
          </header>

          {/* ── WORKSPACE GRID ── */}
          <div style={{ padding: '1.75rem 2rem', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', flex: 1 }}>

            {/* LEFT COLUMN: CHRONOGRAPH TIMER & TASKS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* ── PRECISION CHRONOGRAPH ── */}
              <section className="glass-card" style={{ padding: '1.75rem 2rem', position: 'relative', overflow: 'hidden' }}>
                {/* Mode Selector */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div className="seg-bar">
                    {(['focus', 'short', 'long'] as const).map(m => (
                      <button key={m} className={`seg-btn${mode === m ? ' active' : ''}`} onClick={() => handleModeChange(m)}>
                        {m === 'focus' ? `Focus ${focusDuration}m` : m === 'short' ? `Short Break ${shortBreakDuration}m` : `Long Break ${longBreakDuration}m`}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: running ? '#10B981' : '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: running ? '#10B981' : '#64748B' }} />
                    <span>{running ? 'FLOW ACTIVE' : 'STANDBY'}</span>
                  </div>
                </div>

                {/* Circular Gauge */}
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0 1.25rem' }}>
                  <div style={{ position: 'relative', width: 250, height: 250 }}>
                    <svg width="250" height="250" viewBox="0 0 250 250" style={{ transform: 'rotate(-90deg)' }}>
                      <defs>
                        <linearGradient id="chronoSvg" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#F43F5E" />
                          <stop offset="100%" stopColor="#FB7185" />
                        </linearGradient>
                      </defs>
                      {/* Background track */}
                      <circle cx="125" cy="125" r={r} fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="6" />
                      {/* Active progress */}
                      <circle
                        cx="125"
                        cy="125"
                        r={r}
                        fill="none"
                        stroke="url(#chronoSvg)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>

                    {/* Center Display */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#FB7185', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', marginBottom: 4 }}>
                        CYCLE {intervalCount} OF 4
                      </span>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em', color: '#F8FAFC', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        {fmt(time)}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                        {[1, 2, 3, 4].map(idx => (
                          <span
                            key={idx}
                            style={{
                              width: 16,
                              height: 3,
                              borderRadius: 2,
                              background: idx <= intervalCount ? '#F43F5E' : 'rgba(255, 255, 255, 0.1)',
                              transition: 'all 0.2s',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Focus Task Banner */}
                {activeTask && (
                  <div
                    onClick={() => setActiveTab('tasks')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      maxWidth: 440,
                      margin: '0 auto 1.5rem',
                      padding: '0.5rem 0.875rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F43F5E', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTask.title}</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{activeTask.project}</span>
                  </div>
                )}

                {/* Chronograph Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <button className="btn-icon" onClick={handleResetTimer} title="Reset">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>restart_alt</span>
                  </button>
                  <button className="btn-primary" onClick={handleStartTimer}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{running ? 'pause' : 'play_arrow'}</span>
                    <span>{running ? 'Pause Flow' : 'Start Focus'}</span>
                  </button>
                  <button className="btn-icon" onClick={handleSkipInterval} title="Skip interval">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>skip_next</span>
                  </button>
                  <button className="btn-icon" onClick={handleToggleAudio} title="Toggle Audio">
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: isPlayingAudio ? '#FB7185' : 'inherit' }}>
                      {isPlayingAudio ? 'volume_up' : 'volume_off'}
                    </span>
                  </button>
                </div>
              </section>

              {/* ── LINEAR-STYLE TASK MANAGER ── */}
              <section className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Focus Tasks</h2>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{completedCount} of {tasks.length} completed</span>
                  </div>

                  {/* Filter segmented buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="seg-bar">
                      {(['all', 'active', 'completed'] as const).map(f => (
                        <button key={f} className={`seg-btn${taskFilter === f ? ' active' : ''}`} onClick={() => setTaskFilter(f)}>
                          {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Done'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setIsAddingTask(!isAddingTask)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F1F5F9',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isAddingTask ? 'close' : 'add'}</span>
                      <span>{isAddingTask ? 'Cancel' : 'New Task'}</span>
                    </button>
                  </div>
                </div>

                {/* Inline New Task Form */}
                {isAddingTask && (
                  <form onSubmit={handleCreateTask} style={{ marginBottom: '1rem', padding: '0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Task description (e.g., Implement GraphQL schema)"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        background: '#090A0F',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#F8FAFC',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        background: '#090A0F',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#94A3B8',
                        fontSize: 12,
                        outline: 'none',
                      }}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                    <button
                      type="submit"
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 6,
                        background: '#F43F5E',
                        color: '#FFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </form>
                )}

                {/* Task List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredTasks.map(task => {
                    const isSelected = activeTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setActiveTaskId(task.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.625rem 0.875rem',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(244, 63, 94, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={e => handleToggleTask(task.id, e)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              background: task.completed ? '#10B981' : 'transparent',
                              border: task.completed ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFF',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {task.completed && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span>}
                          </button>
                          <div>
                            <span style={{ fontSize: 13, color: task.completed ? '#64748B' : '#F1F5F9', textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 500 }}>
                              {task.title}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B', marginLeft: 8 }}>{task.project}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>
                            {task.logged}/{task.total}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: task.completed ? 'rgba(16,185,129,0.1)' : task.priority === 'High' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                              color: task.completed ? '#10B981' : task.priority === 'High' ? '#FB7185' : '#F59E0B',
                            }}
                          >
                            {task.completed ? 'Done' : task.priority}
                          </span>
                          <button
                            type="button"
                            onClick={e => handleDeleteTask(task.id, e)}
                            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2, display: 'flex' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#F43F5E')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: STATS & SOUNDSCAPE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                {/* Focus Time */}
                <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Focus Today</span>
                    <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>+32% vs avg</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#F8FAFC', fontFamily: "'JetBrains Mono', monospace" }}>2h 15m</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>/ 4h target</span>
                  </div>
                  <div style={{ width: '100%', height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: '56%', height: '100%', background: 'linear-gradient(to right, #F43F5E, #FB7185)' }} />
                  </div>
                </div>

                {/* Sessions */}
                <div className="glass-card" onClick={() => setIsGoalModalOpen(true)} style={{ padding: '0.875rem 1rem', cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Sessions</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{dailySessions} / {dailyGoal}</div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Target 4h</div>
                </div>

                {/* Streak */}
                <div className="glass-card" onClick={() => setIsGoalModalOpen(true)} style={{ padding: '0.875rem 1rem', cursor: 'pointer' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Streak</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>7 Days 🔥</div>
                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Top 4%</div>
                </div>
              </div>

              {/* Focus Velocity Chart */}
              <section className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Weekly Velocity</h3>
                    <span style={{ fontSize: 10, color: '#64748B' }}>18.5 hrs total flow</span>
                  </div>
                  <button
                    onClick={() => setChartTimeframe(chartTimeframe === 'this_week' ? 'last_week' : 'this_week')}
                    style={{ background: 'none', border: 'none', color: '#FB7185', fontSize: 10, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {chartTimeframe === 'this_week' ? 'This Week' : 'Last Week'}
                  </button>
                </div>

                {/* Bars */}
                <div style={{ height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {daysData.map((d, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDayIndex(idx)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', cursor: 'pointer' }}
                      >
                        <div
                          style={{
                            width: '100%',
                            maxWidth: 22,
                            height: `${d.pct}%`,
                            background: isSelected ? 'linear-gradient(to top, #F43F5E, #FB7185)' : 'rgba(255,255,255,0.08)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'all 0.15s ease',
                          }}
                        />
                        <span style={{ fontSize: 9, color: isSelected ? '#FB7185' : '#64748B', marginTop: 6, fontWeight: isSelected ? 700 : 500 }}>
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
                  <span>{daysData[selectedDayIndex].full}: <strong style={{ color: '#F8FAFC' }}>{daysData[selectedDayIndex].hours}</strong></span>
                  <span style={{ color: '#FB7185' }}>Peak flow day</span>
                </div>
              </section>

              {/* Soundscapes Studio */}
              <section className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#F8FAFC' }}>Soundscape Studio</h3>
                    <span style={{ fontSize: 10, color: isPlayingAudio ? '#10B981' : '#64748B' }}>
                      {isPlayingAudio ? '● Procedural Synthesizer Active' : 'Standby'}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleAudio}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: isPlayingAudio ? '#F43F5E' : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isPlayingAudio ? 'pause' : 'play_arrow'}</span>
                  </button>
                </div>

                {/* Preset Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginBottom: '0.875rem' }}>
                  {soundList.map(s => {
                    const isSelected = currentSoundId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSoundSelect(s.id)}
                        style={{
                          padding: '0.5rem 0.25rem',
                          borderRadius: 6,
                          background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255,255,255,0.02)',
                          border: isSelected ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(255,255,255,0.04)',
                          color: isSelected ? '#FB7185' : '#94A3B8',
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Volume Slider & Tibetan Bell */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#64748B' }}>
                    {isPlayingAudio ? 'volume_up' : 'volume_off'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isPlayingAudio ? volume : 0}
                    onChange={e => {
                      setVolume(Number(e.target.value));
                      if (!isPlayingAudio) {
                        audioEngine.playSound(currentSoundId);
                        setIsPlayingAudio(true);
                      }
                    }}
                    style={{ flex: 1, accentColor: '#F43F5E', height: 3, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748B', width: 24 }}>
                    {volume}%
                  </span>
                  <button
                    onClick={() => audioEngine.playSessionChime()}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      color: '#94A3B8',
                      fontSize: 10,
                      cursor: 'pointer',
                    }}
                    title="Test Bell Chime"
                  >
                    Bell 🔔
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* ── SETTINGS MODAL ── */}
        {isSettingsOpen && (
          <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
            <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>Session Preferences</span>
                <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>FOCUS DURATION</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[15, 25, 30, 45, 60].map(mins => (
                      <button
                        key={mins}
                        onClick={() => {
                          setFocusDuration(mins);
                          if (mode === 'focus' && !running) setTime(mins * 60);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          borderRadius: 6,
                          background: focusDuration === mins ? '#F43F5E' : 'rgba(255,255,255,0.04)',
                          color: focusDuration === mins ? '#FFF' : '#E2E8F0',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>SHORT BREAK</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[3, 5, 10].map(mins => (
                      <button
                        key={mins}
                        onClick={() => {
                          setShortBreakDuration(mins);
                          if (mode === 'short' && !running) setTime(mins * 60);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          borderRadius: 6,
                          background: shortBreakDuration === mins ? '#F43F5E' : 'rgba(255,255,255,0.04)',
                          color: shortBreakDuration === mins ? '#FFF' : '#E2E8F0',
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#E2E8F0', cursor: 'pointer' }}>
                    <span>Auto-play ambient audio when timer starts</span>
                    <input type="checkbox" checked={autoPlayAudio} onChange={e => setAutoPlayAudio(e.target.checked)} style={{ accentColor: '#F43F5E' }} />
                  </label>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#E2E8F0', cursor: 'pointer' }}>
                    <span>Auto-start breaks after focus completion</span>
                    <input type="checkbox" checked={autoStartBreaks} onChange={e => setAutoStartBreaks(e.target.checked)} style={{ accentColor: '#F43F5E' }} />
                  </label>
                </div>
                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>
                    ACCOUNT SECURITY & PASSWORD
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="password"
                      placeholder="New password (min 8 chars)"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="glass-input"
                      style={{ fontSize: 12, padding: '0.5rem 0.75rem' }}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="glass-input"
                      style={{ fontSize: 12, padding: '0.5rem 0.75rem' }}
                    />
                    {passwordStatus && (
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        fontSize: 11,
                        background: passwordStatus.type === 'error' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${passwordStatus.type === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        color: passwordStatus.type === 'error' ? '#FB7185' : '#10B981',
                      }}>
                        {passwordStatus.message}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={isUpdatingPassword || !newPassword}
                      onClick={handleUpdateDashboardPassword}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#F8FAFC',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: isUpdatingPassword || !newPassword ? 'not-allowed' : 'pointer',
                        opacity: isUpdatingPassword || !newPassword ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 6,
                    background: '#F43F5E',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DAILY GOAL MODAL ── */}
        {isGoalModalOpen && (
          <div className="modal-overlay" onClick={() => setIsGoalModalOpen(false)}>
            <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>Daily Session Flow</span>
                <button onClick={() => setIsGoalModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 42, fontWeight: 700, color: '#F8FAFC' }}>
                {dailySessions} <span style={{ fontSize: 20, color: '#64748B' }}>/ {dailyGoal}</span>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 16px' }}>Sessions completed today</p>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: '1.5rem' }}>
                {Array.from({ length: dailyGoal }).map((_, idx) => (
                  <span
                    key={idx}
                    style={{
                      width: 18,
                      height: 6,
                      borderRadius: 3,
                      background: idx < dailySessions ? '#F43F5E' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDailySessions(s => Math.min(dailyGoal, s + 1))}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 6, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  + Log Session
                </button>
                <button
                  onClick={() => setDailySessions(0)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: 12, cursor: 'pointer' }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
