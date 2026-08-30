"use client";

import { useState } from "react";
import Link from "next/link";
import { requestDiagnosis, createCase, DiagnosisResponse } from "@/lib/api";

export default function NewCase() {
  const [symptom, setSymptom] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResponse | null>(null);
  const [error, setError] = useState("");

  const handleDiagnose = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      // 1. Create the case in the database
      const caseData = await createCase({ title: symptom.substring(0, 30), symptom });
      
      // 2. Request diagnosis for this specific case
      const diagnosisData = await requestDiagnosis({ symptom, evidence }, caseData.case_id);
      setResult(diagnosisData);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

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
          <Link href="/cases/new" className="flex items-center gap-3 px-3 py-2 rounded bg-blue-900/30 text-blue-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold">New Diagnosis</h2>
          <p className="text-slate-400 mt-1">Describe the network issue and provide CLI evidence.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <form onSubmit={handleDiagnose}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">Network Symptom</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="e.g. PC cannot ping its default gateway 192.168.10.1"
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">CLI Evidence (show commands)</label>
                <textarea 
                  required
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="Paste output of show ip interface brief, show ip route, etc..."
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Analyzing Network Evidence..." : "Diagnose Root Cause"}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold mb-4">AI Diagnosis</h3>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
                {error}
              </div>
            )}

            {!result && !loading && !error && (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-center">
                <p>Submit symptoms and evidence to see the AI diagnosis here.</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p>Parsing output, consulting rule engine, and reasoning over vector database...</p>
              </div>
            )}

            {result && result.diagnosis && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Root Cause</h4>
                  <p className="text-white text-lg">{result.diagnosis.root_cause}</p>
                </div>
                
                <div className="flex gap-4">
                  <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800">
                    <span className="text-xs text-slate-400 block">OSI Layer</span>
                    <span className="text-emerald-400 font-medium">{result.diagnosis.osi_layer}</span>
                  </div>
                  <div className="bg-slate-950 px-3 py-2 rounded border border-slate-800">
                    <span className="text-xs text-slate-400 block">Confidence</span>
                    <span className="text-blue-400 font-medium">{result.diagnosis.confidence * 100}%</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Explanation</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.diagnosis.explanation}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggested Fix</h4>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <p className="text-amber-400 text-sm font-mono whitespace-pre-wrap">{result.diagnosis.suggested_fix}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
