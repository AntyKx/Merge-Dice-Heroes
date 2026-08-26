import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError, PROMOTED_FIELDS } from "./api";
import type { AuditLogEntry, Player, PromotedField } from "./api";
import * as api from "./api";
import { auth, onAuthStateChanged, signIn, signOutUser } from "./firebase";
import type { User } from "./firebase";

const FIELD_LABELS: Record<PromotedField, string> = {
  wins: "勝場",
  losses: "敗場",
  bestWave: "最高波數",
  crystals: "水晶",
  sigils: "徽記",
  materials: "素材",
  stamina: "體力",
};

function formatDate(value: string | number | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("zh-TW");
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  useEffect(() => {
    if (!user) return;
    setForbidden(false);
    api
      .listPlayers()
      .then(() => setForbidden(false))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }, [user]);

  if (user === undefined) return <div className="center-message">載入中…</div>;

  if (!user) {
    return (
      <div className="center-message">
        <h1>Merge Dice Heroes 後台</h1>
        <button className="primary" onClick={() => signIn().catch(() => {})}>
          使用 Google 登入
        </button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="center-message">
        <p>此帳號（{user.email}）沒有管理員權限。</p>
        <button onClick={() => signOutUser()}>登出</button>
      </div>
    );
  }

  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"players" | "audit">("players");

  return (
    <div className="dashboard">
      <header className="topbar">
        <h1>Merge Dice Heroes 後台</h1>
        <nav>
          <button className={tab === "players" ? "tab active" : "tab"} onClick={() => setTab("players")}>
            玩家
          </button>
          <button className={tab === "audit" ? "tab active" : "tab"} onClick={() => setTab("audit")}>
            操作紀錄
          </button>
        </nav>
        <div className="whoami">
          <span>{user.email}</span>
          <button onClick={() => signOutUser()}>登出</button>
        </div>
      </header>
      <main>{tab === "players" ? <PlayersPanel /> : <AuditPanel />}</main>
    </div>
  );
}

function PlayersPanel() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const runSearch = (q: string) => {
    setLoading(true);
    api
      .listPlayers(q || undefined)
      .then(setPlayers)
      .catch((err) => alert(err instanceof Error ? err.message : "查詢失敗"))
      .finally(() => setLoading(false));
  };

  useEffect(() => runSearch(""), []);

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="players-panel">
      <section className="players-list">
        <form onSubmit={onSearchSubmit} className="search-bar">
          <input placeholder="搜尋玩家暱稱…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit">搜尋</button>
        </form>
        {loading ? (
          <p className="hint">載入中…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>暱稱</th>
                <th>勝/敗</th>
                <th>最高波數</th>
                <th>水晶</th>
                <th>更新時間</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.uid} className={p.uid === selectedUid ? "selected" : ""} onClick={() => setSelectedUid(p.uid)}>
                  <td>{p.playerName}</td>
                  <td>
                    {p.wins}/{p.losses}
                  </td>
                  <td>{p.bestWave}</td>
                  <td>{p.crystals}</td>
                  <td>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={5} className="hint">
                    沒有符合的玩家
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </section>
      <section className="player-detail">
        {selectedUid ? (
          <PlayerDetail uid={selectedUid} onChanged={() => runSearch(query)} />
        ) : (
          <p className="hint">從左側選擇一位玩家查看詳情。</p>
        )}
      </section>
    </div>
  );
}

function PlayerDetail({ uid, onChanged }: { uid: string; onChanged: () => void }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [grantField, setGrantField] = useState<PromotedField>("crystals");
  const [grantDelta, setGrantDelta] = useState("");
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const load = () => {
    api
      .getPlayer(uid)
      .then(({ player, progress }) => {
        setPlayer(player);
        setProgress(progress);
      })
      .catch((err) => alert(err instanceof Error ? err.message : "讀取失敗"));
  };

  useEffect(load, [uid]);

  const submitGrant = (e: FormEvent) => {
    e.preventDefault();
    const delta = Number(grantDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      setGrantError("請輸入非零的數字");
      return;
    }
    setGranting(true);
    setGrantError(null);
    api
      .grant(uid, { [grantField]: delta })
      .then(({ player }) => {
        setPlayer(player);
        setGrantDelta("");
        onChanged();
      })
      .catch((err) => setGrantError(err instanceof Error ? err.message : "發放失敗"))
      .finally(() => setGranting(false));
  };

  if (!player) return <p className="hint">載入中…</p>;

  return (
    <div>
      <h2>{player.playerName}</h2>
      <p className="hint mono">{player.uid}</p>
      <p className="hint">{player.email ?? "(無 email)"}</p>

      <div className="stat-grid">
        {PROMOTED_FIELDS.map((field) => (
          <div key={field}>
            <b>{player[field]}</b>
            <small>{FIELD_LABELS[field]}</small>
          </div>
        ))}
      </div>

      <p className="hint">建立於 {formatDate(player.createdAt)} · 更新於 {formatDate(player.updatedAt)}</p>

      <form className="grant-form" onSubmit={submitGrant}>
        <h3>發放/扣除</h3>
        <div className="grant-form-row">
          <select value={grantField} onChange={(e) => setGrantField(e.target.value as PromotedField)}>
            {PROMOTED_FIELDS.map((field) => (
              <option key={field} value={field}>
                {FIELD_LABELS[field]}
              </option>
            ))}
          </select>
          <input type="number" placeholder="數量（可負數）" value={grantDelta} onChange={(e) => setGrantDelta(e.target.value)} />
          <button type="submit" disabled={granting}>
            {granting ? "處理中…" : "送出"}
          </button>
        </div>
        {grantError && <p className="error">{grantError}</p>}
      </form>

      <button className="link-button" onClick={() => setShowRaw((v) => !v)}>
        {showRaw ? "隱藏" : "顯示"}原始存檔 JSON
      </button>
      {showRaw && <pre className="raw-json">{progress ? JSON.stringify(progress, null, 2) : "(無存檔)"}</pre>}
    </div>
  );
}

function AuditPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .fetchAuditLog()
      .then(setEntries)
      .catch((err) => alert(err instanceof Error ? err.message : "讀取失敗"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="hint">載入中…</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>時間</th>
          <th>管理員</th>
          <th>動作</th>
          <th>對象</th>
          <th>內容</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{formatDate(entry.createdAt)}</td>
            <td className="mono">{entry.adminUid.slice(0, 8)}…</td>
            <td>{entry.action}</td>
            <td className="mono">{entry.targetUid ? `${entry.targetUid.slice(0, 8)}…` : "-"}</td>
            <td className="mono">{entry.detail ?? "-"}</td>
          </tr>
        ))}
        {entries.length === 0 && (
          <tr>
            <td colSpan={5} className="hint">
              尚無紀錄
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
