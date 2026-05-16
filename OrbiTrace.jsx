import { useState, useEffect, useRef, useCallback } from "react";

const PALETTE = {
  bg: "#0a0d12",
  surface: "#0f1319",
  panel: "#13181f",
  border: "#1e2530",
  borderHi: "#2a3445",
  accent: "#00d4ff",
  accentDim: "#0099bb",
  green: "#00ff88",
  greenDim: "#00cc66",
  amber: "#ffaa00",
  red: "#ff4455",
  purple: "#aa88ff",
  text: "#c8d4e0",
  textMuted: "#5a6a7a",
  textDim: "#3a4a5a",
};

const EVENT_TYPES = ["syscall", "network", "file_io", "memory", "process", "scheduler"];
const SYSCALLS = ["read","write","open","close","execve","mmap","brk","socket","connect","accept","sendto","recvfrom","stat","fstat","lstat","poll","select","clone","fork","exit_group","futex","nanosleep","ioctl","fcntl","getpid","getuid","kill","signal","pipe","dup2"];
const PROCESSES = ["nginx","postgres","redis","node","python3","bash","sshd","systemd","chrome","dockerd","containerd","kubelet","etcd","prometheus"];
const NETOPS = ["TCP_CONNECT","TCP_ACCEPT","UDP_SEND","UDP_RECV","DNS_QUERY","TLS_HANDSHAKE"];
const FILES = ["/etc/passwd","/var/log/syslog","/proc/meminfo","/dev/null","/tmp/app.sock","/var/run/docker.sock","/home/user/.ssh/config","/proc/net/tcp","/sys/kernel/debug/tracing/trace_pipe","/var/lib/postgresql/data"];
const PROBES = ["sys_enter_*","kprobe:tcp_connect","kprobe:vfs_read","kprobe:vfs_write","uprobe:malloc","kprobe:schedule","tracepoint:block_rq_issue","kprobe:do_exit","kprobe:sys_clone","xdp:xdp_pass","kprobe:ip_output","kprobe:__kmalloc"];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

function generateTrace() {
  const type = pick(EVENT_TYPES);
  const pid = rand(1000, 65535);
  const ts = Date.now();
  const proc = pick(PROCESSES);
  const cpu = rand(0, 15);
  const lat = rand(1, 9999);
  let detail = "";
  if (type === "syscall") detail = `${pick(SYSCALLS)}() fd=${rand(0,100)} ret=${rand(-1,255)}`;
  else if (type === "network") detail = `${pick(NETOPS)} ${rand(10,200)}.${rand(0,255)}.${rand(0,255)}.${rand(0,255)}:${rand(1024,65535)}`;
  else if (type === "file_io") detail = `${pick(["open","read","write","close","fsync"])}(${pick(FILES)}) bytes=${rand(0,65536)}`;
  else if (type === "memory") detail = `${pick(["malloc","free","mmap","munmap","brk"])} size=${rand(8,65536*16)} addr=0x${rand(0x100000,0xffffff).toString(16).padStart(12,'0')}`;
  else if (type === "process") detail = `${pick(["fork","exec","exit","clone","waitpid"])} child_pid=${rand(1000,65535)} flags=0x${rand(0,255).toString(16).padStart(2,'0')}`;
  else detail = `ctx_switch → ${pick(PROCESSES)}[${rand(1000,65535)}] prio=${rand(0,139)} cpu=${rand(0,15)}`;
  return { id: Math.random().toString(36).slice(2), type, pid, proc, cpu, lat, detail, ts };
}

const TYPE_COLOR = {
  syscall: PALETTE.accent,
  network: PALETTE.green,
  file_io: PALETTE.amber,
  memory: PALETTE.purple,
  process: PALETTE.red,
  scheduler: PALETTE.textMuted,
};

const TYPE_ICON = {
  syscall: "⬡",
  network: "⬢",
  file_io: "▣",
  memory: "◈",
  process: "◉",
  scheduler: "◎",
};

