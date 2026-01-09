'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { Banknote, Check, X, Upload, Loader2, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReconciliationPage() {
  const supabase = createClient();
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [bankStatement, setBankStatement] = useState<any[]>([]);
  const [aiMatches, setAiMatches] = useState<Record<string, any>>({});

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
        runAiMatching(results.data);
      },
    });
  };

  const runAiMatching = async (statement: any[]) => {
    setIsMatching(true);
    try {
      const res = await fetch('/api/ai/match-transactions', {
        method: 'POST',
        body: JSON.stringify({
          bankRows: statement.slice(0, 50), // Limit for AI context window
          pendingTransactions: pendingTransactions.map(tx => ({
            id: tx.id,
            utr_no: tx.utr_no,
            amount: tx.amount,
            date: tx.created_at
          }))
        }),
      });
      const matches = await res.json();
      
      const matchMap: Record<string, any> = {};
      matches.forEach((m: any) => {
        matchMap[m.transaction_id] = m;
      });
      setAiMatches(matchMap);
    } catch (error) {
      console.error('AI Matching failed:', error);
    } finally {
      setIsMatching(false);
    }
  };

  async function verifyTransaction(id: string, invoiceId: string) {
    setIsProcessing(true);
    const { error: txError } = await supabase
      .from('transactions')
      .update({ 
        is_verified: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (!txError) {
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);
      
      setPendingTransactions(pendingTransactions.filter(t => t.id !== id));
      const newMatches = { ...aiMatches };
      delete newMatches[id];
      setAiMatches(newMatches);
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
          
          <div className="flex gap-4">
            {bankStatement.length > 0 && (
              <button 
                onClick={() => runAiMatching(bankStatement)}
                disabled={isMatching}
                className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition-colors font-bold text-sm"
              >
                {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Re-run AI Match
              </button>
            )}
            <label className="bg-white border-2 border-dashed border-gray-300 px-6 py-3 rounded-xl flex items-center gap-3 cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-bold text-gray-600">
                {bankStatement.length > 0 ? 'Change Statement' : 'Upload Bank Statement (CSV)'}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleStatementUpload} />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">UTR Number</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">AI Suggestion</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingTransactions.map((tx) => {
                const match = aiMatches[tx.id];
                return (
                  <tr key={tx.id} className={cn("hover:bg-gray-50 transition-colors", match && "bg-indigo-50/30")}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{tx.invoices?.students?.full_name}</p>
                      <p className="text-xs text-gray-500">Inv: #{tx.invoice_id?.slice(0,8)}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">₹{tx.amount}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 px-3 py-1 rounded-lg font-mono text-sm">{tx.utr_no}</span>
                    </td>
                    <td className="px-6 py-4">
                      {match ? (
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-xs font-bold">{Math.round(match.confidence * 100)}% Match</span>
                          <span className="text-[10px] text-indigo-400 truncate max-w-[150px]">{match.reason}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No match found</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => verifyTransaction(tx.id, tx.invoice_id)}
                          disabled={isProcessing}
                          className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 disabled:opacity-50"
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
                );
              })}
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
