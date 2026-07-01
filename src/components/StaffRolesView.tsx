import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Trash2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function StaffRolesView() {
  const { currentTenantId } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New staff form
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  const fetchData = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    setLoading(true);
    try {
      // Fetch roles
      const { data: rolesData } = await supabase.from('roles_master').select('*').eq('role_scope', 'tenant');
      if (rolesData) setRoles(rolesData);

      // Fetch staff
      const { data: staffData } = await supabase
        .from('user_tenant_roles')
        .select(`
          id,
          role_name,
          is_active,
          users ( id, email, full_name )
        `)
        .eq('tenant_id', currentTenantId);

      if (staffData) {
        setStaff(staffData.map((s: any) => ({
          id: s.id,
          role_name: s.role_name,
          is_active: s.is_active,
          user_id: s.users?.id,
          email: s.users?.email,
          full_name: s.users?.full_name
        })));
      }
    } catch (e) {
      console.warn("Failed to fetch staff/roles", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newRole) return;

    const supabase = getSupabaseClient();
    if (!supabase || !currentTenantId) return;

    setIsAdding(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', newEmail)
        .single();

      if (userError || !userData) {
        toast.error("User not found! They must sign up first.");
        setIsAdding(false);
        return;
      }

      // Add to user_tenant_roles
      const { error: insertError } = await supabase
        .from('user_tenant_roles')
        .insert({
          user_id: userData.id,
          tenant_id: currentTenantId,
          role_name: newRole,
          is_active: true
        });

      if (insertError) {
        if (insertError.code === '23505') {
          toast.error("User already has a role in this business.");
        } else {
          toast.error("Failed to add staff.");
        }
      } else {
        toast.success("Staff added successfully.");
        setNewEmail('');
        setNewRole('');
        fetchData();
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean, roleName: string) => {
    // Check safety rule: Don't disable the last owner
    if (currentStatus && roleName === 'owner') {
      const ownerCount = staff.filter(s => s.role_name === 'owner' && s.is_active).length;
      if (ownerCount <= 1) {
        toast.error("Cannot disable the last active owner.");
        return;
      }
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('user_tenant_roles')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success("Status updated.");
      fetchData();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Staff & Roles
          </h2>
          <p className="text-slate-500">Manage who has access to your business and their permissions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Add New Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStaff} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">User Email Address</label>
              <Input 
                type="email" 
                placeholder="staff@example.com" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="w-64 space-y-2">
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={newRole} onValueChange={setNewRole} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.role_name} value={r.role_name}>
                      <div className="flex flex-col">
                        <span className="capitalize font-medium">{r.role_name}</span>
                        <span className="text-xs text-slate-500">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isAdding || !newEmail || !newRole}>
              {isAdding ? 'Adding...' : 'Add Staff'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Staff Members</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
              No staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{s.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-500">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {s.role_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleStatus(s.id, s.is_active, s.role_name)}
                          className={s.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                        >
                          {s.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