function useCounter(val) {
  const ref = useRef(val);
  const [disp, setDisp] = useState(val);
  useEffect(() => {
    const diff = val - ref.current;
    if (diff === 0) return;
    const steps = 12;
    let i = 0;
    const inc = diff / steps;
    const iv = setInterval(() => {
      i++;
      ref.current += inc;
      setDisp(Math.round(ref.current));
      if (i >= steps) { clearInterval(iv); ref.current = val; setDisp(val); }
    }, 20);
    return () => clearInterval(iv);
  }, [val]);
  return disp;
}

function Sparkline({ data, color, height = 32, width = 120 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={color} fillOpacity="0.08" stroke="none" />
    </svg>
  );
}

function Badge({ type }) {
  const color = TYPE_COLOR[type] || PALETTE.textMuted;
  return (
    <span style={{
      fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: 1,
      color, border: `1px solid ${color}33`, borderRadius: 3,
      padding: "1px 6px", textTransform: "uppercase", flexShrink: 0,
      background: `${color}11`,
    }}>{TYPE_ICON[type]} {type}</span>
  );
}

function MetricCard({ label, value, unit, color, spark }) {
  const v = useCounter(value);
  return (
    <div style={{
      background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
      borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4,
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 11, color: PALETTE.textMuted, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "monospace" }}>{v.toLocaleString()}</span>
          {unit && <span style={{ fontSize: 12, color: PALETTE.textMuted, marginLeft: 4 }}>{unit}</span>}
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
    </div>
  );
}

