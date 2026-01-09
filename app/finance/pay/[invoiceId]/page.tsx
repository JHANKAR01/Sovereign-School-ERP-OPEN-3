'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { IndianRupee, Smartphone, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function UPIPaymentPage() {
  const { invoiceId } = useParams();
  const supabase = createClient();
  const [invoice, setInvoice] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success'>('idle');

  useEffect(() => {
    fetchInvoiceDetails();
  }, [invoiceId]);

  async function fetchInvoiceDetails() {
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .select('*, students(full_name, admission_number)')
      .eq('id', invoiceId)
      .single();

    if (inv) {
      setInvoice(inv);
      const { data: sch } = await supabase
        .from('schools')
        .select('*')
        .eq('id', inv.school_id)
        .single();
      setSchool(sch);
    }
  }

  const upiId = (school?.settings as any)?.upi_id || 'school@upi';
  const amount = invoice?.amount || 0;
  const transactionNote = `Fee-${invoice?.students?.admission_number}-${invoiceId?.toString().slice(0, 8)}`;
  
  // UPI Deep Link
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(school?.name || 'School')}&am=${amount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  async function handleSubmitUTR(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('transactions')
      .insert([{
        school_id: school.id,
        invoice_id: invoice.id,
        amount: amount,
        utr_no: utr,
        payment_method: 'UPI',
        is_verified: false
      }]);

    if (error) {
      alert(error.message);
    } else {
      setPaymentStatus('pending');
    }
    setIsSubmitting(false);
  }

  if (!invoice || !school) return <div className="p-8 text-center">Loading payment details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <h1 className="text-xl font-bold">{school.name}</h1>
          <p className="text-indigo-100 text-sm">Fee Payment Portal</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-4">
              <IndianRupee className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900">₹{amount}</h2>
            <p className="text-gray-500 text-sm mt-1">Invoice: #{invoiceId?.toString().slice(0, 8)}</p>
          </div>

          {paymentStatus === 'idle' ? (
            <div className="space-y-8">
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <QRCodeSVG value={upiLink} size={200} />
                <p className="text-xs text-gray-400 mt-4 uppercase tracking-widest font-bold">Scan to Pay</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href={upiLink}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  <Smartphone className="w-6 h-6 text-gray-700 mb-2" />
                  <span className="text-xs font-bold text-gray-600">Pay via App</span>
                </a>
                <div className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
                  <span className="text-xs font-bold text-gray-600">Zero Fees</span>
                </div>
              </div>

              <form onSubmit={handleSubmitUTR} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Enter Transaction ID (UTR)</label>
                  <input
                    type="text"
                    placeholder="12-digit UTR Number"
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-indigo-500 outline-none transition-colors font-mono"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || utr.length < 6}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Confirm Payment'}
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Pending</h3>
              <p className="text-gray-600 text-sm mb-8">
                We've received your UTR: <span className="font-mono font-bold">{utr}</span>. 
                Our accountant will verify this against the bank statement within 24 hours.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-indigo-600 font-bold hover:underline"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 text-center border-t">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Sovereign Payment Gateway • Secure & Direct</p>
        </div>
      </div>
    </div>
  );
}
