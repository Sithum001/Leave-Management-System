import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { leavesApi, usersApi } from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, X, Calendar, FileText, Filter, Search } from 'lucide-react';

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'maternity', 'paternity', 'unpaid'];
const STATUS_OPTIONS = ['', 'pending', 'approved', 'rejected'];

function StatusBadge({ status }) {
  const map = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
  };
  return <span className={map[status] || 'badge-pending capitalize'}>{status}</span>;
}

function ApplyModal({ onClose, onSuccess, balances }) {
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
  const [loading, setLoading] = useState(false);

  const selectedBalance = balances.find(b => b.leave_type === form.leave_type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leavesApi.create(form);
      toast.success('Leave request submitted!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Apply for Leave</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Leave Type</label>
            <select className="input" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
              {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            {selectedBalance && (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="w-2 h-2 bg-brand-500 rounded-full" />
                {selectedBalance.remaining_days} days remaining (of {selectedBalance.total_days})
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>

          <div>
            <label className="label">Reason</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Briefly describe the reason for your leave..."
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ leave, onClose, onCancel, userRole }) {
  const [cancelling, setCancelling] = useState(false);
  const canCancel = leave.status === 'pending' && (userRole === 'employee');

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await leavesApi.cancel(leave.id);
      toast.success('Request cancelled');
      onCancel();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Leave Request Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Status</span>
            <StatusBadge status={leave.status} />
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <Row label="Employee" value={leave.user_name} />
            <Row label="Department" value={leave.department} />
            <Row label="Leave Type" value={<span className="capitalize">{leave.leave_type}</span>} />
            <Row label="From" value={format(new Date(leave.start_date), 'EEEE, MMM d, yyyy')} />
            <Row label="To" value={format(new Date(leave.end_date), 'EEEE, MMM d, yyyy')} />
            <Row label="Total Days" value={`${leave.total_days} working day${leave.total_days > 1 ? 's' : ''}`} />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-500 mb-1">Reason</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{leave.reason}</p>
          </div>

          {leave.review_comment && (
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">
                Review Comment {leave.reviewer_name && `(by ${leave.reviewer_name})`}
              </p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{leave.review_comment}</p>
            </div>
          )}

          <p className="text-xs text-slate-400">Submitted {format(new Date(leave.created_at), 'MMM d, yyyy HH:mm')}</p>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            {canCancel && (
              <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1 flex items-center justify-center gap-2">
                {cancelling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Cancel Request'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

export default function Leaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balRes] = await Promise.all([
        leavesApi.getAll(statusFilter ? { status: statusFilter } : {}),
        user.role === 'employee' ? usersApi.getBalances(user.id) : Promise.resolve({ data: [] }),
      ]);
      setLeaves(leavesRes.data);
      setBalances(balRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const filtered = leaves.filter(l =>
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.leave_type.includes(search.toLowerCase()) ||
    l.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Requests</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user.role === 'employee' ? 'Track and manage your leave applications' : 'View all leave requests in your team'}
          </p>
        </div>
        {user.role === 'employee' && (
          <button onClick={() => setShowApply(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        )}
      </div>

      {/* Balance Strip (employee) */}
      {user.role === 'employee' && balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {balances.map(b => (
            <div key={b.id} className="card p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide capitalize">{b.leave_type}</p>
              <p className="text-xl font-bold text-brand-600 mt-1">{b.remaining_days}<span className="text-xs text-slate-400 font-normal">/{b.total_days}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, type, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select className="input pl-9 pr-8 w-full sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No leave requests found</p>
            <p className="text-sm mt-1">
              {user.role === 'employee' ? 'Apply for leave to get started.' : 'No requests match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {user.role !== 'employee' && <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Employee</th>}
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Dates</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Days</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Submitted</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                    {user.role !== 'employee' && (
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-700">{req.user_name}</div>
                        <div className="text-xs text-slate-400">{req.department}</div>
                      </td>
                    )}
                    <td className="px-5 py-3.5 capitalize text-slate-600 font-medium">{req.leave_type}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {format(new Date(req.start_date), 'MMM d')} — {format(new Date(req.end_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{req.total_days}d</td>
                    <td className="px-5 py-3.5"><StatusBadge status={req.status} /></td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">{format(new Date(req.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelected(req)}
                        className="text-xs text-brand-500 hover:text-brand-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showApply && (
        <ApplyModal
          balances={balances}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); loadData(); }}
        />
      )}
      {selected && (
        <DetailModal
          leave={selected}
          userRole={user.role}
          onClose={() => setSelected(null)}
          onCancel={() => { setSelected(null); loadData(); }}
        />
      )}
    </div>
  );
}