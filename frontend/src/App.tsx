import { useState, useRef, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "dashboard" | "new-case" | "my-cases" | "knowledge-base" | "review";
type CaseStep = "symptom" | "topology" | "evidence" | "diagnosis" | "verification";
type CaseStatus = "open" | "in-progress" | "pending-review" | "resolved";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface EvidenceBlock {
  id: string;
  device: string;
  command: string;
  output: string;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const MOCK_CASES = [
  {
    id: "NS-2024-001",
    title: "VLAN 10 hosts cannot reach VLAN 20",
    status: "pending-review" as CaseStatus,
    layer: "Layer 2",
    confidence: 87,
    created: "Nov 14, 2024",
    student: "Alex Chen",
  },
  {
    id: "NS-2024-002",
    title: "Default route missing on edge router",
    status: "resolved" as CaseStatus,
    layer: "Layer 3",
    confidence: 94,
    created: "Nov 13, 2024",
    student: "Maya Patel",
  },
  {
    id: "NS-2024-003",
    title: "Duplex mismatch on Fa0/1 causing CRC errors",
    status: "in-progress" as CaseStatus,
    layer: "Layer 1",
    confidence: 72,
    created: "Nov 14, 2024",
    student: "Jordan Lee",
  },
  {
    id: "NS-2024-004",
    title: "OSPF neighbor adjacency stuck in EXSTART",
    status: "open" as CaseStatus,
    layer: "Layer 3",
    confidence: 0,
    created: "Nov 14, 2024",
    student: "Sam Torres",
  },
  {
    id: "NS-2024-005",
    title: "ACL blocking SSH from management subnet",
    status: "resolved" as CaseStatus,
    layer: "Layer 3",
    confidence: 91,
    created: "Nov 12, 2024",
    student: "Alex Chen",
  },
];

const KB_ITEMS = [
  {
    id: "kb-001",
    question: "How do you verify a trunk link between two Cisco switches?",
    answer:
      "Use `show interfaces trunk` to verify which interfaces are in trunking mode, the native VLAN, and the VLANs allowed across the trunk. If the port is missing from the output, it is in access mode.",
    category: "Layer 2",
    commands: ["show interfaces trunk", "show vlan brief", "show interfaces switchport"],
  },
  {
    id: "kb-002",
    question: "What causes an OSPF neighbor to be stuck in EXSTART?",
    answer:
      "MTU mismatch between the two interfaces is the most common cause. One interface may have `ip ospf mtu-ignore` configured, masking the problem. Also check that both routers agree on area ID and authentication.",
    category: "Layer 3",
    commands: ["show ip ospf neighbor", "show interfaces", "show ip ospf interface"],
  },
  {
    id: "kb-003",
    question: "How do you diagnose a duplex mismatch?",
    answer:
      "A duplex mismatch appears as excessive CRC errors and input errors on the full-duplex side while the half-duplex side shows late collisions. Check `show interfaces` for both devices — counters increment rapidly on the mismatched pair.",
    category: "Layer 1",
    commands: ["show interfaces", "show interfaces counters errors"],
  },
  {
    id: "kb-004",
    question: "What is the purpose of the native VLAN on a trunk?",
    answer:
      "The native VLAN carries untagged frames across a trunk link. Both ends must agree; a mismatch triggers a CDP warning and silently drops untagged traffic. Best practice is to change native VLAN away from VLAN 1.",
    category: "Layer 2",
    commands: ["show interfaces trunk", "show cdp neighbors detail"],
  },
  {
    id: "kb-005",
    question: "How does inter-VLAN routing work on a Layer 3 switch?",
    answer:
      "Create a switched virtual interface (SVI) for each VLAN with `interface vlan <id>` and assign an IP address. Enable IP routing globally with `ip routing`. Hosts use the SVI IP as their default gateway.",
    category: "Layer 3",
    commands: ["show ip interface brief", "show ip route", "show interfaces vlan"],
  },
];

const EVIDENCE_BLOCKS: EvidenceBlock[] = [
  {
    id: "e1",
    device: "SW1",
    command: "show interfaces fa0/24 switchport",
    output: `Name: Fa0/24
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Operational Trunking Encapsulation: native
Negotiation of Trunking: Off
Access Mode VLAN: 10 (VLAN0010)
Trunking Native Mode VLAN: 1 (default)
Voice VLAN: none`,
  },
  {
    id: "e2",
    device: "SW2",
    command: "show interfaces fa0/24 switchport",
    output: `Name: Fa0/24
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Operational Trunking Encapsulation: native
Negotiation of Trunking: Off
Access Mode VLAN: 10 (VLAN0010)
Trunking Native Mode VLAN: 1 (default)
Voice VLAN: none`,
  },
  {
    id: "e3",
    device: "SW2",
    command: "show vlan brief",
    output: `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------
1    default                          active    Fa0/1, Fa0/2
10   Students                         active    Fa0/10, Fa0/24
20   Faculty                          active    Fa0/20, Fa0/21
1002 fddi-default                     act/unsup
1003 token-ring-default               act/unsup`,
  },
];

const DIAGNOSIS = {
  rootCause:
    "The inter-switch link (SW1 Fa0/24 — SW2 Fa0/24) is operating in static access mode on both ends. Only VLAN 10 frames traverse this link; VLAN 20 traffic is silently dropped at ingress, preventing any cross-VLAN reachability without a Layer 3 device.",
  layer: "Layer 2",
  confidence: 87,
  evidenceItems: [
    {
      id: "ev-1",
      label: "SW1 Fa0/24 — administrative mode: static access, VLAN 10 only",
      source: "show interfaces fa0/24 switchport",
      detail: `Administrative Mode: static access
Operational Mode: static access
Access Mode VLAN: 10 (VLAN0010)`,
    },
    {
      id: "ev-2",
      label: "SW2 Fa0/24 — identical configuration, VLAN 10 only, no trunking",
      source: "show interfaces fa0/24 switchport",
      detail: `Administrative Mode: static access
Operational Mode: static access
Access Mode VLAN: 10 (VLAN0010)`,
    },
    {
      id: "ev-3",
      label: "VLAN 20 exists on SW2 but Fa0/24 is not in its port list",
      source: "show vlan brief",
      detail: `20   Faculty    active    Fa0/20, Fa0/21
(Fa0/24 absent — VLAN 20 frames cannot reach SW1 side)`,
    },
  ],
  nextCommand: "show interfaces trunk",
  nextCommandPurpose:
    "Confirms that no trunk is present between SW1 and SW2, establishing the missing link as the root cause before reconfiguration.",
  suggestedFix: `SW1(config)# interface fa0/24
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk allowed vlan all

SW2(config)# interface fa0/24
SW2(config-if)# switchport mode trunk
SW2(config-if)# switchport trunk allowed vlan all`,
};

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "m0",
    role: "assistant",
    content:
      "Hi — I am NetSage AI, powered by RAG over your course materials and Cisco documentation. Describe your symptom or paste a show command and I will help you interpret it.",
  },
];

