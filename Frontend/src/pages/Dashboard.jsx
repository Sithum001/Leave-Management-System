import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi, leavesApi, usersApi } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, CalendarCheck, Clock, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
};

const LEAVE_TYPE_COLORS = ['#3b5bdb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card p-5 flex items-start gap-4 hover:shadow-card-hover transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  };
  return <span className={map[status] || 'badge-pending'}>{status}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.get(),
      leavesApi.getAll({ status: '' }),
      usersApi.getBalances(user.id),
    ]).then(([dash, leaves, bal]) => {
      setData(dash.data);
      setRecentLeaves((leaves.data || []).slice(0, 5));
      setBalances(bal.data || []);
    }).catch(() => {
      setRecentLeaves([]);
      setBalances([]);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = data?.stats || {};
  const monthlyTrend = (data?.monthly_trend || []).map(m => ({
    month: m.month,
    count: parseInt(m.count),
  }));

  // Pie data from leave type breakdown for employee
  const leaveTypeData = balances.map((b, i) => ({
    name: b.leave_type,
    value: b.used_days,
    color: LEAVE_TYPE_COLORS[i % LEAVE_TYPE_COLORS.length],
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {user.role !== 'employee' && (
          <StatCard icon={Users} label="Total Employees" value={stats.total_employees} color="bg-brand-500" sub="Active headcount" />
        )}
        {user.role !== 'employee' && (
          <StatCard icon={CalendarCheck} label="On Leave Today" value={stats.on_leave_today} color="bg-emerald-500" sub="Currently out" />
        )}
        <StatCard icon={Clock} label="Pending Requests" value={stats.pending_requests} color="bg-amber-500" sub="Awaiting review" />
        <StatCard icon={TrendingUp} label={user.role === 'employee' ? 'Total Approved' : 'Approved This Month'} value={stats.approved_this_month} color="bg-purple-500" sub={user.role === 'employee' ? 'All time' : 'This month'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Leave Requests — Last 6 Months</h2>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend} barSize={28}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: 12 }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="count" fill="#3b5bdb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Employee: Leave Balance Pie / Admin: Quick Info */}
        <div className="card p-5">
          {user.role === 'employee' ? (
            <>
              <h2 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Leave Used by Type</h2>
              {leaveTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={leaveTypeData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}d`} labelLine={false} fontSize={11}>
                      {leaveTypeData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No leaves taken yet</div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">On Leave by Department</h2>
              <div className="space-y-3">
                {(data?.dept_leave || []).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No one on leave today</p>
                )}
                {(data?.dept_leave || []).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{d.department}</span>
                    <span className="text-sm font-bold text-brand-600">{d.count} person{d.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leave Balances (employee only) */}
      {user.role === 'employee' && balances.length > 0 && (
        <div className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">My Leave Balances — {new Date().getFullYear()}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {balances.map((b) => (
              <div key={b.id} className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide capitalize mb-2">{b.leave_type}</p>
                <p className="text-2xl font-bold text-brand-600">{b.remaining_days}</p>
                <p className="text-[11px] text-slate-400 mt-1">of {b.total_days} days</p>
                <div className="mt-2 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: b.total_days > 0 ? `${Math.min(100, (b.used_days / b.total_days) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Recent Leave Requests</h2>
          <Link to="/leaves" className="text-sm text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentLeaves.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">No leave requests yet</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Employee</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Type</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Duration</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLeaves.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3">
                      <div className="font-medium text-slate-700">{req.user_name}</div>
                      <div className="text-xs text-slate-400">{req.department}</div>
                    </td>
                    <td className="py-3 capitalize text-slate-600">{req.leave_type}</td>
                    <td className="py-3 text-slate-600">
                      {format(new Date(req.start_date), 'MMM d')} — {format(new Date(req.end_date), 'MMM d, yyyy')}
                      <span className="text-slate-400 text-xs ml-1">({req.total_days}d)</span>
                    </td>
                    <td className="py-3"><StatusBadge status={req.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}