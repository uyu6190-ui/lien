import React, { useState, useRef, useEffect } from "react";

/* ─────────────────────────────────────────────
   lien — link page studio  v3
   白 / 黒 / グレー基調、薄い水色アクセント
   レイアウト: 左=構造エディタ / 右=ライブキャンバス
   機能: リンク・画像・動画・余白・テキスト / SNSリンク
         背景色・背景画像・文字色・ボタン形状 / HTML書き出し
   ───────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9);

const youTubeId = (url) => {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : null;
};

/* ── アプリの基本情報(あとで差し替え可能) ── */
const APP_NAME = "lien";
const DEV_NAME = "inu teddy";
const DEV_X_URL = "https://x.com/inuteddy12";
// お問い合わせ先。専用フォームができたらここを差し替える
const CONTACT_URL = "https://x.com/inuteddy12";
// App Storeでの審査・公開後に id を設定する: https://apps.apple.com/app/idXXXXXXXXXX?action=write-review
const APP_STORE_REVIEW_URL = "";

/* ── アプリUIのトークン ── */
const UI = {
  bg: "#F7F8F9",
  panel: "#FFFFFF",
  ink: "#17191B",
  gray: "#878D93",
  faint: "#B8BDC2",
  line: "#E5E8EA",
  accent: "#A9D7E8",
  accentDeep: "#5FA8C7",
  accentBg: "#EDF6FA",
  mono: "'IBM Plex Mono', monospace",
  sans: "'Zen Kaku Gothic New', sans-serif",
};

/* ── 公開ページのカラープリセット ── */
const PRESETS = [
  { key: "paper", label: "PAPER", bg: "#FFFFFF", accent: "#A9D7E8", dark: true },
  { key: "fog",   label: "FOG",   bg: "#F1F2F3", accent: "#9FB6C1", dark: true },
  { key: "sand",  label: "SAND",  bg: "#F6F3EE", accent: "#C2B49A", dark: true },
  { key: "sage",  label: "SAGE",  bg: "#EFF3F0", accent: "#9DB8A8", dark: true },
  { key: "ink",   label: "INK",   bg: "#1C1E20", accent: "#A9D7E8", dark: false },
];

const SNS_LIST = [
  { key: "instagram", label: "Instagram", base: "https://instagram.com/", ex: "username" },
  { key: "x",         label: "X",         base: "https://x.com/",         ex: "username" },
  { key: "tiktok",    label: "TikTok",    base: "https://tiktok.com/@",   ex: "username" },
  { key: "youtube",   label: "YouTube",   base: "https://youtube.com/@",  ex: "channel" },
  { key: "pixiv",     label: "pixiv",     base: "https://pixiv.net/users/", ex: "12345678" },
  { key: "line",      label: "LINE",      base: "https://line.me/ti/p/",  ex: "ID" },
  { key: "booth",     label: "BOOTH",     base: "https://",               ex: "shop.booth.pm" },
  { key: "other",     label: "Web",       base: "https://",               ex: "example.com" },
];

