'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Save, Loader2, ChevronLeft, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ExamMarksEntry() {
  const { examId } = useParams();
  const supabase = createClient();
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, { marks: string; remarks: string }>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchData();
  }, [examId]);

  async function fetchData() {
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examData) {
      setExam(examData);
      
      // Fetch students and existing results
      const { data: studentData } = await supabase
        .from('students')
        .select('id, full_name, roll_number')
        .eq('school_id', examData.school_id)
        .order('roll_number');

      const { data: resultData } = await supabase
        .from('results')
        .select('*')
        .eq('exam_id', examId);

      const marksMap: Record<string, any> = {};
      resultData?.forEach(r => {
        marksMap[r.student_id] = { marks: r.marks_obtained.toString(), remarks: r.remarks || '' };
      });

      setStudents(studentData || []);
      setMarks(marksMap);
    }
    setLoading(false);
  }

  const handleMarkChange = (studentId: string, value: string) => {
    const numValue = parseFloat(value);
    if (value !== '' && (isNaN(numValue) || numValue > exam.max_marks || numValue < 0)) return;
    
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: value }
    }));
  };

  const handleRemarkChange = (studentId: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks: value }
    }));
  };

  const saveMarks = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    const records = Object.entries(marks)
      .filter(([_, data]) => data.marks !== '')
      .map(([studentId, data]) => ({
        school_id: exam.school_id,
        exam_id: examId as string,
        student_id: studentId,
        marks_obtained: parseFloat(data.marks),
        remarks: data.remarks
      }));

    const { error } = await supabase.from('results').upsert(records, {
      onConflict: 'student_id,exam_id'
    });

    if (error) {
      setSaveStatus('error');
      alert(error.message);
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    setIsSaving(false);
  };

  if (loading) return <div className="p-8 text-center">Loading exam details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/teacher/exams" className="p-2 hover:bg-white rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-indigo-600" />
                {exam.name}
              </h1>
              <p className="text-sm text-gray-500">Max Marks: {exam.max_marks} • Weightage: {exam.weightage}%</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {saveStatus === 'success' && (
              <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            <button
              onClick={saveMarks}
              disabled={isSaving}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Marks
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase w-16">Roll</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Student Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase w-32">Marks</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-gray-500">{student.roll_number}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{student.full_name}</td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="0.0"
                        className={cn(
                          "w-full border-2 border-gray-100 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors font-mono text-center",
                          parseFloat(marks[student.id]?.marks) > exam.max_marks && "border-red-300 bg-red-50"
                        )}
                        value={marks[student.id]?.marks || ''}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="Optional remarks..."
                      className="w-full border-2 border-gray-100 rounded-lg px-3 py-2 focus:border-indigo-500 outline-none transition-colors text-sm"
                      value={marks[student.id]?.remarks || ''}
                      onChange={(e) => handleRemarkChange(student.id, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
