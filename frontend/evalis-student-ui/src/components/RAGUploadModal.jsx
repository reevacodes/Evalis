import { useState } from "react";
import { X, UploadCloud, Loader2, Sparkles } from "lucide-react";
import API from "../services/api";

export default function RAGUploadModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [formData, setFormData] = useState({
    subject_code: "",
    subject_name: "",
    semester: 1,
    unit: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Please select a PDF file.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("subject_code", formData.subject_code);
      data.append("subject_name", formData.subject_name);
      data.append("semester", formData.semester);
      data.append("unit", formData.unit);

      // Using raw axios via API instance since it handles auth
      const res = await API.post("/questions/mock-questions/rag-generate", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setMessage(res.data.message || "Successfully generated RAG questions.");
      setTimeout(() => {
        onClose();
        setFile(null);
        setFormData({ subject_code: "", subject_name: "", semester: 1, unit: "" });
        setMessage("");
      }, 3000);
    } catch (err) {
      setMessage(err.response?.data?.detail || "Failed to process RAG generation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-lg overflow-hidden border border-slate-700 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">RAG Mock Generation</h2>
              <p className="text-slate-400 text-sm mt-1">Ground AI strictly in your uploaded lecture PDF.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Subject Code</label>
              <input
                required
                type="text"
                placeholder="e.g. CS101"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                value={formData.subject_code}
                onChange={e => setFormData({...formData, subject_code: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
              <input
                required
                type="number"
                min="1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                value={formData.semester}
                onChange={e => setFormData({...formData, semester: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
              <input
                required
                type="text"
                placeholder="Data Structures"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                value={formData.subject_name}
                onChange={e => setFormData({...formData, subject_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Chapter / Unit</label>
              <input
                required
                type="text"
                placeholder="e.g. 4 or Strings"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Lecture PDF</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                <p className="text-sm text-slate-400">{file ? file.name : "Click to upload PDF"}</p>
              </div>
              <input 
                type="file" 
                accept="application/pdf"
                className="hidden" 
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.includes('Success') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {message}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {loading ? "Generating..." : "Generate & Inject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
