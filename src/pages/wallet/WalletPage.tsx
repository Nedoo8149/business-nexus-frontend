import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Send, History, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [myWalletNumber, setMyWalletNumber] = useState<string>('Loading...');
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Modal states
  const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [amount, setAmount] = useState('');
  const [receiverWalletNumber, setReceiverWalletNumber] = useState('');
  const [verifiedReceiver, setVerifiedReceiver] = useState<any>(null); // For Account Title
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const fetchData = async () => {
const currentUserId = user?.id;
    if (!currentUserId) return;

    try {
      const histRes = await axios.get(`${BACKEND_URL}/api/transactions/history/${currentUserId}`);
      setTransactions(histRes.data);
    } catch (error) {
      console.error("History fetch error:", error);
    }

    try {
      const token = localStorage.getItem('token'); 
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const userRes = await axios.get(`${BACKEND_URL}/api/users/${currentUserId}`, config);
      setBalance(userRes.data.walletBalance || 0);
      setMyWalletNumber(userRes.data.walletNumber || 'N/A');
    } catch (error) {
      console.error("Balance fetch error:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // --- EASYPAISA STYLE WALLET VERIFICATION ---
  const handleVerifyWallet = async () => {
    if (!receiverWalletNumber || receiverWalletNumber.length < 5) return toast.error("Enter a valid wallet number");
    
    setVerifying(true);
    setVerifiedReceiver(null);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/transactions/verify-wallet/${receiverWalletNumber}`);
      setVerifiedReceiver(res.data);
      toast.success("Account Verified!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Invalid Wallet Number");
    } finally {
      setVerifying(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Enter a valid amount');
    
    if (activeAction === 'transfer' && !verifiedReceiver) {
      return toast.error('Please verify the receiver account first');
    }

    setLoading(true);
    const toastId = toast.loading('Processing transaction securely...');
const currentUserId = user?.id;

    try {
      let endpoint = '';
      let payload: any = { userId: currentUserId, amount: Number(amount) };

      if (activeAction === 'deposit') endpoint = '/api/transactions/deposit';
      if (activeAction === 'withdraw') endpoint = '/api/transactions/withdraw';
      if (activeAction === 'transfer') {
        endpoint = '/api/transactions/transfer';
        payload = { 
          senderId: currentUserId, 
          receiverWalletNumber: receiverWalletNumber, 
          amount: Number(amount) 
        };
      }

      const response = await axios.post(`${BACKEND_URL}${endpoint}`, payload);
      
      toast.success(`${activeAction?.charAt(0).toUpperCase()}${activeAction?.slice(1)} Successful!`, { id: toastId });
      
      if (response.data.balance !== undefined) {
          setBalance(response.data.balance);
      }

      // Reset Modal
      setActiveAction(null);
      setAmount('');
      setReceiverWalletNumber('');
      setVerifiedReceiver(null);
      fetchData(); 
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Transaction failed';
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nexus Wallet</h1>
          <p className="text-gray-600">Your secure digital payment gateway.</p>
        </div>
      </div>

      {/* BALANCE CARD */}
      <Card>
        <CardBody className="flex flex-col md:flex-row items-center justify-between p-6">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="p-4 rounded-full bg-opacity-10" style={{ backgroundColor: '#288DFF15', color: '#288DFF' }}>
              <Wallet size={36} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase">Available Balance</p>
              <h2 className="text-3xl font-bold text-gray-900">${balance.toLocaleString()}</h2>
              {/* NAYA: Apka Wallet Number idhar show hoga */}
              <p className="text-sm text-[#288DFF] font-mono mt-1 font-semibold bg-blue-50 px-2 py-1 rounded inline-block">
                A/C No: {myWalletNumber}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveAction('deposit')} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg shadow-sm hover:opacity-90 transition-all" style={{ backgroundColor: '#288DFF' }}>
              <ArrowDownCircle size={18} /> Deposit
            </button>
            <button onClick={() => setActiveAction('withdraw')} className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-lg shadow-sm hover:bg-gray-50 transition-all" style={{ borderColor: '#288DFF', color: '#288DFF' }}>
              <ArrowUpCircle size={18} /> Withdraw
            </button>
            <button onClick={() => setActiveAction('transfer')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg shadow-sm hover:bg-gray-800 transition-all">
              <Send size={18} /> Transfer
            </button>
          </div>
        </CardBody>
      </Card>

      {/* TRANSACTION HISTORY */}
      <Card>
        <CardHeader className="bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History size={20} className="text-gray-500" /> Payment Ledger
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No transactions found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm border-b">
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Ref ID</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Status</th>
                  </tr>
                </thead>
               <tbody>
                  {transactions.map((t) => {
                    const currentUserId = user?.id;
                    
                    // Sahi tareeqe se check kar rahe hain ke sender kon hai
                    const senderId = t.user?._id || t.user; 
                    const isSender = senderId === currentUserId;
                    const isTransfer = t.type === 'Transfer';
                    
                    let displayType: React.ReactNode = t.type;
                    let amountColor = 'text-green-600';
                    let sign = '+';

                    // Agar Withdraw kiya hai ya Phir User ne kisi ko Transfer kiya hai (Sender hai)
                    if (t.type === 'Withdraw' || (isTransfer && isSender)) {
                      amountColor = 'text-red-600';
                      sign = '-';
                      if (isTransfer) {
                        const receiverTitle = t.receiverId?.name || t.receiverId?.email?.split('@')[0] || 'Unknown';
                        displayType = <>Sent to <span className="font-bold text-gray-900">{receiverTitle}</span></>;
                      } else {
                        displayType = 'Withdrawal';
                      }
                    } 
                    // Agar Receiver hai
                    else if (isTransfer && !isSender) {
                      const senderTitle = t.user?.name || t.user?.email?.split('@')[0] || 'Unknown';
                      displayType = <>Received from <span className="font-bold text-gray-900">{senderTitle}</span></>;
                    }

                    return (
                      <tr key={t._id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-700">
                          {displayType}
                          {isTransfer && <p className="text-xs text-gray-400 font-mono mt-0.5">Verified Transfer</p>}
                        </td>
                        <td className="p-4 text-sm text-gray-500 font-mono">{t.referenceId}</td>
                        <td className={`p-4 font-bold ${amountColor}`}>{sign}${t.amount.toLocaleString()}</td>
                        <td className="p-4 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ACTION MODAL */}
      {activeAction && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4 capitalize">{activeAction} Funds</h3>
            <form onSubmit={handleTransaction} className="space-y-4">
              
              {/* TRANSFER WALA HISSA */}
              {activeAction === 'transfer' && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receiver's Wallet Number</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      required 
                      value={receiverWalletNumber} 
                      onChange={(e) => {
                        setReceiverWalletNumber(e.target.value);
                        setVerifiedReceiver(null); // Agar number change kare tou verified reset ho jaye
                      }} 
                      placeholder="e.g. 1528493012" 
                      className="w-full border-gray-300 rounded-lg p-2.5 border outline-none font-mono" 
                      disabled={verifiedReceiver !== null}
                    />
                    {!verifiedReceiver ? (
                      <button type="button" onClick={handleVerifyWallet} disabled={verifying} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all flex items-center">
                        {verifying ? '...' : <Search size={18} />}
                      </button>
                    ) : (
                      <button type="button" onClick={() => setVerifiedReceiver(null)} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm font-medium">
                        Change
                      </button>
                    )}
                  </div>
                  
                  {/* Account Title UI */}
                  {/* Account Title UI */}
                  {verifiedReceiver && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                      <CheckCircle size={22} className="text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-800 mb-1">
                          Account Title: <span className="font-bold text-green-950 text-base ml-1">{verifiedReceiver.name}</span>
                        </p>
                        <p className="text-xs text-green-700 capitalize font-medium">
                          Account Type: {verifiedReceiver.role}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Amount Input */}
              { (activeAction !== 'transfer' || verifiedReceiver) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                  <input required type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" className="w-full border-gray-300 rounded-lg p-2.5 border outline-none focus:ring-2 focus:ring-[#288DFF]" />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setActiveAction(null); setVerifiedReceiver(null); setReceiverWalletNumber(''); }} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={loading || (activeAction === 'transfer' && !verifiedReceiver)} className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#288DFF' }}>
                  {loading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};