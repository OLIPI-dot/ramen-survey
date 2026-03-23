import React, { useState, useEffect, useRef, useMemo } from 'react';
// Deploy Kick: 2026-03-23 12:16 🚀🐰
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import FooterModals from './components/FooterModals';
import SurveyListView from './components/SurveyListView';
import SurveyDetailView from './components/SurveyDetailView';
import './App.css';

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⭐ 人気スコアの係数
const SCORE_VOTE_WEIGHT = 3;

// 👁️ view_count 重複加算防止 (テスト用に10秒に短縮らび！)
const VIEW_COOLDOWN_MS = 10 * 1000;
const SUBMISSION_COOLDOWN_MS = 10 * 1000; // 🛡️ 連続投稿制限 (10秒)

// 🛡️ 管理者のメールアドレス
const ADMIN_EMAILS = ['pachu.pachu.pachuly@gmail.com'];

// 🛡️ NGワードフィルター
const NG_WORDS = ['死ね', '殺す', 'カス', 'アホ', 'バカ', 'きもい', 'キモイ', 'うざい'];
const hasNGWord = (text) => NG_WORDS.some(ng => text.includes(ng));

// 🌟 アプリ全体で使うデフォルト画像
const DEFAULT_SURVEY_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000';

// 🏷️ カテゴリ別デフォルトサムネ (廃止：スッキリデザインのため)
const CATEGORY_IMAGES = {};


// 🐰 らびの降臨メッセージ集
const LABI_RESPONSES = {
  default: [
    "やっほー！呼んだかな？らびだよ！🐰✨ いつでも広場を見守ってるよ！",
    "やっほー！わーい！コメントありがとう！🥕 嬉しいなぁ！",
    "やっほー！その意見、とっても素敵だね！✨ さすが広場のみんな！",
    "やっほー！らびもそう思ってたんだ！🐰🥕 気が合うね！",
    "やっほー！広場が賑やかで楽しいな〜！🐾 今日も良い一日になりそう！",
    "やっほー！ひょっこり降臨！🐰 らびだよ〜！"
  ],
  keywords: [
    "やっほー！わああ！大好きなニンジンだー！🥕🥕🥕 むしゃむしゃ！😋 ありがとう！",
    "やっほー！ニンジンっていう言葉を聞くと、どこからでも飛んでくるよ！🐰💨💨",
    "やっほー！🥕 はらびの元気の源なんだ！広場のみんなにもお置き分けしたいな〜✨",
    "やっほー！らびは幸せ者だなぁ…！🥕 最高のプレゼントをありがとう！"
  ],
  admin: [
    "やっほー！管理者さん、いつも素敵な広場の運営をありがとう！応援してるらび！🐰✨",
    "やっほー！広場がもっと良くなるように、らびもお手伝い頑張るね！🥕🍀",
    "やっほー！いつも見守ってくれてありがとう！広場の平和はらびが守るよ！🛡️🐰",
    "やっほー！お疲れ様！🐰 たまには人参茶でも飲んでゆっくりしてね〜🍵"
  ]
};

const CATEGORY_ICON_STYLE = {
  "すべて": { icon: "📂", color: "#64748b" },
  "ニュース": { icon: "⚡", color: "#0ea5e9" },
  "話題": { icon: "✨", color: "#8b5cf6" },
  "エンタメ": { icon: "🎭", color: "#ec4899" },
  "レビュー": { icon: "⭐", color: "#f59e0b" },
  "コラム": { icon: "🖊️", color: "#3b82f6" },
  "ネタ": { icon: "😂", color: "#f97316" },
  "YouTuber": { icon: "📺", color: "#ef4444" },
  "らび": { icon: "🐰", color: "#f472b6" },
  "その他": { icon: "🏷️", color: "#94a3b8" },
  "マイアンケート": { icon: "👤", color: "#94a3b8" }
};

