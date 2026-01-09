'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReactToPrint } from 'react-to-print';
import { Download, Printer, GraduationCap, Award, TrendingUp, FileText } from 'lucide-react';
import { calculateGrade, calculateWeightedAverage } from '@/lib/academic-utils';
import { cn } from '@/lib/utils';

export default function ParentReportCard() {
  const supabase = createClient();
  const reportRef = useRef<HTMLDivElement>(null);
  const [student, setStudent] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // In a real app, we'd find the student linked to this parent profile
    // For demo, we fetch the first student in the school
    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
    
    const { data: studentData } = await supabase
      .from('students')
      .select('*, classes(name, section)')
      .eq('school_id', profile?.school_id)
      .limit(1)
      .single();

    if (studentData) {
      setStudent(studentData);
      
      const { data: resData } = await supabase
        .from('results')
        .select('*, exams(*)')
        .eq('student_id', studentData.id);
      
      setResults(resData || []);

      const { data: schData } = await supabase
        .from('schools')
        .select('*')
        .eq('id', profile?.school_id)
        .single();
      setSchool(schData);
    }
    setLoading(false);
  }

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `${student?.full_name}_Report_Card`,
  });

  if (loading) return <div className="p-8 text-center">Generating report card...</div>;
  if (!student) return <div className="p-8 text-center">No student record found.</div>;

  const weightedAvg = calculateWeightedAverage(results);
  const finalGrade = calculateGrade(weightedAvg);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Academic Performance
          </h1>
          <button
            onClick={() => handlePrint()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        {/* Report Card Preview */}
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-200" ref={reportRef}>
          {/* School Header */}
          <div className="bg-indigo-900 p-10 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <GraduationCap className="w-64 h-64 -mr-20 -mt-20" />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-2">{school?.name}</h2>
            <p className="text-indigo-200 text-sm uppercase tracking-widest font-bold">Official Academic Progress Report</p>
          </div>

          <div className="p-10">
            {/* Student Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 pb-8 border-b border-gray-100">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Student Name</p>
                <p className="font-bold text-gray-900">{student.full_name}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Admission No</p>
                <p className="font-bold text-gray-900">{student.admission_number}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Class / Section</p>
                <p className="font-bold text-gray-900">{student.classes?.name} - {student.classes?.section}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-1">Academic Year</p>
                <p className="font-bold text-gray-900">2024-25</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-600 uppercase">Weighted Avg</span>
                </div>
                <p className="text-3xl font-black text-indigo-900">{weightedAvg.toFixed(1)}%</p>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-bold text-green-600 uppercase">Final Grade</span>
                </div>
                <p className="text-3xl font-black text-green-900">{finalGrade}</p>
              </div>
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-600 uppercase">Exams Taken</span>
                </div>
                <p className="text-3xl font-black text-amber-900">{results.length}</p>
              </div>
            </div>

            {/* Detailed Marks Table */}
            <div className="mb-12">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Subject-wise Breakdown</h3>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Exam Name</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">Max Marks</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">Obtained</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">Percentage</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((res) => {
                      const percentage = (res.marks_obtained / res.exams.max_marks) * 100;
                      return (
                        <tr key={res.id}>
                          <td className="px-6 py-4 font-bold text-gray-900">{res.exams.name}</td>
                          <td className="px-6 py-4 text-center text-gray-500">{res.exams.max_marks}</td>
                          <td className="px-6 py-4 text-center font-bold text-indigo-600">{res.marks_obtained}</td>
                          <td className="px-6 py-4 text-center font-mono text-sm">{percentage.toFixed(1)}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold",
                              percentage >= 80 ? "bg-green-100 text-green-700" :
                              percentage >= 60 ? "bg-blue-100 text-blue-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {calculateGrade(percentage)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 gap-20 pt-12 mt-12 border-t border-gray-100">
              <div className="text-center">
                <div className="h-px bg-gray-200 mb-4"></div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="h-px bg-gray-200 mb-4"></div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Principal Signature</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
              Generated by Sovereign ERP • Secure Digital Record
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
