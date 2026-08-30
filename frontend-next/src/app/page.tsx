"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCases } from "@/lib/api";

export default function Dashboard() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCases()
      .then(data => {
        setCases(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded bg-blue-900/30 text-blue-400">
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

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Welcome back, Student</h2>
            <p className="text-slate-400 mt-1">Here is the status of your CCNA troubleshooting lab.</p>
          </div>
          <Link href="/cases/new" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
            + Start New Diagnosis
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-slate-400 font-medium mb-2">Total Cases</h3>
            <p className="text-4xl font-bold text-white">{cases.length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-slate-400 font-medium mb-2">Resolved This Week</h3>
            <p className="text-4xl font-bold text-emerald-400">{cases.filter(c => c.status === "resolved").length}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-slate-400 font-medium mb-2">AI Confidence Avg</h3>
            <p className="text-4xl font-bold text-blue-400">92%</p>
          </div>
        </div>

        {/* Recent Cases */}
        <div>
          <h3 className="text-xl font-bold mb-4">Recent Troubleshooting Cases</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Case ID</th>
                  <th className="px-6 py-4 font-medium">Symptom</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-400">Loading cases...</td></tr>
                ) : cases.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-400">No cases yet. Start a new diagnosis!</td></tr>
                ) : cases.map((c: any) => (
                  <tr key={c.id}>
                    <td className="px-6 py-4 text-blue-400 font-mono">{c.id}</td>
                    <td className="px-6 py-4">{c.symptom.substring(0, 50)}{c.symptom.length > 50 ? "..." : ""}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                        {c.status === 'resolved' ? 'Resolved' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/cases/${c.id}`} className="text-slate-400 hover:text-white transition">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
