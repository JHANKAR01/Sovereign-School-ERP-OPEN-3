'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Check, X, Loader2, Users, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Student = {
  id: string;
  full_name: string;
  roll_number: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
};

export default function TeacherAttendance() {
  const supabase = createClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'verified' | 'denied' | 'error'>('checking');
  const [schoolLocation, setSchoolLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
    checkGeofence();
  }, []);

  async function fetchInitialData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
    if (!profile?.school_id) return;

    // Fetch school settings for geofence
    const { data: school } = await supabase.from('schools').select('settings').eq('id', profile.school_id).single();
    const settings = school?.settings as any;
    if (settings?.location) {
      setSchoolLocation(settings.location);
    }

    // Fetch students
    const { data: studentData } = await supabase
      .from('students')
      .select('id, full_name, roll_number')
      .eq('school_id', profile.school_id)
      .order('roll_number');

    if (studentData) {
      setStudents(studentData.map(s => ({ ...s, status: 'present' })));
    }
    setLoading(false);
  }

  function checkGeofence() {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (schoolLocation) {
          const dist = calculateDistance(latitude, longitude, schoolLocation.lat, schoolLocation.lng);
          setDistance(dist);
          // Allow if within 500 meters
          setLocationStatus(dist < 0.5 ? 'verified' : 'denied');
        } else {
          // If no school location set, default to verified for demo
          setLocationStatus('verified');
        }
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true }
    );
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  function deg2rad(deg: number) {
    return deg * (Math.PI/180);
  }

  const toggleStatus = (id: string) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const submitAttendance = async () => {
    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

    const records = students.map(s => ({
      school_id: profile?.school_id,
      student_id: s.id,
      status: s.status,
      marked_by: user?.id,
      date: new Date().toISOString().split('T')[0]
    }));

    const { error } = await supabase.from('attendance').upsert(records);

    if (error) {
      alert(error.message);
    } else {
      alert('Attendance marked successfully!');
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="p-8 text-center">Loading class list...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-6 border-b sticky top-0 z-10">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Daily Attendance
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className={cn(
            "px-3 py-1.5 rounded-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider",
            locationStatus === 'verified' ? "bg-green-100 text-green-700" : 
            locationStatus === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
          )}>
            {locationStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
            {locationStatus === 'verified' && <ShieldCheck className="w-3 h-3" />}
            {locationStatus === 'denied' && <AlertTriangle className="w-3 h-3" />}
            {locationStatus === 'verified' ? 'On-Site' : locationStatus === 'denied' ? 'Off-Site' : 'Locating...'}
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className="max-w-md mx-auto p-4 space-y-3">
        {locationStatus === 'denied' && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl mb-4">
            <p className="text-sm text-red-800 font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Geofence Alert
            </p>
            <p className="text-xs text-red-600 mt-1">
              You are {distance?.toFixed(2)}km away from school. Attendance marking is restricted to school premises.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => toggleStatus(student.id)}
              className={cn(
                "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                student.status === 'present' 
                  ? "bg-white border-gray-100 shadow-sm" 
                  : "bg-red-50 border-red-200 shadow-inner"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                  student.status === 'present' ? "bg-indigo-50 text-indigo-600" : "bg-red-100 text-red-600"
                )}>
                  {student.roll_number || '??'}
                </div>
                <div>
                  <p className={cn("font-bold", student.status === 'absent' && "text-red-700")}>
                    {student.full_name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                    Roll Number
                  </p>
                </div>
              </div>
              
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                student.status === 'present' ? "bg-green-100 text-green-600" : "bg-red-600 text-white"
              )}>
                {student.status === 'present' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto flex gap-4">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Summary</p>
            <p className="text-sm font-bold text-gray-700">
              {students.filter(s => s.status === 'present').length} Present • {students.filter(s => s.status === 'absent').length} Absent
            </p>
          </div>
          <button
            onClick={submitAttendance}
            disabled={isSubmitting || locationStatus !== 'verified'}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Records'}
          </button>
        </div>
      </div>
    </div>
  );
}
