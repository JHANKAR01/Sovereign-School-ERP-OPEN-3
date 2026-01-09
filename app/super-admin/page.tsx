'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, School, Settings, Shield, Trash2 } from 'lucide-react';

type School = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  settings: any;
  created_at: string;
};

export default function SuperAdminDashboard() {
  const supabase = createClient();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', slug: '' });

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schools:', error);
    } else {
      setSchools(data || []);
    }
    setLoading(false);
  }

  async function handleAddSchool(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('schools')
      .insert([newSchool])
      .select();

    if (error) {
      alert(error.message);
    } else {
      setSchools([data[0], ...schools]);
      setIsAdding(false);
      setNewSchool({ name: '', slug: '' });
    }
  }

  async function toggleSchoolStatus(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('schools')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert(error.message);
    } else {
      setSchools(schools.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    }
  }

  async function updateFeatureFlag(schoolId: string, flag: string, value: boolean) {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;

    const updatedSettings = {
      ...(school.settings as object || {}),
      features: {
        ...((school.settings as any)?.features || {}),
        [flag]: value
      }
    };

    const { error } = await supabase
      .from('schools')
      .update({ settings: updatedSettings })
      .eq('id', schoolId);

    if (error) {
      alert(error.message);
    } else {
      setSchools(schools.map(s => s.id === schoolId ? { ...s, settings: updatedSettings } : s));
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-indigo-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage school tenants and global configurations</p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New School
          </button>
        </div>

        {isAdding && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Onboard New School</h2>
            <form onSubmit={handleAddSchool} className="flex gap-4">
              <input
                type="text"
                placeholder="School Name (e.g. Greenwood High)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newSchool.name}
                onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Slug (e.g. greenwood)"
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newSchool.slug}
                onChange={e => setNewSchool({ ...newSchool, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                required
              />
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                Create Tenant
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-gray-600 px-4 py-2 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-6">
          {schools.map((school) => (
            <div key={school.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <School className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{school.name}</h3>
                    <p className="text-sm text-gray-500">Domain: {school.slug}.sovereign.edu</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${school.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {school.is_active ? 'Active' : 'Suspended'}
                  </span>
                  <button
                    onClick={() => toggleSchoolStatus(school.id, school.is_active || false)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {school.is_active ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Feature Flags
                </h4>
                <div className="flex flex-wrap gap-6">
                  {[
                    { id: 'enable_transport', label: 'Transport Management' },
                    { id: 'enable_hostel', label: 'Hostel Module' },
                    { id: 'enable_biometric', label: 'Biometric Attendance' },
                    { id: 'enable_virtual_class', label: 'Virtual Classroom' }
                  ].map((flag) => (
                    <label key={flag.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        checked={(school.settings as any)?.features?.[flag.id] || false}
                        onChange={(e) => updateFeatureFlag(school.id, flag.id, e.target.checked)}
                      />
                      <span className="text-sm text-gray-600">{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