const formatWithDay = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const dayStr = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${MM}/${DD}(${dayStr}) ${HH}:${mm}`;
};

// ⌛ 残り時間カウントダウンコンポーネント
const CountdownTimer = ({ deadline, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) {
        setTimeLeft('終了');
        onTimeUp();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 100) % 60); // ミリ秒チックに速く動かすなら /1000

      let str = '';
      if (days > 0) str += `${days}日 `;
      str += `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${Math.floor(diff / 1000 % 60).toString().padStart(2, '0')}`;
      setTimeLeft(`残り：${str}`);
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return <div className="countdown-display">{timeLeft}</div>;
};

// 🔢 数字がヌルヌル増える演出（アニメーションカウンタ）
const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value);
  useEffect(() => {
    let start = displayValue;
    let end = value;
    if (start === end) return;
    let timer = setInterval(() => {
      if (start < end) start++;
      else if (start > end) start--;
      setDisplayValue(start);
      if (start === end) clearInterval(timer);
    }, 50); // 50msごとにカウントアップ
    return () => clearInterval(timer);
  }, [value]);
  return <span className="count-animate">{displayValue}</span>;
};

const AdSenseBox = ({ slot, format = 'auto', affiliateType = null }) => {
  // 🥕 おりぴさんの特別な紹介ID！
  const ASSOCIATE_ID = 'olipivote-22';

  // ✨ おすすめ商品リスト
  const RECOMMENDATIONS = [
    { title: '【第2類医薬品】 by Amazon 鼻炎スプレーN 30mL × 5本', url: 'https://amzn.to/4raqnTr', image: 'https://m.media-amazon.com/images/I/71uk-JC-T4L._AC_SX679_.jpg', icon: '👃', category: 'おりぴ医薬品' },
    { title: 'by Amazon キトサン加工綿棒 200本x10個', url: 'https://amzn.to/4slfYp4', image: 'https://m.media-amazon.com/images/I/71RDCcGMRkL._AC_SX679_PIbundle-10,TopRight,0,0_SH20_.jpg', icon: '�', category: 'おりぴ日用品' },
    { title: 'ソフトパックティッシュ (320枚 72パック入)', url: 'https://amzn.to/4b6ZPMN', image: 'https://m.media-amazon.com/images/I/71F-kSQlPGL._AC_SX679_PIbundle-72,TopRight,0,0_SH20_.jpg', icon: '�', category: 'おりぴ日用品' },
    { title: '山善 つっぱり式カーテンレール 3ポール', url: 'https://amzn.to/4ldgyCJ', image: 'https://m.media-amazon.com/images/I/610RqBHU+-S._AC_SY879_.jpg', icon: '🏠', category: 'おりぴ家具' },
    { title: 'オーディオテクニカ AT8705 マイクアーム ロープロファイル', url: 'https://amzn.to/4cqLvkJ', image: 'https://m.media-amazon.com/images/I/51vcPonquOL._AC_SY879_.jpg', icon: '🎙️', category: 'おりぴ音響機器' },
    { title: "D'Addario ダダリオ ブリッジピンプラー", url: 'https://amzn.to/4b3HArD', image: 'https://m.media-amazon.com/images/I/61iQnsDnENL._AC_SX679_.jpg', icon: '🎸', category: 'おりぴ楽器' },
    { title: 'アストロプロダクツ 充電式 グルーガン', url: 'https://amzn.to/4bnSVnP', image: 'https://m.media-amazon.com/images/I/61E4pp-RS5L._AC_SX679_.jpg', icon: '🛠️', category: 'おりぴ工具' },
    { title: '下村企販 バナナスタンド', url: 'https://amzn.to/4rfif4a', image: 'https://m.media-amazon.com/images/I/41SLnhzQXVL._AC_SY879_.jpg', icon: '🍌', category: 'おりぴキッチン' },
    { title: 'ブテナロック 足洗いソープ', url: 'https://amzn.to/4rVg8ni', image: 'https://m.media-amazon.com/images/I/51U5qFjDPOL._AC_SY879_.jpg', icon: '🧼', category: 'おりぴ生活' },
    { title: 'Logicool G ゲーミングヘッドセット', url: 'https://amzn.to/46HYQS0', image: 'https://m.media-amazon.com/images/I/71QEWj+ioXS._AC_SX679_.jpg', icon: '🎧', category: 'おりぴPC' },
    { title: '味の素 冷凍ギョーザ 1kg', url: 'https://amzn.to/4b9MxiU', image: 'https://m.media-amazon.com/images/I/81bIZEBVGqL._AC_SX1000_.jpg', icon: '🥟', category: 'おりぴ食品' },
    { title: 'UGREEN USB-C ケーブル 2M', url: 'https://amzn.to/40ekjhW', image: 'https://m.media-amazon.com/images/I/61DgZxJhEZL._AC_SY879_.jpg', icon: '🔌', category: 'おりぴPC' },
    { title: 'LISEN USB-C ケーブル 2M', url: 'https://amzn.to/4aQsQO4', image: 'https://m.media-amazon.com/images/I/81eeRU5gwtL._AC_SX679_.jpg', icon: '🔌', category: 'おりぴPC' },
    { title: 'Shark 自動ゴミ収集掃除機', url: 'https://amzn.to/4bgVp6q', image: 'https://m.media-amazon.com/images/I/51F7qXg9W+L._AC_SX679_.jpg', icon: '', category: 'おりぴ家電' },
    { title: 'SONY 65インチ 4Kブラビア', url: 'https://amzn.to/3N15HiU', image: 'https://m.media-amazon.com/images/I/61N0XNFinyL._AC_SY879_.jpg', icon: '', category: 'おりぴ家電' },
    { title: 'by Amazon エナジードリンク', url: 'https://amzn.to/4rVsb47', image: 'https://m.media-amazon.com/images/I/81YLVVDtZRL._AC_SX679_.jpg', icon: '⚡', category: 'おりぴ飲物' }
  ];

  // ランダムに1つ選ぶよ（マウント時から完全にランダム！）
  const [rec, setRec] = useState(() => RECOMMENDATIONS[Math.floor(Math.random() * RECOMMENDATIONS.length)]);
  useEffect(() => {
    setRec(RECOMMENDATIONS[Math.floor(Math.random() * RECOMMENDATIONS.length)]);
  }, []);

  useEffect(() => {
    const initAd = () => {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { }
    };
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      initAd(); return;
    }
    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9429738476925701";
    script.async = true; script.crossOrigin = "anonymous";
    script.onload = initAd;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="adsense-container-wrapper" style={{ margin: '24px 0', textAlign: 'center', position: 'relative' }}>
      {/* 🛡️ 審査中・広告未配信時の代替表示 */}
      <div className="ads-placeholder" style={{
        background: 'linear-gradient(135deg, #fff5f7 0%, #ffffff 100%)',
        border: '3px dashed #ec4899', borderRadius: '24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '28px', color: '#64748b', fontSize: '0.9rem',
        boxShadow: '0 10px 40px rgba(236, 72, 153, 0.12)',
        zIndex: 1,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {affiliateType === 'ofuse' ? (
          <div className="affiliate-content" style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💖</div>
            <div style={{ fontWeight: 'bold', color: '#db2777' }}>らび＆おりぴを応援！</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '4px' }}>いつも広場を使ってくれてありがとう！<br />100円から応援できるらび🥕</div>
            <a href="https://ofuse.me/olipi" target="_blank" rel="noopener noreferrer" className="affiliate-btn ofuse-btn" style={{
              marginTop: '12px', padding: '8px 20px', background: '#db2777', color: '#fff', borderRadius: '20px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.85rem',
              display: 'inline-block', position: 'relative', zIndex: 20
            }}>OFUSEで応援する 🥕✨</a>
          </div>
        ) : (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>✨</div>
            <div style={{ fontWeight: 'bold' }}>スポンサー枠</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px' }}>広場を一緒に盛り上げてくれる<br />スポンサーさんを募集中です！✨</div>
          </div>
        )}
      </div>
      <ins className="adsbygoogle"
        style={{ display: 'block', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }} // 👈 pointerEvents: 'none' でクリックを通します
        data-ad-client="ca-pub-9429738476925701"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"></ins>
    </div>
  );
};

const SiteConceptSection = ({ user, totalVotes = 0 }) => (
  <div className="site-concept-card" style={{
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    borderRadius: '28px',
    padding: '36px',
    marginBottom: '32px',
    border: 'none',
    boxShadow: '0 20px 50px rgba(99, 102, 241, 0.2)',
    textAlign: 'center',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{ position: 'relative', zIndex: 1 }}>
      <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '16px', textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        3秒で本音が言える、<br />みんなの意見がすぐ分かる！ 🚀
      </h2>
      <p style={{ fontSize: '1.1rem', opacity: 0.95, marginBottom: '28px', lineHeight: '1.6' }}>
        気になる話題に1タップで投票。匿名だから安心。<br />
        {totalVotes > 0 && <span style={{ fontWeight: 'bold', borderBottom: '2px solid #fff' }}>現在 <AnimatedCounter value={totalVotes} /> 件の投票が集まっています！🔥</span>}
      </p>
      
      {!user && (
        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '20px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '12px' }}>✨ ログインして今すぐ参加らび！</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <li>✅ 投票後すぐ結果が見れる</li>
            <li>✅ 自分の意見をコメントできる</li>
            <li>✅ 面白いアンケートを作れる</li>
          </ul>
          <button onClick={() => window.loginWithGoogle()} className="premium-login-btn" style={{
            background: '#fff', color: '#6366f1', padding: '12px 32px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', cursor: 'pointer'
          }}>
            Googleでログインして参加 🐰💎
          </button>
        </div>
      )}
      
      {user && (
        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
          💡 気になる話題を見つけたら、どんどん投票してみようらびっ！
        </div>
      )}
    </div>
    {/* 装飾用の光の輪 */}
    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
  </div>
);

function App() {
  const [view, setView] = useState('list');
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [options, setOptions] = useState([]);
  const [votedOption, setVotedOption] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [myCommentKeys, setMyCommentKeys] = useState(() => JSON.parse(localStorage.getItem('my_comment_keys') || '{}'));
  const [myReactions, setMyReactions] = useState(() => JSON.parse(localStorage.getItem('my_reactions') || '{}'));
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [liveSurveys, setLiveSurveys] = useState([]);
  const [popularSurveys, setPopularSurveys] = useState([]);
  const [endingSoonSurveys, setEndingSoonSurveys] = useState([]);
  const [showAllEndingSoon, setShowAllEndingSoon] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0); // 📊 サイト全体の総投票数
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyImage, setSurveyImage] = useState('');
  const [surveyCategory, setSurveyCategory] = useState('');
  const [setupOptions, setSetupOptions] = useState([]);
  const [surveyVisibility, setSurveyVisibility] = useState('public');
  const [sortMode, setSortMode] = useState('today'); // デフォルトを今日のものに変更らび！
  const [popularMode, setPopularMode] = useState('trending');
  const [filterCategory, setFilterCategory] = useState('すべて');
  const [tempOption, setTempOption] = useState('');
  const [watchedIds, setWatchedIds] = useState(() => JSON.parse(localStorage.getItem('watched_surveys') || '[]'));
  const [deadline, setDeadline] = useState('');
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [surveyTags, setSurveyTags] = useState([]); // 🏷️ タグ作成用
  const [tempTag, setTempTag] = useState(''); // タグ入力中の文字
  const [filterTag, setFilterTag] = useState(''); // 🏷️ タグ絞り込み
  const [currentPage, setCurrentPage] = useState(1); // 📄 ページネーション用
  const [likedSurveys, setLikedSurveys] = useState(() => JSON.parse(localStorage.getItem('liked_surveys') || '[]')); // 👍 いいね履歴
  const [surveyYoutube, setSurveyYoutube] = useState(''); // 📺 YouTube動画URL
  const [surveyDescription, setSurveyDescription] = useState(''); // 📝 解説文 / 参考URL
  const [activeTab, setActiveTab] = useState('official'); // ⚖️ 'official' or 'user'
  // 🐰 (重複宣言を削除しました - line 1611付近に統合)

  // 📺 YouTube URLからIDを抽出する魔法
  const extractYoutubeId = (input) => {
    if (!input) return null;
    const urls = input.split(/[\s,]+/).filter(Boolean);
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ids = urls.map(url => {
      const trimmed = url.trim();
      if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
      const match = trimmed.match(regex);
      return match ? match[1] : null;
    }).filter(Boolean);
    return ids.length > 0 ? Array.from(new Set(ids)).join(',') : null;
  };

  // 📺 ニコニコ動画 URLからIDを抽出する魔法
  const extractNicoId = (input) => {
    if (!input) return null;
    const urls = input.split(/[\s,]+/).filter(Boolean);
    const regex = /(?:nicovideo\.jp\/watch\/|nico\.ms\/|www\.nicovideo\.jp\/watch\/)([a-z]{2}\d+|\d+)/;
    const ids = urls.map(url => {
      const trimmed = url.trim();
      if (/^[a-z]{2}\d+$/.test(trimmed) || /^\d+$/.test(trimmed)) return trimmed; // sm123... などの形式
      const match = trimmed.match(regex);
      return match ? match[1] : null;
    }).filter(Boolean);
    return ids.length > 0 ? Array.from(new Set(ids)).join(',') : null;
  };

  // 👑 管理者フラグ
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const [currentCommentPage, setCurrentCommentPage] = useState(1); // 💬 コメント用ページネーション
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagEditValue, setTagEditValue] = useState('');

  // 📡 リアルタイム人数
  const [globalOnlineCount, setGlobalOnlineCount] = useState(1);
  const manualUpdatesRef = useRef({}); // 🛡️ { [surveyId]: timestamp } アンケートごとの更新ガード
  const [surveyOnlineCount, setSurveyOnlineCount] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortMode, searchQuery, filterCategory, filterTag, popularMode]);

  // ▼ページネーションUIコンポーネント
  const Pagination = ({ current, total, onPageChange }) => {
    if (total <= 1) return null;
    const pages = [];
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return (
      <div className="pagination-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px', marginBottom: '16px', width: '100%' }}>
        <button onClick={() => { onPageChange(Math.max(1, current - 1)); }} disabled={current === 1} style={{ background: 'none', border: 'none', cursor: current === 1 ? 'default' : 'pointer', color: current === 1 ? '#cbd5e1' : '#475569', fontSize: '1.2rem', padding: '4px 8px' }}>&lt;</button>
        {pages.map((p, i) => (
          <button key={i} onClick={() => { if (p !== '...') { onPageChange(p); } }} disabled={p === '...'} style={{ background: p === current ? '#8b5cf6' : 'none', color: p === current ? '#fff' : (p === '...' ? '#94a3b8' : '#475569'), border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p === '...' ? 'default' : 'pointer', fontWeight: p === current ? 'bold' : 'normal', fontSize: '1rem', transition: 'all 0.2s', boxShadow: p === current ? '0 2px 4px rgba(139,92,246,0.3)' : 'none' }}>
            {p}
          </button>
        ))}
        <button onClick={() => { onPageChange(Math.min(total, current + 1)); }} disabled={current === total} style={{ background: 'none', border: 'none', cursor: current === total ? 'default' : 'pointer', color: current === total ? '#cbd5e1' : '#475569', fontSize: '1.2rem', padding: '4px 8px' }}>&gt;</button>
      </div>
    );
  };

  // 📝 モーダル管理の状態
  const [showingTerms, setShowingTerms] = useState(false);
  const [showingPrivacy, setShowingPrivacy] = useState(false);
  const [showingContact, setShowingContact] = useState(false);
  const [showingAbout, setShowingAbout] = useState(false);
  const [contactType, setContactType] = useState('削除依頼');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // 📡 広場全体のリアルタイム人数追跡
  useEffect(() => {
    // 💡 タブ・端末ごとに一意のIDを生成 (crypto.randomUUID または Math.random)
    const clientId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);

    const channel = supabase.channel('global-presence', {
      config: { presence: { key: clientId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setGlobalOnlineCount(count > 0 ? count : 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { channel.unsubscribe(); };
  }, []);

  // 📊 サイト全体の総投票数を取得・同期する魔法
  useEffect(() => {
    const fetchTotalVotes = async () => {
      // optionsテーブルのvotesカラムを全合算する（小規模ならこれでOK）
      const { data, error } = await supabase.from('options').select('votes');
      if (!error && data) {
        const total = data.reduce((sum, opt) => sum + (opt.votes || 0), 0);
        setTotalVotes(total);
      }
    };

    fetchTotalVotes();

    // 投票があったらリアルタイムで合算し直す
    const channel = supabase.channel('total-votes-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options' }, (payload) => {
        // payload.new.votes と payload.old.votes の差分で計算してもいいが、
        // 確実性のために合算し直す（秒間数百件でなければ問題なし）
        fetchTotalVotes();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  // 🐰 らびのトレンドアンケート自動生成魔法 (絶対重複させない版)
  useEffect(() => {
    const magic = async () => {
      if (!user || localStorage.getItem('labi_magic_done_31')) return;

      // 多重起動防止フラグ
      localStorage.setItem('labi_magic_done_31', 'busy');

      const trends = [
        { title: 'うさぎのらびの挑戦！🥕 みんなの『元気が出る魔法』はどれ？🐰🌈', category: 'らび', options: ['美味しいものを食べる 🍰', '好きな音楽を聴く 🎵', '誰かに褒めてもらう 👏', '太陽の光を浴びる ☀️', 'らびとニンジンを分かち合う 🐰🥕'], tags: ['らび', '元気', '魔法'] },
        { title: 'いま一番欲しいApple製品は？', category: 'IT・テクノロジー', options: ['iPhone', 'MacBook', 'iPad', 'Apple Watch', 'Vision Pro'] },
        { title: '休日の過ごし方といえば？', category: '生活', options: ['家でゴロゴロ', 'ショッピング・お出かけ', '趣味・スポーツ', '勉強や自己研鑽'] },
        { title: '次に旅行に行きたい国は？', category: '生活', options: ['ハワイ (アメリカ)', '韓国', '台湾', 'ヨーロッパ'] },
        { title: '好きな映画のジャンルは？', category: 'エンタメ', options: ['アクション', 'SF・ファンタジー', 'ホラー・サスペンス', '恋愛・ドラマ'] },
        { title: '定番の居酒屋メニューといえば？', category: 'グルメ', options: ['枝豆', '唐揚げ', 'だし巻き卵', 'ポテトフライ'] },
        { title: 'もし100万円もらえたら何に使う？', category: 'トレンド', options: ['貯金・投資', '旅行・レジャー', 'ガジェット・PC', '美味しいものを食べる'] },
        { title: '今期一番見ているアニメは？', category: 'エンタメ', options: ['話題作', '日常・コメディ', 'バトル・ファンタジー', '今期は見ていない'] },
        { title: 'スマホのOSはどっち派？', category: 'IT・テクノロジー', options: ['iOS (iPhone)', 'Android'] },
        { title: '好きな季節はどれ？', category: '生活', options: ['春', '夏', '秋', '冬'] },
        { title: '朝食はパン派？ご飯派？', category: 'グルメ', options: ['パン派', 'ご飯派', 'シリアル・麺類', '食べない'] },
        { title: '最近ハマっているゲームのジャンルは？', category: 'ゲーム', options: ['RPG', 'FPS/TPS', 'パズル・カジュアル', 'シミュレーション'] },
        { title: '通勤・通学中は何してる？', category: '生活', options: ['音楽を聴く', 'スマホで動画・SNS', '読書', '寝る'] },
        { title: 'ペットを飼うならどっち？', category: '生活', options: ['犬', '猫', '鳥・小動物', '飼わない'] },
        { title: '好きなラーメンの系統は？', category: 'グルメ', options: ['家系', '二郎系', 'あっさり醤油・塩', '豚骨・味噌'] },
        { title: 'よく使うキャッシュレス決済は？', category: '生活', options: ['PayPay', 'クレジットカード', '交通系IC (Suica等)', '現金派'] },
        { title: 'お風呂の時間はどれくらい？', category: '生活', options: ['15分以内 (シャワーのみ等)', '15〜30分', '30分〜1時間', '1時間以上'] },
        { title: 'タイムトラベルできるならどっち？', category: 'エンタメ', options: ['過去', '未来'] },
        { title: '好きなスポーツ観戦は？', category: 'スポーツ', options: ['野球', 'サッカー', 'バスケットボール', '格闘技'] },
        { title: '仕事・勉強中の飲み物といえば？', category: '生活', options: ['コーヒー', 'お茶・紅茶', 'エナジードリンク', '水・炭酸水'] },
        { title: '好きなチョコレートの種類は？', category: 'グルメ', options: ['ミルク', 'ビター', 'ホワイト', 'ナッツ入り等'] },
        { title: '旅行での宿選び、一番重視するのは？', category: '生活', options: ['価格の安さ', '食事の美味しさ', '温泉・お風呂', 'アクセスの良さ'] },
        { title: '生まれ変わるなら男？女？', category: 'トレンド', options: ['男', '女', '人間以外', '生まれ変わりたくない'] },
        { title: '好きなテレビ番組のジャンルは？', category: 'エンタメ', options: ['バラエティ', 'ドラマ', 'ニュース・報道', 'スポーツ'] },
        { title: '一番よく使う動画配信サービスは？', category: 'エンタメ', options: ['YouTube', 'Netflix', 'Amazon Prime', 'TVer'] },
        { title: '夏といえば何？', category: '生活', options: ['海・プール', 'お祭り・花火', 'スイカ・かき氷', 'クーラーの効いた部屋'] },
        { title: '健康のために気をつけていることは？', category: '生活', options: ['食事', '運動', '睡眠', '特に気にしていない'] },
        { title: '好きなおにぎりの具は？', category: 'グルメ', options: ['鮭', 'ツナマヨ', '明太子', '梅干し'] },
        { title: '一番よく使うAI機能は？', category: 'IT・テクノロジー', options: ['文章作成・要約', '翻訳', '画像作成', 'ただの話し相手'] },
        { title: '寝る前に必ずすることは？', category: '生活', options: ['スマホチェック', '読書', 'ストレッチ', '何もしないで即寝'] },
        { title: '人生で一番大切なものは？', category: 'トレンド', options: ['愛・家族', 'お金', '健康', '自由・時間'] }
      ];

      try {
        for (const t of trends) {
          const { data: existing } = await supabase.from('surveys').select('id').eq('title', t.title).limit(1);
          if (existing && existing.length > 0) continue;

          const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase.from('surveys').insert([{
            title: t.title,
            category: t.category,
            deadline,
            user_id: user.id,
            visibility: 'public',
            image_url: '',
            tags: t.tags || []
          }]).select();

          if (data && data[0]) {
            await supabase.from('options').insert(t.options.map(name => ({ name, votes: 0, survey_id: data[0].id })));
          }
        }
        localStorage.setItem('labi_magic_done_31', 'true');
      } catch (e) {
        localStorage.removeItem('labi_magic_done_31');
      }
      fetchSurveys(user);
      refreshSidebar();
    };
    magic();
  }, [user]);

  // 💬 詳細画面のデータ取得＆リアルタイム購読ロジック
  useEffect(() => {
    if (view === 'details' && currentSurvey) {
      let activeCommentChannel;
      let activePresenceChannel;
      let activeOptionsChannel;

      const initDetailView = async () => {
        // 1. オプションと投票状況の取得
        const { data: optData } = await supabase.from('options').select('*').eq('survey_id', currentSurvey.id).order('id', { ascending: true });
        if (optData) {
          setOptions(optData);
          // setTotalVotes(optData.reduce((sum, item) => sum + item.votes, 0)); // This is for current survey, not global
        }
        setVotedOption(localStorage.getItem(`voted_survey_${currentSurvey.id}`));

        // 2. コメントの取得
        const { data: commData, error: commError } = await supabase
          .from('comments')
          .select('*')
          .eq('survey_id', currentSurvey.id)
          .order('created_at', { ascending: false });
        if (!commError) setComments(commData);

        // 3. リアルタイム購読 (オプション)
        activeOptionsChannel = supabase.channel(`opts-${currentSurvey.id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options', filter: `survey_id=eq.${currentSurvey.id}` }, () => {
            initDetailView(); // 更新があったら再取得（再帰的ですが購読は重複しません）
          })
          .subscribe();

        // 4. リアルタイム購読 (コメント)
        activeCommentChannel = supabase
          .channel(`comments_realtime_${currentSurvey.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'comments'
          }, payload => {
            if (payload.eventType === 'INSERT' && payload.new.survey_id === currentSurvey.id) {
              setComments(prev => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              setComments(prev => prev.filter(c => c.id !== payload.old.id));
            }
          })
          .subscribe();

        // 5. リアルタイム視聴人数（Presence）
        const clientId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
        activePresenceChannel = supabase.channel(`survey-presence-${currentSurvey.id}`, {
          config: { presence: { key: clientId } }
        });

        activePresenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = activePresenceChannel.presenceState();
            const count = Object.keys(state).length;
            setSurveyOnlineCount(count > 0 ? count : 1);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await activePresenceChannel.track({ online_at: new Date().toISOString() });
            }
          });
      };

      initDetailView();

      return () => {
        if (activeCommentChannel) supabase.removeChannel(activeCommentChannel);
        if (activePresenceChannel) supabase.removeChannel(activePresenceChannel);
        if (activeOptionsChannel) supabase.removeChannel(activeOptionsChannel);
      };
    } else {
      setComments([]);
      setCurrentCommentPage(1);
      setSurveyOnlineCount(1);
    }
  }, [view, currentSurvey]);

  // 🔮 簡易トリップ生成ファンクション
  const generateTrip = (nameWithPass) => {
    if (!nameWithPass.includes('#')) return nameWithPass;
    const parts = nameWithPass.split('#');
    const name = parts[0];
    const pass = parts.slice(1).join('#');
    if (!pass) return name;

    // 堅牢な簡易ハッシュ（btoaは日本語に弱いため、数値演算ベースに変更）
    let h = 0;
    for (let i = 0; i < pass.length; i++) {
      h = ((h << 5) - h) + pass.charCodeAt(i);
      h |= 0; // 32bit 整数に固定
    }
    const hash = Math.abs(h).toString(36).substring(0, 10).toUpperCase();
    return `${name} ◆${hash}`;
  };

  const renderCommentContent = (content) => {
    if (!content) return null;
    // 第3弾：Markdownリンク [text](url) に対応！
    const parts = content.split(/(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+|>>\d+)/g);
    
    // splitに正規表現のキャプチャグループが含まれる場合、マッチした部分も配列に入るため
    // インデックスを調整しながらレンダリングするらび。
    const elements = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // [text](url) 形式のマッチ後、i+1, i+2 にキャプチャグループが入るのでスキップ
      const mdMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (mdMatch) {
        elements.push(
          <a key={i} href={mdMatch[2]} target="_blank" rel="noopener noreferrer" className="comment-url-link">
            {mdMatch[1]}
          </a>
        );
        i += 2; // キャプチャグループ分をスキップ
        continue;
      }

      if (part.startsWith('>>') && /^>>\d+$/.test(part)) {
        elements.push(<span key={i} className="comment-anchor-link">{part}</span>);
        continue;
      }

      if (/^https?:\/\/\S+$/.test(part)) {
        const cleanUrl = part.trim();
        elements.push(
          <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="comment-url-link">
            {cleanUrl}
          </a>
        );
        continue;
      }

      // キャプチャグループとして入ってきただけの文字列を除外（親に含まれているため）
      // [text](url) の一部である場合は mdMatch で処理済み
      if (parts[i-1]?.startsWith('[') && parts[i-1]?.endsWith(')') && (part === parts[i-1].match(/\[([^\]]+)\]/)?.[1] || part === parts[i-1].match(/\(([^)]+)\)/)?.[1])) {
        continue;
      }

      elements.push(part);
    }
    return elements;
  };

  // 🛡️ レートリミット（連投制限）チェック
  const checkRateLimit = () => {
    if (isAdmin) return true; // 管理者は無制限！🛡️✨
    const lastSub = parseInt(localStorage.getItem('last_submission_time') || '0', 10);
    const now = Date.now();
    if (now - lastSub < SUBMISSION_COOLDOWN_MS) {
      const waitSec = Math.ceil((SUBMISSION_COOLDOWN_MS - (now - lastSub)) / 1000);
      alert(`🏃 ちょっと急ぎすぎかも！あと ${waitSec} 秒待ってね🐰🥕`);
      return false;
    }
    return true;
  };

  const updateRateLimit = () => {
    localStorage.setItem('last_submission_time', Date.now().toString());
  };

  async function handlePostComment() {
    if (!commentContent.trim()) return;
    if (!checkRateLimit()) return; // 🛡️ 連投チェック
    setIsPostingComment(true);

    try {
      // 未入力時は常に「名無し」にする
      const nameToUse = commentName.trim() || '名無し';
      const finalName = generateTrip(nameToUse);

      // 編集・削除用のランダムな鍵を生成
      const editKey = Math.random().toString(36).substring(2);

      // 🏎️ UIを先に更新（楽観的UI更新）
      const tempId = 'temp-' + Date.now();
      const optimisticComment = {
        id: tempId,
        survey_id: currentSurvey.id,
        user_name: finalName,
        content: commentContent,
        user_id: user?.id || null,
        edit_key: editKey,
        created_at: new Date().toISOString(),
        reactions: {}
      };

      setComments(prev => [...prev, optimisticComment]);
      setCommentContent('');
      setCommentName('');
      updateRateLimit();

      // 📊 GA4 キーイベント: コメント投稿
      if (window.gtag) {
        window.gtag('event', 'post_comment', {
          'survey_id': currentSurvey.id,
          'survey_title': currentSurvey.title
        });
      }

      // アンケート本体のコメント数も更新
      const updatedSurvey = { ...currentSurvey, comment_count: (currentSurvey.comment_count || 0) + 1 };
      setCurrentSurvey(updatedSurvey);
      setSurveys(prev => prev.map(s => s.id === currentSurvey.id ? updatedSurvey : s));

      // 🆙 DBへ反映（非同期でOKらび！）
      supabase.from('comments').insert([{
        survey_id: currentSurvey.id,
        user_name: finalName,
        content: commentContent,
        user_id: user?.id || null,
        edit_key: editKey
      }]).select().then(({ data, error }) => {
        if (!error && data) {
          // 成功したら本物のIDに書き換える（編集・削除のため）
          setComments(prev => prev.map(c => c.id === tempId ? data[0] : c));
          
          const updatedKeys = { ...myCommentKeys };
          updatedKeys[data[0].id] = editKey;
          localStorage.setItem('my_comment_keys', JSON.stringify(updatedKeys));
          setMyCommentKeys(updatedKeys);
        } else if (error) {
          console.error("Comment Insert Error:", error);
          // 失敗したらロールバックする親切設計らび
          setComments(prev => prev.filter(c => c.id !== tempId));
        }
      });

      // 🪄 ラビの降臨チェック
      triggerLabiDescent(commentContent, finalName, isAdmin, comments.length + 1);
    } finally {
      setIsPostingComment(false);
    }
  }

  // 🪄 らびの降臨（自動返信）トリガー
  const triggerLabiDescent = async (userComment, userName, isAdminComment, resNum) => {
    // 条件1: らびのアンケートかどうか (タイトルかタグに「らび」)
    const titleMatch = currentSurvey?.title?.includes('らび') || currentSurvey?.title?.includes('ラビ');
    let tagMatch = false;
    if (Array.isArray(currentSurvey?.tags)) {
      tagMatch = currentSurvey.tags.includes('らび') || currentSurvey.tags.includes('ラビ');
    } else if (typeof currentSurvey?.tags === 'string') {
      tagMatch = currentSurvey.tags.includes('らび') || currentSurvey.tags.includes('ラビ');
    }
    const isLabiSurvey = titleMatch || tagMatch || currentSurvey?.category === 'らび';

    if (!isLabiSurvey) return;

    // 条件2: キーワードブースト (100%) または 確率 (30%)
    const textToSearch = userComment.toLowerCase();
    const keywords = ['ニンジン', 'にんじん', 'carrot', '🥕', 'らび', 'ラビ', 'うさぎ', 'ウサギ'];
    const hasKeyword = keywords.some(k => textToSearch.includes(k));
    const shouldDescend = hasKeyword || Math.random() < 0.3;

    if (!shouldDescend) return;

    // ⏳ 3〜5秒の溜めを作る
    const delay = 3000 + Math.random() * 2000;
    console.log(`🐰 Labi is planning to descend in ${Math.round(delay)}ms...`);
    
    setTimeout(async () => {
      try {
        let responseList = LABI_RESPONSES.default;
        if (hasKeyword) responseList = LABI_RESPONSES.keywords;
        if (isAdminComment) responseList = LABI_RESPONSES.admin;

        let reply = responseList[Math.floor(Math.random() * responseList.length)];
        if (resNum) {
          reply = `>>${resNum}\n${reply}`;
        }

        const { error } = await supabase.from('comments').insert([{
          survey_id: currentSurvey.id,
          user_name: "らび🐰(AI)",
          content: reply,
          user_id: null,
          edit_key: "labi_bot"
        }]);

        if (error) {
          console.error("🐰 Labi Descent Failed:", error.message);
        } else {
          console.log("🐰 Labi descended successfully!");
        }
      } catch (e) {
        console.error("🐰 Labi Descent Exception:", e);
      }
    }, delay);
  };

  async function handleReaction(commentId, type) {
    const reactionKey = `${commentId}_${type}`;
    const hasReacted = !!myReactions[reactionKey];

    const target = comments.find(c => c.id === commentId);
    if (!target) return;

    const newReactions = { ...target.reactions };
    if (hasReacted) {
      newReactions[type] = Math.max(0, (newReactions[type] || 0) - 1);
    } else {
      newReactions[type] = (newReactions[type] || 0) + 1;
    }

    // 🏎️ UIを先に更新（楽観적UI更新）
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: newReactions } : c));
    setMyReactions(prev => {
      const next = { ...prev };
      if (hasReacted) delete next[reactionKey];
      else next[reactionKey] = true;
      localStorage.setItem('my_reactions', JSON.stringify(next));
      return next;
    });

    // 🆙 DBへ反映（非同期）
    supabase.from('comments').update({ reactions: newReactions }).eq('id', commentId);
  }

  async function handleDeleteComment(commentId) {
    if (isActionLoading) return;
    const myKeys = JSON.parse(localStorage.getItem('my_comment_keys') || '{}');
    const key = myKeys[commentId];
    if (!key && !isAdmin) return alert("🐰 自分のコメントしか消せないよ！");
    if (!confirm("本当にこのコメントを消しちゃう？🐰💦")) return;

    setIsActionLoading(true);
    // 物理削除から「論理削除（上書き）」に変更 🛡️
    const { error } = await supabase
      .from('comments')
      .update({ content: '[[DELETED]]' })
      .eq('id', commentId);

    setIsActionLoading(false);

    if (error) {
      console.error("Soft delete error:", error);
      alert("😿 削除処理に失敗したよ…");
    } else {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: '[[DELETED]]' } : c));
    }
  }

  async function startEditComment(comment) {
    const myKeys = JSON.parse(localStorage.getItem('my_comment_keys') || '{}');
    if (!myKeys[comment.id]) return alert("🐰 自分のコメントしか直せないよ！");
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  }

  async function handleUpdateComment() {
    if (!editContent.trim() || isActionLoading) return;
    const myKeys = JSON.parse(localStorage.getItem('my_comment_keys') || '{}');
    const key = myKeys[editingCommentId];

    setIsActionLoading(true);
    const { error } = await supabase
      .from('comments')
      .update({ content: editContent })
      .eq('id', editingCommentId)
      .eq('edit_key', key);
    setIsActionLoading(false);

    if (error) alert("😿 直せなかったみたい…");
    else {
      setEditingCommentId(null);
    }
  }

  // 🖱️ ページ遷移時に一番上へ戻る魔法 & 📊 Google Analytics 追跡 & 🔍 SEO 強化魔法 (Meta / JSON-LD)
  useEffect(() => {
    // 🐰 らびのGA & SEO計測魔法（SPA対応・超確実版！）

    // ガード1: 詳細画面なのに対象アンケートがまだ読み込まれていない場合はスキップ
    if (view === 'details' && !currentSurvey) return;

    window.scrollTo(0, 0);

    // 🔍 SEOメタタグとタイトルの更新
    const pageTitle = currentSurvey
      ? `${currentSurvey.title} - みんなのアンケート広場`
      : (view === 'list' ? 'みんなのアンケート広場｜匿名で気軽に投票・本音が集まるアンケートコミュニティ' : 'アンケート作成 - みんなのアンケート広場');

    const metaKeywords = currentSurvey
      ? `${currentSurvey.category}, ${Array.isArray(currentSurvey.tags) ? currentSurvey.tags.join(', ') : (currentSurvey.tags || '')}, アンケート, 投票, みんなのアンケート広場`
      : 'アンケート, 投票, 匿名, 掲示板, コミュニティ, 意見共有, トレンド, みんなのアンケート広場, らび';

    const metaDescription = currentSurvey
      ? `【${currentSurvey.category}】${currentSurvey.title}のアンケート実施中！みんなはどう思ってる？匿名で1タップ投票して、リアルタイムの結果やコメントをチェックしよう！🐰🥕`
      : 'みんなのアンケート広場は、誰でもかんたんに匿名でアンケートを作成・投票できる場所です。日常の疑問や本音を共有して、みんなの意見を楽しく集約しましょう！';

    const currentUrl = currentSurvey 
      ? `https://minna-no-vote-square.vercel.app/s/${currentSurvey.id}` 
      : (view === 'list' ? 'https://minna-no-vote-square.vercel.app/' : 'https://minna-no-vote-square.vercel.app/create');

    // 動画サムネイルがあればOGP画像にする魔法 📸
    let ogImageUrl = 'https://minna-no-vote-square.vercel.app/ogp-image.png?v=20260315';
    if (currentSurvey?.image_url) {
      const videoEntries = currentSurvey.image_url.split(',').map(s => s.trim());
      const ytEntry = videoEntries.find(e => e.startsWith('yt:'));
      if (ytEntry) {
        const videoId = ytEntry.substring(3);
        ogImageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    document.title = pageTitle;

    const cleanDesc = currentSurvey && currentSurvey.description 
      ? currentSurvey.description.slice(0, 100).replace(/https?:\/\/\S+/g, '').trim() + '...'
      : metaDescription;

    // ヘルパー: メタタグの更新魔法 🪄
    const updateMeta = (selector, attr, content) => {
      let tag = document.querySelector(selector);
      if (tag) tag.setAttribute(attr, content);
    };

    updateMeta('meta[name="description"]', 'content', cleanDesc);
    updateMeta('meta[name="keywords"]', 'content', metaKeywords);
    updateMeta('meta[property="og:title"]', 'content', pageTitle);
    updateMeta('meta[property="og:description"]', 'content', cleanDesc);
    updateMeta('meta[property="og:url"]', 'content', currentUrl);
    updateMeta('meta[property="og:image"]', 'content', ogImageUrl);
    updateMeta('meta[name="twitter:title"]', 'content', pageTitle);
    updateMeta('meta[name="twitter:description"]', 'content', cleanDesc);
    updateMeta('meta[name="twitter:image"]', 'content', ogImageUrl);


    // 🔗 カノニカルURLの更新
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.setAttribute('href', currentUrl);

    // 🏷️ JSON-LD (構造化データ) の動的注入
    let scriptTag = document.getElementById('json-ld-structured-data');
    if (scriptTag) scriptTag.remove();

    if (currentSurvey) {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Question",
        "name": currentSurvey.title,
        "text": `${currentSurvey.title}（カテゴリ：${currentSurvey.category}）`,
        "answerCount": currentSurvey.total_votes || 0,
        "dateCreated": currentSurvey.created_at,
        "author": { "@type": "Person", "name": "匿名ユーザー" },
        "suggestedAnswer": options.map(opt => ({
          "@type": "Answer",
          "text": opt.name,
          "upvoteCount": opt.votes || 0
        }))
      };
      scriptTag = document.createElement('script');
      scriptTag.id = 'json-ld-structured-data';
      scriptTag.type = 'application/ld+json';
      scriptTag.text = JSON.stringify(structuredData);
      document.head.appendChild(scriptTag);
    } else if (view === 'list' && surveys.length > 0) {
      // 🏘️ トップページ用の構造化データ (ItemList)
      const listData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "最新のアンケート一覧",
        "description": "みんなのアンケート広場で現在実施中の人気アンケート一覧です。",
        "itemListElement": surveys.slice(0, 10).map((sv, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `https://minna-no-vote-square.vercel.app/s/${sv.id}`,
          "name": sv.title
        }))
      };
      scriptTag = document.createElement('script');
      scriptTag.id = 'json-ld-structured-data';
      scriptTag.type = 'application/ld+json';
      scriptTag.text = JSON.stringify(listData);
      document.head.appendChild(scriptTag);
    }

    if (window.gtag) {
      const virtualPath = currentSurvey
        ? `/survey/${currentSurvey.id}`
        : (view === 'list' ? '/' : '/create');

      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: virtualPath
      });
    }
  }, [view, currentSurvey?.id]);

  // 🔗 URL の ?s=<id> パラメータからアンケートを直接読み込む
  const loadFromUrl = async () => {
    let urlTimeoutId = setTimeout(() => {
      console.warn("⚠️ loadFromUrl: Safety timeout triggered (10s). Forcing isLoading=false.");
      setIsLoading(false);
    }, 10000);

    try {
      const params = new URLSearchParams(window.location.search);
      let surveyId = params.get('s');
      let categoryFilter = params.get('c');
      let tagFilter = params.get('t');
      
      if (!surveyId && window.location.pathname.startsWith('/s/')) {
        surveyId = window.location.pathname.split('/')[2];
      }

      console.log("🔍 loadFromUrl triggered. surveyId:", surveyId, "Path:", window.location.pathname);

      // 🛡️ 無限ループ防止ガード: 最新URLに基づいて詳細を表示！
      if (surveyId && String(surveyId) !== 'null') {
         // ここでは必ずリロードさせるらび！
      }

      if (!surveyId || surveyId === 'null' || surveyId === 'undefined') {
        console.log("🏘️ loadFromUrl: Resetting to list view.");
        if (view !== 'list') {
          setView('list');
          setCurrentSurvey(null);
          window.history.replaceState({ view: 'list' }, '', window.location.href);
          setTimeout(() => window.scrollTo(0, 0), 10);
        }
        if (categoryFilter) setFilterCategory(categoryFilter);
        if (tagFilter) setFilterTag(tagFilter);
        return;
      }

      const { data: sv, error: svError } = await supabase.from('surveys').select('*').eq('id', surveyId).single();
      if (svError) {
         setView('list');
         setCurrentSurvey(null);
         return;
      }

      if (sv.visibility === 'private' && (!user || user.id !== sv.user_id)) {
        alert('非公開のアンケートです🔒');
        setView('list');
        return;
      }

      setCurrentSurvey(sv);
      setIsTimeUp(sv.deadline && new Date(sv.deadline) < new Date());
      window.history.replaceState({ view: 'details', surveyId: sv.id }, '', window.location.href);
      setView('details');
    } catch (err) {
      console.error("❌ loadFromUrl CRASHED:", err);
    } finally {
      if (urlTimeoutId) clearTimeout(urlTimeoutId);
      setIsLoading(false);
    }
  };

  // ブラウザの戻る・進むボタンに対応するセンサー センサーを追加！
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'auto';
    }
    const handlePopState = (e) => {
      console.log("↩️ popstate event fired!", e.state);
      if (e.state && e.state.view) {
        if (e.state.view === 'list') {
          setView('list');
          setCurrentSurvey(null);
          if (e.state.scrollY !== undefined) {
            setTimeout(() => window.scrollTo(0, e.state.scrollY), 20); // 少し待ってから戻すらび！
          }
        } else if (e.state.view === 'details' && e.state.surveyId) {
          loadFromUrl();
        }
      } else {
        loadFromUrl();
      }
      // 🚀 ブラウザの自動復元に任せるので、ここでの強制スクロールはやめるらび！
    };
    window.addEventListener('popstate', handlePopState);
    loadFromUrl(); // 初回読み込み
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]); // userが変わった時も再チェック

  const navigateTo = async (nextView, survey = null) => {
    // 現在のスクロール位置を「しおり」として記録するらび！
    if (view === 'list') {
      window.history.replaceState({ view: 'list', scrollY: window.pageYOffset }, '', window.location.href);
    }

    if (nextView === 'details' && survey) {
      if (survey.visibility === 'private' && (!user || user.id !== survey.user_id)) {
        return alert('非公開です🔒');
      }
      // 🔗 履歴に「詳細だよ！」という確実なラベルを貼るらび！
      window.history.pushState({ view: 'details', surveyId: survey.id }, '', `/s/${survey.id}`);
      setCurrentSurvey(survey);
      setIsTimeUp(survey.deadline && new Date(survey.deadline) < new Date());

      const viewKey = `last_view_${survey.id}`;
      const lastView = parseInt(localStorage.getItem(viewKey) || '0', 10);
      const now = Date.now();
      if (now - lastView > VIEW_COOLDOWN_MS) {
        localStorage.setItem(viewKey, now.toString());
        // 🚀 非同期で実行して、ナビゲーションをブロックしないらび！
        (async () => {
          const { data: serverCount, error: rpcError } = await supabase.rpc('increment_survey_view', { survey_id_arg: survey.id });
          if (rpcError) {
            console.error("❌ View increment error:", rpcError);
          } else {
            console.log("✅ View increment success (New Count):", serverCount);
            // 🏆 サーバーから返ってきた最新数値を即座に反映！
            if (serverCount !== undefined) {
               const mapper = s => String(s.id) === String(survey.id) ? { ...s, view_count: serverCount } : s;
               setSurveys(prev => prev.map(mapper));
               setPopularSurveys(prev => prev.map(mapper));
               setCurrentSurvey(prev => prev && String(prev.id) === String(survey.id) ? { ...prev, view_count: serverCount } : prev);
            }
          }
        })();
      }
    } else if (nextView === 'list') {
      // 🏘️ 広場に戻る時は「広場だよ！」というラベルを貼ってURLをリセット！
      window.history.pushState({ view: 'list' }, '', '/');
      setCurrentSurvey(null);
      setFilterCategory('すべて'); // リストに戻る際にカテゴリフィルタをリセット
      setFilterTag(''); // リストに戻る際にタグフィルタをリセット
    }
    setView(nextView);
    setTimeout(() => window.scrollTo(0, 0), 10);
  };

  const fetchSurveys = async (currentUser, silent = false) => {
    let safetyTimeoutId;
    if (!silent) {
       safetyTimeoutId = setTimeout(() => {
         console.warn("⚠️ fetchSurveys: Safety timeout triggered (10s). Forcing isLoading=false.");
         setIsLoading(false);
       }, 10000);
    }

    try {
      const isActuallyAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);

      // 🚀 爆速化: 最初は最新200件程度に絞って取得するらび！ (全件取得は重すぎる)
      const { data: sData, error: sError } = await supabase.from('surveys')
        .select('*')
        .eq('visibility', 'public')
        .order('id', { ascending: false })
        .range(0, 199);
      if (sError) console.error("fetchSurveys error:", sError);

      // ログイン中なら自分の非公開/限定公開アンケートも取得
      let mine = [];
      if (currentUser) {
        let query = supabase.from('surveys').select('*').neq('visibility', 'public');
        if (!isActuallyAdmin) {
          query = query.eq('user_id', currentUser.id);
        }
        const { data: mData, error: mError } = await query;
        if (mError) console.error("fetchSurveys (private) error:", mError);
        if (mData) mine = mData;
      }

      // 🛡️ 重複排除ガード: IDをキーにしたMapで確実に1つにするらび！
      const uniqueMap = new Map();
      [...(sData || []), ...mine].forEach(s => {
        if (s && s.id) uniqueMap.set(String(s.id), s);
      });
      const allSurveys = Array.from(uniqueMap.values());

      if (allSurveys.length > 0) {
        const updatedList = allSurveys.map(s => {
          let isOfficialPattern = s.is_official === true;
          const isLegacy = new Date(s.created_at) < new Date('2026-03-19T00:00:00Z');
          
          if (!isOfficialPattern && isLegacy) {
            const hasOfficialTag = s.tags && s.tags.some(tag => ['お知らせ', 'ニュース', '話題', '速報', '注目', '2chまとめアンテナ'].includes(tag) || tag.includes('トピックス') || tag.includes('新聞'));
            const hasOfficialTitle = s.title && /^(【.*?】|「.*?」)/.test(s.title);
            if (hasOfficialTag || hasOfficialTitle) {
              isOfficialPattern = true;
            }
          }

          const sId = String(s.id);

          // 🏆 判定の正規化 (DB側の誤爆データをフロントで救済するらび！)
          let effectiveCategory = s.category || 'その他';
          const titleSafe = s.title || '';
          const tagsSafe = s.tags || [];

          if (titleSafe.includes('【コラム】') || tagsSafe.includes('コラム')) {
            effectiveCategory = 'コラム';
          } else if (titleSafe.includes('【レビュー】') || tagsSafe.includes('レビュー')) {
            effectiveCategory = 'レビュー';
          } else if (titleSafe.includes('【ネタ】') || tagsSafe.includes('ネタ')) {
            effectiveCategory = 'ネタ';
          } else if (titleSafe.includes('【話題】') || tagsSafe.includes('話題')) {
            effectiveCategory = '話題';
          }

          return {
            ...s,
            category: effectiveCategory, // 以降の全コンポーネントでこの正規化後のカテゴリを使うらび
            is_official: isOfficialPattern,
            total_votes: s.total_votes ?? 0,
            likes_count: s.likes_count ?? 0,
            view_count: s.view_count ?? 0,
            comment_count: s.comment_count ?? 0
          };
        });

        setCurrentSurvey(prev => {
          if (!prev) return null;
          const lastUpdate = manualUpdatesRef.current[String(prev.id)];
          if (lastUpdate && Date.now() - lastUpdate < 15000) return prev;
          const latest = updatedList.find(s => String(s.id) === String(prev.id));
          return latest ? { ...latest } : prev;
        });

        setSurveys(prevList => {
          return updatedList.map(newS => {
            const sId = String(newS.id);
            const lastUpdate = manualUpdatesRef.current[sId];
            if (lastUpdate && Date.now() - lastUpdate < 15000) {
              const previous = prevList.find(s => String(s.id) === sId);
              return previous || newS;
            }
            return newS;
          });
        });
      } else {
        setSurveys([]);
      }
    } catch (err) {
      console.error("❌ fetchSurveys CRASHED:", err);
    } finally {
      if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSurveys(user);
    refreshSidebar();
    const ch = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => { fetchSurveys(user, true); refreshSidebar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'options' }, () => { fetchSurveys(user, true); refreshSidebar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => { fetchSurveys(user, true); refreshSidebar(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);


  const refreshSidebar = async () => {
    let sidebarTimeoutId = setTimeout(() => {
      console.warn("⚠️ refreshSidebar: Safety timeout triggered (10s).");
    }, 10000);

    try {
      const { data: sData, error: sError } = await supabase.from('surveys').select('*').eq('visibility', 'public');
      if (sData) {
        const voteMap = {}; 
        const regularSurveys = sData.filter(s => !s.tags?.includes('お知らせ'));

        const withStats = regularSurveys.map(s => {
          const sId = String(s.id);
          return {
            ...s,
            total_votes: voteMap[sId] ?? s.total_votes ?? 0,
            likes_count: s.likes_count ?? 0,
            view_count: s.view_count ?? 0,
            comment_count: s.comment_count || 0 
          };
        });

        const now = new Date();
        const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const applyGuard = (prevList) => withStats.map(s => {
          const lastUpdate = manualUpdatesRef.current[String(s.id)];
          if (lastUpdate && Date.now() - lastUpdate < 15000) {
            return prevList.find(p => String(p.id) === String(s.id)) || s;
          }
          return s;
        });

        setLiveSurveys(prev => applyGuard(prev).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10));
        setPopularSurveys(prev => applyGuard(prev).sort((a, b) => {
          const scoreA = (a.total_votes || 0) * SCORE_VOTE_WEIGHT + (a.view_count || 0);
          const scoreB = (b.total_votes || 0) * SCORE_VOTE_WEIGHT + (b.view_count || 0);
          return scoreB - scoreA;
        }).slice(0, 10));
        setEndingSoonSurveys(prev => {
          const guarded = applyGuard(prev);
          return guarded
            .filter(s => s.deadline && new Date(s.deadline) > now && new Date(s.deadline) <= next24h)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        });
      }
    } catch (err) {
      console.error("refreshSidebar error:", err);
    } finally {
      if (sidebarTimeoutId) clearTimeout(sidebarTimeoutId);
    }
  };

  useEffect(() => { refreshSidebar(); }, []);

  const handleStartSurvey = async () => {
    if (!user) return alert('ログインが必要です！');
    if (!checkRateLimit()) return; // 🛡️ 連投チェック
    if (!surveyTitle.trim()) return alert('お題（タイトル）を入力してください✨');
    if (!surveyCategory) return alert('カテゴリを選択してください🍜');
    if (setupOptions.length < 2) return alert('投票項目は2つ以上入力してください🗳️');

    if (hasNGWord(surveyTitle) || setupOptions.some(hasNGWord) || surveyTags.some(hasNGWord)) {
      return alert('NGワードが含まれているため作成できません。言葉遣いに気をつけてね🐰');
    }

    if (!deadline) return alert('⏰ いつまでアンケートを取るか、締切日時を設定してください！');

    const finalImage = surveyImage.trim(); // 自動セットを廃止
    
    // 📺 動画（YouTube/ニコニコ）の処理
    let processedImage = finalImage;
    if (surveyYoutube.trim()) {
      const parts = surveyYoutube.trim().split(/[\s,]+/).filter(Boolean);
      const videoEntries = parts.map(part => {
        const ytId = extractYoutubeId(part);
        const nicoId = extractNicoId(part);
        if (ytId && (part.includes('youtube.com') || part.includes('youtu.be') || !nicoId)) {
          return `yt:${ytId}`;
        } else if (nicoId) {
          return `nico:${nicoId}`;
        }
        return null;
      }).filter(Boolean);

      if (videoEntries.length > 0) {
        processedImage = videoEntries.join(',');
      }
    }

    const finalDeadline = new Date(`${deadline}:00+09:00`).toISOString();
    const { data, error } = await supabase.from('surveys').insert([{ 
      title: surveyTitle, 
      deadline: finalDeadline, 
      user_id: user.id, 
      image_url: processedImage, 
      category: surveyCategory, 
      visibility: surveyVisibility, 
      tags: surveyTags,
      description: surveyDescription.trim() // 📝 解説文を保存
    }]).select();
    if (error) {
      alert('公開に失敗しました。エラー: ' + error.message);
      return;
    }
    updateRateLimit(); // 🛡️ 作成時間を記録
    await supabase.from('options').insert(setupOptions.map(name => ({ name, votes: 0, survey_id: data[0].id })));

    // 全ての状態をリセット
    setSurveyTitle('');
    setSurveyCategory('');
    setSurveyImage('');
    setSurveyYoutube('');
    setSurveyDescription(''); // 📝 リセット
    setSetupOptions([]);
    setSurveyTags([]);
    setDeadline('');
    setSurveyVisibility('public');

    navigateTo('list');
    fetchSurveys(user);
  };

  const handleVote = async (optionId) => {
    // 引数がオブジェクト（opt）で渡される場合とIDで渡される場合の両方に対応
    const targetId = typeof optionId === 'object' ? optionId.id : optionId;
    const option = options.find(o => o.id === targetId);
    if (!option || isTimeUp || votedOption) return;
    
    // 🛡️ ガード開始 (15秒間、DBの反映遅延による巻き戻りを防ぐらび！)
    if (currentSurvey) {
      manualUpdatesRef.current[String(currentSurvey.id)] = Date.now();
    }
    
    // 🆙 投票用RPC（Security Definer ＆ 最新の総数を返してくれるすごいやつらび！）
    const { data: serverTotal, error: voteError } = await supabase.rpc('increment_survey_vote', {
      survey_id_arg: currentSurvey.id,
      option_id_arg: option.id
    });
    if (voteError) {
      console.error("❌ Vote update error:", voteError);
    } else {
      console.log("✅ Vote update success (New Total):", serverTotal);
      if (serverTotal !== undefined) {
        // 🏆 サーバーの最新合計値で同期させるらび！
        const mapper = s => String(s.id) === String(currentSurvey.id) ? { ...s, total_votes: serverTotal } : s;
        setSurveys(prev => prev.map(mapper));
        setPopularSurveys(prev => prev.map(mapper));
        setCurrentSurvey(prev => prev && String(prev.id) === String(currentSurvey.id) ? { ...prev, total_votes: serverTotal } : prev);
      }
    }

    // 🏆 チャッピー流：あなたは〇人目演出！
    const currentTotal = (currentSurvey.total_votes || 0) + 1;
    setTimeout(() => {
      // 📊 GA4 キーイベント: 投票成功！らび！
      if (window.gtag) {
        window.gtag('event', 'vote_survey', {
          'survey_id': currentSurvey.id,
          'survey_title': currentSurvey.title,
          'option_name': option.text
        });
      }
      alert(`✨ 投票完了らびっ！ ✨\n\nあなたは、このアンケートの\n【 ${currentTotal} 人目 】の投票者だよ！🐰🥕💎\n\n広場に参加してくれてありがとうらびっ！`);
    }, 500);

    // 💎 UX改善: 瞬時にUIを更新する
    localStorage.setItem(`voted_survey_${currentSurvey.id}`, String(option.id));
    setVotedOption(String(option.id));

    const updatedOptions = options.map(o => o.id === option.id ? { ...o, votes: (o.votes || 0) + 1 } : o);
    const updatedSurvey = {
      ...currentSurvey,
      total_votes: currentTotal,
      options: updatedOptions
    };
    setCurrentSurvey(updatedSurvey);
    setSurveys(prev => prev.map(s => String(s.id) === String(currentSurvey.id) ? updatedSurvey : s));
  };

  const handleLikeSurvey = async () => {
    if (!currentSurvey) return;

    // 🛡️ ガード開始 (15秒間、DBの反映遅延による巻き戻りを防ぐらび！)
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now();

    const isLiked = likedSurveys.some(id => String(id) === String(currentSurvey.id));
    const newLikesCount = isLiked
      ? Math.max(0, (currentSurvey.likes_count || 0) - 1)
      : (currentSurvey.likes_count || 0) + 1;

    // 🏎️ UIを先に更新（楽観的UI更新）
    const mapper = s => String(s.id) === String(currentSurvey.id) ? { ...s, likes_count: newLikesCount } : s;
    setCurrentSurvey(prev => prev && String(prev.id) === String(currentSurvey.id) ? { ...prev, likes_count: newLikesCount } : prev);
    setSurveys(prev => prev.map(mapper));
    setPopularSurveys(prev => prev.map(mapper));

    const newLikedIds = isLiked
      ? likedSurveys.filter(id => String(id) !== String(currentSurvey.id))
      : [...likedSurveys, String(currentSurvey.id)];
    setLikedSurveys(newLikedIds);
    localStorage.setItem('liked_surveys', JSON.stringify(newLikedIds));

    // 🛡️ DBを更新：RPC（Security Definer ＆ 最新のいいね数を返すらび！）
    const { data: serverLikes, error: likeError } = await supabase.rpc('increment_survey_like', {
      survey_id_arg: currentSurvey.id,
      increment_val: isLiked ? -1 : 1
    });
    if (likeError) {
      console.error("❌ Like increment error:", likeError);
    } else {
      console.log("✅ Like increment success (New Likes):", serverLikes);
      if (serverLikes !== undefined) {
        // 🏆 サーバーから返ってきた「真実のいいね数」で同期させるらび！
        const mapper = s => String(s.id) === String(currentSurvey.id) ? { ...s, likes_count: serverLikes } : s;
        setSurveys(prev => prev.map(mapper));
        setPopularSurveys(prev => prev.map(mapper));
        setCurrentSurvey(prev => prev && String(prev.id) === String(currentSurvey.id) ? { ...prev, likes_count: serverLikes } : prev);
      }
    }
  };

  const toggleWatch = (e, id) => {
    e.stopPropagation();
    const newIds = watchedIds.includes(id) ? watchedIds.filter(v => v !== id) : [...watchedIds, id];
    setWatchedIds(newIds);
    localStorage.setItem('watched_surveys', JSON.stringify(newIds));
  };

  // 🗑️ アンケートを削除する（オーナーまたは管理者）
  const handleDeleteSurvey = async (surveyId) => {
    if (!window.confirm('本当に削除しますか？この操作は元に戻せません。')) return;

    setIsActionLoading(true);
    // 関連データを順番に削除（コメント -> 選択肢 -> アンケート本体）
    await supabase.from('comments').delete().eq('survey_id', surveyId);
    await supabase.from('options').delete().eq('survey_id', surveyId);
    const { error } = await supabase.from('surveys').delete().eq('id', surveyId);
    setIsActionLoading(false);

    if (error) {
      console.error("Survey delete error:", error);
      alert('😿 アンケートの削除に失敗しました。');
    } else {
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
      navigateTo('list');
      alert('🗑️ アンケートを完全に削除しました！');
    }
  };

  // 🔄 公開設定を変更する（オーナーまたは管理者）
  const handleUpdateVisibility = async (newVisibility) => {
    if (!currentSurvey || !user || (!isAdmin && currentSurvey.user_id !== user.id)) return;
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now(); // 🛡️ ガード開始 (15秒)
    setIsActionLoading(true);
    const { data, error } = await supabase.from('surveys').update({ visibility: newVisibility }).eq('id', currentSurvey.id).select();
    setIsActionLoading(false);
    if (error) {
      console.error("Update visibility error:", error);
      return alert('変更に失敗しましたらび...');
    }
    if (!data || data.length === 0) {
      console.warn("Update visibility failed: No data returned. Possible RLS issue.", { userId: user.id, surveyId: currentSurvey.id });
      return alert('😿 保存が反映されませんでした。権限の不具合かもしれません。');
    }
    const merged = { ...currentSurvey, ...data[0] };
    setCurrentSurvey(merged);
    setSurveys(prev => prev.map(s => String(s.id) === String(currentSurvey.id) ? { ...s, ...merged } : s));
    alert(`公開設定を「${newVisibility}」に変更しました！`);
    // fetchSurveys(user); // 🏎️ リロードを防ぐためにコメントアウトまたは削除
  };

  // 🏷️ カテゴリを変更する（オーナーまたは管理者）
  const handleUpdateCategory = async (newCategory) => {
    if (!currentSurvey || !user || (!isAdmin && currentSurvey.user_id !== user.id)) return;
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now(); // 🛡️ ガード開始 (15秒)
    setIsActionLoading(true);
    const { data, error } = await supabase.from('surveys').update({ category: newCategory }).eq('id', currentSurvey.id).select();
    setIsActionLoading(false);
    if (error) {
      console.error("Update category error:", error);
      return alert('😿 カテゴリの変更に失敗しました。');
    }
    if (!data || data.length === 0) {
      console.warn("Update category failed: No data returned.", { userId: user.id, surveyId: currentSurvey.id });
      return alert('😿 カテゴリ保存が反映されませんでした。');
    }
    const merged = { ...currentSurvey, ...data[0] };
    setCurrentSurvey(merged);
    setSurveys(prev => prev.map(s => String(s.id) === String(currentSurvey.id) ? { ...s, ...merged } : s));
    setIsEditingCategory(false);
    alert(`🏷️ カテゴリを「${newCategory}」に変更しましたらびっ！`);
    fetchSurveys(user, true); // 🏎️ サイレントに最新化
  };

  // 🏷️ タグを更新する（オーナーまたは管理者）
  const handleUpdateTags = async () => {
    if (!currentSurvey || !user || (!isAdmin && currentSurvey.user_id !== user.id)) return;
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now(); // 🛡️ ガード開始 (15秒)
    setIsActionLoading(true);
    const newTags = tagEditValue.split(/[,、，\s]+/).map(t => t.trim()).filter(t => t !== "");
    const { data, error } = await supabase.from('surveys').update({ tags: newTags }).eq('id', currentSurvey.id).select();
    setIsActionLoading(false);
    if (error) {
      console.error("Update tags error:", error);
      return alert('😿 タグの更新に失敗しました。');
    }
    if (!data || data.length === 0) {
      console.warn("Update tags failed: No data returned.", { userId: user.id, surveyId: currentSurvey.id });
      return alert('😿 タグ保存が反映されませんでした。');
    }
    const merged = { ...currentSurvey, ...data[0] };
    setCurrentSurvey(merged);
    setSurveys(prev => prev.map(s => String(s.id) === String(currentSurvey.id) ? { ...s, ...merged } : s));
    setIsEditingTags(false);
    alert('🏷️ タグを更新しましたらびっ！');
    fetchSurveys(user, true); // 🏎️ サイレントに最新化
  };

  // 📩 お問い合わせをDBに保存する
  const handleSubmitInquiry = async () => {
    if (!contactMessage.trim()) return alert('内容を入力してください');
    setIsSendingInquiry(true);

    try {
      // 1. Supabase DBに保存
      const { error: dbError } = await supabase.from('inquiries').insert([{
        type: contactType,
        email: contactEmail,
        message: contactMessage
      }]);
      if (dbError) throw dbError;

      // 2. EmailJSでGmail通知を送信
      const serviceId = 'service_mkhbkz3';
      const templateId = 'template_4wpor27';
      const publicKey = 'wEjNAL8NrmlxBHc6k';

      // 念のため初期化を実行
      emailjs.init(publicKey);

      try {
        await emailjs.send(
          serviceId,
          templateId,
          {
            from_name: contactEmail || '匿名ユーザー',
            inquiry_type: contactType,
            message: contactMessage,
            reply_to: contactEmail
          }
        );
      } catch (e) {
        // エラーがあってもDBには保存されているので続行
      }

      alert('お問い合わせありがとうございます！内容を確認次第、順次対応させていただきます。😊');
      setContactMessage('');
      setContactEmail('');
      setShowingContact(false);
    } catch (error) {
      if (window.confirm('システムへの直接送信に失敗しました。従来のメールソフトを起動しますか？')) {
        const subject = encodeURIComponent(`[アンケート広場] ${contactType}`);
        const body = encodeURIComponent(`種別：${contactType}\n返信先：${contactEmail || 'なし'}\n\n${contactMessage}`);
        window.open(`mailto:contact@olipi.dev?subject=${subject}&body=${body}`);
        setShowingContact(false);
      }
    } finally {
      setIsSendingInquiry(false);
    }
  };

  // 📸 結果をテキスト化してシェア（X対応コンパクト版）
  const handleShareResult = (type) => {
    const bar = (perc) => {
      const filled = Math.round(perc / 20); // 5マス
      return '█'.repeat(filled) + '░'.repeat(5 - filled);
    };
    const title = currentSurvey.title.length > 20
      ? currentSurvey.title.slice(0, 20) + '…'
      : currentSurvey.title;
    const lines = options.map((opt, index) => {
      const perc = currentSurvey.total_votes > 0 ? Math.round((opt.votes / currentSurvey.total_votes) * 100) : 0;
      const name = opt.name.length > 8 ? opt.name.slice(0, 8) + '…' : opt.name;
      return `${index + 1}. ${name} ${bar(perc)} ${perc}%`;
    });
    const url = `${window.location.origin}/s/${currentSurvey.id}`;

    const shareUrl = `${window.location.origin}/s/${currentSurvey.id}`;

    // 🏆 1位の項目を見つける
    const sorted = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0));
    const topOption = sorted[0];
    const isWinner = topOption && topOption.votes > 0;

    if (type === 'copy') {
      const copyText = [
        `📊「${title}」`,
        '',
        ...lines,
        '',
        `計${currentSurvey.total_votes}票 👉 ${shareUrl}`,
        `#アンケート広場`,
      ].join('\n');
      // 📊 GA4 キーイベント: 結果コピー
      if (window.gtag) {
        window.gtag('event', 'share_result', {
          'method': 'copy',
          'survey_id': currentSurvey.id,
          'survey_title': currentSurvey.title
        });
      }
      navigator.clipboard.writeText(copyText).then(() => alert('コピーしました！'));
    } else if (type === 'x') {
      // 📝 X用のテキストをリッチに！らび頑張る！🐰✨
      let xText = `📊「${title}」\n`;
      if (isWinner) {
        xText += `🏆 現在1位: ${topOption.name} (${Math.round(topOption.votes / currentSurvey.total_votes * 100)}%)\n`;
      }
      xText += `🔥 現在の合計: ${currentSurvey.total_votes}票！みんなはどう思う？らびっ！`;
      
      // 📊 GA4 キーイベント: Xでシェア
      if (window.gtag) {
        window.gtag('event', 'share_result', {
          'method': 'x',
          'survey_id': currentSurvey.id,
          'survey_title': currentSurvey.title
        });
      }
      
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(shareUrl)}&hashtags=アンケート広場`,
        '_blank'
      );
    }
  };

  // 🚩 通報機能
  const handleReportContent = async (type, id, contentTitle, extraContext = '') => {
    if (!user) return alert('🚨 通報にはログインが必要です。');
    if (!checkRateLimit()) return; // 🛡️ 通報も連投制限（EmailJS節約のため）
    if (!window.confirm(`「${contentTitle}」を不適切なコンテンツとして通報しますか？🐰💦`)) return;

    setIsActionLoading(true);
    try {
      // 1. Supabase DBに保存 (inquiriesテーブルを再利用)
      const { error: dbError } = await supabase.from('inquiries').insert([{
        type: `通報:${type}`,
        email: user.email,
        message: `【通報】対象ID: ${id}\n内容概要: ${contentTitle}\n${extraContext}\n通報者: ${user.email}`
      }]);
      if (dbError) throw dbError;

      // 2. EmailJSで通知
      const serviceId = 'service_mkhbkz3';
      const templateId = 'template_4wpor27';
      const publicKey = 'wEjNAL8NrmlxBHc6k';
      emailjs.init(publicKey);

      await emailjs.send(serviceId, templateId, {
        from_name: '広場パトロール隊',
        inquiry_type: `🚩 通報 (${type})`,
        message: `対象ID: ${id}\n内容: ${contentTitle}\n${extraContext}\n通報者: ${user.email}`,
        reply_to: user.email
      });

      updateRateLimit(); // 🛡️ 通報時間を記録
      alert('🙏 通報ありがとうございます。運営が内容を確認し、適切に対応させていただきます。😊');
    } catch (error) {
      console.error("Report Error:", error);
      alert('😿 通報の送信に失敗しました。時間をおいて試してみてね。');
    } finally {
      setIsActionLoading(false);
    }
  };

  // 📋 フィルタリング済みアンケートリスト
  const filteredBaseSurveys = useMemo(() => {
    let base = [...surveys];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filterCategory && filterCategory !== 'すべて') {
      base = base.filter(s => s.category === filterCategory);
    }
    if (filterTag) {
      base = base.filter(s => s.tags?.includes(filterTag));
    }
    base = base.filter(s => {
      if (s.visibility === 'private') {
        if (!user) return false;
        if (user.id !== s.user_id && !isAdmin) return false;
      }
      return true;
    });

    // 期日・期限切れやタブ別フィルタリングの適用
    base = base.filter(s => {
      // 30日経過等のアーカイブ対応
      const ageMs = new Date() - new Date(s.created_at);
      const isAutoEnded = ageMs > 30 * 24 * 60 * 60 * 1000;
      const isEnded = isAutoEnded || (s.deadline && new Date(s.deadline) < new Date());

      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      if (sortMode === 'today') {
        const isRecent = new Date(s.created_at).getTime() >= todayStart.getTime();
        return !isEnded && isRecent;
      } else if (sortMode === 'ended') {
        return isEnded;
      } else if (sortMode === 'watching') {
        return watchedIds.includes(s.id);
      } else if (sortMode === 'mine') {
        return user && s.user_id === user.id;
      }

      // その他（新着など）では終了したものを非表示
      if (isEnded) return false;

      return true;
    });

    return base;
  }, [surveys, searchQuery, filterCategory, filterTag, sortMode, watchedIds, user, isAdmin]);

  // 💎 鮮度重視 ＆ ランダム性のある「あなたへのおすすめ」 🐰✨
  const recommendedSurveys = useMemo(() => {
    const now = new Date();
    return [...surveys]
      .filter(s => s.visibility === 'public')
      // 💡 期間が終了したものは除外するらび！
      .filter(s => {
        const isEnded = s.deadline && new Date(s.deadline) < now;
        return !isEnded;
      })
      .map(s => {
        // 📈 基本スコア (投票数 + 閲覧数)
        const baseScore = (s.total_votes || 0) * SCORE_VOTE_WEIGHT + (s.view_count || 0);
        
        // 🕒 鮮度ボーナス (新しいほど高得点！ 48時間以内の投稿に最大ボーナス)
        const ageHours = (now - new Date(s.created_at)) / (1000 * 60 * 60);
        const freshnessBonus = Math.max(0, 150 - ageHours * 3); // 48時間で0になるくらい
        
        return { ...s, _finalScore: baseScore + freshnessBonus };
      })
      .sort((a, b) => b._finalScore - a._finalScore)
      .slice(0, 24) // 優秀な候補を24件選んで...
      .sort(() => Math.random() - 0.5) // シャッフルするらび！🔀
      .slice(0, 12); // その中から12件を表示
  }, [surveys]);

  // 🔥 関連アンケート（同じカテゴリ or 類似タグ）
  const relatedSurveys = useMemo(() => {
    if (!currentSurvey) return [];
    return surveys
      .filter(s => s.id !== currentSurvey.id && s.visibility === 'public')
      .filter(s => 
        s.category === currentSurvey.category || 
        s.tags?.some(t => currentSurvey.tags?.includes(t))
      )
      .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
      .slice(0, 12);
  }, [surveys, currentSurvey?.id]);

  const Sidebar = () => (
    <div className="live-feed-sidebar">
      <div className="sidebar-section-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', border: '1px solid #ddd6fe' }}>
        <div className="live-feed-title" style={{ color: '#7c3aed', marginBottom: '8px' }}>📡 広場の状況</div>
        <div style={{ fontSize: '0.9rem', color: '#4c1d95', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ position: 'relative', display: 'inline-block', width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></span>
          いま {globalOnlineCount} 人が広場にいます 🐰✨
        </div>
      </div>

      <div className="sidebar-section-card" style={{ marginBottom: '24px', border: '2px solid #fee2e2' }}>
        <div className="live-feed-title" style={{ color: '#e11d48' }}>⏰ もうすぐ終了！</div>
        <div className="live-feed-content">
          {endingSoonSurveys.length > 0 ? (
            <>
              {(showAllEndingSoon ? endingSoonSurveys : endingSoonSurveys.slice(0, 4)).map(s => (
                <div key={s.id} className="live-item clickable" onClick={() => navigateTo('details', s)}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#e11d48', background: '#fff1f2', display: 'inline-block', padding: '2px 8px', borderRadius: '12px' }}>
                    〆: {formatWithDay(s.deadline)}
                  </div>
                </div>
              ))}
              {endingSoonSurveys.length > 4 && (
                <button onClick={() => setShowAllEndingSoon(v => !v)} style={{
                  marginTop: '8px', width: '100%', background: 'none', border: '1.5px solid #fca5a5',
                  borderRadius: '12px', color: '#e11d48', fontSize: '0.8rem', padding: '4px 0', cursor: 'pointer', fontWeight: 'bold'
                }}>
                  {showAllEndingSoon ? '▲ 閉じる' : `▼ あと${endingSoonSurveys.length - 4}件 もっと見る`}
                </button>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
              現在、24時間以内に終了する<br />アンケートはありません🍵
            </div>
          )}
        </div>
      </div>
      <div className="sidebar-section-card">
        <div className="live-feed-title">✨ 広場の最新ニュース</div>
        <div className="live-feed-content">
          {liveSurveys.map(s => (
            <div key={s.id} className="live-item clickable" onClick={() => navigateTo('details', s)}>
              <strong>{s.title}</strong> が公開されました！
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-section-card" style={{ marginTop: '24px' }}>
        <div className="live-feed-title">🔥 人気ランキング</div>
        <div className="live-feed-content">
          {popularSurveys.map((s, idx) => (
            <div key={s.id} className="live-item popular clickable" onClick={() => navigateTo('details', s)}>
              <span className="rank-label" style={idx > 2 ? { fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', minWidth: '24px', textAlign: 'center' } : {}}>
                {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}位`}
              </span>
              <div className="popular-item-info">
                <strong style={{ display: 'block', marginBottom: '4px' }}>{s.title}</strong>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>🗳️ <AnimatedCounter value={s.total_votes || 0} /> 票</span>
                  <span>👁️ {s.view_count || 0}</span>
                  <span>👍 {s.likes_count || 0}</span>
                  <span>💬 {s.comment_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <AdSenseBox slot="sidebar_slot_placeholder" affiliateType="amazon" />
    </div>
  );

  return (
    <div className="survey-main-portal">
      <div className="main-wrap">
        <div className="layout-grid-3">
          <div className="nav-sidebar-left">
            {view !== 'list' && (
              <button className="side-back-btn" onClick={() => navigateTo('list')}>⇠ 広場へ戻る</button>
            )}
          </div>

          <div className="survey-card">
            {view === 'list' && (
              <SurveyListView
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortMode={sortMode}
                setSortMode={setSortMode}
                popularMode={popularMode}
                setPopularMode={setPopularMode}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                filterTag={filterTag}
                setFilterTag={setFilterTag}
                setView={setView}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                filteredBaseSurveys={filteredBaseSurveys}
                surveys={surveys}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                navigateTo={navigateTo}
                watchedIds={watchedIds}
                toggleWatch={toggleWatch}
                CATEGORY_ICON_STYLE={CATEGORY_ICON_STYLE}
                SCORE_VOTE_WEIGHT={SCORE_VOTE_WEIGHT}
                formatWithDay={formatWithDay}
                Pagination={Pagination}
                SiteConceptSection={SiteConceptSection}
                AdSenseBox={AdSenseBox}
                user={user}
                isAdmin={isAdmin}
                isLoading={isLoading}
                totalVotes={totalVotes}
                surveyTitle={surveyTitle} setSurveyTitle={setSurveyTitle}
                surveyDescription={surveyDescription} setSurveyDescription={setSurveyDescription}
                surveyYoutube={surveyYoutube} setSurveyYoutube={setSurveyYoutube}
                surveyCategory={surveyCategory} setSurveyCategory={setSurveyCategory}
                setupOptions={setupOptions} setSetupOptions={setSetupOptions}
                tempOption={tempOption} setTempOption={setTempOption}
                surveyVisibility={surveyVisibility} setSurveyVisibility={setSurveyVisibility}
                deadline={deadline} setDeadline={setDeadline}
                surveyTags={surveyTags} setSurveyTags={setSurveyTags}
                tempTag={tempTag} setTempTag={setTempTag}
                handleStartSurvey={handleStartSurvey}
                supabase={supabase}
                recommendedSurveys={recommendedSurveys}
              />
            )}

            {view === 'create' && (
              <div className="score-card">
                <h2 className="setup-title">📝 新しく作る</h2>
                <div className="create-form">
                  <div className="setting-item-block">
                    <label>お題（タイトル）:</label>
                    <input className="title-input" value={surveyTitle} onChange={e => setSurveyTitle(e.target.value)} placeholder="例：今日のおやつは何がいい？" />
                  </div>
                  <div className="setting-item-block">
                    <label>📝 解説文 / 参考記事URL:</label>
                    <textarea 
                      className="title-input" 
                      style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                      value={surveyDescription} 
                      onChange={e => setSurveyDescription(e.target.value)} 
                      placeholder="例：このニュースの詳細はここからチェック！ https://...&#10;アンケートの背景などを自由に書いてね 🐰🥕" 
                    />
                  </div>
                  <div className="setting-item-block">
                    <label>📺 YouTube/ニコニコ動画（URL）:</label>
                    <input className="title-input" value={surveyYoutube} onChange={e => setSurveyYoutube(e.target.value)} placeholder="例：https://www.youtube.com/watch?v=..." />
                  </div>
                  <div className="setting-item-block">
                    <label>カテゴリ:</label>
                    <div className="category-selector">
                      {(isAdmin ? ['ニュース', 'YouTuber', '話題', 'エンタメ', 'レビュー', 'コラム', 'ネタ', 'らび', 'その他'] : ['ニュース', 'YouTuber', '話題', 'エンタメ', 'レビュー', 'コラム', 'ネタ', 'その他']).map(cat => (
                        <button key={cat} className={`cat-btn ${surveyCategory === cat ? 'active' : ''}`} onClick={() => setSurveyCategory(cat)}>{cat}</button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-item-block">
                    <label className="setting-label">🗳️ 投票項目を決める：</label>
                    <div className="setup-add-container">
                      <input className="add-input" value={tempOption} onChange={e => setTempOption(e.target.value)} onKeyPress={e => e.key === 'Enter' && (setSetupOptions([...setupOptions, tempOption.trim()]), setTempOption(''))} placeholder="項目を追加..." />
                      <button className="add-button" onClick={() => { if (tempOption.trim()) { setSetupOptions([...setupOptions, tempOption.trim()]); setTempOption(''); } }}>追加</button>
                    </div>
                    {setupOptions.map((opt, i) => <div key={i} className="setup-option-item"><span>{i + 1}. {opt}</span><button onClick={() => setSetupOptions(setupOptions.filter((_, idx) => idx !== i))}>×</button></div>)}
                  </div>
                  <div className="setting-item-block">
                    <label>🔒 公開設定:</label>
                    <div className="visibility-selector">
                      {[{ val: 'public', label: '🌐 公開' }, { val: 'limited', label: '🔗 限定公開' }, { val: 'private', label: '🔒 非公開' }].map(v => (
                        <button key={v.val} className={`vis-btn ${surveyVisibility === v.val ? 'active' : ''}`} onClick={() => setSurveyVisibility(v.val)}>{v.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-item-block">
                    <label>⏰ 締切日時 <span style={{ color: '#e11d48', fontWeight: 'bold' }}>（必須）</span>:</label>
                    <input className="title-input" type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    <div className="deadline-quick-btns">
                      {[1, 5, 10, 60].map(min => (
                        <button key={min} className="deadline-add-btn" onClick={() => {
                          const base = deadline ? new Date(deadline) : new Date();
                          base.setMinutes(base.getMinutes() + min);
                          const local = new Date(base.getTime() - base.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setDeadline(local);
                        }}>+{min}分</button>
                      ))}
                      {deadline && <button className="deadline-clear-btn" onClick={() => setDeadline('')}>✕ クリア</button>}
                    </div>
                  </div>
                  <div className="setting-item-block">
                    <label>🏷️ タグ（アンケートのキーワード）:</label>
                    <div className="setup-add-container">
                      <input className="add-input" value={tempTag} onChange={e => setTempTag(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter' && tempTag.trim()) { setSurveyTags([...surveyTags, tempTag.trim().replace(/^#/, '')]); setTempTag(''); } }}
                        placeholder="例：推し、お昼ごはん、習慣..." />
                      <button className="add-button" onClick={() => { if (tempTag.trim()) { setSurveyTags([...surveyTags, tempTag.trim().replace(/^#/, '')]); setTempTag(''); } }}>追加</button>
                    </div>
                    {surveyTags.length > 0 && (
                      <div className="tag-bubble-row">
                        {surveyTags.map((tag, i) => (
                          <span key={i} className="tag-bubble" onClick={() => setSurveyTags(surveyTags.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer' }}>#{tag} ×</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="start-button" onClick={handleStartSurvey} style={{ marginTop: '20px' }}>世界に公開する！🚀</button>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginTop: '12px' }}>
                    ※ 終了したアンケートは、広場の歴史として<span style={{ fontWeight: 'bold', color: '#7c3aed' }}>アーカイブ（永久保存）</span>されます。🐰💎
                  </p>
                </div>
              </div>
            )}

            {view === 'details' && currentSurvey && (
              <SurveyDetailView
                currentSurvey={currentSurvey}
                setCurrentSurvey={setCurrentSurvey}
                surveyOnlineCount={surveyOnlineCount}
                isTimeUp={isTimeUp}
                setIsTimeUp={setIsTimeUp}
                votedOption={votedOption}
                options={options}
                isTotalVotes={options.reduce((sum, o) => sum + (o.votes || 0), 0)}
                handleVote={handleVote}
                handleLikeSurvey={handleLikeSurvey}
                handleShareResult={handleShareResult}
                likedSurveys={likedSurveys}
                user={user}
                isAdmin={isAdmin}
                isEditingCategory={isEditingCategory}
                setIsEditingCategory={setIsEditingCategory}
                isEditingTags={isEditingTags}
                setIsEditingTags={setIsEditingTags}
                tagEditValue={tagEditValue}
                setTagEditValue={setTagEditValue}
                handleUpdateCategory={handleUpdateCategory}
                handleUpdateTags={handleUpdateTags}
                handleUpdateVisibility={handleUpdateVisibility}
                handleDeleteSurvey={handleDeleteSurvey}
                handleReportContent={handleReportContent}
                navigateTo={navigateTo}
                comments={comments}
                commentName={commentName}
                setCommentName={setCommentName}
                commentContent={commentContent}
                setCommentContent={setCommentContent}
                handlePostComment={handlePostComment}
                isPostingComment={isPostingComment}
                currentCommentPage={currentCommentPage}
                setCurrentCommentPage={setCurrentCommentPage}
                editingCommentId={editingCommentId}
                editContent={editContent}
                setEditContent={setEditContent}
                handleUpdateComment={handleUpdateComment}
                handleDeleteComment={handleDeleteComment}
                isActionLoading={isActionLoading}
                startEditComment={startEditComment}
                myCommentKeys={myCommentKeys}
                myReactions={myReactions}
                handleReaction={handleReaction}
                renderCommentContent={renderCommentContent}
                formatWithDay={formatWithDay}
                CountdownTimer={CountdownTimer}
                AnimatedCounter={AnimatedCounter}
                Pagination={Pagination}
                AdSenseBox={AdSenseBox}
                CATEGORY_ICON_STYLE={CATEGORY_ICON_STYLE}
                supabase={supabase}
                setSurveys={setSurveys}
                relatedSurveys={relatedSurveys}
              />
            )}
          </div>

          <Sidebar />
        </div>
      </div>

      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-about">
            <h4>📢 アンケート広場について</h4>
            <p>アンケート広場は、誰でもかんたんに匿名（またはGoogleログイン）でアンケートを作成・投票できる場所です。<br />
              みんなの「ちょっと気になる」を集めて、楽しく意見を共有しましょう！</p>
          </div>
          <div className="footer-links">
            <div className="footer-link-group">
              <h5>📚 サイト情報</h5>
              <ul>
                <li onClick={() => setShowingAbout(true)} className="footer-link-item">🌟 このサイトについて</li>
                <li onClick={() => setShowingTerms(true)} className="footer-link-item">📖 利用規約</li>
                <li onClick={() => setShowingPrivacy(true)} className="footer-link-item">📄 プライバシーポリシー</li>
                <li onClick={() => setShowingContact(true)} className="footer-link-item">📩 お問い合わせ</li>
              </ul>
            </div>
            <div className="footer-link-group">
              <h5>💡 使い方・ルール</h5>
              <ul>
                <li>不適切な投稿は控えてね</li>
                <li>楽しく安全に使いましょう</li>
                <li>限定公開なら身内だけで楽しめるよ</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 🥕 らびの応援コーナー */}
        <div className="footer-support-section" style={{
          padding: '20px', borderTop: '1px solid rgba(226, 232, 240, 0.6)',
          textAlign: 'center', background: 'linear-gradient(to right, transparent, #fff5f7, transparent)'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ec4899', fontWeight: 'bold' }}>🐰 うさぎのらびを応援する 🥕</p>
          <a href="https://ofuse.me/olipi" target="_blank" rel="noopener noreferrer" className="footer-ofuse-btn" style={{
            display: 'inline-block', padding: '10px 24px', background: '#db2777', color: '#fff',
            borderRadius: '30px', textDecoration: 'none', fontWeight: 'bold', fontSize: '1rem',
            boxShadow: '0 4px 12px rgba(219, 39, 119, 0.3)', transition: 'transform 0.2s'
          }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
            OFUSEで応援メッセージを送る ✨
          </a>
        </div>

        <div className="footer-bottom">© 2026 アンケート広場 / Powered by olipi projects</div>
      </footer>

      <FooterModals
        showingTerms={showingTerms} setShowingTerms={setShowingTerms}
        showingPrivacy={showingPrivacy} setShowingPrivacy={setShowingPrivacy}
        showingAbout={showingAbout} setShowingAbout={setShowingAbout}
        showingContact={showingContact} setShowingContact={setShowingContact}
        contactType={contactType} setContactType={setContactType}
        contactEmail={contactEmail} setContactEmail={setContactEmail}
        contactMessage={contactMessage} setContactMessage={setContactMessage}
        isSendingInquiry={isSendingInquiry} handleSubmitInquiry={handleSubmitInquiry}
      />
    </div>
  );
}

export default App;