function ProbeChip({ probe, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${PALETTE.accent}18` : "transparent",
      border: `1px solid ${active ? PALETTE.accent : PALETTE.border}`,
      borderRadius: 4, padding: "3px 8px", cursor: "pointer",
      color: active ? PALETTE.accent : PALETTE.textMuted,
      fontSize: 11, fontFamily: "monospace", transition: "all .15s",
      whiteSpace: "nowrap",
    }}>{probe}</button>
  );
}

function TraceRow({ trace, selected, onClick }) {
  const color = TYPE_COLOR[trace.type];
  const latColor = trace.lat > 5000 ? PALETTE.red : trace.lat > 1000 ? PALETTE.amber : PALETTE.green;
  return (
    <div onClick={onClick} style={{
      display: "grid", gridTemplateColumns: "90px 80px 110px 70px 60px 1fr",
      gap: 0, padding: "4px 12px", cursor: "pointer", borderBottom: `1px solid ${PALETTE.border}33`,
      background: selected ? `${PALETTE.accent}0a` : "transparent",
      transition: "background .1s",
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = `${PALETTE.border}60`; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: PALETTE.textMuted, paddingTop: 2 }}>
        {new Date(trace.ts).toISOString().slice(11, 23)}
      </span>
      <Badge type={trace.type} />
      <span style={{ fontSize: 12, fontFamily: "monospace", color: PALETTE.text, paddingTop: 2 }}>{trace.proc}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: PALETTE.textMuted, paddingTop: 2 }}>{trace.pid}</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: latColor, paddingTop: 2 }}>{trace.lat}µs</span>
      <span style={{ fontSize: 11, fontFamily: "monospace", color: PALETTE.textDim, paddingTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trace.detail}</span>
    </div>
  );
}

function HeatMap({ data }) {
  const max = Math.max(...Object.values(data), 1);
  const types = EVENT_TYPES;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${types.length}, 1fr)`, gap: 2 }}>
      {types.map(t => {
        const v = data[t] || 0;
        const intensity = v / max;
        const color = TYPE_COLOR[t];
        return (
          <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: "100%", height: 28, borderRadius: 3,
              background: `${color}`,
              opacity: 0.1 + intensity * 0.85,
              border: `1px solid ${color}44`,
              transition: "opacity .3s",
            }} />
            <span style={{ fontSize: 9, color: PALETTE.textMuted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5 }}>{t.slice(0,4)}</span>
            <span style={{ fontSize: 10, color, fontFamily: "monospace" }}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}

function CPUChart({ data }) {
  const cpus = Array.from({ length: 8 }, (_, i) => i);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 3 }}>
      {cpus.map(cpu => {
        const v = data[cpu] || 0;
        return (
          <div key={cpu} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              width: "100%", display: "flex", alignItems: "flex-end",
              height: 40, background: PALETTE.border + "44", borderRadius: 2, overflow: "hidden",
            }}>
              <div style={{
                width: "100%", height: `${Math.min(100, v)}%`,
                background: v > 80 ? PALETTE.red : v > 50 ? PALETTE.amber : PALETTE.green,
                transition: "height .4s ease, background .3s",
              }} />
            </div>
            <span style={{ fontSize: 9, color: PALETTE.textMuted, fontFamily: "monospace" }}>cpu{cpu}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OrbiTrace() {
  const [running, setRunning] = useState(true);
  const [traces, setTraces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState(new Set());
  const [activeProbes, setActiveProbes] = useState(new Set(PROBES.slice(0, 4)));
  const [metrics, setMetrics] = useState({ events: 0, syscalls: 0, netEvents: 0, drops: 0 });
  const [sparks, setSparks] = useState({ events: [], syscalls: [], net: [] });
  const [heatmap, setHeatmap] = useState({});
  const [cpuLoad, setCpuLoad] = useState({});
  const [tab, setTab] = useState("traces");
  const listRef = useRef(null);
  const autoScroll = useRef(true);

  const tick = useCallback(() => {
    if (!running) return;
    const batch = Array.from({ length: rand(2, 6) }, generateTrace);
    setTraces(prev => {
      const next = [...prev, ...batch].slice(-500);
      return next;
    });
    setMetrics(prev => ({
      events: prev.events + batch.length,
      syscalls: prev.syscalls + batch.filter(t => t.type === "syscall").length,
      netEvents: prev.netEvents + batch.filter(t => t.type === "network").length,
      drops: prev.drops + (Math.random() < 0.03 ? 1 : 0),
    }));
    setSparks(prev => ({
      events: [...prev.events.slice(-24), batch.length * 4].slice(-25),
      syscalls: [...prev.syscalls.slice(-24), batch.filter(t => t.type === "syscall").length * 8].slice(-25),
      net: [...prev.net.slice(-24), batch.filter(t => t.type === "network").length * 6].slice(-25),
    }));
    setHeatmap(prev => {
      const next = { ...prev };
      batch.forEach(t => { next[t.type] = (next[t.type] || 0) + 1; });
      return next;
    });
    setCpuLoad(() => {
      const load = {};
      for (let i = 0; i < 8; i++) load[i] = rand(5, 95);
      return load;
    });
  }, [running]);

  useEffect(() => {
    const iv = setInterval(tick, 400);
    return () => clearInterval(iv);
  }, [tick]);

  useEffect(() => {
    if (autoScroll.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [traces]);

  const filteredTraces = traces.filter(t => {
    const matchText = !filter || t.proc.includes(filter) || t.detail.includes(filter) || String(t.pid).includes(filter);
    const matchType = typeFilter.size === 0 || typeFilter.has(t.type);
    return matchText && matchType;
  });

  const toggleType = (type) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const toggleProbe = (p) => {
    setActiveProbes(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const selectedTrace = traces.find(t => t.id === selected);

  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh", color: PALETTE.text, fontFamily: "monospace", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: PALETTE.surface, borderBottom: `1px solid ${PALETTE.border}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke={PALETTE.accent} strokeWidth="1.5" opacity="0.4" />
            <circle cx="14" cy="14" r="8" fill="none" stroke={PALETTE.accent} strokeWidth="1" opacity="0.6" />
            <circle cx="14" cy="14" r="4" fill={PALETTE.accent} opacity="0.9" />
            <circle cx="14" cy="4" r="2" fill={PALETTE.accent} opacity="0.7" />
            <circle cx="14" cy="24" r="2" fill={PALETTE.accent} opacity="0.7" />
            <circle cx="4" cy="14" r="2" fill={PALETTE.accent} opacity="0.7" />
            <circle cx="24" cy="14" r="2" fill={PALETTE.accent} opacity="0.7" />
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: PALETTE.accent, letterSpacing: 2 }}>ORBITRACE</div>
            <div style={{ fontSize: 9, color: PALETTE.textMuted, letterSpacing: 1 }}>eBPF KERNEL TRACER v2.1.0</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: running ? PALETTE.green : PALETTE.red, boxShadow: running ? `0 0 6px ${PALETTE.green}` : "none" }} />
          <span style={{ fontSize: 11, color: running ? PALETTE.green : PALETTE.red }}>{running ? "TRACING" : "PAUSED"}</span>
        </div>
        <button onClick={() => setRunning(r => !r)} style={{
          background: running ? `${PALETTE.red}22` : `${PALETTE.green}22`,
          border: `1px solid ${running ? PALETTE.red : PALETTE.green}`,
          borderRadius: 4, padding: "5px 14px", color: running ? PALETTE.red : PALETTE.green,
          cursor: "pointer", fontSize: 11, letterSpacing: 1,
        }}>{running ? "⏸ PAUSE" : "▶ RESUME"}</button>
        <button onClick={() => setTraces([])} style={{
          background: "transparent", border: `1px solid ${PALETTE.border}`,
          borderRadius: 4, padding: "5px 14px", color: PALETTE.textMuted,
          cursor: "pointer", fontSize: 11, letterSpacing: 1,
        }}>✕ CLEAR</button>
      </div>

      {/* Metrics row */}
      <div style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, flexShrink: 0 }}>
        <MetricCard label="Total Events" value={metrics.events} color={PALETTE.accent} spark={sparks.events} />
        <MetricCard label="Syscalls" value={metrics.syscalls} color={PALETTE.purple} spark={sparks.syscalls} />
        <MetricCard label="Net Events" value={metrics.netEvents} color={PALETTE.green} spark={sparks.net} />
        <MetricCard label="Ring Drops" value={metrics.drops} color={PALETTE.red} />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 280px", gap: 0, minHeight: 0, padding: "0 20px 16px" }}>
        {/* Left: trace panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0, paddingRight: 10 }}>
          {/* Tabs + filter */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["traces", "probes"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? `${PALETTE.accent}18` : "transparent",
                border: `1px solid ${tab === t ? PALETTE.accent : PALETTE.border}`,
                borderRadius: 4, padding: "4px 12px", cursor: "pointer",
                color: tab === t ? PALETTE.accent : PALETTE.textMuted,
                fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
              }}>{t}</button>
            ))}
            <div style={{ flex: 1 }} />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="filter by process, pid, detail..."
              style={{
                background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
                borderRadius: 4, padding: "5px 10px", color: PALETTE.text,
                fontSize: 11, width: 240, outline: "none",
              }}
            />
          </div>

          {/* Type filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EVENT_TYPES.map(type => (
              <button key={type} onClick={() => toggleType(type)} style={{
                background: typeFilter.has(type) ? `${TYPE_COLOR[type]}22` : "transparent",
                border: `1px solid ${typeFilter.has(type) ? TYPE_COLOR[type] : PALETTE.border}`,
                borderRadius: 3, padding: "2px 8px", cursor: "pointer",
                color: typeFilter.has(type) ? TYPE_COLOR[type] : PALETTE.textMuted,
                fontSize: 10, letterSpacing: 0.5, transition: "all .15s",
              }}>{TYPE_ICON[type]} {type}</button>
            ))}
            <span style={{ fontSize: 10, color: PALETTE.textMuted, alignSelf: "center", marginLeft: 4 }}>
              {filteredTraces.length} events
            </span>
          </div>

          {tab === "traces" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {/* Column headers */}
              <div style={{
                display: "grid", gridTemplateColumns: "90px 80px 110px 70px 60px 1fr",
                padding: "4px 12px", borderBottom: `1px solid ${PALETTE.border}`,
                background: PALETTE.panel, borderRadius: "6px 6px 0 0", flexShrink: 0,
              }}>
                {["timestamp","type","process","pid","latency","detail"].map(h => (
                  <span key={h} style={{ fontSize: 9, color: PALETTE.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{h}</span>
                ))}
              </div>
              {/* Trace list */}
              <div
                ref={listRef}
                onScroll={e => { const el = e.currentTarget; autoScroll.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 10; }}
                style={{
                  flex: 1, overflowY: "auto", background: PALETTE.panel,
                  borderRadius: "0 0 6px 6px", border: `1px solid ${PALETTE.border}`, borderTop: "none",
                  minHeight: 240,
                }}
              >
                {filteredTraces.map(t => (
                  <TraceRow key={t.id} trace={t} selected={selected === t.id} onClick={() => setSelected(s => s === t.id ? null : t.id)} />
                ))}
                {filteredTraces.length === 0 && (
                  <div style={{ padding: 32, textAlign: "center", color: PALETTE.textMuted, fontSize: 12 }}>no events match filter</div>
                )}
              </div>
              {/* Detail panel */}
              {selectedTrace && (
                <div style={{
                  background: PALETTE.panel, border: `1px solid ${PALETTE.accent}44`,
                  borderRadius: 6, padding: 14, marginTop: 8, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 10, color: PALETTE.accent, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>⬡ Event Detail</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                    {[
                      ["Type", selectedTrace.type],
                      ["Process", selectedTrace.proc],
                      ["PID", selectedTrace.pid],
                      ["CPU", `cpu${selectedTrace.cpu}`],
                      ["Latency", `${selectedTrace.lat}µs`],
                      ["Timestamp", new Date(selectedTrace.ts).toISOString()],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 11, color: PALETTE.textMuted, minWidth: 80 }}>{k}</span>
                        <span style={{ fontSize: 11, color: PALETTE.text, fontFamily: "monospace" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${PALETTE.border}` }}>
                    <span style={{ fontSize: 11, color: PALETTE.textMuted }}>detail </span>
                    <span style={{ fontSize: 11, color: PALETTE.text }}>{selectedTrace.detail}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Probes tab */
            <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: 14, flex: 1 }}>
              <div style={{ fontSize: 10, color: PALETTE.accent, letterSpacing: 1, marginBottom: 12, textTransform: "uppercase" }}>Active eBPF Probes ({activeProbes.size}/{PROBES.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PROBES.map(p => (
                  <ProbeChip key={p} probe={p} active={activeProbes.has(p)} onClick={() => toggleProbe(p)} />
                ))}
              </div>
              <div style={{ marginTop: 20, padding: 12, background: PALETTE.bg, borderRadius: 4, border: `1px solid ${PALETTE.border}` }}>
                <div style={{ fontSize: 9, color: PALETTE.textMuted, marginBottom: 8, letterSpacing: 1 }}>LOADED BPF PROGRAMS</div>
                {[...activeProbes].map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderBottom: `1px solid ${PALETTE.border}33` }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: PALETTE.green, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: PALETTE.text }}>{p}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: PALETTE.textMuted }}>prog_fd={rand(3,99)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Event heatmap */}
          <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, color: PALETTE.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Event Heatmap</div>
            <HeatMap data={heatmap} />
          </div>

          {/* CPU load */}
          <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, color: PALETTE.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>CPU Activity</div>
            <CPUChart data={cpuLoad} />
          </div>

          {/* Top processes */}
          <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: 12, flex: 1 }}>
            <div style={{ fontSize: 10, color: PALETTE.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>Top Processes</div>
            {(() => {
              const counts = {};
              traces.slice(-200).forEach(t => { counts[t.proc] = (counts[t.proc] || 0) + 1; });
              const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
              const max = sorted[0]?.[1] || 1;
              return sorted.map(([proc, count]) => (
                <div key={proc} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: PALETTE.text }}>{proc}</span>
                    <span style={{ fontSize: 10, color: PALETTE.textMuted }}>{count}</span>
                  </div>
                  <div style={{ height: 3, background: PALETTE.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: PALETTE.accent, borderRadius: 2, transition: "width .3s" }} />
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* Ring buffer */}
          <div style={{ background: PALETTE.panel, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, color: PALETTE.textMuted, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Ring Buffer</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: PALETTE.textMuted }}>capacity</span>
              <span style={{ color: PALETTE.text }}>64 MB</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: PALETTE.textMuted }}>buffered</span>
              <span style={{ color: PALETTE.green }}>{Math.min(traces.length, 500)} events</span>
            </div>
            <div style={{ height: 4, background: PALETTE.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(traces.length / 500) * 100}%`, background: traces.length > 400 ? PALETTE.red : PALETTE.green, borderRadius: 2, transition: "width .3s" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
