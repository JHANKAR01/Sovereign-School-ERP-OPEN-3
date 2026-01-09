import Link from 'next/link';
import { Shield, FileSpreadsheet, CreditCard, Banknote, LayoutDashboard, Users, Award } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">
            Project <span className="text-indigo-600">Sovereign</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The Zero-Fee, Multi-Tenant School ERP for the Modern Era.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Link href="/super-admin" className="group p-8 bg-white rounded-3xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all text-left">
            <Shield className="w-12 h-12 text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900">Super Admin</h3>
            <p className="text-gray-500 mt-2">Manage school tenants, slugs, and global feature flags.</p>
          </Link>

          <Link href="/admin/import" className="group p-8 bg-white rounded-3xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all text-left">
            <FileSpreadsheet className="w-12 h-12 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900">AI Data Importer</h3>
            <p className="text-gray-500 mt-2">Bulk import student records using Gemini AI mapping.</p>
          </Link>

          <Link href="/finance/reconciliation" className="group p-8 bg-white rounded-3xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all text-left">
            <Banknote className="w-12 h-12 text-amber-600 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900">Reconciliation</h3>
            <p className="text-gray-500 mt-2">Verify UPI payments against bank statements.</p>
          </Link>

          <Link href="/teacher/attendance" className="group p-8 bg-white rounded-3xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all text-left">
            <Users className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900">Attendance</h3>
            <p className="text-gray-500 mt-2">Mark student attendance with geofencing.</p>
          </Link>

          <Link href="/parent/report-card" className="group p-8 bg-white rounded-3xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all text-left">
            <Award className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-xl font-bold text-gray-900">Report Card</h3>
            <p className="text-gray-500 mt-2">View and download academic performance reports.</p>
          </Link>

          <div className="p-8 bg-gray-100 rounded-3xl border border-gray-200 text-left opacity-60">
          </div>
        </div>

        <div className="pt-12 border-t border-gray-200">
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">
            Built for Sovereignty • Zero Transaction Fees • AI Powered
          </p>
        </div>
      </div>
    </div>
  );
}
