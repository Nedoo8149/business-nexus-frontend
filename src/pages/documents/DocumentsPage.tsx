import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FileText, Upload, Eye, X, PenTool, Users } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
// Vite special worker import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min?url'; 

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]); // Naya: Users list ke liye
  const [shareWithId, setShareWithId] = useState(''); // Naya: Dropdown state
  const [uploading, setUploading] = useState(false);
  
  // Modals States
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [signDoc, setSignDoc] = useState<any | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigCanvas = useRef<any>(null);
  
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // 1. Documents Fetch Karna (Private logic ke sath)
  const fetchDocuments = async () => {
    try {

      const currentUserId = user?.id;
      // Backend ko ID bhej rahe hain taake sirf apne aur shared docs aayen
      const res = await axios.get(`${BACKEND_URL}/api/documents?userId=${currentUserId}`);
      setDocuments(res.data);
    } catch (error) {
      toast.error('Failed to load documents');
    }
  };

  // 2. Users ki list fetch karna (Dropdown ke liye)
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/users`);
        const currentUserId = user?.id;
      // Apne ilawa baki sab users ko dropdown mein dikhana hai
      const otherUsers = res.data.filter((u: any) => u._id !== currentUserId);
      setUsersList(otherUsers);
    } catch (error) {
      console.error('Failed to fetch users list');
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchUsers();
    }
  }, [user]);

  // 3. Upload File (With Privacy)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('uploadedBy', user?.id || '');
    
    // Agar kisi ko select kiya hai tou uski ID bhi bhej do
    if (shareWithId) {
      formData.append('sharedWith', shareWithId);
    }

    setUploading(true);
    const toastId = toast.loading('Uploading private document...');
    
    try {
      await axios.post(`${BACKEND_URL}/api/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded and shared successfully!', { id: toastId });
      fetchDocuments();
    } catch (error) {
      toast.error('Upload failed', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  // --- E-SIGNATURE LOGIC ---
  const handleSaveSignature = async () => {
    const documentId = signDoc?._id || signDoc?.id;
    try {
      if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
        return toast.error('Please draw your signature first');
      }
      if (!documentId) return alert("Error: Document ID is missing!");

      const signatureImage = sigCanvas.current.getCanvas().toDataURL('image/png');
      toast.loading('Saving signature...', { id: 'sign-toast' });

      await axios.post(`${BACKEND_URL}/api/documents/${documentId}/sign`, {
        signature: signatureImage
      });
      
      toast.success('Document digitally signed!', { id: 'sign-toast' });
      setSignDoc(null); 
      fetchDocuments(); 
    } catch (error: any) {
      console.error("Signature Error:", error);
      toast.error('Failed to save signature', { id: 'sign-toast' });
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Chamber</h1>
          <p className="text-gray-600">Securely manage and sign your startup contracts</p>
        </div>
        
        {/* NAYA: Upload Controls Area */}
        <div className="flex items-center gap-3 w-full md:w-auto bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center text-gray-500 pl-2">
            <Users size={18} />
          </div>
          <select 
            value={shareWithId} 
            onChange={(e) => setShareWithId(e.target.value)}
            className="border-none outline-none text-sm text-gray-700 bg-transparent focus:ring-0 min-w-[150px]"
          >
            <option value="">Private (Only Me)</option>
            {usersList.map(u => (
              <option key={u._id} value={u._id}>Share with: {u.name} ({u.role})</option>
            ))}
          </select>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
          
          <Button leftIcon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document list */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="flex justify-between items-center bg-gray-50 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Your Private Documents</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No documents found.</p>
                    <p className="text-sm">Upload a document to get started.</p>
                  </div>
                ) : (
                  documents.map(doc => {
                    // Check logic: Kia yeh file maine upload ki hai ya mere sath share hui hai?
                    const currentUserId = user?.id;
                    const isMyUpload = doc.uploadedBy?._id === currentUserId;
                    
                    return (
                      <div key={doc._id} className="flex items-center p-4 hover:bg-blue-50/50 rounded-lg transition-colors border border-gray-100 shadow-sm mb-2">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
                          <FileText size={24} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm font-bold text-gray-900 truncate">{doc.title}</h3>
                            {doc.status === 'Signed' ? (
                               <Badge variant="primary" size="sm" className="bg-green-100 text-green-700">Signed</Badge>
                            ) : (
                               <Badge variant="secondary" size="sm" className="bg-yellow-100 text-yellow-700">Pending</Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="font-medium">
                              {isMyUpload ? 'Uploaded by You' : `From: ${doc.uploadedBy ? doc.uploadedBy.name : 'You'}`}
                            </span>
                            {isMyUpload && doc.sharedWith && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                <Users size={12} /> Shared with {doc.sharedWith?.name}
                              </span>
                            )}
                            <span>Modified: {formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {doc.status !== 'Signed' && (
                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => setSignDoc(doc)}>
                              <PenTool size={16} className="mr-1" /> Sign
                            </Button>
                          )}

                          <Button variant="ghost" size="sm" className="p-2 text-blue-600 hover:bg-blue-100" onClick={() => setPreviewDoc(doc)}>
                            <Eye size={18} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* --- E-SIGNATURE MODAL --- */}
      {signDoc && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-gray-900">Sign Contract</h3>
               <button onClick={() => setSignDoc(null)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><X size={20} /></button>
             </div>
             <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50 cursor-crosshair">
               <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{width: 400, height: 200, className: 'w-full h-48'}} />
             </div>
             <div className="flex justify-between mt-4">
               <Button variant="ghost" onClick={() => sigCanvas.current.clear()}>Clear</Button>
               <Button variant="primary" onClick={handleSaveSignature}>Save Signature</Button>
             </div>
          </div>
        </div>
      )}

      {/* --- PDF PREVIEW MODAL --- */}
      {previewDoc && (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-[60] flex justify-center items-center p-2 md:p-8">
          <div className="bg-white w-full max-w-5xl h-full max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-600" /> {previewDoc.title}
              </h3>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors text-gray-500"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex flex-col items-center custom-scrollbar">
              <Document
                file={`${BACKEND_URL}${previewDoc.fileUrl}`}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="text-blue-600 font-medium">Loading Document...</div>}
              >
                {Array.from(new Array(numPages || 0), (_, index) => (
                  <div key={`page_${index + 1}`} className="mb-8 shadow-md rounded-lg overflow-hidden border border-gray-300 relative">
                    <Page pageNumber={index + 1} width={window.innerWidth < 768 ? window.innerWidth - 40 : 800} renderTextLayer={true} renderAnnotationLayer={true} />
                    
                    {previewDoc.status === 'Signed' && previewDoc.signatureUrl && index + 1 === numPages && (
                      <div className="absolute bottom-12 right-12 bg-white/90 p-3 rounded-lg shadow-sm border border-blue-200">
                        <p className="text-[10px] text-blue-600 font-bold uppercase mb-2 border-b border-blue-100">Digitally Signed & Verified</p>
                        <img src={previewDoc.signatureUrl} alt="Signature" className="h-20 object-contain mix-blend-multiply" />
                      </div>
                    )}
                  </div>
                ))}
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};