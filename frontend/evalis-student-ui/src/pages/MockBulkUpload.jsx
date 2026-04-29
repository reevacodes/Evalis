import React, { useState } from 'react';
import API from '../services/api';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

export default function MockBulkUpload() {
  const [subjectCode, setSubjectCode] = useState('COM-102');
  const [subjectName, setSubjectName] = useState('Data Structures using C');
  const [semester, setSemester] = useState(2);
  const [unit, setUnit] = useState('Chapter 3');
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState(null); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    try {
      setStatus('loading');
      setMessage('');
      
      const parsed = JSON.parse(jsonText);
      const questions = parsed.questions || parsed;

      if (!Array.isArray(questions)) {
        throw new Error("JSON must be an array of questions or an object with a 'questions' array.");
      }

      const payload = {
        subject_code: subjectCode,
        subject_name: subjectName,
        semester: Number(semester),
        unit: unit,
        questions: questions
      };

      const res = await API.post('/mock-questions/bulk', payload);
      setStatus('success');
      setMessage(`Successfully inserted ${res.data.inserted_count} questions into mock collection!`);
      setJsonText('');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage(err.response?.data?.detail || err.message || 'Failed to upload.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 flex justify-center text-slate-900 dark:text-white">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <UploadCloud className="text-indigo-500" />
          Bulk Upload Mock Questions
        </h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Subject Code</label>
            <input 
              type="text" 
              value={subjectCode} 
              onChange={e => setSubjectCode(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject Name</label>
            <input 
              type="text" 
              value={subjectName} 
              onChange={e => setSubjectName(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Semester</label>
            <input 
              type="number" 
              value={semester} 
              onChange={e => setSemester(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit / Chapter</label>
            <input 
              type="text" 
              value={unit} 
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g. Chapter 3"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 rounded"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Paste JSON Payload Here</label>
          <textarea 
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            rows={15}
            className="w-full bg-slate-100 dark:bg-slate-900 font-mono text-sm border border-slate-300 dark:border-slate-700 p-4 rounded focus:ring-2 focus:ring-indigo-500"
            placeholder={'{\n  "questions": [\n    { ... }\n  ]\n}'}
          ></textarea>
        </div>

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg flex items-start gap-3">
            <AlertCircle />
            <div>
              <div className="font-bold">Upload Failed</div>
              <div className="text-sm">{message}</div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg flex items-start gap-3">
            <CheckCircle />
            <div>
              <div className="font-bold">Success!</div>
              <div className="text-sm">{message}</div>
            </div>
          </div>
        )}

        <button 
          onClick={handleUpload}
          disabled={status === 'loading' || !jsonText.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 transition"
        >
          {status === 'loading' ? 'Uploading...' : 'Upload Questions'}
        </button>
      </div>
    </div>
  );
}