const AI_RESPONSES: Record<string, string> = {
  trunk:
    "A trunk link carries tagged frames for multiple VLANs between switches. Configure with `switchport mode trunk`. Verify with `show interfaces trunk` — the port should appear with the allowed VLAN list and encapsulation dot1q.",
  vlan:
    "VLAN isolation is by design — hosts in different VLANs cannot communicate without Layer 3 routing. First confirm the VLANs exist with `show vlan brief`, then check whether inter-VLAN routing (SVI or router-on-a-stick) is configured.",
  ospf:
    "OSPF neighbors must share the same area ID, hello/dead intervals, authentication, and MTU. Start with `show ip ospf neighbor` to check state, then `show ip ospf interface` for per-interface parameters.",
  ping:
    "When ping fails, work Layer 1 up: physical link, ARP resolution (`show arp`), routing table (`show ip route`), and ACLs. Use `traceroute` to find the exact hop where packets stop.",
  access:
    "An access port carries exactly one VLAN and drops any tagged frame it receives. If the port connecting two switches is in access mode, only that access VLAN will pass — all other VLANs are silently discarded.",
  default:
    "Based on the evidence so far, the fault appears at Layer 2. Verify whether the inter-switch link is in trunk mode with `show interfaces trunk`. If the port is absent from that output, it is the root cause.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function layerBadge(layer: string) {
  if (layer.includes("1")) return "text-pink-400 bg-pink-400/10 border-pink-400/25";
  if (layer.includes("2")) return "text-amber-400 bg-amber-400/10 border-amber-400/25";
  if (layer.includes("3")) return "text-blue-400 bg-blue-400/10 border-blue-400/25";
  if (layer.includes("4")) return "text-violet-400 bg-violet-400/10 border-violet-400/25";
  return "text-emerald-400 bg-emerald-400/10 border-emerald-400/25";
}

