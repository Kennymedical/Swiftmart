'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserCog, ShieldCheck, Check, AlertCircle, Search, UserCheck } from 'lucide-react';

interface ProfileItem {
  id: string;
  username: string;
  full_name: string | null;
  role: 'customer' | 'vendor' | 'admin' | 'staff';
  staff_permissions?: {
    manage_orders?: boolean;
    manage_kyc?: boolean;
    manage_posts?: boolean;
    manage_payouts?: boolean;
    manage_commissions?: boolean;
  };
}

export default function AdminStaffPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<ProfileItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, role, staff_permissions')
        .order('role', { ascending: false });

      if (error) throw error;
      setUsers((data as any[]) || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load staff accounts', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'customer' | 'vendor' | 'admin' | 'staff') => {
    setUpdatingId(userId);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setMessage({ text: 'Role updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update role', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePermissionToggle = async (userId: string, permKey: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const currentPerms = user.staff_permissions || {};
    const updatedPerms = {
      ...currentPerms,
      [permKey]: !Boolean((currentPerms as any)[permKey])
    };

    setUpdatingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ staff_permissions: updatedPerms })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, staff_permissions: updatedPerms } : u))
      );
      setMessage({ text: 'Staff permission updated', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Permission update failed', type: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#D4AF37]" /> Staff Role Management
          </h1>
          <p className="text-xs text-[#A8B0C5] mt-1">
            Assign operations staff, manage permissions, and govern console access.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]" />
          <input
            type="text"
            placeholder="Search user or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-950/60 border border-green-500/40 text-green-300'
            : 'bg-red-950/60 border border-red-500/40 text-red-300'
        }`}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-[#142850]/40 border border-[#D4AF37]/25 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#F5F7FA]">
            <thead className="bg-[#0A152B] border-b border-white/10 uppercase font-bold text-[#D4AF37] tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Staff Permissions</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#A8B0C5]">
                    Loading staff and user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#A8B0C5]">
                    No accounts match your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{u.full_name || u.username}</div>
                      <div className="text-[10px] text-[#A8B0C5]">@{u.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as any)}
                        className="bg-[#0A152B] border border-[#D4AF37]/40 text-[#D4AF37] rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
                      >
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="staff">Staff Operator</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'staff' ? (
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'manage_orders', label: 'Escrow & Orders' },
                            { key: 'manage_kyc', label: 'KYC Audit' },
                            { key: 'manage_posts', label: 'Moderation' },
                            { key: 'manage_payouts', label: 'Payout Approvals' },
                            { key: 'manage_commissions', label: 'Commission Rates' },
                          ].map(perm => {
                            const isEnabled = Boolean((u.staff_permissions as any)?.[perm.key]);
                            return (
                              <button
                                key={perm.key}
                                type="button"
                                onClick={() => handlePermissionToggle(u.id, perm.key)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition ${
                                  isEnabled
                                    ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F5C445]'
                                    : 'bg-white/5 border-white/20 text-[#8A94B0]'
                                }`}
                              >
                                {perm.label} {isEnabled ? '✓' : '✗'}
                              </button>
                            );
                          })}
                        </div>
                      ) : u.role === 'admin' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Full Administrative Access
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#8A94B0]">No console access</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {updatingId === u.id && (
                        <span className="text-[10px] text-[#D4AF37] font-semibold">Updating...</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
