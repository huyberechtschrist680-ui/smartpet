"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Snapshot = {
  ok: true;
  device: string;
  online: boolean;
  status: null | {
    device: string;
    mode?: string;
    power?: string;
    emotion?: number;
    food?: string;
    remain?: number;
    motion?: string;
    uptime_ms?: number;
    received_at: number;
  };
  pending: null | {
    id: string;
    command: string;
    status: string;
    created_at: number;
    delivered_at?: number;
  };
  last_ack: null | {
    id?: string;
    command?: string;
    result: string;
    ack_at: number;
    matched_pending: boolean;
  };
  events: Array<{ time: number; type: string; text: string }>;
  server_time: number;
  storage: "upstash" | "memory";
};

function formatTime(ts?: number) {
  if (!ts) return "--";
  return new Date(ts).toLocaleString();
}

function formatAgo(ts?: number) {
  if (!ts) return "--";
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s 前`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s 前`;
}

const buttons = [
  ["摸头", "touch"],
  ["喂食", "feed"],
  ["无动作", "setmot 0"],
  ["玩耍", "setmot 1"],
  ["闲逛", "setmot 2"],
  ["疲惫", "setmot 3"],
  ["前进", "setmot 4"],
  ["睡觉", "setslp true"],
  ["唤醒", "setslp false"],
  ["吃饱", "setful true"],
  ["饥饿", "setful false"],
  ["请求状态", "state"],
] as const;

export default function Home() {
  const [password, setPassword] = useState("");
  const [device, setDevice] = useState(process.env.NEXT_PUBLIC_DEFAULT_DEVICE || "smartpet-01");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [emotion, setEmotion] = useState(5);
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const addLog = useCallback((message: string) => {
    setLogs((old) => [`${new Date().toLocaleTimeString()}  ${message}`, ...old].slice(0, 80));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("smartpet-admin-password");
    const savedDevice = localStorage.getItem("smartpet-device-id");
    if (saved) setPassword(saved);
    if (savedDevice) setDevice(savedDevice);
  }, []);

  useEffect(() => {
    if (password) localStorage.setItem("smartpet-admin-password", password);
  }, [password]);

  useEffect(() => {
    if (device) localStorage.setItem("smartpet-device-id", device);
  }, [device]);

  const refresh = useCallback(async () => {
    if (!password) return;
    try {
      const response = await fetch(`/api/smartpet/admin/state?device=${encodeURIComponent(device)}`, {
        headers: { "X-Admin-Password": password },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        addLog(`刷新失败：${data.error || response.status}`);
        return;
      }
      setSnapshot(data);
    } catch (error) {
      addLog(`刷新异常：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [addLog, device, password]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const sendCommand = useCallback(
    async (command: string) => {
      if (!password) {
        addLog("请先输入管理密码");
        return;
      }
      setBusy(true);
      try {
        const response = await fetch("/api/smartpet/admin/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, device, command }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          addLog(`命令失败 ${command}：${data.error || response.status}`);
          return;
        }
        addLog(`已下发：${data.id} ${data.command}`);
        await refresh();
      } catch (error) {
        addLog(`命令异常：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setBusy(false);
      }
    },
    [addLog, device, password, refresh]
  );

  const clearCommand = useCallback(async () => {
    if (!password) return;
    setBusy(true);
    try {
      const response = await fetch("/api/smartpet/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, device }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        addLog(`清空失败：${data.error || response.status}`);
        return;
      }
      addLog("已清空待执行命令");
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [addLog, device, password, refresh]);

  const status = snapshot?.status;
  const onlineText = snapshot?.online ? "在线" : "离线";
  const onlineClass = snapshot?.online ? "ok" : "bad";

  const apiBase = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Vercel API部署</p>
          <h1>SmartPet 远程操控台</h1>
        </div>
        <button className="secondary" onClick={refresh}>刷新</button>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>连接设置</h2>
          <label>
            设备 ID
            <input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="smartpet-01" />
          </label>
          <label>
            管理密码
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Vercel 环境变量 SMARTPET_ADMIN_PASSWORD" />
          </label>
        </div>

        <div className="card status-card">
          <h2>最新状态</h2>
          <div className={`pill ${onlineClass}`}>{onlineText}</div>
          <dl className="status-list">
            <div><dt>Emotion</dt><dd>{status?.emotion ?? "--"}</dd></div>
            <div><dt>Food</dt><dd>{status?.food ?? "--"}</dd></div>
            <div><dt>Power</dt><dd>{status?.power ?? "--"}</dd></div>
            <div><dt>Motion</dt><dd>{status?.motion ?? "--"}</dd></div>
            <div><dt>Remain</dt><dd>{status?.remain ?? "--"} s</dd></div>
            <div><dt>Uptime</dt><dd>{status?.uptime_ms ?? "--"} ms</dd></div>
          </dl>
          <p className="hint">最近上报：{formatAgo(status?.received_at)}（{formatTime(status?.received_at)}）</p>
          <p className="hint">存储：{snapshot?.storage || "--"}</p>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>远程控制</h2>
          <div className="button-grid">
            {buttons.map(([label, command]) => (
              <button key={command} onClick={() => sendCommand(command)} disabled={busy}>{label}</button>
            ))}
          </div>
          <div className="emotion-row">
            <label>心情值：{emotion}</label>
            <input type="range" min="1" max="10" value={emotion} onChange={(e) => setEmotion(Number(e.target.value))} />
            <button onClick={() => sendCommand(`setemo ${emotion}`)} disabled={busy}>设置心情</button>
          </div>
        </div>

        <div className="card">
          <h2>命令队列</h2>
          {snapshot?.pending ? (
            <div className="pending">
              <p><b>{snapshot.pending.command}</b></p>
              <p>ID：{snapshot.pending.id}</p>
              <p>状态：{snapshot.pending.status}</p>
              <p>创建：{formatTime(snapshot.pending.created_at)}</p>
              <p>下发：{formatTime(snapshot.pending.delivered_at)}</p>
            </div>
          ) : <p className="empty">当前没有待执行命令。</p>}
          <button className="danger" onClick={clearCommand} disabled={busy}>清空待执行命令</button>

          <h3>最近 ACK</h3>
          {snapshot?.last_ack ? (
            <div className="pending">
              <p>结果：{snapshot.last_ack.result}</p>
              <p>ID：{snapshot.last_ack.id || "--"}</p>
              <p>匹配待执行命令：{snapshot.last_ack.matched_pending ? "是" : "否"}</p>
              <p>时间：{formatTime(snapshot.last_ack.ack_at)}</p>
            </div>
          ) : <p className="empty">暂无 ACK。</p>}
        </div>
      </section>

      <section className="card">
        <h2>ESP32 API</h2>
        <div className="api-grid">
          <code>POST {apiBase}/api/smartpet/sync</code>
          <code>{"Authorization: Bearer <SMARTPET_API_TOKEN>"}</code>
          <code>{`{"device":"${device || "smartpet-01"}","heartbeat":true,"mode":"website","uptime_ms":123456,"status":{"power":"NORMAL","emotion":5,"food":"HUNGRY","remain":0,"motion":"NULL"},"ack":null}`}</code>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>事件日志</h2>
          <div className="event-log">
            {(snapshot?.events || []).map((event) => (
              <div key={`${event.time}-${event.text}`}>
                <span>{formatTime(event.time)}</span>
                <b>{event.type}</b>
                <p>{event.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>网页日志</h2>
          <div className="event-log">
            {logs.map((line, index) => <p key={index}>{line}</p>)}
          </div>
        </div>
      </section>
    </main>
  );
}
