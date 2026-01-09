'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { Banknote, Check, X, Upload, Search, Loader2, AlertCircle } from 'lucide-react';

export default function ReconciliationPage() {
  const supabase = createClient();
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankStatement, setBankStatement] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  async function fetchPendingTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, invoices(student_id, students(full_name))')
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (data) setPendingTransactions(data);
    setLoading(false);
  }

  const handleStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setBankStatement(results.data);
        autoMatch(results.data);
      },
    });
  };

  const autoMatch = (statement: any[]) => {
    // Fuzzy matching logic: Match UTR or Amount + Date
    const matchedIds: string[] = [];
    pendingTransactions.forEach(tx => {
      const match = statement.find(row => 
        row.UTR?.toString().includes(tx.utr_no) || 
        (parseFloat(row.Amount) === tx.amount && row.Description?.includes(tx.utr_no))
      );
      if (match) matchedIds.push(tx.id);
    });
    
    if (matchedIds.length > 0) {
      alert(`Found ${matchedIds.length} potential matches in the statement!`);
    }
  };

  async function verifyTransaction(id: string, invoiceId: string) {
    setIsProcessing(true);
    
    // 1. Update transaction status
    const { error: txError } = await supabase
      .from('transactions')
      .update({ 
        is_verified: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', id);

    // 2. Update invoice status
    if (!txError) {
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);
      
      setPendingTransactions(pendingTransactions.filter(t => t.id !== id));
    }

    setIsProcessing(false);
  }

  if (loading) return <div className="p-8 text-center">Loading transactions...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Banknote className="w-8 h-8 text-green-600" />
              Payment Reconciliation
            </h1>
            <p className="text-gray-600">Verify student-submitted UTRs against bank statements.</p>
          </div>
          
          <label className="bg-white border-2 border-dashed border-gray-300 px-6 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-colors">
            <Upload className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-bold text-gray-600">Upload Bank Statement (CSV)</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleStatementUpload} />
          </label>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">UTR Number</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{tx.invoices?.students?.full_name}</p>
                    <p className="text-xs text-gray-500">Inv: #{tx.invoice_id.slice(0,8)}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">₹{tx.amount}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm">{tx.utr_no}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => verifyTransaction(tx.id, tx.invoice_id)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                        title="Approve"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Reject">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                      <p>No pending transactions to reconcile.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