/* 入力(@名前 / ID / フルURL)から最終URLを組み立てる */
const resolveSnsUrl = (key, handle) => {
  const h = (handle || "").trim();
  if (!h) return "";
  if (/^https?:\/\//i.test(h)) return h;
  const meta = SNS_LIST.find((m) => m.key === key);
  const clean = h.replace(/^@+/, "");
  return (meta ? meta.base : "https://") + clean;
};

const SPACER = { s: 20, m: 44, l: 80 };

const isHexColor = (v) => /^#[0-9a-f]{6}$/i.test(String(v || "").trim());
const colorOr = (v, fallback) => (isHexColor(v) ? String(v).trim() : fallback);

const BLOCK_META = {
  link:   { tag: "LINK",  name: "リンク" },
  image:  { tag: "IMG",   name: "画像" },
  video:  { tag: "VIDEO", name: "動画" },
  text:   { tag: "TEXT",  name: "テキスト" },
  spacer: { tag: "SPACE", name: "余白" },
};

const makeBlankState = () => ({
  profile: {
    name: "",
    bio: "",
    avatar: "",
  },
  design: {
    bg: "#FFFFFF",
    accent: "#A9D7E8",
    darkText: true,
    bgImage: "",
    overlay: 0.5,
    shape: "line", // line | fill | shadow
    bioColor: "",
  },
  sns: SNS_LIST.map((s) => ({ key: s.key, enabled: false, handle: "" })),
  blocks: [
    { id: uid(), type: "link", title: "", desc: "", url: "", thumb: "", buttonBg: "", buttonText: "" },
  ],
});

const DEFAULT_STATE = makeBlankState();

/* ── 端末内マルチページ保存(プロジェクト) ── */
const PROJECTS_INDEX_KEY = "lien-projects-index";
const projectKey = (id) => `lien-project-${id}`;

const safeParse = (v) => {
  if (v == null) return null;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch (e) {
    return null;
  }
};

const loadIndex = async () => {
  try {
    const r = await window.storage.get(PROJECTS_INDEX_KEY, false);
    const v = safeParse(r?.value);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
};
const saveIndex = async (list) => {
  try {
    await window.storage.set(PROJECTS_INDEX_KEY, JSON.stringify(list), false);
  } catch (e) {
    /* noop */
  }
};
const loadProjectData = async (id) => {
  try {
    const r = await window.storage.get(projectKey(id), false);
    return safeParse(r?.value);
  } catch (e) {
    return null;
  }
};
const saveProjectData = async (id, data) => {
  try {
    await window.storage.set(projectKey(id), JSON.stringify(data), false);
    return true;
  } catch (e) {
    return false;
  }
};
const deleteProjectData = async (id) => {
  try {
    await window.storage.delete(projectKey(id), false);
  } catch (e) {
    /* noop */
  }
};

/* ════════════ 書き出しHTML ════════════ */
function buildExportHtml(state) {
  const d = state.design;
  const text = d.darkText ? "#222426" : "#F4F5F6";
  const sub = d.darkText ? "#8A8F94" : "#C6CBD0";
  const line = d.darkText ? "#22242622" : "#F4F5F633";
  const bioColor = colorOr(d.bioColor, sub);
  const esc = (s) =>
    String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  const rowCss = {
    line: `background:transparent;border:1px solid ${line};`,
    fill: `background:${d.darkText ? "#00000007" : "#FFFFFF12"};border:1px solid transparent;`,
    shadow: `background:${d.darkText ? "#FFFFFF" : "#FFFFFF14"};border:1px solid ${line};box-shadow:0 4px 18px #00000010;`,
  }[d.shape];

  const snsHtml = state.sns
    .map((s) => ({ ...s, _url: resolveSnsUrl(s.key, s.handle) }))
    .filter((s) => s.enabled && s._url)
    .map((s) => {
      const meta = SNS_LIST.find((m) => m.key === s.key);
      return `<a class="sns" href="${esc(s._url)}" target="_blank" rel="noopener">${meta.label}</a>`;
    })
    .join('<span class="dot">·</span>');

  const blocksHtml = state.blocks
    .map((b) => {
      const customButtonBg = colorOr(b.buttonBg, "");
      const customButtonText = colorOr(b.buttonText, "");
      const customRowCss = [
        customButtonBg ? `background:${customButtonBg};` : "",
        customButtonText ? `color:${customButtonText};` : "",
        customButtonBg && d.shape === "line" ? "border-color:transparent;" : "",
      ].join("");
      const rowColor = customButtonText || text;
      const descColor = customButtonText || sub;
      const arrowColor = customButtonText || d.accent;
      if (b.type === "link")
        return `<a class="row" style="${customRowCss}" href="${esc(b.url) || "#"}" target="_blank" rel="noopener">
  ${b.thumb ? `<img class="thumb" src="${esc(b.thumb)}" alt="" />` : ""}
  <span class="meta"><span class="title" style="color:${rowColor}">${esc(b.title)}</span>${b.desc ? `<span class="desc" style="color:${descColor}">${esc(b.desc)}</span>` : ""}</span>
  <span class="arrow" style="color:${arrowColor}">&#8594;</span>
</a>`;
      if (b.type === "spacer") return `<div style="height:${SPACER[b.size] || 44}px"></div>`;
      if (b.type === "text")
        return `<div class="label"><span class="hr"></span><span class="lt">${esc(b.text)}</span><span class="hr"></span></div>`;
      if (b.type === "image" && b.src)
        return `<figure class="fig"><img src="${esc(b.src)}" alt="${esc(b.caption || "")}" />${
          b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ""
        }</figure>`;
      if (b.type === "video") {
        const id = youTubeId(b.url);
        return id
          ? `<div class="vid"><iframe src="https://www.youtube.com/embed/${id}" title="video" frameborder="0" allowfullscreen></iframe></div>`
          : "";
      }
      return "";
    })
    .join("\n");

  const ov = Math.round(d.overlay * 255).toString(16).padStart(2, "0");
  const ovColor = d.darkText ? "#FFFFFF" : "#000000";
  const bgLayer = d.bgImage
    ? `background:linear-gradient(${ovColor}${ov},${ovColor}${ov}),url('${d.bgImage}') center/cover fixed no-repeat;`
    : `background:${d.bg};`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(state.profile.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{${bgLayer}font-family:'Zen Kaku Gothic New',sans-serif;color:${text};display:flex;justify-content:center;min-height:100vh;padding:64px 22px}
main{width:100%;max-width:440px;text-align:center}
.avatar{width:92px;height:92px;border-radius:50%;object-fit:cover;border:1px solid ${line};margin-bottom:18px}
.avatar-ph{width:92px;height:92px;border-radius:50%;border:1px solid ${line};background:${d.accent}26;display:inline-block;margin-bottom:18px}
h1{font-size:20px;font-weight:700;letter-spacing:.08em}
.bio{font-size:13px;color:${bioColor};margin:14px 0 20px;white-space:pre-wrap;line-height:2.1}
.snsrow{font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.06em;margin-bottom:36px}
.sns{color:${text};text-decoration:none;border-bottom:1px solid ${d.accent};padding-bottom:2px}
.sns:hover{color:${d.accent}}
.dot{color:${sub};margin:0 10px}
.row{display:flex;align-items:center;gap:14px;padding:16px 18px;margin:12px 0;text-decoration:none;color:${text};text-align:left;border-radius:10px;transition:border-color .15s,transform .15s;${rowCss}}
.row:hover{border-color:${d.accent};transform:translateX(2px)}
.thumb{width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0}
.meta{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.title{font-size:14.5px;font-weight:700;letter-spacing:.03em}
.desc{font-size:11.5px;color:${sub}}
.arrow{color:${d.accent};font-size:15px}
.label{display:flex;align-items:center;gap:14px;margin:30px 0 14px}
.hr{flex:1;height:1px;background:${line}}
.lt{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.22em;color:${sub};text-transform:uppercase}
.fig{margin:16px 0}
.fig img{width:100%;border-radius:10px;border:1px solid ${line};display:block}
.fig figcaption{font-size:11.5px;color:${sub};margin-top:8px}
.vid{position:relative;width:100%;padding-top:56.25%;border-radius:10px;overflow:hidden;margin:16px 0;border:1px solid ${line}}
.vid iframe{position:absolute;inset:0;width:100%;height:100%}
footer{margin-top:56px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.3em;color:${sub}}
</style>
</head>
<body>
<main>
${state.profile.avatar ? `<img class="avatar" src="${esc(state.profile.avatar)}" alt="" />` : `<div class="avatar-ph"></div>`}
<h1>${esc(state.profile.name)}</h1>
<p class="bio">${esc(state.profile.bio)}</p>
${snsHtml ? `<div class="snsrow">${snsHtml}</div>` : ""}
${blocksHtml}
<footer>LIEN</footer>
</main>
</body>
</html>`;
}

/* ════════════ 小さなUI部品 ════════════ */
const MonoLabel = ({ children, style }) => (
  <p
    style={{
      fontFamily: UI.mono,
      fontSize: 10,
      letterSpacing: ".24em",
      color: UI.gray,
      textTransform: "uppercase",
      margin: 0,
      ...style,
    }}
  >
    {children}
  </p>
);

/* ════════════ アプリ本体 ════════════ */
export default function App() {
  const [view, setView] = useState("landing"); // landing | app
  const [tutorialStep, setTutorialStep] = useState(-1); // -1=非表示, 0..n=ステップ
  const [state, setState] = useState(DEFAULT_STATE);
  const [mode, setMode] = useState("edit"); // edit | preview
  const [openBlock, setOpenBlock] = useState(null);
  const [tab, setTab] = useState("blocks"); // blocks | profile | sns | design (エディタ内タブ)
  const [mobilePane, setMobilePane] = useState("editor"); // editor | canvas (モバイル表示)
  const [exportData, setExportData] = useState(null); // {html} 公開モーダル
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pubTab, setPubTab] = useState("easy"); // easy | github
  const [ghToken, setGhToken] = useState("");
  const [ghRepo, setGhRepo] = useState("my-lien-page");
  const [ghBusy, setGhBusy] = useState(false);
  const [ghLog, setGhLog] = useState([]);
  const [ghUrl, setGhUrl] = useState("");
  const [ghError, setGhError] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reviewNotice, setReviewNotice] = useState(false);
  const [projects, setProjects] = useState([]); // [{id,name,updatedAt}]
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [libError, setLibError] = useState("");
  const fileInputs = useRef({});
  const projectCache = useRef({}); // 同一セッション中はここから即時に開ける

  const d = state.design;
  const pageText = d.darkText ? "#222426" : "#F4F5F6";
  const pageSub = d.darkText ? "#8A8F94" : "#C6CBD0";
  const pageLine = d.darkText ? "#22242622" : "#F4F5F633";
  const pageBio = colorOr(d.bioColor, pageSub);

  /* ── マイページ(プロジェクト)管理 ── */
  useEffect(() => {
    loadIndex().then(setProjects);
  }, []);

  // 編集内容は即座にメモリへも反映(端末ストレージが不安定でも同一セッションでは開ける)
  useEffect(() => {
    if (currentProjectId) projectCache.current[currentProjectId] = state;
  }, [state, currentProjectId]);

  // 端末ストレージへの保存はデバウンスして実行
  useEffect(() => {
    if (!currentProjectId) return;
    const t = setTimeout(() => {
      saveProjectData(currentProjectId, state);
      setProjects((prev) => {
        const next = prev.map((p) =>
          p.id === currentProjectId ? { ...p, name: state.profile.name || "", updatedAt: Date.now() } : p
        );
        saveIndex(next);
        return next;
      });
    }, 600);
    return () => clearTimeout(t);
  }, [state, currentProjectId]);

  const createProject = async () => {
    const id = uid();
    const data = makeBlankState();
    projectCache.current[id] = data;
    saveProjectData(id, data);
    const next = [{ id, name: "", updatedAt: Date.now() }, ...projects];
    setProjects(next);
    saveIndex(next);
    setCurrentProjectId(id);
    setState(data);
    setView("app");
    setTab("profile");
    setMobilePane("editor");
    setTutorialStep(0);
  };

  const openProject = async (id) => {
    setLibError("");
    let data = projectCache.current[id];
    if (!data) data = await loadProjectData(id);
    if (!data) {
      setLibError("このページを開けませんでした。端末の空き容量や保存状況をご確認ください。");
      return;
    }
    projectCache.current[id] = data;
    setCurrentProjectId(id);
    setState(data);
    setView("app");
    setTab("profile");
    setMobilePane("editor");
    setTutorialStep(-1);
  };

  const duplicateProject = async (id) => {
    setLibError("");
    let data = projectCache.current[id];
    if (!data) data = await loadProjectData(id);
    if (!data) {
      setLibError("このページを複製できませんでした。");
      return;
    }
    const cloned = JSON.parse(JSON.stringify(data));
    cloned.blocks = cloned.blocks.map((b) => ({ ...b, id: uid() }));
    const newId = uid();
    projectCache.current[newId] = cloned;
    saveProjectData(newId, cloned);
    const next = [{ id: newId, name: cloned.profile.name ? `${cloned.profile.name}のコピー` : "", updatedAt: Date.now() }, ...projects];
    setProjects(next);
    saveIndex(next);
  };

  const deleteProject = async (id) => {
    delete projectCache.current[id];
    await deleteProjectData(id);
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    await saveIndex(next);
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setView("landing");
    }
  };

  const goToLibrary = () => setView("landing");

  const openReview = () => {
    if (APP_STORE_REVIEW_URL) {
      window.open(APP_STORE_REVIEW_URL, "_blank", "noopener");
    } else {
      setReviewNotice(true);
      setTimeout(() => setReviewNotice(false), 3000);
    }
  };

  /* ── 書類として保存／開く(iCloud Driveなどに置ける) ── */
  const sanitizeFileName = (name) =>
    (name || "").trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "lien-page";

  const saveProjectFile = (data, name) => {
    const payload = { type: "lien-page", version: 1, ...data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${sanitizeFileName(name || data?.profile?.name)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };

  const openProjectFile = (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const blank = makeBlankState();
        const data = {
          profile: { ...blank.profile, ...(obj.profile || {}) },
          design: { ...blank.design, ...(obj.design || {}) },
          sns: Array.isArray(obj.sns) && obj.sns.length ? obj.sns : blank.sns,
          blocks: Array.isArray(obj.blocks) && obj.blocks.length
            ? obj.blocks.map((b) => ({ ...b, id: b.id || uid() }))
            : blank.blocks,
        };
        const id = uid();
        projectCache.current[id] = data;
        saveProjectData(id, data);
        const next = [{ id, name: data.profile.name || "", updatedAt: Date.now() }, ...projects];
        setProjects(next);
        saveIndex(next);
        setLibError("");
      } catch (e) {
        setLibError("書類を読み込めませんでした。lienで保存した .json ファイルを選んでください。");
      }
    };
    reader.readAsText(file);
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) +
      " " + date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };


  const setProfile = (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const setDesign = (p) => setState((s) => ({ ...s, design: { ...s.design, ...p } }));
  const setSns = (key, p) =>
    setState((s) => ({ ...s, sns: s.sns.map((x) => (x.key === key ? { ...x, ...p } : x)) }));
  const updateBlock = (id, p) =>
    setState((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const removeBlock = (id) => {
    setState((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }));
    if (openBlock === id) setOpenBlock(null);
  };
  const moveBlock = (id, dir) =>
    setState((s) => {
      const i = s.blocks.findIndex((b) => b.id === id);
      const j = i + dir;
      if (j < 0 || j >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...s, blocks };
    });
  const addBlock = (type) => {
    const presets = {
      link: { title: "新しいリンク", desc: "", url: "", thumb: "", buttonBg: "", buttonText: "" },
      spacer: { size: "m" },
      text: { text: "SECTION" },
      image: { src: "", caption: "" },
      video: { url: "" },
    };
    const id = uid();
    setState((s) => ({ ...s, blocks: [...s.blocks, { id, type, ...presets[type] }] }));
    setOpenBlock(id);
  };

  const readImage = (file, cb) => {
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  };
  const pickFile = (key, cb) => {
    const el = fileInputs.current[key];
    if (!el) return;
    el.onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) readImage(f, cb);
      e.target.value = "";
    };
    el.click();
  };

  const exportHtml = () => {
    const html = buildExportHtml(state);
    // サンドボックス環境ではダウンロードがブロックされることがあるので、
    // まずダウンロードを試み、必ずコピー用モーダルも表示する。
    try {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-page.html";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      /* フォールバックでモーダルを使う */
    }
    setCopied(false);
    setShowCode(false);
    setExportData({ html });
  };

  const copyHtml = async () => {
    if (!exportData) return;
    try {
      await navigator.clipboard.writeText(exportData.html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // クリップボードAPIが使えない場合は手動選択を促す
      const ta = document.getElementById("lien-export-textarea");
      if (ta) {
        ta.focus();
        ta.select();
      }
    }
  };

  const downloadFromModal = () => {
    if (!exportData) return;
    try {
      const blob = new Blob([exportData.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-page.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      /* noop */
    }
  };

  const openNetlify = () => {
    try {
      window.open("https://app.netlify.com/drop", "_blank", "noopener");
    } catch (e) {
      /* ポップアップがブロックされた場合はモーダル内のリンクから開ける */
    }
  };

  /* ── GitHub Pages へ自動公開 ── */
  const ghB64 = (str) => btoa(unescape(encodeURIComponent(str)));

  const deployToGitHub = async () => {
    const token = ghToken.trim();
    const repo = (ghRepo.trim() || "my-lien-page").replace(/[^A-Za-z0-9._-]/g, "-");
    if (!token) {
      setGhError("トークンを入力してください。");
      return;
    }
    setGhBusy(true);
    setGhError("");
    setGhUrl("");
    setGhLog([]);
    const log = (m) => setGhLog((l) => [...l, m]);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    };
    try {
      log("GitHub に接続しています…");
      const meRes = await fetch("https://api.github.com/user", { headers });
      if (!meRes.ok) throw new Error("トークンが正しくないか、権限が足りません（classic の repo 権限が必要です）。");
      const me = await meRes.json();
      const owner = me.login;

      log(`リポジトリ「${repo}」を準備しています…`);
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: repo, auto_init: true, description: "made with lien" }),
      });
      if (!createRes.ok && createRes.status !== 422) {
        const e = await createRes.json().catch(() => ({}));
        throw new Error("リポジトリの作成に失敗しました：" + (e.message || createRes.status));
      }

      // 既存 index.html があれば sha を取得（更新のため）
      let sha;
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/index.html`, { headers });
      if (getRes.ok) {
        const f = await getRes.json();
        sha = f.sha;
      }

      log("ページ（index.html）を保存しています…");
      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/index.html`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "update page (lien)",
          content: ghB64(exportData.html),
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const e = await putRes.json().catch(() => ({}));
        throw new Error("保存に失敗しました：" + (e.message || putRes.status));
      }

      log("公開設定（GitHub Pages）を有効にしています…");
      const pagesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ source: { branch: "main", path: "/" } }),
      });
      // 409 = すでに有効。それ以外のエラーは致命的ではないので続行
      if (pagesRes.ok || pagesRes.status === 409) {
        log("公開設定ができました。");
      } else {
        log("※ Pages の自動有効化はスキップされました（後で設定が必要な場合があります）。");
      }

      setGhUrl(`https://${owner}.github.io/${repo}/`);
      log("完了！反映まで数十秒〜1分ほどかかります。");
    } catch (e) {
      setGhError(e.message || "エラーが発生しました。通信環境やトークンを確認してください。");
    } finally {
      setGhBusy(false);
    }
  };

  /* ── ランディング/チュートリアル ── */
  const TUTORIAL = [
    { tab: null, title: "ようこそ", body: "lien はリンクをまとめた1ページを、コードを書かずに作れるツールです。4つのステップで完成します。所要1〜2分。" },
    { tab: "profile", title: "1 / 4　プロフィール", body: "PROFILE タブで、アイコン画像・名前・自己紹介を入力します。アイコンは枠をタップして端末内の画像を選べます。" },
    { tab: "blocks", title: "2 / 4　ブロックを置く", body: "BLOCKS タブの下にある「+ リンク」などでブロックを追加。行をタップするとタイトルや飛ばしたいURL、サムネ画像を編集できます。↑↓で並べ替え、×で削除。" },
    { tab: "sns", title: "3 / 4　SNSをつなぐ", body: "SOCIAL タブで使いたいSNSのボタンを1タップ。出てきた欄にユーザー名を入れるだけで、リンクは自動でつくられます。プロフィールの下に並びます。" },
    { tab: "design", title: "4 / 4　見た目を決める", body: "DESIGN タブで背景色・背景画像・アクセント色・文字色・ボタンの形を調整。右側のプレビューにすぐ反映されます。" },
    { tab: null, title: "公開する", body: "右上の「公開する」から2通り選べます。今すぐ試すなら『かんたん公開』（登録なし・ドラッグだけ）。消えずに残して更新もしたいなら『GitHubに保存』（合言葉を一度だけ用意すれば、URL発行まで自動）。" },
  ];

  const goTutorial = (next) => {
    const step = tutorialStep + next;
    if (step < 0) return;
    if (step >= TUTORIAL.length) {
      setTutorialStep(-1);
      return;
    }
    const t = TUTORIAL[step];
    if (t.tab) setTab(t.tab);
    if (mode !== "edit") setMode("edit");
    setMobilePane("editor");
    setTutorialStep(step);
  };

  /* ── エディタ用スタイル ── */
  const field = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13,
    border: `1px solid ${UI.line}`,
    borderRadius: 8,
    background: "#FFF",
    color: UI.ink,
    outline: "none",
    fontFamily: UI.sans,
  };
  const smallBtn = (active) => ({
    padding: "6px 13px",
    fontSize: 11.5,
    fontFamily: UI.mono,
    letterSpacing: ".06em",
    borderRadius: 6,
    border: `1px solid ${active ? UI.accentDeep : UI.line}`,
    background: active ? UI.accentBg : "#FFF",
    color: active ? UI.accentDeep : UI.ink,
    cursor: "pointer",
  });
  const iconBtn = (danger) => ({
    width: 24,
    height: 24,
    borderRadius: 6,
    border: `1px solid ${UI.line}`,
    background: "#FFF",
    color: danger ? "#B0524F" : UI.gray,
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  });

  /* ════════ 左パネル: エディタ ════════ */
  const editorTabs = [
    { key: "blocks", label: "BLOCKS" },
    { key: "profile", label: "PROFILE" },
    { key: "sns", label: "SOCIAL" },
    { key: "design", label: "DESIGN" },
  ];

  const editor = (
    <div
      style={{
        background: UI.panel,
        border: `1px solid ${UI.line}`,
        borderRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* タブ */}
      <div style={{ display: "flex", borderBottom: `1px solid ${UI.line}` }}>
        {editorTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "13px 0 11px",
              fontFamily: UI.mono,
              fontSize: 10.5,
              letterSpacing: ".18em",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: tab === t.key ? UI.ink : UI.faint,
              borderBottom: `2px solid ${tab === t.key ? UI.accentDeep : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 18, overflowY: "auto" }}>
        {/* ── BLOCKS ── */}
        {tab === "blocks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {state.blocks.length === 0 && (
              <p style={{ fontSize: 12, color: UI.gray, textAlign: "center", padding: "20px 0" }}>
                下のボタンからブロックを追加してください
              </p>
            )}
            {state.blocks.map((b, i) => {
              const meta = BLOCK_META[b.type];
              const open = openBlock === b.id;
              const summary =
                b.type === "link" ? b.title :
                b.type === "text" ? b.text :
                b.type === "spacer" ? `サイズ ${String(b.size).toUpperCase()}` :
                b.type === "image" ? (b.src ? "画像あり" : "未設定") :
                b.type === "video" ? (youTubeId(b.url) ? "YouTube" : "未設定") : "";
              return (
                <div key={b.id} style={{ border: `1px solid ${open ? UI.accentDeep : UI.line}`, borderRadius: 10 }}>
                  {/* 行ヘッダー */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                    <span style={{ fontFamily: UI.mono, fontSize: 10, color: UI.faint, width: 18 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: UI.mono,
                        fontSize: 9.5,
                        letterSpacing: ".12em",
                        color: UI.accentDeep,
                        background: UI.accentBg,
                        padding: "3px 7px",
                        borderRadius: 4,
                      }}
                    >
                      {meta.tag}
                    </span>
                    <button
                      onClick={() => setOpenBlock(open ? null : b.id)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: UI.ink,
                        fontFamily: UI.sans,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        padding: 0,
                      }}
                    >
                      {summary}
                    </button>
                    <button style={{ ...iconBtn(), opacity: i === 0 ? 0.35 : 1 }} disabled={i === 0} aria-label="上へ" onClick={() => moveBlock(b.id, -1)}>↑</button>
                    <button style={{ ...iconBtn(), opacity: i === state.blocks.length - 1 ? 0.35 : 1 }} disabled={i === state.blocks.length - 1} aria-label="下へ" onClick={() => moveBlock(b.id, 1)}>↓</button>
                    <button style={iconBtn(true)} aria-label="削除" onClick={() => removeBlock(b.id)}>×</button>
                  </div>

                  {/* 展開エディタ */}
                  {open && (
                    <div style={{ borderTop: `1px solid ${UI.line}`, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {b.type === "link" && (
                        <>
                          <input style={field} placeholder="タイトル" value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })} />
                          <input style={field} placeholder="説明(任意)" value={b.desc} onChange={(e) => updateBlock(b.id, { desc: e.target.value })} />
                          <input style={field} placeholder="https:// リンク先URL" value={b.url} onChange={(e) => updateBlock(b.id, { url: e.target.value })} />
                          <div style={{ border: `1px solid ${UI.line}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                            <MonoLabel>BUTTON COLOR</MonoLabel>
                            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                              <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                                背景
                                <input
                                  type="color"
                                  value={colorOr(b.buttonBg, d.shape === "shadow" ? "#FFFFFF" : d.bg)}
                                  onChange={(e) => updateBlock(b.id, { buttonBg: e.target.value })}
                                  style={{ width: 32, height: 32, border: `1px solid ${UI.line}`, borderRadius: 8, cursor: "pointer", background: "none", padding: 2 }}
                                />
                              </label>
                              <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                                文字
                                <input
                                  type="color"
                                  value={colorOr(b.buttonText, pageText)}
                                  onChange={(e) => updateBlock(b.id, { buttonText: e.target.value })}
                                  style={{ width: 32, height: 32, border: `1px solid ${UI.line}`, borderRadius: 8, cursor: "pointer", background: "none", padding: 2 }}
                                />
                              </label>
                              {(b.buttonBg || b.buttonText) && (
                                <button style={smallBtn(false)} onClick={() => updateBlock(b.id, { buttonBg: "", buttonText: "" })}>
                                  色を戻す
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button style={smallBtn(false)} onClick={() => pickFile(b.id, (src) => updateBlock(b.id, { thumb: src }))}>
                              {b.thumb ? "サムネ変更" : "+ サムネ画像"}
                            </button>
                            {b.thumb && (
                              <>
                                <img src={b.thumb} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", border: `1px solid ${UI.line}` }} />
                                <button style={smallBtn(false)} onClick={() => updateBlock(b.id, { thumb: "" })}>はずす</button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      {b.type === "text" && (
                        <input style={field} placeholder="見出しテキスト" value={b.text} onChange={(e) => updateBlock(b.id, { text: e.target.value })} />
                      )}
                      {b.type === "spacer" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {["s", "m", "l"].map((sz) => (
                            <button key={sz} style={smallBtn(b.size === sz)} onClick={() => updateBlock(b.id, { size: sz })}>
                              {sz.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      )}
                      {b.type === "image" && (
                        <>
                          <button style={smallBtn(false)} onClick={() => pickFile(b.id, (src) => updateBlock(b.id, { src }))}>
                            {b.src ? "画像を変更" : "+ 画像を選ぶ"}
                          </button>
                          <input style={field} placeholder="キャプション(任意)" value={b.caption} onChange={(e) => updateBlock(b.id, { caption: e.target.value })} />
                        </>
                      )}
                      {b.type === "video" && (
                        <input style={field} placeholder="https://youtube.com/watch?v=..." value={b.url} onChange={(e) => updateBlock(b.id, { url: e.target.value })} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 追加 */}
            <div style={{ borderTop: `1px solid ${UI.line}`, paddingTop: 14, marginTop: 6 }}>
              <MonoLabel style={{ marginBottom: 10 }}>ADD BLOCK</MonoLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(BLOCK_META).map(([type, m]) => (
                  <button key={type} style={smallBtn(false)} onClick={() => addBlock(type)}>
                    + {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE ── */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                onClick={() => pickFile("avatar", (src) => setProfile({ avatar: src }))}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `1px dashed ${UI.faint}`,
                  background: state.profile.avatar ? `center/cover url(${state.profile.avatar})` : UI.accentBg,
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: UI.mono,
                  fontSize: 9,
                  color: UI.gray,
                  letterSpacing: ".1em",
                }}
                aria-label="アイコン画像を選ぶ"
              >
                {!state.profile.avatar && "IMG"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <MonoLabel>NAME</MonoLabel>
                <input style={field} value={state.profile.name} onChange={(e) => setProfile({ name: e.target.value })} />
              </div>
            </div>
            {state.profile.avatar && (
              <button style={{ ...smallBtn(false), alignSelf: "flex-start" }} onClick={() => setProfile({ avatar: "" })}>
                アイコンをはずす
              </button>
            )}
            <div>
              <MonoLabel style={{ marginBottom: 6 }}>BIO</MonoLabel>
              <textarea
                style={{ ...field, minHeight: 90, resize: "vertical", lineHeight: 1.9 }}
                value={state.profile.bio}
                onChange={(e) => setProfile({ bio: e.target.value })}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  bio文字色
                  <input
                    type="color"
                    value={colorOr(d.bioColor, pageSub)}
                    onChange={(e) => setDesign({ bioColor: e.target.value })}
                    style={{ width: 32, height: 32, border: `1px solid ${UI.line}`, borderRadius: 8, cursor: "pointer", background: "none", padding: 2 }}
                  />
                </label>
                {d.bioColor && (
                  <button style={smallBtn(false)} onClick={() => setDesign({ bioColor: "" })}>
                    色を戻す
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SOCIAL ── */}
        {tab === "sns" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* 追加パレット */}
            <div>
              <MonoLabel style={{ marginBottom: 10 }}>SNSをえらぶ</MonoLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {state.sns.map((s) => {
                  const meta = SNS_LIST.find((m) => m.key === s.key);
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSns(s.key, { enabled: !s.enabled })}
                      style={{
                        ...smallBtn(s.enabled),
                        fontFamily: UI.sans,
                        letterSpacing: 0,
                        fontSize: 12.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      aria-pressed={s.enabled}
                    >
                      <span style={{ color: s.enabled ? UI.accentDeep : UI.faint, fontWeight: 700 }}>
                        {s.enabled ? "✓" : "+"}
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 11.5, color: UI.gray, margin: "10px 0 0", lineHeight: 1.7 }}>
                使うSNSをタップして選ぶだけ。下に出てくる欄に<strong style={{ color: UI.ink }}>ユーザー名</strong>を入れればOK（リンクは自動でつくられます）。
              </p>
            </div>

            {/* 選んだSNSの入力欄 */}
            {state.sns.some((s) => s.enabled) && (
              <div style={{ borderTop: `1px solid ${UI.line}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {state.sns.filter((s) => s.enabled).map((s) => {
                  const meta = SNS_LIST.find((m) => m.key === s.key);
                  const url = resolveSnsUrl(s.key, s.handle);
                  const isFullUrl = /^https?:\/\//i.test((s.handle || "").trim());
                  return (
                    <div key={s.key} style={{ border: `1px solid ${UI.line}`, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: UI.ink }}>{meta.label}</span>
                        <button style={iconBtn(true)} aria-label="はずす" onClick={() => setSns(s.key, { enabled: false })}>×</button>
                      </div>
                      {/* ユーザー名入力(@や接頭辞をそえる) */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: `1px solid ${UI.line}`,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "#FFF",
                        }}
                      >
                        {!isFullUrl && meta.base !== "https://" && (
                          <span style={{ fontFamily: UI.mono, fontSize: 11, color: UI.faint, padding: "0 0 0 10px", whiteSpace: "nowrap" }}>
                            {meta.base.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                        <input
                          style={{ ...field, border: "none", borderRadius: 0, flex: 1, minWidth: 0 }}
                          placeholder={meta.base === "https://" ? `URL（例: ${meta.ex}）` : `ユーザー名（例: ${meta.ex}）`}
                          value={s.handle}
                          onChange={(e) => setSns(s.key, { handle: e.target.value })}
                        />
                      </div>
                      {url ? (
                        <p style={{ fontFamily: UI.mono, fontSize: 10.5, color: UI.accentDeep, margin: "7px 0 0", wordBreak: "break-all" }}>
                          → {url}
                        </p>
                      ) : (
                        <p style={{ fontSize: 11, color: UI.faint, margin: "7px 0 0" }}>
                          ユーザー名を入れると表示されます
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DESIGN ── */}
        {tab === "design" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <MonoLabel style={{ marginBottom: 10 }}>PRESET</MonoLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    style={{ ...smallBtn(d.bg === p.bg && d.accent === p.accent), display: "flex", alignItems: "center", gap: 7 }}
                    onClick={() => setDesign({ bg: p.bg, accent: p.accent, darkText: p.dark, bgImage: "" })}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.bg, border: `3px solid ${p.accent}` }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <MonoLabel style={{ marginBottom: 10 }}>COLOR</MonoLabel>
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  背景色
                  <input
                    type="color"
                    value={d.bg}
                    onChange={(e) => setDesign({ bg: e.target.value, bgImage: "" })}
                    style={{ width: 32, height: 32, border: `1px solid ${UI.line}`, borderRadius: 8, cursor: "pointer", background: "none", padding: 2 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  アクセント
                  <input
                    type="color"
                    value={d.accent}
                    onChange={(e) => setDesign({ accent: e.target.value })}
                    style={{ width: 32, height: 32, border: `1px solid ${UI.line}`, borderRadius: 8, cursor: "pointer", background: "none", padding: 2 }}
                  />
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={smallBtn(d.darkText)} onClick={() => setDesign({ darkText: true })}>文字 黒</button>
                  <button style={smallBtn(!d.darkText)} onClick={() => setDesign({ darkText: false })}>文字 白</button>
                </div>
              </div>
            </div>

            <div>
              <MonoLabel style={{ marginBottom: 10 }}>BACKGROUND IMAGE</MonoLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button style={smallBtn(false)} onClick={() => pickFile("bg", (src) => setDesign({ bgImage: src }))}>
                  {d.bgImage ? "画像を変更" : "+ 画像を設定"}
                </button>
                {d.bgImage && (
                  <>
                    <button style={smallBtn(false)} onClick={() => setDesign({ bgImage: "" })}>はずす</button>
                    <label style={{ fontSize: 12, color: UI.ink, display: "flex", alignItems: "center", gap: 8 }}>
                      うすさ
                      <input
                        type="range"
                        min="0"
                        max="0.85"
                        step="0.05"
                        value={d.overlay}
                        onChange={(e) => setDesign({ overlay: Number(e.target.value) })}
                        style={{ accentColor: UI.accentDeep }}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div>
              <MonoLabel style={{ marginBottom: 10 }}>BUTTON STYLE</MonoLabel>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={smallBtn(d.shape === "line")} onClick={() => setDesign({ shape: "line" })}>ライン</button>
                <button style={smallBtn(d.shape === "fill")} onClick={() => setDesign({ shape: "fill" })}>フィル</button>
                <button style={smallBtn(d.shape === "shadow")} onClick={() => setDesign({ shape: "shadow" })}>シャドウ</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ════════ 右: ページキャンバス ════════ */
  const rowStyle = {
    line: { background: "transparent", border: `1px solid ${pageLine}` },
    fill: { background: d.darkText ? "#00000007" : "#FFFFFF12", border: "1px solid transparent" },
    shadow: { background: d.darkText ? "#FFFFFF" : "#FFFFFF14", border: `1px solid ${pageLine}`, boxShadow: "0 4px 18px #00000010" },
  }[d.shape];

  const renderPageBlock = (b) => {
    if (b.type === "link") {
      const buttonBg = colorOr(b.buttonBg, "");
      const buttonText = colorOr(b.buttonText, "");
      const customRowStyle = {
        ...(buttonBg ? { background: buttonBg, borderColor: "transparent" } : {}),
        ...(buttonText ? { color: buttonText } : {}),
      };
      const currentRowStyle = { ...rowStyle, ...customRowStyle };
      const linkText = buttonText || pageText;
      const linkSub = buttonText || pageSub;
      const linkArrow = buttonText || d.accent;
      return (
        <a
          key={b.id}
          href={b.url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={mode === "edit" ? (e) => e.preventDefault() : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "15px 17px",
            margin: "12px 0",
            textDecoration: "none",
            color: pageText,
            textAlign: "left",
            borderRadius: 10,
            transition: "border-color .15s, transform .15s",
            ...currentRowStyle,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = d.accent; e.currentTarget.style.transform = "translateX(2px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = currentRowStyle.border.includes("transparent") || buttonBg ? "transparent" : pageLine; e.currentTarget.style.transform = "none"; }}
        >
          {b.thumb && <img src={b.thumb} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
          <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: ".03em", color: linkText }}>{b.title}</span>
            {b.desc && <span style={{ fontSize: 11.5, color: linkSub }}>{b.desc}</span>}
          </span>
          <span style={{ color: linkArrow, fontSize: 15 }}>→</span>
        </a>
      );
    }

    if (b.type === "spacer") return <div key={b.id} style={{ height: SPACER[b.size] || 44 }} />;

    if (b.type === "text")
      return (
        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, margin: "28px 0 12px" }}>
          <span style={{ flex: 1, height: 1, background: pageLine }} />
          <span style={{ fontFamily: UI.mono, fontSize: 10.5, letterSpacing: ".22em", color: pageSub, textTransform: "uppercase" }}>
            {b.text}
          </span>
          <span style={{ flex: 1, height: 1, background: pageLine }} />
        </div>
      );

    if (b.type === "image")
      return (
        <figure key={b.id} style={{ margin: "16px 0" }}>
          {b.src ? (
            <img src={b.src} alt={b.caption || ""} style={{ width: "100%", borderRadius: 10, border: `1px solid ${pageLine}`, display: "block" }} />
          ) : (
            <div
              style={{
                padding: "36px 0",
                borderRadius: 10,
                border: `1px dashed ${pageSub}`,
                color: pageSub,
                fontSize: 12,
                textAlign: "center",
                fontFamily: UI.mono,
                letterSpacing: ".1em",
              }}
            >
              NO IMAGE
            </div>
          )}
          {b.caption && <figcaption style={{ fontSize: 11.5, color: pageSub, marginTop: 8, textAlign: "center" }}>{b.caption}</figcaption>}
        </figure>
      );

    if (b.type === "video") {
      const id = youTubeId(b.url);
      return id ? (
        <div
          key={b.id}
          style={{ position: "relative", paddingTop: "56.25%", borderRadius: 10, overflow: "hidden", margin: "16px 0", border: `1px solid ${pageLine}` }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="video"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            allowFullScreen
          />
        </div>
      ) : (
        <div
          key={b.id}
          style={{
            padding: "36px 0",
            margin: "16px 0",
            borderRadius: 10,
            border: `1px dashed ${pageSub}`,
            color: pageSub,
            fontSize: 12,
            textAlign: "center",
            fontFamily: UI.mono,
            letterSpacing: ".1em",
          }}
        >
          NO VIDEO URL
        </div>
      );
    }
    return null;
  };

  const activeSns = state.sns.filter((s) => s.enabled && resolveSnsUrl(s.key, s.handle));

  const pageCanvas = (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${UI.line}`,
        overflow: "hidden",
        background: d.bgImage
          ? `linear-gradient(${d.darkText ? "rgba(255,255,255," : "rgba(0,0,0,"}${d.overlay}), ${
              d.darkText ? "rgba(255,255,255," : "rgba(0,0,0,"
            }${d.overlay})), url(${d.bgImage}) center/cover no-repeat`
          : d.bg,
        transition: "background .3s",
      }}
    >
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "52px 24px 48px", textAlign: "center", color: pageText, fontFamily: UI.sans }}>
        {state.profile.avatar ? (
          <img
            src={state.profile.avatar}
            alt=""
            style={{ width: 92, height: 92, borderRadius: "50%", objectFit: "cover", border: `1px solid ${pageLine}` }}
          />
        ) : (
          <div style={{ width: 92, height: 92, borderRadius: "50%", border: `1px solid ${pageLine}`, background: `${d.accent}26`, display: "inline-block" }} />
        )}
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".08em", marginTop: 18 }}>{state.profile.name}</h1>
        <p style={{ fontSize: 13, color: pageBio, whiteSpace: "pre-wrap", lineHeight: 2.1, margin: "14px 0 20px" }}>{state.profile.bio}</p>

        {activeSns.length > 0 && (
          <p style={{ fontFamily: UI.mono, fontSize: 11.5, letterSpacing: ".06em", marginBottom: 32 }}>
            {activeSns.map((s, i) => {
              const meta = SNS_LIST.find((m) => m.key === s.key);
              const el = (
                <a
                  key={s.key}
                  href={resolveSnsUrl(s.key, s.handle) || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={mode === "edit" ? (e) => e.preventDefault() : undefined}
                  style={{ color: pageText, textDecoration: "none", borderBottom: `1px solid ${d.accent}`, paddingBottom: 2 }}
                >
                  {meta.label}
                </a>
              );
              return (
                <React.Fragment key={s.key}>
                  {i > 0 && <span style={{ color: pageSub, margin: "0 10px" }}>·</span>}
                  {el}
                </React.Fragment>
              );
            })}
          </p>
        )}

        <div>{state.blocks.map(renderPageBlock)}</div>

        <p style={{ marginTop: 52, fontFamily: UI.mono, fontSize: 10, letterSpacing: ".3em", color: pageSub }}>LIEN</p>
      </div>
    </div>
  );

  /* ════════ レイアウト ════════ */
  return (
    <div style={{ minHeight: "100vh", background: UI.bg, fontFamily: UI.sans, color: UI.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        input::placeholder, textarea::placeholder { color: ${UI.faint}; }
        input:focus, textarea:focus { border-color: ${UI.accentDeep} !important; }
        button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid ${UI.accentDeep}; outline-offset: 2px; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-thumb { background: ${UI.line}; border-radius: 99px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
        @media (min-width: 920px) {
          .layout { grid-template-columns: 400px 1fr !important; }
          .mobile-switch { display: none !important; }
          .pane-editor, .pane-canvas { display: block !important; }
        }
      `}</style>

      {/* 非表示file input群 */}
      {["avatar", "bg", ...state.blocks.map((b) => b.id)].map((k) => (
        <input key={k} ref={(el) => (fileInputs.current[k] = el)} type="file" accept="image/*" style={{ display: "none" }} />
      ))}
      <input
        ref={(el) => (fileInputs.current["projectFile"] = el)}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) openProjectFile(f);
          e.target.value = "";
        }}
      />

      {/* ════════ トップ(マイページ)画面 ════════ */}
      {view === "landing" && (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 24px 60px",
            background: "#FAFAF8",
            position: "relative",
          }}
        >
          <button
            style={{ ...iconBtn(), position: "absolute", top: 16, right: 16 }}
            aria-label={`${APP_NAME}について`}
            title={`about ${APP_NAME}`}
            onClick={() => setAboutOpen(true)}
          >
            i
          </button>

          {/* ミニマルなマーク(オリジナル) */}
          <div
            style={{ width: 64, height: 64, marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-hidden="true"
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke={UI.ink} strokeWidth="1.4" />
              <circle cx="28" cy="20" r="6.5" stroke={UI.ink} strokeWidth="1.4" />
              <line x1="28" y1="26.5" x2="28" y2="40" stroke={UI.ink} strokeWidth="1.4" />
              <circle cx="28" cy="40" r="3" fill={UI.accent} stroke={UI.ink} strokeWidth="1.4" />
            </svg>
          </div>

          <h1
            style={{
              fontFamily: UI.mono,
              fontSize: "clamp(30px, 9vw, 48px)",
              fontWeight: 400,
              letterSpacing: ".42em",
              color: UI.ink,
              margin: 0,
              paddingLeft: ".42em",
              textAlign: "center",
            }}
          >
            lien
          </h1>

          <p
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: UI.mono,
              fontSize: "clamp(10px, 3vw, 13px)",
              letterSpacing: ".34em",
              color: UI.gray,
              margin: "16px 0 32px",
              textAlign: "center",
            }}
          >
            <span style={{ color: UI.accentDeep }}>〜</span>
            LINK IN BIO STUDIO
            <span style={{ color: UI.accentDeep }}>〜</span>
          </p>

          <div style={{ width: "100%", maxWidth: 460 }}>
            <button
              onClick={createProject}
              style={{
                width: "100%",
                padding: "20px 0",
                borderRadius: 999,
                border: "none",
                background: UI.accent,
                color: "#1F3A46",
                fontSize: "clamp(15px, 4.4vw, 18px)",
                fontFamily: UI.sans,
                fontWeight: 700,
                letterSpacing: ".08em",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(169,215,232,.45)",
                transition: "transform .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              ＋　新しいページをつくる
            </button>

            <p style={{ fontSize: 12.5, color: UI.faint, margin: "20px 0 0", lineHeight: 1.8, textAlign: "center" }}>
              ページはこの端末に自動で保存されます。
            </p>

            {/* 保存済みページ一覧 */}
            {projects.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <MonoLabel style={{ marginBottom: 12, textAlign: "left" }}>MY PAGES</MonoLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openProject(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openProject(p.id);
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = UI.accentDeep)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = UI.line)}
                      style={{
                        border: `1px solid ${UI.line}`,
                        borderRadius: 12,
                        background: UI.panel,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "border-color .15s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: UI.ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name || "名前未設定のページ"}
                        </p>
                        <p style={{ fontFamily: UI.mono, fontSize: 10.5, color: UI.faint, margin: "4px 0 0", letterSpacing: ".06em" }}>
                          編集: {formatDate(p.updatedAt)}
                        </p>
                      </div>
                      <span style={{ color: UI.accentDeep, fontSize: 15, flexShrink: 0 }} aria-hidden="true">→</span>
                      <button style={iconBtn()} aria-label="複製" title="複製" onClick={(e) => { e.stopPropagation(); duplicateProject(p.id); }}>⧉</button>
                      <button
                        style={iconBtn()}
                        aria-label="書類として保存"
                        title="書類として保存"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setLibError("");
                          let data = projectCache.current[p.id];
                          if (!data) data = await loadProjectData(p.id);
                          if (data) saveProjectFile(data, p.name);
                          else setLibError("このページを書類として保存できませんでした。");
                        }}
                      >
                        ↓
                      </button>
                      <button style={iconBtn(true)} aria-label="削除" title="削除" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 書類を開く(他の端末/iCloudから) */}
            <div style={{ marginTop: 28, borderTop: `1px solid ${UI.line}`, paddingTop: 20, textAlign: "center" }}>
              <button style={smallBtn(false)} onClick={() => fileInputs.current["projectFile"]?.click()}>
                ＋ 書類からページを開く
              </button>
              <p style={{ fontSize: 11.5, color: UI.gray, margin: "10px 0 0", lineHeight: 1.8 }}>
                各ページの「↓」で書類(.json)として保存できます。<br />
                保存時に<strong style={{ color: UI.ink }}>iCloud Drive</strong>を選べば、ほかの端末からこのボタンで開いて続きを編集できます。
              </p>
              {libError && <p style={{ fontSize: 11.5, color: "#B0524F", margin: "10px 0 0" }}>{libError}</p>}
            </div>

            <p style={{ fontSize: 11, color: UI.faint, margin: "28px 0 0", lineHeight: 1.8, textAlign: "center" }}>
              すべて端末内だけで処理されます（どこにも送信されません）
            </p>
          </div>
        </div>
      )}

      {/* ════════ アプリ本体 ════════ */}
      {view === "app" && (
      <>
      {/* ── ヘッダー ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          padding: "10px 20px",
          minHeight: 54,
          background: UI.panel,
          borderBottom: `1px solid ${UI.line}`,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={iconBtn()} aria-label="マイページへ" title="マイページ" onClick={goToLibrary}>⌂</button>
          <button style={iconBtn()} aria-label={`${APP_NAME}について`} title={`about ${APP_NAME}`} onClick={() => setAboutOpen(true)}>i</button>
          <span style={{ fontFamily: UI.mono, fontSize: 15, letterSpacing: ".28em", fontWeight: 500 }}>
            LIEN<span style={{ color: UI.accentDeep }}>_</span>
          </span>
          <span style={{ fontFamily: UI.mono, fontSize: 9.5, letterSpacing: ".14em", color: UI.faint }}>LINK PAGE STUDIO</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={iconBtn()} aria-label="書類として保存" title="書類として保存(iCloudなどに)" onClick={() => saveProjectFile(state, state.profile.name)}>↓</button>
          <button style={smallBtn(false)} aria-label="使い方を見る" onClick={() => { setTutorialStep(0); setMode("edit"); setMobilePane("editor"); setTab("profile"); }}>
            ?
          </button>
          <button style={smallBtn(mode === "preview")} onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>
            {mode === "edit" ? "PREVIEW" : "EDIT"}
          </button>
          <button
            style={{
              ...smallBtn(false),
              background: UI.accent,
              borderColor: UI.accent,
              color: "#1F3A46",
              fontWeight: 500,
              fontFamily: UI.sans,
              letterSpacing: ".04em",
            }}
            onClick={exportHtml}
          >
            公開する
          </button>
        </div>
      </header>

      {/* ── プレビュー全画面モード ── */}
      {mode === "preview" ? (
        <div style={{ maxWidth: 560, margin: "28px auto 60px", padding: "0 16px" }}>{pageCanvas}</div>
      ) : (
        <>
          {/* モバイル: 切替 */}
          <div className="mobile-switch" style={{ display: "flex", gap: 8, justifyContent: "center", padding: "14px 0 0" }}>
            <button style={smallBtn(mobilePane === "editor")} onClick={() => setMobilePane("editor")}>EDITOR</button>
            <button style={smallBtn(mobilePane === "canvas")} onClick={() => setMobilePane("canvas")}>PAGE</button>
          </div>

          <div
            className="layout"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 20,
              maxWidth: 1120,
              margin: "0 auto",
              padding: "18px 16px 60px",
              alignItems: "start",
            }}
          >
            <div className="pane-editor" style={{ display: mobilePane === "canvas" ? "none" : "block", position: "sticky", top: 72 }}>
              {editor}
            </div>
            <div className="pane-canvas" style={{ display: mobilePane === "canvas" ? "block" : "none" }}>
              {pageCanvas}
            </div>
          </div>
        </>
      )}
      </>
      )}

      {/* ── 公開ガイドモーダル ── */}
      {exportData && (
        <div
          onClick={() => setExportData(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#17191BAA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: UI.panel,
              border: `1px solid ${UI.line}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 480,
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 60px #00000033",
            }}
          >
            <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${UI.line}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: UI.mono, fontSize: 10.5, letterSpacing: ".18em", color: UI.accentDeep, margin: 0 }}>PUBLISH</p>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: UI.ink, margin: "6px 0 0" }}>ページを公開する</h3>
              </div>
              <button style={iconBtn()} aria-label="閉じる" onClick={() => setExportData(null)}>×</button>
            </div>

            {/* タブ切替 */}
            <div style={{ display: "flex", padding: "12px 22px 0", gap: 8 }}>
              <button style={smallBtn(pubTab === "easy")} onClick={() => setPubTab("easy")}>かんたん公開</button>
              <button style={smallBtn(pubTab === "github")} onClick={() => setPubTab("github")}>GitHubに保存</button>
            </div>

            <div style={{ padding: "16px 22px 18px", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {pubTab === "easy" && (<>
              <p style={{ fontSize: 12, color: UI.gray, margin: 0, lineHeight: 1.7 }}>
                登録なしで今すぐ試したい人向け。ファイルをドラッグするだけの2ステップです。
              </p>
              {/* STEP 1 */}
              <div style={{ display: "flex", gap: 13 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: UI.accent,
                    color: "#1F3A46",
                    fontFamily: UI.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  1
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: UI.ink, margin: "2px 0 4px" }}>ファイルを保存する</p>
                  <p style={{ fontSize: 12, color: UI.gray, margin: "0 0 10px", lineHeight: 1.7 }}>
                    「公開する」を押した時点で <span style={{ fontFamily: UI.mono }}>my-page.html</span> のダウンロードが始まっています。始まっていなければ下のボタンで保存してください。
                  </p>
                  <button style={smallBtn(false)} onClick={downloadFromModal}>ファイルを保存（ダウンロード）</button>
                </div>
              </div>

              {/* STEP 2 */}
              <div style={{ display: "flex", gap: 13 }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: UI.accent,
                    color: "#1F3A46",
                    fontFamily: UI.mono,
                    fontSize: 13,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  2
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: UI.ink, margin: "2px 0 4px" }}>公開ページを開いて、ファイルを置く</p>
                  <p style={{ fontSize: 12, color: UI.gray, margin: "0 0 10px", lineHeight: 1.7 }}>
                    下のボタンで「Netlify Drop」という無料サイトが開きます。表示された枠に、さっき保存した
                    <span style={{ fontFamily: UI.mono }}> my-page.html </span>
                    をドラッグして置くだけ。数秒で公開URLが出ます（登録不要）。
                  </p>
                  <button
                    style={{ ...smallBtn(false), background: UI.accent, borderColor: UI.accent, color: "#1F3A46", fontWeight: 700, fontFamily: UI.sans }}
                    onClick={openNetlify}
                  >
                    公開ページ（Netlify Drop）を開く ↗
                  </button>
                  <p style={{ fontSize: 11, color: UI.faint, margin: "8px 0 0", lineHeight: 1.6 }}>
                    開かないときは、ブラウザで
                    <a href="https://app.netlify.com/drop" target="_blank" rel="noopener noreferrer" style={{ color: UI.accentDeep, fontFamily: UI.mono }}> app.netlify.com/drop </a>
                    にアクセスしてください。
                  </p>
                </div>
              </div>

              {/* 出てきたURLについて */}
              <div style={{ background: UI.accentBg, borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, color: "#345863", margin: 0, lineHeight: 1.8 }}>
                  出てきたURLを、Instagramのプロフィールなどに貼れば完成です。<br />
                  ※ そのままだと一定時間で消えます。Netlifyに<strong>無料登録</strong>すると消えずに残り、あとからファイルを置きかえて更新もできます。
                </p>
              </div>
            </>)}

            {/* ── GitHub に保存（自動公開）── */}
            {pubTab === "github" && (<>
              <p style={{ fontSize: 12, color: UI.gray, margin: 0, lineHeight: 1.8 }}>
                消えずに残り、あとから更新もできる方法です。<strong style={{ color: UI.ink }}>GitHub Pages</strong> に直接保存して、そのまま公開URLを発行します（無料）。最初の一度だけ、合言葉（トークン）の発行が必要です。
              </p>

              {ghUrl ? (
                <div style={{ background: UI.accentBg, borderRadius: 10, padding: "14px 16px" }}>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: "#2C5660", margin: "0 0 8px" }}>公開しました 🎉</p>
                  <a
                    href={ghUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: UI.mono, fontSize: 12.5, color: UI.accentDeep, wordBreak: "break-all" }}
                  >
                    {ghUrl}
                  </a>
                  <p style={{ fontSize: 11, color: "#4A6A72", margin: "8px 0 0", lineHeight: 1.7 }}>
                    反映まで数十秒〜1分ほどかかります。表示されないときは少し待って再読み込みしてください。次回からは同じトークンとリポジトリ名で「保存」すると上書き更新されます。
                  </p>
                </div>
              ) : (
                <>
                  {/* トークン発行の案内 */}
                  <div style={{ border: `1px solid ${UI.line}`, borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: UI.ink, margin: "0 0 6px" }}>① 合言葉（トークン）を発行</p>
                    <p style={{ fontSize: 11.5, color: UI.gray, margin: "0 0 8px", lineHeight: 1.7 }}>
                      下のボタンでGitHubのトークン発行ページが開きます（要ログイン）。<strong>repo</strong> にチェックが入った状態で開くので、一番下の「Generate token」を押し、表示された文字列をコピーして下に貼り付けてください。
                    </p>
                    <p style={{ fontSize: 10.5, color: UI.faint, margin: "0 0 10px", lineHeight: 1.7 }}>
                      ※「トークン」はGitHub側の呼び方で、一時的な合言葉のことです。あなたのパスワードそのものではなく、「この操作だけ」を期限つきで許可するための専用の鍵で、不要になればGitHub側でいつでも取り消せます。
                    </p>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=lien"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...smallBtn(false), display: "inline-block", textDecoration: "none", fontFamily: UI.sans }}
                    >
                      トークン発行ページを開く ↗
                    </a>
                  </div>

                  {/* 入力 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <MonoLabel style={{ marginBottom: 6 }}>② トークンを貼り付け</MonoLabel>
                      <input
                        type="password"
                        style={field}
                        placeholder="ghp_xxxxxxxx..."
                        value={ghToken}
                        onChange={(e) => setGhToken(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <MonoLabel style={{ marginBottom: 6 }}>③ ページの名前（URLに使われます）</MonoLabel>
                      <input
                        style={field}
                        placeholder="my-lien-page"
                        value={ghRepo}
                        onChange={(e) => setGhRepo(e.target.value)}
                      />
                    </div>
                    <button
                      style={{
                        ...smallBtn(false),
                        background: ghBusy ? UI.accentBg : UI.accent,
                        borderColor: UI.accent,
                        color: "#1F3A46",
                        fontWeight: 700,
                        fontFamily: UI.sans,
                        padding: "11px 0",
                        opacity: ghBusy ? 0.7 : 1,
                        cursor: ghBusy ? "default" : "pointer",
                      }}
                      disabled={ghBusy}
                      onClick={deployToGitHub}
                    >
                      {ghBusy ? "公開中…" : "GitHubに保存して公開する"}
                    </button>
                  </div>

                  {/* 進行ログ / エラー */}
                  {ghLog.length > 0 && (
                    <div style={{ background: UI.bg, borderRadius: 8, padding: "10px 12px" }}>
                      {ghLog.map((m, i) => (
                        <p key={i} style={{ fontSize: 11.5, color: UI.gray, margin: i ? "4px 0 0" : 0, lineHeight: 1.6 }}>
                          {m}
                        </p>
                      ))}
                    </div>
                  )}
                  {ghError && (
                    <p style={{ fontSize: 11.5, color: "#B0524F", margin: 0, lineHeight: 1.7 }}>{ghError}</p>
                  )}

                  <p style={{ fontSize: 10.5, color: UI.faint, margin: 0, lineHeight: 1.7 }}>
                    トークンはこの画面からGitHubに直接送られるだけで、どこにも保存されません。不要になったら発行ページから削除できます。
                  </p>
                </>
              )}
            </>)}

              {/* 上級者向け: コードをコピー */}
              <div style={{ borderTop: `1px solid ${UI.line}`, paddingTop: 12 }}>
                <button
                  style={{ ...smallBtn(false), border: "none", background: "transparent", color: UI.gray, padding: "4px 0" }}
                  onClick={() => setShowCode((v) => !v)}
                >
                  {showCode ? "▾ HTMLコードを隠す" : "▸ 上級者向け：HTMLコードを見る／コピー"}
                </button>
                {showCode && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      id="lien-export-textarea"
                      readOnly
                      value={exportData.html}
                      onFocus={(e) => e.target.select()}
                      style={{
                        width: "100%",
                        minHeight: 160,
                        fontFamily: UI.mono,
                        fontSize: 11,
                        lineHeight: 1.6,
                        color: UI.ink,
                        background: UI.bg,
                        border: `1px solid ${UI.line}`,
                        borderRadius: 8,
                        padding: 12,
                        resize: "vertical",
                        outline: "none",
                        whiteSpace: "pre",
                      }}
                    />
                    <button
                      style={{ ...smallBtn(false), marginTop: 8, background: copied ? UI.accentBg : "#FFF", color: copied ? UI.accentDeep : UI.ink }}
                      onClick={copyHtml}
                    >
                      {copied ? "COPIED" : "コードをコピー"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "12px 22px 18px", borderTop: `1px solid ${UI.line}`, display: "flex", justifyContent: "flex-end" }}>
              <button style={smallBtn(false)} onClick={() => setExportData(null)}>とじる</button>
            </div>
          </div>
        </div>
      )}

      {/* ── チュートリアル ── */}
      {tutorialStep >= 0 && view === "app" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#17191B66",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 16,
            zIndex: 120,
          }}
        >
          <div
            style={{
              background: UI.panel,
              border: `1px solid ${UI.line}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 460,
              padding: "22px 22px 18px",
              boxShadow: "0 24px 60px #00000033",
              marginBottom: "6vh",
            }}
          >
            {/* 進行ドット */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {TUTORIAL.map((_, i) => (
                <span
                  key={i}
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 2,
                    background: i <= tutorialStep ? UI.accentDeep : UI.line,
                    transition: "background .2s",
                  }}
                />
              ))}
            </div>

            <p style={{ fontFamily: UI.mono, fontSize: 10.5, letterSpacing: ".16em", color: UI.accentDeep, margin: "0 0 8px" }}>
              GUIDE
            </p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: UI.ink, margin: "0 0 10px" }}>
              {TUTORIAL[tutorialStep].title}
            </h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.9, color: UI.gray, margin: 0 }}>
              {TUTORIAL[tutorialStep].body}
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
              <button
                style={{ ...smallBtn(false), border: "none", background: "transparent", color: UI.faint, padding: "6px 4px" }}
                onClick={() => setTutorialStep(-1)}
              >
                スキップ
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {tutorialStep > 0 && (
                  <button style={smallBtn(false)} onClick={() => goTutorial(-1)}>もどる</button>
                )}
                <button
                  style={{ ...smallBtn(false), background: UI.accent, borderColor: UI.accent, color: "#1F3A46", fontWeight: 500 }}
                  onClick={() => goTutorial(1)}
                >
                  {tutorialStep >= TUTORIAL.length - 1 ? "はじめる" : "つぎへ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── About ── */}
      {aboutOpen && (
        <div
          onClick={() => setAboutOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#17191BAA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 130,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: UI.panel,
              border: `1px solid ${UI.line}`,
              borderRadius: 16,
              width: "100%",
              maxWidth: 420,
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 24px 60px #00000033",
            }}
          >
            <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${UI.line}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: UI.mono, fontSize: 10.5, letterSpacing: ".18em", color: UI.accentDeep, margin: 0 }}>ABOUT</p>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: UI.ink, margin: "6px 0 0" }}>about {APP_NAME}</h3>
              </div>
              <button style={iconBtn()} aria-label="閉じる" onClick={() => setAboutOpen(false)}>×</button>
            </div>

            <div style={{ padding: "18px 22px 20px", overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13.5, color: UI.ink, lineHeight: 1.9, margin: 0 }}>
                お使いいただきありがとうございます。<br />
                ご意見ご要望があれば教えてくださると、ほんとうにうれしいです。
              </p>

              {/* お問い合わせ */}
              <div>
                <a
                  href={CONTACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...smallBtn(false), display: "inline-block", textDecoration: "none", fontFamily: UI.sans }}
                >
                  お問い合わせ
                </a>
                <p style={{ fontSize: 10.5, color: UI.faint, margin: "6px 0 0" }}>不具合報告・ご意見ご要望はこちらから</p>
              </div>

              {/* レビュー */}
              <div>
                <button
                  style={{ ...smallBtn(false), background: UI.accent, borderColor: UI.accent, color: "#1F3A46", fontWeight: 500, fontFamily: UI.sans }}
                  onClick={openReview}
                >
                  レビューで応援する
                </button>
                <p style={{ fontSize: 10.5, color: UI.faint, margin: "6px 0 0" }}>
                  {reviewNotice ? "App Store公開後にご利用いただけます。" : "励みになります"}
                </p>
              </div>

              {/* iCloud同期 */}
              <div style={{ borderTop: `1px solid ${UI.line}`, paddingTop: 14 }}>
                <button style={smallBtn(false)} onClick={() => fileInputs.current["projectFile"]?.click()}>
                  iCloudと同期
                </button>
                <p style={{ fontSize: 10.5, color: UI.faint, margin: "6px 0 0", lineHeight: 1.7 }}>
                  iCloud Driveに保存した書類(.json)を読み込み、マイページに追加します。各ページの保存は「↓」から。
                </p>
              </div>

              {/* other apps */}
              <div style={{ borderTop: `1px solid ${UI.line}`, paddingTop: 14 }}>
                <MonoLabel style={{ marginBottom: 8 }}>OTHER APPS</MonoLabel>
                <div style={{ border: `1px dashed ${UI.line}`, borderRadius: 10, padding: "14px", textAlign: "center" }}>
                  <p style={{ fontSize: 11.5, color: UI.faint, margin: 0, letterSpacing: ".06em" }}>近日公開予定</p>
                </div>
              </div>

              {/* クレジット */}
              <div style={{ textAlign: "center", paddingTop: 4 }}>
                <a
                  href={DEV_X_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: UI.mono, fontSize: 11, letterSpacing: ".14em", color: UI.gray, textDecoration: "none" }}
                >
                  created by {DEV_NAME}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