function statusBadge(s: CaseStatus) {
  const map = {
    open: "text-slate-400 bg-slate-400/10 border-slate-400/25",
    "in-progress": "text-cyan-400 bg-cyan-400/10 border-cyan-400/25",
    "pending-review": "text-amber-400 bg-amber-400/10 border-amber-400/25",
    resolved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  };
  return map[s];
}

function statusLabel(s: CaseStatus) {
  const map = {
    open: "Open",
    "in-progress": "In Progress",
    "pending-review": "Pending Review",
    resolved: "Resolved",
  };
  return map[s];
}

function getAIResponse(q: string) {
  const l = q.toLowerCase();
  if (l.includes("trunk")) return AI_RESPONSES.trunk;
  if (l.includes("vlan")) return AI_RESPONSES.vlan;
  if (l.includes("ospf")) return AI_RESPONSES.ospf;
  if (l.includes("ping") || l.includes("reachab")) return AI_RESPONSES.ping;
  if (l.includes("access")) return AI_RESPONSES.access;
  return AI_RESPONSES.default;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function Ico({
  d,
  cls = "w-4 h-4",
  poly,
}: {
  d?: string | string[];
  cls?: string;
  poly?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
    >
      {poly && <polyline points={poly} />}
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : d && <path d={d} />}
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  {
    id: "new-case",
    label: "New Case",
    icon: "M12 5v14M5 12h14",
    circ: true,
  },
  {
    id: "my-cases",
    label: "My Cases",
    icon: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    icon: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  },
  {
    id: "review",
    label: "Review",
    badge: 1,
    icon: ["M22 11.08V12a10 10 0 1 1-5.93-9.14", ""],
    poly: "22 4 12 14.01 9 11.01",
  },
];

function Sidebar({ active, onNav }: { active: View; onNav: (v: View) => void }) {
  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-[#0c1525] border-r border-[#18273d]">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-[#18273d]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">NetSage</div>
            <div className="text-[10px] text-slate-600 leading-none mt-0.5">Network Diagnostics</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id as View)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive
                  ? "bg-blue-500/12 text-blue-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/4"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 flex-shrink-0"
              >
                {item.poly && <polyline points={item.poly} />}
                {item.circ && <circle cx="12" cy="12" r="9" />}
                {Array.isArray(item.icon)
                  ? item.icon.map((p, i) => p && <path key={i} d={p} />)
                  : item.icon && <path d={item.icon as string} />}
              </svg>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-3.5 border-t border-[#18273d]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-[9px] font-bold">
            AC
          </div>
          <div>
            <div className="text-[11px] text-slate-300 font-medium leading-tight">Alex Chen</div>
            <div className="text-[9px] text-slate-600">Student · CCNA Lab</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Chatbot panel ───────────────────────────────────────────────────────────

function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const txt = input.trim();
    if (!txt) return;
    setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: txt }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: (Date.now() + 1).toString(), role: "assistant", content: getAIResponse(txt) },
      ]);
    }, 1100);
  }

  return (
    <div className="w-64 flex-shrink-0 border-l border-[#18273d] flex flex-col bg-[#0c1525]">
      <div className="px-4 py-3 border-b border-[#18273d] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-medium text-slate-300">NetSage AI</span>
        <span className="ml-auto text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">RAG</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollable px-3 py-3 space-y-2.5">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-500 text-white rounded-tr-sm"
                  : "bg-[#111f33] text-slate-300 border border-[#18273d] rounded-tl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-[#111f33] border border-[#18273d] rounded-xl rounded-tl-sm px-3 py-2.5 flex gap-1 items-center">
              {[0, 150, 300].map((d) => (
                <div
                  key={d}
                  className="w-1 h-1 rounded-full bg-slate-500 animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested */}
      <div className="px-3 pb-1 flex flex-wrap gap-1">
        {["What is a trunk?", "Why does VLAN fail?"].map((s) => (
          <button
            key={s}
            onClick={() => { setInput(s); }}
            className="text-[9px] text-slate-600 border border-[#18273d] rounded-full px-2 py-0.5 hover:text-slate-400 hover:border-slate-600 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-3 py-2.5 border-t border-[#18273d] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a networking question..."
          className="flex-1 bg-[#111f33] border border-[#18273d] rounded-lg px-3 py-1.5 text-[11px] text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/40"
        />
        <button
          onClick={send}
          className="w-7 h-7 flex items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors flex-shrink-0"
        >
          <Ico d="M22 2L11 13M22 2 15 22 11 13 2 9l20-7z" cls="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onNav }: { onNav: (v: View) => void }) {
  return (
    <div className="h-full overflow-y-auto scrollable px-8 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-7">
          <h1 className="text-lg font-semibold text-white">Dashboard</h1>
          <p className="text-xs text-slate-600 mt-0.5">CCNA Troubleshooting Lab — Fall 2024</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: "Open Cases", value: "2", sub: "+1 today", color: "text-cyan-400" },
            { label: "Resolved", value: "14", sub: "this semester", color: "text-emerald-400" },
            { label: "Avg. Confidence", value: "84%", sub: "across diagnoses", color: "text-blue-400" },
            { label: "Pending Review", value: "1", sub: "awaiting instructor", color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0f1e31] border border-[#18273d] rounded-xl px-5 py-4">
              <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-2">{s.label}</div>
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-700 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Recent cases table */}
        <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-[#18273d] flex items-center justify-between">
            <h2 className="text-xs font-medium text-white">Recent Cases</h2>
            <button
              onClick={() => onNav("my-cases")}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#18273d]">
                {["Case ID", "Title", "Layer", "Confidence", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-5 py-2 text-[9px] uppercase tracking-widest text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CASES.map((c, i) => (
                <tr
                  key={c.id}
                  className={`hover:bg-white/2 transition-colors ${i < MOCK_CASES.length - 1 ? "border-b border-[#18273d]/60" : ""}`}
                >
                  <td className="px-5 py-3 text-[11px] font-mono text-slate-500">{c.id}</td>
                  <td className="px-5 py-3 text-xs text-slate-200">{c.title}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${layerBadge(c.layer)}`}>
                      {c.layer}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {c.confidence > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1 rounded-full bg-[#18273d] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{ width: `${c.confidence}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">{c.confidence}%</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[11px] text-slate-600">{c.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => onNav("new-case")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Ico d="M12 5v14M5 12h14" cls="w-3.5 h-3.5" />
            New Case
          </button>
          <button
            onClick={() => onNav("knowledge-base")}
            className="flex items-center gap-2 px-4 py-2 bg-[#111f33] hover:bg-[#18273d] text-slate-400 text-xs font-medium rounded-lg border border-[#18273d] transition-colors"
          >
            <Ico d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]} cls="w-3.5 h-3.5" />
            Knowledge Base
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Case ─────────────────────────────────────────────────────────────────

const STEPS: { id: CaseStep; label: string }[] = [
  { id: "symptom", label: "Symptom" },
  { id: "topology", label: "Topology" },
  { id: "evidence", label: "Evidence" },
  { id: "diagnosis", label: "Diagnosis" },
  { id: "verification", label: "Verification" },
];

function StepBar({ current }: { current: CaseStep }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors ${
              i < idx
                ? "text-emerald-400"
                : i === idx
                ? "text-blue-400 bg-blue-400/10"
                : "text-slate-700"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                i < idx
                  ? "bg-emerald-500 text-black"
                  : i === idx
                  ? "bg-blue-500 text-white"
                  : "bg-[#18273d] text-slate-700"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            {step.label}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-px mx-0.5 ${i < idx ? "bg-emerald-500/30" : "bg-[#18273d]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function NewCaseView() {
  const [step, setStep] = useState<CaseStep>("symptom");
  const [title, setTitle] = useState("");
  const [symptom, setSymptom] = useState("");
  const [topology, setTopology] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [expandedEv, setExpandedEv] = useState<string | null>(null);
  const [expandedDiag, setExpandedDiag] = useState<string | null>(null);
  const [verifyOut, setVerifyOut] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"none" | "pass" | "fail">("none");

  const stepOrder: CaseStep[] = ["symptom", "topology", "evidence", "diagnosis", "verification"];

  function next() {
    const i = stepOrder.indexOf(step);
    if (i < stepOrder.length - 1) setStep(stepOrder[i + 1]);
  }
  function prev() {
    const i = stepOrder.indexOf(step);
    if (i > 0) setStep(stepOrder[i - 1]);
  }

  return (
    <div className="flex h-full">
      {/* Main workflow */}
      <div className="flex-1 overflow-y-auto scrollable px-8 py-7">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-white">New Troubleshooting Case</h1>
            <p className="text-xs text-slate-600 mt-0.5">Document your fault, gather evidence, and run AI diagnosis.</p>
          </div>

          <StepBar current={step} />

          {/* ── Symptom ── */}
          {step === "symptom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Case Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. VLAN 10 hosts cannot ping VLAN 20"
                  className="w-full bg-[#0f1e31] border border-[#18273d] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Symptom Description</label>
                <textarea
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  placeholder="Describe what you observe — which hosts are affected, what you have already tried, and what the expected behavior should be..."
                  rows={5}
                  className="w-full bg-[#0f1e31] border border-[#18273d] rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Severity</label>
                <div className="flex gap-2">
                  {["Low", "Medium", "High", "Critical"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      className={`px-3.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                        severity === s
                          ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                          : "border-[#18273d] text-slate-600 hover:border-slate-600 hover:text-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Topology ── */}
          {step === "topology" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Topology Description</label>
                <textarea
                  value={topology}
                  onChange={(e) => setTopology(e.target.value)}
                  placeholder="PC-A (192.168.10.2/24) — SW1 Fa0/1 | SW1 Fa0/24 — SW2 Fa0/24 | SW2 Fa0/20 — PC-B (192.168.20.2/24)"
                  rows={3}
                  className="w-full bg-[#0f1e31] border border-[#18273d] rounded-lg px-4 py-3 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 resize-none font-mono transition-colors"
                />
              </div>
              {/* Visual diagram */}
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-6">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-5">Network Diagram</div>
                <div className="flex items-center justify-center gap-1 py-2 overflow-x-auto">
                  {/* PC-A */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-11 h-9 rounded-md bg-[#111f33] border border-[#18273d] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={1.5} className="w-5 h-5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    </div>
                    <span className="text-[9px] text-slate-600">PC-A</span>
                    <span className="text-[9px] text-blue-400 font-mono">10.0.10.2</span>
                    <span className="text-[8px] text-blue-400/60">VLAN 10</span>
                  </div>
                  <div className="w-8 h-px bg-[#18273d]" />
                  {/* SW1 */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-11 h-9 rounded-md bg-[#111f33] border border-blue-500/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} className="w-5 h-5">
                        <rect x="2" y="7" width="20" height="10" rx="1" />
                        <circle cx="6" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="10" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="14" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="18" cy="12" r="1" fill="#18273d" />
                      </svg>
                    </div>
                    <span className="text-[9px] text-slate-400">SW1</span>
                    <span className="text-[9px] text-slate-600 font-mono">Fa0/24 ↗</span>
                  </div>
                  {/* Problem link */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-0.5">
                      <div className="w-5 h-px bg-red-500/40" style={{ borderTop: "1px dashed #ef4444" }} />
                      <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center">
                        <span className="text-[8px] text-red-400 font-bold">!</span>
                      </div>
                      <div className="w-5 h-px bg-red-500/40" style={{ borderTop: "1px dashed #ef4444" }} />
                    </div>
                    <span className="text-[8px] text-red-400/80">access · access</span>
                  </div>
                  {/* SW2 */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-11 h-9 rounded-md bg-[#111f33] border border-blue-500/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={1.5} className="w-5 h-5">
                        <rect x="2" y="7" width="20" height="10" rx="1" />
                        <circle cx="6" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="10" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="14" cy="12" r="1" fill="#3b82f6" />
                        <circle cx="18" cy="12" r="1" fill="#18273d" />
                      </svg>
                    </div>
                    <span className="text-[9px] text-slate-400">SW2</span>
                    <span className="text-[9px] text-slate-600 font-mono">↗ Fa0/24</span>
                  </div>
                  <div className="w-8 h-px bg-[#18273d]" />
                  {/* PC-B */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-11 h-9 rounded-md bg-[#111f33] border border-[#18273d] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={1.5} className="w-5 h-5">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    </div>
                    <span className="text-[9px] text-slate-600">PC-B</span>
                    <span className="text-[9px] text-amber-400 font-mono">10.0.20.2</span>
                    <span className="text-[8px] text-amber-400/60">VLAN 20</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Evidence ── */}
          {step === "evidence" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 mb-4">
                Paste <code className="text-cyan-400 bg-cyan-400/8 px-1 rounded">show</code> command outputs from each device. Expand to inspect the captured data.
              </p>
              {EVIDENCE_BLOCKS.map((ev) => (
                <div key={ev.id} className="bg-[#0f1e31] border border-[#18273d] rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors"
                    onClick={() => setExpandedEv(expandedEv === ev.id ? null : ev.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-[#18273d] text-slate-400 rounded font-mono">
                        {ev.device}
                      </span>
                      <code className="text-[11px] text-cyan-400">{ev.command}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-emerald-400">✓ captured</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-3.5 h-3.5 text-slate-700 transition-transform ${expandedEv === ev.id ? "rotate-90" : ""}`}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                  {expandedEv === ev.id && (
                    <div className="border-t border-[#18273d] bg-[#080e1a] px-4 py-3">
                      <pre className="text-[10px] text-slate-400 font-mono leading-relaxed overflow-x-auto whitespace-pre">
                        {ev.output}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
              <button className="w-full border border-dashed border-[#18273d] rounded-xl py-3.5 text-xs text-slate-700 hover:border-blue-500/20 hover:text-slate-500 transition-colors flex items-center justify-center gap-2">
                <Ico d="M12 5v14M5 12h14" cls="w-3.5 h-3.5" />
                Add another device / command
              </button>
            </div>
          )}

          {/* ── Diagnosis ── */}
          {step === "diagnosis" && (
            <div className="space-y-3">
              {/* Root cause */}
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">Root Cause</div>
                <p className="text-sm text-slate-200 leading-relaxed">{DIAGNOSIS.rootCause}</p>
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-[#18273d]">
                  <div>
                    <div className="text-[9px] text-slate-700 mb-1">OSI Layer</div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${layerBadge("Layer 2")}`}>
                      Layer 2 — Data Link
                    </span>
                  </div>
                  <div className="ml-auto">
                    <div className="text-[9px] text-slate-700 mb-1.5">Confidence</div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-[#18273d] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${DIAGNOSIS.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-blue-400">{DIAGNOSIS.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#18273d]">
                  <div className="text-[9px] uppercase tracking-widest text-slate-700">Supporting Evidence</div>
                </div>
                {DIAGNOSIS.evidenceItems.map((ev) => (
                  <div key={ev.id} className="border-b border-[#18273d]/60 last:border-b-0">
                    <button
                      className="w-full text-left flex items-start justify-between px-5 py-3 hover:bg-white/2 transition-colors"
                      onClick={() => setExpandedDiag(expandedDiag === ev.id ? null : ev.id)}
                    >
                      <div className="flex items-start gap-2.5 flex-1 pr-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-slate-300 leading-snug">{ev.label}</p>
                          <code className="text-[10px] text-slate-600">{ev.source}</code>
                        </div>
                      </div>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`w-3.5 h-3.5 text-slate-700 flex-shrink-0 mt-0.5 transition-transform ${expandedDiag === ev.id ? "rotate-90" : ""}`}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                    {expandedDiag === ev.id && (
                      <div className="px-5 py-3 bg-[#080e1a] border-t border-[#18273d]">
                        <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre">
                          {ev.detail}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Next command */}
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">Next Diagnostic Command</div>
                <code className="block bg-[#080e1a] border border-[#18273d] rounded-lg px-4 py-2.5 text-sm text-cyan-400 mb-2">
                  {DIAGNOSIS.nextCommand}
                </code>
                <p className="text-xs text-slate-600 leading-relaxed">{DIAGNOSIS.nextCommandPurpose}</p>
              </div>

              {/* Fix */}
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">Suggested Fix</div>
                <pre className="bg-[#080e1a] border border-[#18273d] rounded-lg px-4 py-3 text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre overflow-x-auto">
                  {DIAGNOSIS.suggestedFix}
                </pre>
              </div>
            </div>
          )}

          {/* ── Verification ── */}
          {step === "verification" && (
            <div className="space-y-4">
              <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl px-5 py-4">
                <p className="text-sm text-amber-300 leading-relaxed">
                  Apply the fix in Packet Tracer, then paste your verification output and record the result.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  Verification Command Output
                </label>
                <textarea
                  value={verifyOut}
                  onChange={(e) => setVerifyOut(e.target.value)}
                  placeholder="Paste your `show interfaces trunk` or ping output after applying the fix..."
                  rows={7}
                  className="w-full bg-[#0f1e31] border border-[#18273d] rounded-lg px-4 py-3 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 resize-none font-mono transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-2">Result</label>
                <div className="flex gap-3">
                  {[
                    { id: "pass" as const, label: "Issue Resolved", active: "border-emerald-500 bg-emerald-500/8 text-emerald-400" },
                    { id: "fail" as const, label: "Still Failing", active: "border-red-500 bg-red-500/8 text-red-400" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setVerifyStatus(opt.id)}
                      className={`flex-1 py-3 rounded-xl border text-xs font-medium transition-colors ${
                        verifyStatus === opt.id
                          ? opt.active
                          : "border-[#18273d] text-slate-600 hover:border-slate-600"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {verifyStatus === "pass" && (
                <div className="bg-emerald-400/8 border border-emerald-400/20 rounded-xl px-5 py-4 flex items-center gap-3">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-xs text-emerald-300">Case complete. Submit for instructor review when ready.</p>
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="flex justify-between mt-8 pt-5 border-t border-[#18273d]">
            <button
              onClick={prev}
              disabled={step === "symptom"}
              className="px-4 py-2 rounded-lg text-xs text-slate-500 border border-[#18273d] hover:border-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            {step !== "verification" ? (
              <button
                onClick={next}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                {step === "evidence" ? "Run AI Diagnosis →" : "Continue →"}
              </button>
            ) : (
              <button className="px-5 py-2 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <ChatBot />
    </div>
  );
}

// ─── My Cases ─────────────────────────────────────────────────────────────────

function MyCases() {
  const [filter, setFilter] = useState<CaseStatus | "all">("all");

  const filters: Array<{ id: CaseStatus | "all"; label: string }> = [
    { id: "all", label: "All Cases" },
    { id: "open", label: "Open" },
    { id: "in-progress", label: "In Progress" },
    { id: "pending-review", label: "Pending Review" },
    { id: "resolved", label: "Resolved" },
  ];

  const filtered = filter === "all" ? MOCK_CASES : MOCK_CASES.filter((c) => c.status === filter);

  return (
    <div className="h-full overflow-y-auto scrollable px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">My Cases</h1>
          <p className="text-xs text-slate-600 mt-0.5">{MOCK_CASES.length} cases total</p>
        </div>
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                filter === f.id
                  ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                  : "border-[#18273d] text-slate-600 hover:text-slate-400 hover:border-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-[#0f1e31] border border-[#18273d] rounded-xl px-5 py-4 hover:border-blue-500/15 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono text-slate-700">{c.id}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${layerBadge(c.layer)}`}>
                      {c.layer}
                    </span>
                  </div>
                  <h3 className="text-sm text-slate-200 group-hover:text-white transition-colors">{c.title}</h3>
                  <div className="text-[10px] text-slate-600 mt-1">{c.created}</div>
                </div>
                {c.confidence > 0 ? (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px] text-slate-700 mb-1">Confidence</div>
                    <div className="text-xl font-semibold text-blue-400">{c.confidence}%</div>
                  </div>
                ) : (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px] text-slate-700 mb-1">Confidence</div>
                    <div className="text-xs text-slate-700">Pending</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

function KnowledgeBase() {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const cats = ["all", "Layer 1", "Layer 2", "Layer 3"];

  const filtered = KB_ITEMS.filter((item) => {
    const matchQ =
      search === "" ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    const matchC = cat === "all" || item.category === cat;
    return matchQ && matchC;
  });

  return (
    <div className="h-full overflow-y-auto scrollable px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Knowledge Base</h1>
          <p className="text-xs text-slate-600 mt-0.5">RAG-indexed Cisco references, troubleshooting guides, and course materials.</p>
        </div>
        <div className="relative mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search networking concepts, protocols, commands..."
            className="w-full bg-[#0f1e31] border border-[#18273d] rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 mb-5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                cat === c
                  ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                  : "border-[#18273d] text-slate-600 hover:text-slate-400"
              }`}
            >
              {c === "all" ? "All Layers" : c}
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div key={item.id} className="bg-[#0f1e31] border border-[#18273d] rounded-xl overflow-hidden">
              <button
                className="w-full text-left flex items-start justify-between px-5 py-4 hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${layerBadge(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{item.question}</p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-4 h-4 text-slate-700 flex-shrink-0 mt-1 transition-transform ${expanded === item.id ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {expanded === item.id && (
                <div className="border-t border-[#18273d] px-5 py-4 bg-[#0a1628]">
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.answer}</p>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">Related Commands</div>
                    <div className="flex flex-wrap gap-2">
                      {item.commands.map((cmd) => (
                        <code
                          key={cmd}
                          className="text-[11px] bg-[#080e1a] border border-[#18273d] text-cyan-400 px-2.5 py-1 rounded-md"
                        >
                          {cmd}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-700 text-sm">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review ───────────────────────────────────────────────────────────────────

const PENDING = MOCK_CASES.filter((c) => c.status === "pending-review");

function Review() {
  const [selected, setSelected] = useState(PENDING[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"accept" | "edit" | "reject" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const current = MOCK_CASES.find((c) => c.id === selected);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Queue sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-[#18273d] bg-[#0c1525] overflow-y-auto scrollable">
        <div className="px-4 py-4 border-b border-[#18273d]">
          <h2 className="text-xs font-medium text-white">Review Queue</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">{PENDING.length} awaiting decision</p>
        </div>
        <div className="py-1">
          {PENDING.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelected(c.id); setDecision(null); setSubmitted(false); }}
              className={`w-full text-left px-4 py-3 transition-colors border-b border-[#18273d]/50 ${
                selected === c.id
                  ? "bg-blue-500/8 border-l-2 border-l-blue-500 pl-3"
                  : "hover:bg-white/2"
              }`}
            >
              <div className="text-[9px] font-mono text-slate-700 mb-0.5">{c.id}</div>
              <div className="text-[11px] text-slate-300 leading-snug">{c.title}</div>
              <div className="text-[9px] text-slate-600 mt-0.5">By {c.student}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto scrollable px-7 py-7">
        {current ? (
          <div className="max-w-2xl">
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[9px] font-mono text-slate-700">{current.id}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(current.status)}`}>
                  {statusLabel(current.status)}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${layerBadge(current.layer)}`}>
                  {current.layer}
                </span>
              </div>
              <h1 className="text-lg font-semibold text-white">{current.title}</h1>
              <p className="text-xs text-slate-600 mt-1">
                Submitted by {current.student} — {current.created}
              </p>
            </div>

            {/* Diagnosis summary */}
            <div className="space-y-3 mb-5">
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">AI Diagnosis</div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">{DIAGNOSIS.rootCause}</p>
                <div className="flex items-center gap-5 pt-4 border-t border-[#18273d]">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${layerBadge("Layer 2")}`}>
                    Layer 2 — Data Link
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-20 h-1 rounded-full bg-[#18273d] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: "87%" }} />
                    </div>
                    <span className="text-xs font-semibold text-blue-400">87%</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-2">Suggested Fix</div>
                <pre className="text-xs text-emerald-400 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {DIAGNOSIS.suggestedFix}
                </pre>
              </div>
            </div>

            {/* Decision */}
            {!submitted ? (
              <div className="bg-[#0f1e31] border border-[#18273d] rounded-xl p-5">
                <div className="text-[9px] uppercase tracking-widest text-slate-700 mb-3">Reviewer Decision</div>
                <div className="flex gap-2 mb-4">
                  {[
                    { id: "accept" as const, label: "Accept", active: "border-emerald-500 bg-emerald-500/8 text-emerald-400" },
                    { id: "edit" as const, label: "Edit & Accept", active: "border-amber-500 bg-amber-500/8 text-amber-400" },
                    { id: "reject" as const, label: "Reject", active: "border-red-500 bg-red-500/8 text-red-400" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDecision(opt.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        decision === opt.id
                          ? opt.active
                          : "border-[#18273d] text-slate-600 hover:text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reviewer notes (optional) — visible to the student after decision..."
                  rows={3}
                  className="w-full bg-[#080e1a] border border-[#18273d] rounded-lg px-3 py-2.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-blue-500/40 resize-none transition-colors"
                />
                <button
                  disabled={!decision}
                  onClick={() => setSubmitted(true)}
                  className="mt-3 w-full py-2.5 rounded-lg text-xs font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
                >
                  Submit Review
                </button>
              </div>
            ) : (
              <div className="bg-emerald-400/8 border border-emerald-400/20 rounded-xl px-5 py-4 flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="text-xs text-emerald-300">
                  Review submitted — decision: <strong className="capitalize">{decision}</strong>. Student has been notified.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-700 text-sm">
            No cases in review queue.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="flex h-screen bg-[#0b1120] text-slate-200">
      <Sidebar active={view} onNav={setView} />
      <main className="flex-1 overflow-hidden">
        {view === "dashboard" && <Dashboard onNav={setView} />}
        {view === "new-case" && <NewCaseView />}
        {view === "my-cases" && <MyCases />}
        {view === "knowledge-base" && <KnowledgeBase />}
        {view === "review" && <Review />}
      </main>
    </div>
  );
}
