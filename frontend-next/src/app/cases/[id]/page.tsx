"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getCase } from "@/lib/api";

export default function CaseView({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCase(resolvedParams.id)
      .then(data => {
        setCaseData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load case");
        setLoading(false);
      });
  }, [resolvedParams.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 p-6 hidden md:block">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">NetSage AI</h1>
            <p className="text-xs text-slate-400">Network Diagnostics</p>
          </div>
        </div>

        <nav className="space-y-2">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>
          <Link href="/cases/new" className="flex items-center gap-3 px-3 py-2 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">Loading case details...</div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-6 rounded-xl">{error}</div>
        ) : (
          <>
            <header className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold font-mono text-blue-400">{caseData.id}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${caseData.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    {caseData.status === 'resolved' ? 'Resolved' : 'In Progress'}
                  </span>
                </div>
                <p className="text-slate-400">{new Date(caseData.created_at).toLocaleString()}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Symptom Info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Case Context</h3>
                
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Symptom</h4>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                    <p className="text-slate-200">{caseData.symptom}</p>
                  </div>
                </div>
              </div>

              {/* Diagnosis Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
                <h3 className="text-xl font-bold mb-4">AI Diagnosis</h3>
                
                {!caseData.diagnosis ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-center bg-slate-950 rounded-lg border border-slate-800 border-dashed">
                    <p>No diagnosis has been generated for this case yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause</h4>
                      <p className="text-white text-lg">{caseData.diagnosis.root_cause}</p>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800">
                        <span className="text-xs text-slate-400 block">OSI Layer</span>
                        <span className="text-emerald-400 font-medium">{caseData.diagnosis.osi_layer}</span>
                      </div>
                      <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800">
                        <span className="text-xs text-slate-400 block">Confidence</span>
                        <span className="text-blue-400 font-medium">{caseData.diagnosis.confidence}%</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Explanation</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{caseData.diagnosis.explanation}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Fix</h4>
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                        <p className="text-amber-400 text-sm font-mono whitespace-pre-wrap">{caseData.diagnosis.suggested_fix}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
