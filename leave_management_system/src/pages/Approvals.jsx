import { useState, useEffect } from 'react';
import { leavesApi } from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ClipboardList, CheckCircle, XCircle, Clock, ChevronDown, Search } from 'lucide-react';

function StatusBadge({ status }) {
  const map = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
  return <span className={map[status] || 'badge-pending capitalize'}>{status}</span>;
}

function ReviewModal({ leave, onClose, onDone }) {
  const [status, setStatus] = useState('approved');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leavesApi.review(leave.id, { status, comment });
      toast.success(`Request ${status} successfully`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Review Leave Request</h2>
          <p className="text-sm text-slate-500 mt-1">Request from {leave.user_name}</p>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><span className="text-slate-400">Employee:</span> <span className="font-medium ml-1">{leave.user_name}</span></div>
            <div><span className="text-slate-400">Type:</span> <span className="font-medium ml-1 capitalize">{leave.leave_type}</span></div>
            <div><span className="text-slate-400">From:</span> <span className="font-medium ml-1">{format(new Date(leave.start_date), 'MMM d, yyyy')}</span></div>
            <div><span className="text-slate-400">To:</span> <span className="font-medium ml-1">{format(new Date(leave.end_date), 'MMM d, yyyy')}</span></div>
            <div><span className="text-slate-400">Days:</span> <span className="font-medium ml-1">{leave.total_days}</span></div>
            <div><span className="text-slate-400">Dept:</span> <span className="font-medium ml-1">{leave.department}</span></div>
          </div>
          <div className="mt-3">
            <span className="text-slate-400 text-sm">Reason:</span>
            <p className="text-sm font-medium text-slate-700 mt-1">{leave.reason}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  status === 'approved'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                }`}
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  status === 'rejected'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 text-slate-500 hover:border-red-300'
                }`}
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>

          <div>
            <label className="label">Comment <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder={status === 'approved' ? 'e.g. Enjoy your time off!' : 'e.g. Please reschedule to next month...'}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all ${
                status === 'approved'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : `${status === 'approved' ? 'Approve' : 'Reject'} Request`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Approvals() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await leavesApi.getAll(tab !== 'all' ? { status: tab } : {});
      setLeaves(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeaves(); }, [tab]);

  const filtered = leaves.filter(l =>
    l.user_name.toLowerCase().includes(search.toLowerCase()) ||
    l.department?.toLowerCase().includes(search.toLowerCase()) ||
    l.leave_type.includes(search.toLowerCase())
  );

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  const tabs = [
    { key: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
    { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-emerald-600' },
    { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600' },
    { key: 'all', label: 'All', icon: ClipboardList, color: 'text-slate-600' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Leave Approvals</h1>
        <p className="text-slate-500 text-sm mt-1">Review and manage your team's leave applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className={`w-4 h-4 ${tab === key ? color : ''}`} />
            {label}
            {key === 'pending' && pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="input pl-9" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {tab !== 'all' ? tab : ''} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="card p-5 hover:shadow-card-hover transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Employee info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 font-bold text-sm">
                      {req.user_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{req.user_name}</p>
                    <p className="text-xs text-slate-400">{req.department}</p>
                  </div>
                </div>

                {/* Leave details */}
                <div className="flex flex-wrap gap-x-6 gap-y-1 flex-1">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Type</p>
                    <p className="text-sm font-medium text-slate-700 capitalize">{req.leave_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Duration</p>
                    <p className="text-sm font-medium text-slate-700">
                      {format(new Date(req.start_date), 'MMM d')} – {format(new Date(req.end_date), 'MMM d')}
                      <span className="text-slate-400 ml-1">({req.total_days}d)</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Submitted</p>
                    <p className="text-sm font-medium text-slate-700">{format(new Date(req.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>

                {/* Status + action */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={req.status} />
                  {req.status === 'pending' && (
                    <button
                      onClick={() => setReviewing(req)}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>

              {/* Reason row */}
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-500">
                  <span className="font-semibold">Reason:</span> {req.reason}
                </p>
                {req.review_comment && (
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold">Review note:</span> {req.review_comment}
                    {req.reviewer_name && <span className="text-slate-400"> — {req.reviewer_name}</span>}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          leave={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); loadLeaves(); }}
        />
      )}
    </div>
  );
}