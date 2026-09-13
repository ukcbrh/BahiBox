import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Trash2, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getSupabaseClient } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function RolesManager({ onClose, purchasedModules }: { onClose: () => void; purchasedModules: { module_name: string; module_key: string }[] }) {
  const { currentTenantId } = useAuth();
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [permissionsMap, setPermissionsMap] = useState<Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleModule, setNewRoleModule] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchRoles = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('roles_master').select('*').eq('role_scope', 'tenant').order('role_name');
    if (data) setRolesList(data);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.from('roles_master').insert({
      role_name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
      role_scope: 'tenant',
      description: newRoleDesc,
      module_key: newRoleModule || null
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Role created');
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleModule('');
    setShowCreateForm(false);
    fetchRoles();
  };

  const handleSelectRole = async (role: any) => {
    setSelectedRole(role);
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }

    const moduleKeyToUse = role.module_key || 'retail';
    const { data: modData } = await supabase.from('menu_modules').select('id').eq('module_key', moduleKeyToUse).single();
    if (!modData) { setMenuItems([]); setLoading(false); return; }

    const { data: itemsData } = await supabase.from('menu_items').select('*').eq('menu_module_id', modData.id).eq('is_active', true).order('display_order');
    setMenuItems(itemsData || []);

    const { data: permsData } = await supabase.from('role_menu_permissions').select('*').eq('role_name', role.role_name);
    const map: Record<string, any> = {};
    (permsData || []).forEach((p: any) => {
      map[p.menu_item_id] = { view: p.can_view, create: p.can_create, edit: p.can_edit, delete: p.can_delete };
    });
    setPermissionsMap(map);
    setLoading(false);
  };

  const togglePerm = (menuItemId: string, key: 'view' | 'create' | 'edit' | 'delete') => {
    setPermissionsMap(prev => ({
      ...prev,
      [menuItemId]: {
        view: prev[menuItemId]?.view || false,
        create: prev[menuItemId]?.create || false,
        edit: prev[menuItemId]?.edit || false,
        delete: prev[menuItemId]?.delete || false,
        [key]: !prev[menuItemId]?.[key]
      }
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }
    const rows = Object.entries(permissionsMap).map(([menuItemId, perms]) => ({
      role_name: selectedRole.role_name,
      menu_item_id: menuItemId,
      can_view: perms.view,
      can_create: perms.create,
      can_edit: perms.edit,
      can_delete: perms.delete
    }));
    for (const row of rows) {
      await supabase.from('role_menu_permissions').upsert(row, { onConflict: 'role_name,menu_item_id' });
    }
    setSaving(false);
    toast.success('Permissions saved');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manage Roles & Permissions</h2>
        </div>
        <Button variant="outline" onClick={onClose}>Back to Staff</Button>
      </div>

      {!selectedRole ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Roles</CardTitle>
              <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>{showCreateForm ? 'Cancel' : '+ Create New Role'}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showCreateForm && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <Input placeholder="Role name (e.g. Branch Supervisor)" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                <Input placeholder="Description" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
                <Select value={newRoleModule} onValueChange={setNewRoleModule}>
                  <SelectTrigger><SelectValue placeholder="Module (leave blank for Global role)" /></SelectTrigger>
                  <SelectContent>
                    {purchasedModules.map(m => <SelectItem key={m.module_key} value={m.module_key}>{m.module_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateRole} disabled={!newRoleName}>Create Role</Button>
              </div>
            )}
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
              <div className="space-y-2">
                {rolesList.map(r => (
                  <button key={r.role_name} onClick={() => handleSelectRole(r)} className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{r.role_name.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{r.module_key ? purchasedModules.find(m => m.module_key === r.module_key)?.module_name || r.module_key : 'Global (All Modules)'}</p>
                    </div>
                    <span className="text-xs text-primary font-semibold">Edit Permissions →</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="capitalize">{selectedRole.role_name.replace(/_/g, ' ')} — Permissions</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedRole(null)}>← Back to Roles</Button>
                <Button onClick={handleSavePermissions} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : menuItems.length === 0 ? (
              <p className="text-sm text-slate-400">No menu items found for this module.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Menu Item</th>
                    <th className="px-3 py-2 font-semibold text-center">View</th>
                    <th className="px-3 py-2 font-semibold text-center">Create</th>
                    <th className="px-3 py-2 font-semibold text-center">Edit</th>
                    <th className="px-3 py-2 font-semibold text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {menuItems.map(item => (
                    <tr key={item.id}>
                      <td className={`px-3 py-2 ${item.parent_item_id ? 'pl-8 text-slate-500' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>{item.item_label}</td>
                      {(['view', 'create', 'edit', 'delete'] as const).map(key => (
                        <td key={key} className="px-3 py-2 text-center">
                          <input type="checkbox" checked={permissionsMap[item.id]?.[key] || false} onChange={() => togglePerm(item.id, key)} className="w-4 h-4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AttendanceManager({ onClose, staffList, currentTenantId, userId }: { onClose: () => void; staffList: any[]; currentTenantId: string; userId?: string }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAttendance = async () => {
    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('tenant_id', currentTenantId)
      .eq('attendance_date', selectedDate);
    const map: Record<string, string> = {};
    (data || []).forEach((a: any) => { map[a.user_tenant_role_id] = a.status; });
    setAttendanceMap(map);
    setLoading(false);
  };

  useEffect(() => { fetchAttendance(); }, [selectedDate]);

  const markStatus = async (utrId: string, status: string) => {
    setAttendanceMap(prev => ({ ...prev, [utrId]: status }));
    setSaving(true);
    const supabase = getSupabaseClient();
    if (!supabase) { setSaving(false); return; }
    const { error } = await supabase.from('staff_attendance').upsert({
      tenant_id: currentTenantId,
      user_tenant_role_id: utrId,
      attendance_date: selectedDate,
      status,
      marked_by: userId || null
    }, { onConflict: 'user_tenant_role_id,attendance_date' });
    if (error) toast.error(error.message);
    setSaving(false);
  };

  const statusOptions = [
    { key: 'present', label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
    { key: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 border-red-300' },
    { key: 'half_day', label: 'Half Day', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    { key: 'leave', label: 'Leave', color: 'bg-blue-100 text-blue-700 border-blue-300' }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Attendance</h2>
        </div>
        <Button variant="outline" onClick={onClose}>Back to Staff</Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-slate-400 p-6">Loading...</p>
          ) : staffList.length === 0 ? (
            <p className="text-sm text-slate-400 p-6">No staff found.</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffList.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.full_name || s.email}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{s.role_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {statusOptions.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => markStatus(s.id, opt.key)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border-2 transition-colors ${attendanceMap[s.id] === opt.key ? opt.color : 'bg-white dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function StaffRolesView() {
  const { currentTenantId, user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRolesManager, setShowRolesManager] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [purchasedModulesForRoles, setPurchasedModulesForRoles] = useState<{ module_name: string; module_key: string }[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from('merchant_subscriptions')
        .select('status, subscription_plans(module_name, module_key)')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'active');
      if (data) {
        const uniqueModules = Array.from(
          new globalThis.Map(
            data
              .filter((d: any) => d.subscription_plans)
              .map((d: any) => [d.subscription_plans.module_key, { module_name: d.subscription_plans.module_name, module_key: d.subscription_plans.module_key }])
          ).values()
        );
        setPurchasedModulesForRoles(uniqueModules as any);
      }
    };
    fetchModules();
  }, [currentTenantId]);

  // New staff form
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [purchasedModules, setPurchasedModules] = useState<{ module_name: string; module_key: string }[]>([]);
  const [newModuleKey, setNewModuleKey] = useState('');
  const [branchesForModule, setBranchesForModule] = useState<any[]>([]);
  const [newBranchId, setNewBranchId] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentTenantId]);

  useEffect(() => {
    const fetchModules = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from('merchant_subscriptions')
        .select('status, subscription_plans(module_name, module_key)')
        .eq('tenant_id', currentTenantId)
        .eq('status', 'active');
      if (data) {
        const uniqueModules = Array.from(
          new globalThis.Map(
            data
              .filter((d: any) => d.subscription_plans)
              .map((d: any) => [d.subscription_plans.module_key, { module_name: d.subscription_plans.module_name, module_key: d.subscription_plans.module_key }])
          ).values()
        );
        setPurchasedModules(uniqueModules as any);
      }
    };
    fetchModules();
  }, [currentTenantId]);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!newModuleKey) { setBranchesForModule([]); return; }
      const supabase = getSupabaseClient();
      if (!supabase || !currentTenantId) return;
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('tenant_id', currentTenantId)
        .eq('module_key', newModuleKey);
      if (data) setBranchesForModule(data);
      setNewBranchId('');
    };
    fetchBranches();
  }, [newModuleKey, currentTenantId]);

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
          branch_id: newBranchId || null,
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

  const handleResetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Password reset link sent to ${email}`);
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

  if (showRolesManager) {
    return <RolesManager onClose={() => setShowRolesManager(false)} purchasedModules={purchasedModulesForRoles} />;
  }

  if (showAttendance) {
    return <AttendanceManager onClose={() => setShowAttendance(false)} staffList={staff} currentTenantId={currentTenantId || ''} userId={user?.id} />;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6" /> Staff & Roles
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Manage who has access to your business and their permissions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAttendance(true)}>Attendance</Button>
          <Button variant="outline" onClick={() => setShowRolesManager(true)}>Manage Roles</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
         <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Add New Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStaff} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm font-medium">User Email Address</label>
              <Input 
                type="email" 
                placeholder="staff@example.com" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="w-48 space-y-2">
              <label className="text-sm font-medium">Module</label>
              <Select value={newModuleKey} onValueChange={setNewModuleKey} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {purchasedModules.map(mod => (
                    <SelectItem key={mod.module_key} value={mod.module_key}>{mod.module_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48 space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Select value={newBranchId} onValueChange={setNewBranchId} required disabled={!newModuleKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branchesForModule.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64 space-y-2">
              <label className="text-sm font-medium">Assign Role</label>
              <Select value={newRole} onValueChange={setNewRole} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(r => !r.module_key || r.module_key === newModuleKey).map(r => (
                    <SelectItem key={r.role_name} value={r.role_name}>
                      <div className="flex flex-col">
                        <span className="capitalize font-medium">{r.role_name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{r.description}</span>
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
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              No staff members found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase">
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
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{s.full_name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{s.email}</td>
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResetPassword(s.email)}
                        >
                          Reset Password
                        </Button>
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
