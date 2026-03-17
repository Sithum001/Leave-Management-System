import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Plus, Search, X, Users, Edit2, UserX, UserCheck } from 'lucide-react';
import { Avatar } from '../components/Layout';

const ROLES = ['employee', 'manager', 'admin'];
const DEPARTMENTS = ['Engineering', 'Marketing', 'Finance', 'HR', 'Operations', 'Administration', 'Sales', 'Design'];

function AddEmployeeModal({ onClose, onSuccess, users }) {
  const [form, setForm] = useState({
    employee_id: '',
    name: '',
    email: '',
    password: 'Welcome123',
    role: 'employee',
    department: 'Engineering',
    position: '',
    manager_id: null,
    join_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, manager_id: form.manager_id ? parseInt(form.manager_id) : null };
      await usersApi.create(payload);
      toast.success('Employee added successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Add New Employee</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employee ID</label>
              <input className="input" placeholder="EMP006" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} required />
            </div>
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Jane Smith" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="jane@abc.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="label">Initial Password</label>
              <input type="text" className="input" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={e => set('department', e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Position / Job Title</label>
              <input className="input" placeholder="Software Engineer" value={form.position} onChange={e => set('position', e.target.value)} required />
            </div>
            <div>
              <label className="label">Join Date</label>
              <input type="date" className="input" value={form.join_date} onChange={e => set('join_date', e.target.value)} />
            </div>
          </div>

          {managers.length > 0 && (
            <div>
              <label className="label">Reporting Manager <span className="text-slate-400 font-normal">(optional)</span></label>
              <select className="input" value={form.manager_id || ''} onChange={e => set('manager_id', e.target.value || null)}>
                <option value="">— None —</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.department})</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeModal({ employee, onClose, onSave }) {
  const [form, setForm] = useState({
    name: employee.name,
    department: employee.department,
    position: employee.position,
    role: employee.role,
    is_active: employee.is_active,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await usersApi.update(employee.id, form);
      toast.success('Employee updated!');
      onSave();
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Edit Employee</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <Avatar user={employee} />
            <div>
              <p className="font-semibold text-slate-800">{employee.name}</p>
              <p className="text-sm text-slate-400">{employee.employee_id} · {employee.email}</p>
            </div>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Department</label>
              <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Position</label>
            <input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-brand-500" />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">Active employee</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getAll();
      setEmployees(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(employees.map(e => e.department))].sort();

  const handleToggle = async (emp) => {
    try {
      await usersApi.update(emp.id, { is_active: !emp.is_active });
      toast.success(emp.is_active ? 'Employee deactivated' : 'Employee activated');
      loadEmployees();
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">{employees.length} total employee{employees.length !== 1 ? 's' : ''} registered</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, email, ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-full sm:w-48" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <div key={emp.id} className={`card p-5 hover:shadow-card-hover transition-all ${!emp.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={emp} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{emp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {user.role === 'admin' && (
                    <>
                      <button
                        onClick={() => setEditing(emp)}
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(emp)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          emp.is_active
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={emp.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {emp.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Employee ID</span>
                  <span className="font-mono font-semibold text-slate-600">{emp.employee_id}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Department</span>
                  <span className="font-medium text-slate-600">{emp.department}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Position</span>
                  <span className="font-medium text-slate-600 truncate ml-4 text-right">{emp.position}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Joined</span>
                  <span className="font-medium text-slate-600">{format(new Date(emp.join_date), 'MMM d, yyyy')}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                  emp.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                  emp.role === 'manager' ? 'bg-blue-50 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {emp.role}
                </span>
                <span className={`text-xs font-medium ${emp.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {emp.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddEmployeeModal
          users={employees}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); loadEmployees(); }}
        />
      )}
      {editing && (
        <EmployeeModal
          employee={editing}
          onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); loadEmployees(); }}
        />
      )}
    </div>
  );
}