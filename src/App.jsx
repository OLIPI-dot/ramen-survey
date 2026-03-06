import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import emailjs from '@emailjs/browser';
import './App.css';

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⭐ 人気スコアの係数
const SCORE_VOTE_WEIGHT = 3;

// 👁️ view_count 重複加算防止
const VIEW_COOLDOWN_MS = 5 * 60 * 1000;
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
    "呼んだかな？らびだよ！🐰✨ いつでも広場を見守ってるよ！",
    "わーい！コメントありがとう！🥕 嬉しいなぁ！",
    "その意見、とっても素敵だね！✨ さすが広場のみんな！",
    "らびもそう思ってたんだ！🐰🥕 気が合うね！",
    "広場が賑やかで楽しいな〜！🐾 今日も良い一日になりそう！",
    "ひょっこり降臨！🐰 らびだよ〜！"
  ],
  keywords: [
    "わああ！大好きなニンジンだー！🥕🥕🥕 むしゃむしゃ！😋 ありがとう！",
    "ニンジンっていう言葉を聞くと、どこからでも飛んでくるよ！🐰💨💨",
    "🥕 はらびの元気の源なんだ！広場のみんなにもお裾分けしたいな〜✨",
    "らびは幸せ者だなぁ…！🥕 最高のプレゼントをありがとう！"
  ],
  admin: [
    "管理者さん、いつも素敵な広場の運営をありがとう！応援してるらび！🐰✨",
    "広場がもっと良くなるように、らびもお手伝い頑張るね！🥕🍀",
    "いつも見守ってくれてありがとう！広場の平和はらびが守るよ！🛡️🐰",
    "お疲れ様！🐰 たまには人参茶でも飲んでゆっくりしてね〜🍵"
  ]
};

const CATEGORY_ICON_STYLE = {
  "エンタメ": { icon: "🎬", color: "#f43f5e" },
  "グルメ": { icon: "🍔", color: "#f59e0b" },
  "スポーツ": { icon: "⚽", color: "#3b82f6" },
  "トレンド": { icon: "🔥", color: "#ec4899" },
  "IT・テクノロジー": { icon: "💻", color: "#8b5cf6" },
  "生活": { icon: "🏠", color: "#10b981" },
  "ゲーム": { icon: "🎮", color: "#14b8a6" },
  "アニメ": { icon: "📺", color: "#6366f1" }, // 📺 アニメ用アイコン（インディゴ系に変更してITと差別化）
  "らび": { icon: "🐰", color: "#ec4899" }, // らび専用アイコン（ピンク系）
  "その他": { icon: "❓", color: "#64748b" },
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

const AdSenseBox = ({ slot, format = 'auto', affiliateType = null }) => {
  // 🥕 おりぴさんの特別な紹介ID！
  const ASSOCIATE_ID = 'olipivote-22';

  // ✨ おすすめ商品リスト
  const RECOMMENDATIONS = [
    { title: 'by Amazon エナジードリンク', url: 'https://amzn.to/4rVsb47', image: 'https://m.media-amazon.com/images/I/81YLVVDtZRL._AC_SX679_.jpg', icon: '⚡', category: 'おりぴ飲物' },
    { title: 'SONY 65インチ 4Kブラビア', url: 'https://amzn.to/3N15HiU', image: 'https://m.media-amazon.com/images/I/61N0XNFinyL._AC_SY879_.jpg', icon: '📺', category: 'おりぴ家電' },
    { title: 'Shark 自動ゴミ収集掃除機', url: 'https://amzn.to/4bgVp6q', image: 'https://m.media-amazon.com/images/I/51F7qXg9W+L._AC_SX679_.jpg', icon: '🧹', category: 'おりぴ家電' },
    { title: 'LISEN USB-C ケーブル 2M', url: 'https://amzn.to/4aQsQO4', image: 'https://m.media-amazon.com/images/I/81eeRU5gwtL._AC_SX679_.jpg', icon: '🔌', category: 'おりぴPC' },
    { title: 'UGREEN USB-C ケーブル 2M', url: 'https://amzn.to/40ekjhW', image: 'https://m.media-amazon.com/images/I/61DgZxJhEZL._AC_SY879_.jpg', icon: '🔌', category: 'おりぴPC' },
    { title: '味の素 冷凍ギョーザ 1kg', url: 'https://amzn.to/4b9MxiU', image: 'https://m.media-amazon.com/images/I/81bIZEBVGqL._AC_SY679_.jpg', icon: '🥟', category: 'おりぴ食品' },
    { title: 'Logicool G ゲーミングヘッドセット', url: 'https://amzn.to/46HYQS0', image: 'https://m.media-amazon.com/images/I/71QEWj+ioXS._AC_SX679_.jpg', icon: '🎧', category: 'おりぴPC' },
    { title: 'ブテナロック 足洗いソープ', url: 'https://amzn.to/4rVg8ni', image: 'https://m.media-amazon.com/images/I/51U5qFjDPOL._AC_SY879_.jpg', icon: '🧼', category: 'おりぴ生活' },
    { title: '下村企販 バナナスタンド', url: 'https://amzn.to/4rfif4a', image: 'https://m.media-amazon.com/images/I/41SLnhzQXVL._AC_SY879_.jpg', icon: '🍌', category: 'おりぴキッチン' }
  ];

  // ランダムに1つ選ぶよ
  const [rec, setRec] = useState(RECOMMENDATIONS[0]);
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
        background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        border: '2px dashed #ec4899', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', color: '#64748b', fontSize: '0.9rem',
        boxShadow: '0 8px 30px rgba(0,0,0,0.05)',
        zIndex: 1
      }}>
        {affiliateType === 'amazon' ? (
          <div className="affiliate-content" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '30px', flexWrap: 'wrap', padding: '10px' }}>
            <div className="product-image-container" style={{ width: '100px', height: '100px', background: '#fff', borderRadius: '12px', padding: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <img src={rec.image} alt={rec.title} referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ textAlign: 'center', maxWidth: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontWeight: '800', color: '#334155', fontSize: '1.05rem', marginBottom: '10px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rec.title}</div>
              <a href={rec.url} target="_blank" rel="noopener noreferrer" className="affiliate-btn amazon-btn" style={{
                padding: '8px 24px', background: 'linear-gradient(135deg, #ff9900 0%, #ffb347 100%)', color: '#fff', borderRadius: '30px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(255, 153, 0, 0.25)', display: 'inline-block', position: 'relative', zIndex: 20
              }}>Amazonで詳しく見る ✨</a>
            </div>
          </div>
        ) : affiliateType === 'ofuse' ? (
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
  const [isTotalVotes, setIsTotalVotes] = useState(0);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyImage, setSurveyImage] = useState('');
  const [surveyCategory, setSurveyCategory] = useState('');
  const [setupOptions, setSetupOptions] = useState([]);
  const [surveyVisibility, setSurveyVisibility] = useState('public');
  const [sortMode, setSortMode] = useState('latest');
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

  // 👑 管理者フラグ
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const [currentCommentPage, setCurrentCommentPage] = useState(1); // 💬 コメント用ページネーション

  // 📡 リアルタイム人数
  const [globalOnlineCount, setGlobalOnlineCount] = useState(1);
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

  // 💬 コメント取得＆リアルタイム購読ロジック & 個別アンケート見てる人数追跡
  useEffect(() => {
    if (view === 'details' && currentSurvey) {
      let activeCommentChannel;
      let activePresenceChannel;

      const fetchAndSubscribe = async () => {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('survey_id', currentSurvey.id)
          .order('created_at', { ascending: false });
        if (!error) setComments(data);

        activeCommentChannel = supabase
          .channel(`comments_realtime_${currentSurvey.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'comments'
          }, payload => {
            // 他のアンケートのコメントも流れてくる可能性があるため、ID一致チェックを行う
            if (payload.eventType === 'INSERT') {
              // INSERTの場合は survey_id が含まれているはずなのでチェック可能
              if (payload.new.survey_id === currentSurvey.id) {
                setComments(prev => [payload.new, ...prev]);
              }
            } else if (payload.eventType === 'UPDATE') {
              // UPDATEで survey_id が無い場合でも、現在のリストにその ID があれば更新対象
              setComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
            } else if (payload.eventType === 'DELETE') {
              if (payload.old && payload.old.id) {
                setComments(prev => prev.filter(c => c.id !== payload.old.id));
              }
            }
          })
          .subscribe();

        // 個別アンケートのリアルタイム視聴人数（Presence）
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

      fetchAndSubscribe();

      return () => {
        if (activeCommentChannel) supabase.removeChannel(activeCommentChannel);
        if (activePresenceChannel) supabase.removeChannel(activePresenceChannel);
      };
    } else {
      setComments([]);
      setCurrentCommentPage(1);
      setSurveyOnlineCount(1); // リセット
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
    // 第2弾：より広範かつ確実なURL検出正規表現
    const parts = content.split(/(https?:\/\/[^\s]+|>>\d+)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('>>') && /^>>\d+$/.test(part)) {
        return <span key={i} className="comment-anchor-link">{part}</span>;
      }
      if (/^https?:\/\/\S+$/.test(part)) {
        const cleanUrl = part.trim();
        return (
          <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="comment-url-link">
            {cleanUrl}
          </a>
        );
      }
      return part;
    });
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

      const { data, error } = await supabase.from('comments').insert([{
        survey_id: currentSurvey.id,
        user_name: finalName,
        content: commentContent,
        user_id: user?.id || null,
        edit_key: editKey
      }]).select();

      if (error) {
        alert("😿 コメントが送れなかったみたい（理由: " + error.message + "）");
        console.error("Comment Insert Error:", error);
      } else {
        // 成功したらIDと鍵をlocalStorageに保存（自分が書いた証明）
        const updatedKeys = { ...myCommentKeys };
        updatedKeys[data[0].id] = editKey;
        localStorage.setItem('my_comment_keys', JSON.stringify(updatedKeys));
        setMyCommentKeys(updatedKeys); // 状態を更新して即座にボタンを出す

        setCommentContent('');
        setCommentName(''); // 投稿後は空に
        updateRateLimit(); // 🛡️ 投稿時間を記録

        // 🪄 ラビの降臨チェック
        // コメントリストの先頭に追加される想定なので、この時点での自分自身の番号は comments.length + 1
        const resNum = comments.length + 1;
        triggerLabiDescent(commentContent, finalName, isAdmin, resNum);
      }
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
    setTimeout(async () => {
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
        user_id: null, // user_idはUUID型なので無効な文字列は弾かれるためnullにする
        edit_key: "labi_bot"
      }]);

      if (error) console.error("Labi Descent Error:", error);
    }, 3000 + Math.random() * 2000);
  };

  async function handleReaction(commentId, type) {
    const reactionKey = `${commentId}_${type}`;
    const hasReacted = !!myReactions[reactionKey];

    const target = comments.find(c => c.id === commentId);
    if (!target) return;

    const newReactions = { ...target.reactions };
    if (hasReacted) {
      // 既に押している場合はキャンセル（-1）
      newReactions[type] = Math.max(0, (newReactions[type] || 0) - 1);
    } else {
      // 未押下の場合は +1
      newReactions[type] = (newReactions[type] || 0) + 1;
    }

    const { error } = await supabase
      .from('comments')
      .update({ reactions: newReactions })
      .eq('id', commentId);

    if (!error) {
      const updatedMyReactions = { ...myReactions };
      if (hasReacted) delete updatedMyReactions[reactionKey];
      else updatedMyReactions[reactionKey] = true;

      setMyReactions(updatedMyReactions);
      localStorage.setItem('my_reactions', JSON.stringify(updatedMyReactions));
    } else {
      console.error("Reaction update error:", error);
    }
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

  // 🖱️ ページ遷移時に一番上へ戻る魔法 & 📊 Google Analytics 追跡
  useEffect(() => {
    // 🐰 らびのGA計測魔法（SPA対応・超確実版！）

    // ガード1: 詳細画面なのに対象アンケートがまだ読み込まれていない場合はスキップ
    if (view === 'details' && !currentSurvey) return;

    // ガード2: 初期ロード時、URLにアンケートIDがあるのにまだ詳細画面に切り替わっていない間はスキップ
    const params = new URLSearchParams(window.location.search);
    if (params.get('s') && view === 'list') return;

    window.scrollTo(0, 0);

    if (window.gtag) {
      const pageTitle = currentSurvey
        ? `${currentSurvey.title} - みんなのアンケート広場`
        : (view === 'list' ? 'みんなのアンケート広場' : 'アンケート作成 - みんなのアンケート広場');

      const virtualPath = currentSurvey
        ? `/survey/${currentSurvey.id}`
        : (view === 'list' ? '/' : '/create');

      // 🌟 らびの「大成功 ＆ 完璧計測」魔法！
      // 1. ブラウザのタイトルを更新
      document.title = pageTitle;

      // 2. page_view イベントを明示的に送信！
      window.gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: window.location.href,
        page_path: virtualPath
      });
    }
  }, [view, currentSurvey?.id]);

  // 🔗 URL の ?s=<id> パラメータからアンケートを直接読み込む
  const loadFromUrl = async () => {
    const params = new URLSearchParams(window.location.search);
    const surveyId = params.get('s');
    // IDがない、または無効な文字列（'null','undefined'など）の場合は無視
    if (!surveyId || surveyId === 'null' || surveyId === 'undefined') {
      setView('list');
      setCurrentSurvey(null);
      return;
    }

    const { data: sv } = await supabase.from('surveys').select('*').eq('id', surveyId).single();
    if (!sv) {
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
    setView('details');
  };

  // ブラウザの戻る・進むボタンに対応するセンサー センサーを追加！
  useEffect(() => {
    const handlePopState = () => loadFromUrl();
    window.addEventListener('popstate', handlePopState);
    loadFromUrl(); // 初回読み込み
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]); // userが変わった時も再チェック

  const navigateTo = async (nextView, survey = null) => {
    const url = new URL(window.location.origin + window.location.pathname);
    if (nextView === 'details' && survey) {
      if (survey.visibility === 'private' && (!user || user.id !== survey.user_id)) {
        return alert('非公開です🔒');
      }
      url.searchParams.set('s', survey.id);
      window.history.pushState({ surveyId: survey.id }, '', url);
      setCurrentSurvey(survey);
      setIsTimeUp(survey.deadline && new Date(survey.deadline) < new Date());

      const viewKey = `last_view_${survey.id}`;
      const lastView = parseInt(localStorage.getItem(viewKey) || '0', 10);
      const now = Date.now();
      if (now - lastView > VIEW_COOLDOWN_MS) {
        localStorage.setItem(viewKey, now.toString());
        await supabase.rpc('increment_survey_view', { survey_id: survey.id });
      }
    } else if (nextView === 'list') {
      // 🏘️ 広場に戻る時はURLからパラメータを完全に消去する（絶対パスで確実に）
      window.history.pushState({ view: 'list' }, '', window.location.pathname);
      setCurrentSurvey(null);
    }
    setView(nextView);
    window.scrollTo(0, 0);
  };

  const fetchSurveys = async (currentUser) => {
    setIsLoading(true);
    // アンケート本体
    const { data: sData } = await supabase.from('surveys').select('*').eq('visibility', 'public');

    // ログイン中なら自分の非公開/限定公開アンケートも取得
    let mine = [];
    if (currentUser) {
      const { data: mData } = await supabase.from('surveys').select('*').eq('user_id', currentUser.id).neq('visibility', 'public');
      if (mData) mine = mData;
    }

    // 投票数は一括取得してマージ
    const { data: oData } = await supabase.from('options').select('survey_id, votes');
    // コメント数は DB のカラムを使うのでここでは取得不要！

    const allSurveys = [...(sData || []), ...mine];
    if (allSurveys.length > 0) {
      const updatedList = allSurveys.map(s => ({
        ...s,
        total_votes: oData ? oData.filter(o => o.survey_id === s.id).reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0,
        comment_count: s.comment_count || 0 // DB カラムをそのまま使うらび！
      }));
      setSurveys(updatedList);

      // 💎 重要: 詳細画面を開いている場合、そのデータも最新版に差し替える
      setCurrentSurvey(prev => {
        if (!prev) return null;
        const latest = updatedList.find(s => String(s.id) === String(prev.id));
        return latest ? { ...latest } : prev;
      });
    } else {
      setSurveys([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSurveys(user);
    refreshSidebar();
    const ch = supabase.channel('global-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => { fetchSurveys(user); refreshSidebar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'options' }, () => { fetchSurveys(user); refreshSidebar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => { fetchSurveys(user); refreshSidebar(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  useEffect(() => {
    if (view === 'details' && currentSurvey) {
      const load = async () => {
        const { data } = await supabase.from('options').select('*').eq('survey_id', currentSurvey.id).order('id', { ascending: true });
        if (data) { setOptions(data); setIsTotalVotes(data.reduce((sum, item) => sum + item.votes, 0)); }
        setVotedOption(localStorage.getItem(`voted_survey_${currentSurvey.id}`));
      };
      load();

      const ch = supabase.channel(`opts-${currentSurvey.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'options', filter: `survey_id=eq.${currentSurvey.id}` }, () => {
          load();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ch);
      };
    }
  }, [view, currentSurvey]);

  const refreshSidebar = async () => {
    const { data: sData } = await supabase.from('surveys').select('*').eq('visibility', 'public');
    const { data: oData } = await supabase.from('options').select('survey_id, votes');
    const { data: cData } = await supabase.from('comments').select('survey_id');

    if (sData && oData) {
      const withStats = sData.map(s => ({
        ...s,
        total_votes: oData.filter(o => o.survey_id === s.id).reduce((sum, opt) => sum + (opt.votes || 0), 0),
        comment_count: s.comment_count || 0 // DB カラムをそのまま使うらび！
      }));
      setLiveSurveys([...withStats].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10));
      setPopularSurveys([...withStats].sort((a, b) => {
        const scoreA = (a.total_votes || 0) * SCORE_VOTE_WEIGHT + (a.view_count || 0);
        const scoreB = (b.total_votes || 0) * SCORE_VOTE_WEIGHT + (b.view_count || 0);
        return scoreB - scoreA;
      }).slice(0, 10));

      const now = new Date();
      const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const endingSoon = withStats
        .filter(s => s.deadline && new Date(s.deadline) > now && new Date(s.deadline) <= next24h)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 3);
      setEndingSoonSurveys(endingSoon);
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
    const finalDeadline = new Date(`${deadline}:00+09:00`).toISOString();
    const { data, error } = await supabase.from('surveys').insert([{ title: surveyTitle, deadline: finalDeadline, user_id: user.id, image_url: finalImage, category: surveyCategory, visibility: surveyVisibility, tags: surveyTags }]).select();
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
    setSetupOptions([]);
    setSurveyTags([]);
    setDeadline('');
    setSurveyVisibility('public');

    navigateTo('list');
    fetchSurveys(user);
  };

  const handleVote = async (option) => {
    if (isTimeUp || votedOption) return;
    await supabase.from('options').update({ votes: option.votes + 1 }).eq('id', option.id);
    // IDを保存するように変更（同名回避のため）
    localStorage.setItem(`voted_survey_${currentSurvey.id}`, String(option.id));
    setVotedOption(String(option.id));
  };

  const handleLikeSurvey = async () => {
    if (!currentSurvey) return;

    const isLiked = likedSurveys.some(id => String(id) === String(currentSurvey.id));
    const newLikesCount = isLiked
      ? Math.max(0, (currentSurvey.likes_count || 0) - 1)
      : (currentSurvey.likes_count || 0) + 1;

    // 🏎️ UIを先に更新（楽観的UI更新）
    setCurrentSurvey({ ...currentSurvey, likes_count: newLikesCount });

    // 一覧やランキングなどの全リストの状態も同期させる（重要！）
    const mapper = s => String(s.id) === String(currentSurvey.id) ? { ...s, likes_count: newLikesCount } : s;
    setSurveys(prev => prev.map(mapper));
    setPopularSurveys(prev => prev.map(mapper));

    const newLikedIds = isLiked
      ? likedSurveys.filter(id => String(id) !== String(currentSurvey.id))
      : [...likedSurveys, String(currentSurvey.id)];
    setLikedSurveys(newLikedIds);
    localStorage.setItem('liked_surveys', JSON.stringify(newLikedIds));

    // 🛡️ DBを更新：RPCを使用して確実に増減させる（レースコンディション回避）
    const { error } = await supabase.rpc('increment_survey_like', {
      survey_id: currentSurvey.id,
      increment_val: isLiked ? -1 : 1
    });

    if (error) {
      console.warn("⚠️ いいねのDB保存に失敗しました（RPC未設定など）:", error.message);
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
    const { error } = await supabase.from('surveys').update({ visibility: newVisibility }).eq('id', currentSurvey.id);
    if (error) {
      console.error("Update visibility error:", error);
      return alert('変更に失敗しました');
    }
    setCurrentSurvey({ ...currentSurvey, visibility: newVisibility });
    alert(`公開設定を「${newVisibility}」に変更しました！`);
    fetchSurveys(user);
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
      const perc = isTotalVotes > 0 ? Math.round((opt.votes / isTotalVotes) * 100) : 0;
      const name = opt.name.length > 8 ? opt.name.slice(0, 8) + '…' : opt.name;
      return `${index + 1}. ${name} ${bar(perc)} ${perc}%`;
    });
    const url = `${window.location.origin}/?s=${currentSurvey.id}`;

    if (type === 'copy') {
      // コピー用はURLを含める
      const copyText = [
        `📊「${title}」`,
        '',
        ...lines,
        '',
        `計${isTotalVotes}票 👉 ${url}`,
        `#アンケート広場`,
      ].join('\n');
      navigator.clipboard.writeText(copyText).then(() => alert('コピーしました！'));
    } else if (type === 'x') {
      // Xシェア：URLはurl=パラメータで渡してテキスト本文をスッキリさせる
      const surveyTagsText = currentSurvey.tags && currentSurvey.tags.length > 0
        ? currentSurvey.tags.map(t => `#${t}`).join(' ')
        : '';
      const xText = [
        `📊「${title}」`,
        '',
        ...lines,
        '',
        `計${isTotalVotes}票 #アンケート広場 ${surveyTagsText}`,
      ].join('\n');
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`,
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
            endingSoonSurveys.map(s => (
              <div key={s.id} className="live-item clickable" onClick={() => navigateTo('details', s)}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{s.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#e11d48', background: '#fff1f2', display: 'inline-block', padding: '2px 8px', borderRadius: '12px' }}>
                  〆: {formatWithDay(s.deadline)}
                </div>
              </div>
            ))
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
                  <span>🗳️ {s.total_votes || 0} 票</span>
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
            {view !== 'list' && <button className="side-back-btn" onClick={() => navigateTo('list')}>⇠ 広場へ戻る</button>}
          </div>

          <div className="survey-card">
            {view === 'list' && (
              <>
                <div className="auth-header">
                  {user ? (
                    <div className="user-info">
                      {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} className="user-avatar" />}
                      <span className="user-name">{user.user_metadata?.full_name || user.email.split('@')[0]}さん</span>
                      <button className="logout-button" onClick={() => supabase.auth.signOut()}>ログアウト</button>
                    </div>
                  ) : <button className="login-button-top" onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}>Googleでログイン</button>}
                </div>
                <button className="create-new-button" onClick={() => user ? setView('create') : alert("📝 アンケートの作成はログインしていないと使えません🙇‍♀️\n上の「Googleでログイン」ボタンからログインしてね！")}>＋ 新しいアンケートを作る</button>
                <div className="search-container">
                  <input type="text" placeholder="🔍 アンケートを検索する..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="search-input" />
                </div>
                <div className="tab-switcher">
                  <button className={sortMode === 'latest' ? 'active' : ''} onClick={() => setSortMode('latest')}>⏳ 新着</button>
                  <button className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>🔥 人気</button>
                  <button className={sortMode === 'watching' ? 'active' : ''} onClick={() => setSortMode('watching')}>⭐ ウォッチ中</button>
                  <button className={sortMode === 'ended' ? 'active' : ''} onClick={() => setSortMode('ended')}>📁 終了</button>
                  <button className={sortMode === 'mine' ? 'active' : ''} onClick={() => { if (!user) return alert("👤 マイアンケートはログインしていないと使えません🙇‍♀️\n上の「Googleでログイン」ボタンからログインしてね！"); setSortMode('mine'); }}>👤 マイアンケート</button>
                </div>
                {sortMode === 'popular' && (
                  <div className="popular-sub-tabs">
                    <button className={popularMode === 'trending' ? 'active' : ''} onClick={() => setPopularMode('trending')}>🔥 盛り上がり</button>
                    <button className={popularMode === 'score' ? 'active' : ''} onClick={() => setPopularMode('score')}>⚡ 総合</button>
                    <button className={popularMode === 'votes' ? 'active' : ''} onClick={() => setPopularMode('votes')}>🗳️ 投票人気</button>
                    <button className={popularMode === 'views' ? 'active' : ''} onClick={() => setPopularMode('views')}>👁️ 閲覧人気</button>
                  </div>
                )}
                <div className="category-filter-bar">
                  {['すべて', 'エンタメ', 'アニメ', 'グルメ', 'スポーツ', 'トレンド', 'IT・テクノロジー', '生活', 'ゲーム', 'らび', 'その他'].map(cat => (
                    <button key={cat} className={`filter-cat-btn ${filterCategory === cat ? 'active' : ''}`} onClick={() => setFilterCategory(cat)}>{cat}</button>
                  ))}
                </div>
                {/* 📈 マイ統計パネル（マイアンケートタブのみ） */}
                {sortMode === 'mine' && user && (() => {
                  const mine = surveys.filter(s => s.user_id === user.id);
                  const totalVotes = mine.reduce((sum, s) => sum + (s.total_votes || 0), 0);
                  const totalViews = mine.reduce((sum, s) => sum + (s.view_count || 0), 0);
                  const avgRate = mine.length > 0
                    ? Math.round(mine.reduce((sum, s) => sum + (s.view_count > 0 ? (s.total_votes || 0) / s.view_count : 0), 0) / mine.length * 100)
                    : 0;
                  const top = mine.sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))[0];
                  return (
                    <div className="my-stats-panel">
                      <div className="my-stats-title">📈 マイ統計</div>
                      <div className="my-stats-grid">
                        <div className="my-stat-card"><div className="stat-num">{mine.length}</div><div className="stat-label">作成数</div></div>
                        <div className="my-stat-card"><div className="stat-num">{totalVotes}</div><div className="stat-label">合計票</div></div>
                        <div className="my-stat-card"><div className="stat-num">{totalViews}</div><div className="stat-label">合計閲覧</div></div>
                        <div className="my-stat-card"><div className="stat-num">{avgRate}%</div><div className="stat-label">平均投票率</div></div>
                      </div>
                      {top && <div className="my-stat-top">🏆 人気No.1：<strong>{top.title}</strong>（{top.total_votes || 0}票）</div>}
                    </div>
                  );
                })()}
                <div className="survey-list">
                  {isLoading ? <div className="empty-msg">読み込み中...</div> : (() => {
                    const filtered = surveys
                      .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) && (filterCategory === 'すべて' || s.category === filterCategory))
                      .filter(s => !filterTag || (s.tags && s.tags.includes(filterTag)))
                      .filter(s => {
                        // 🤖 30日経過で自動終了（deadline未設定も含む）
                        const ageMs = new Date() - new Date(s.created_at);
                        const isAutoEnded = ageMs > 30 * 24 * 60 * 60 * 1000;
                        const isEnded = isAutoEnded || (s.deadline && new Date(s.deadline) < new Date());

                        // 終わっているものは「最新」や「人気」の一覧から隠す（終了タブにのみ存在）
                        if (isEnded) {
                          if (sortMode === 'ended' || sortMode === 'mine') return true;
                          return false;
                        }

                        if (sortMode === 'ended') return false; // ここに来るのはisEnded=falseのみ
                        if (sortMode === 'watching') return watchedIds.includes(s.id);
                        if (sortMode === 'mine') return user && s.user_id === user.id;
                        return true;
                      })
                      .sort((a, b) => {
                        if (sortMode !== 'popular') return new Date(b.created_at) - new Date(a.created_at);
                        if (popularMode === 'trending') {
                          const ageA = Math.max(0.5, (new Date() - new Date(a.created_at)) / 3600000);
                          const ageB = Math.max(0.5, (new Date() - new Date(b.created_at)) / 3600000);
                          return (((b.total_votes || 0) * 10 + (b.view_count || 0)) / Math.pow(ageB + 2, 1.2)) - (((a.total_votes || 0) * 10 + (a.view_count || 0)) / Math.pow(ageA + 2, 1.2));
                        }
                        if (popularMode === 'score') {
                          const scoreA = (a.total_votes || 0) * SCORE_VOTE_WEIGHT + (a.view_count || 0);
                          const scoreB = (b.total_votes || 0) * SCORE_VOTE_WEIGHT + (b.view_count || 0);
                          return scoreB - scoreA;
                        }
                        return popularMode === 'votes' ? b.total_votes - a.total_votes : (b.view_count || 0) - (a.view_count || 0);
                      });

                    const ITEMS_PER_PAGE = 21;
                    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                    const currentItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                    return (
                      <>
                        {currentItems.map((s, idx) => {
                          const realIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                          const isEnded = s.deadline && new Date(s.deadline) < new Date();
                          const showBadge = sortMode === 'popular' && realIdx < 3;
                          let badgeLabel = '';
                          if (showBadge) {
                            if (popularMode === 'trending') {
                              badgeLabel = `🔥 ${Math.round(((s.total_votes || 0) * 10 + (s.view_count || 0)) / (Math.pow(Math.max(0.5, (new Date() - new Date(s.created_at)) / 3600000) + 2, 1.2)))}`;
                            } else if (popularMode === 'views') {
                              badgeLabel = `👁️ ${s.view_count || 0} View`;
                            } else if (popularMode === 'score') {
                              badgeLabel = `⚡ ${(s.total_votes || 0) * SCORE_VOTE_WEIGHT + (s.view_count || 0)} pt`;
                            } else {
                              badgeLabel = `🗳️ ${s.total_votes || 0} 票`;
                            }
                          }
                          return (
                            <React.Fragment key={s.id}>
                              <div className="survey-item-card" onClick={() => navigateTo('details', s)}>
                                <div className="category-icon-thumb" style={{ background: CATEGORY_ICON_STYLE[s.category]?.color }}>{CATEGORY_ICON_STYLE[s.category]?.icon}</div>
                                <div className="survey-item-content">
                                  <div className="survey-item-info">
                                    <span className="survey-item-title">{showBadge && (realIdx === 0 ? '👑 ' : realIdx === 1 ? '🥈 ' : '🥉 ')}{s.title}</span>
                                    <div className="card-right-actions">
                                      <button className={`watch-star-btn ${watchedIds.includes(s.id) ? 'active' : ''}`} onClick={(e) => toggleWatch(e, s.id)}>{watchedIds.includes(s.id) ? '★' : '☆'}</button>
                                      <span className={`status-badge ${isEnded ? 'ended' : 'active'}`}>{isEnded ? '終了' : '受付中'}</span>
                                    </div>
                                  </div>
                                  <div className="survey-item-meta-row">
                                    {showBadge && <span className="popular-score-badge">{badgeLabel}</span>}
                                    {s.deadline && <span className="survey-item-deadline">〆: {formatWithDay(s.deadline)}</span>}
                                    <div className="card-stats-row">
                                      <span className="survey-item-votes" title="投票数">🗳️ {s.total_votes || 0}</span>
                                      <span className="survey-item-views" title="閲覧数">👁️ {s.view_count || 0}</span>
                                      <span className="survey-item-likes" title="いいね数">👍 {s.likes_count || 0}</span>
                                      <span className="survey-item-comments" title="コメント数">💬 {s.comment_count || 0}</span>
                                    </div>
                                  </div>
                                  {s.tags && s.tags.length > 0 && (
                                    <div className="tag-bubble-row" onClick={e => e.stopPropagation()}>
                                      {s.tags.map(tag => (
                                        <span key={tag} className={`tag-bubble ${filterTag === tag ? 'active' : ''}`} onClick={() => setFilterTag(filterTag === tag ? '' : tag)}>#{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* 💎 9個目（3行）ごとに広告を差し込む魔法 */}
                              {(idx + 1) % 9 === 0 && (
                                <AdSenseBox slot={`list_feed_slot_${Math.floor(idx / 9)}`} affiliateType="amazon" />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
                <div className="pagination-container-outer">
                  {(() => {
                    const filtered = surveys
                      .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) && (filterCategory === 'すべて' || s.category === filterCategory))
                      .filter(s => !filterTag || (s.tags && s.tags.includes(filterTag)))
                      .filter(s => {
                        const ageMs = new Date() - new Date(s.created_at);
                        const isAutoEnded = ageMs > 30 * 24 * 60 * 60 * 1000;
                        const isEnded = isAutoEnded || (s.deadline && new Date(s.deadline) < new Date());
                        if (isEnded) {
                          if (sortMode === 'ended' || sortMode === 'mine') return true;
                          return false;
                        }
                        if (sortMode === 'ended') return false;
                        if (sortMode === 'watching') return watchedIds.includes(s.id);
                        if (sortMode === 'mine') return user && s.user_id === user.id;
                        return true;
                      });
                    const totalPages = Math.ceil(filtered.length / 21);
                    return <Pagination current={currentPage} total={totalPages} onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />;
                  })()}
                </div>
              </>
            )}

            {view === 'create' && (
              <div className="score-card">
                <h2 className="setup-title">📝 新しく作る</h2>
                <div className="create-form">
                  <div className="setting-item-block"><label>お題（タイトル）:</label><input className="title-input" value={surveyTitle} onChange={e => setSurveyTitle(e.target.value)} placeholder="例：今日のおやつは何がいい？" /></div>
                  <div className="setting-item-block"><label>カテゴリ:</label>
                    <div className="category-selector">
                      {(isAdmin ? ['エンタメ', 'アニメ', 'グルメ', 'スポーツ', 'トレンド', 'IT・テクノロジー', '生活', 'ゲーム', 'らび', 'その他'] : ['エンタメ', 'アニメ', 'グルメ', 'スポーツ', 'トレンド', 'IT・テクノロジー', '生活', 'ゲーム', 'その他']).map(cat => (
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
                  <button className="start-button" onClick={handleStartSurvey}>公開する！</button>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
                    ※ 終了したアンケートは、公平を期すために<span style={{ fontWeight: 'bold' }}>締切から7日後</span>に自動的に完全削除されます。
                  </p>
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
                </div>
              </div>
            )}

            {view === 'details' && currentSurvey && (
              <div className="score-card">
                {/* ヒーロー画像を削除 */}
                <div className="detail-header">
                  <h1 className="survey-title">{currentSurvey.title}</h1>
                  <div className="detail-meta-bar">
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>👀 いま {surveyOnlineCount} 人がチェック中！</span>
                    <span>👁️ {currentSurvey.view_count || 0} 閲覧</span>
                    <span>👍 {currentSurvey.likes_count || 0} いいね</span>
                    {currentSurvey.category && <span>🏷️ {currentSurvey.category}</span>}
                  </div>
                  {currentSurvey.deadline && (
                    <div className="deadline-info-block">
                      <div className="absolute-deadline">締切：{new Date(currentSurvey.deadline).getFullYear()}年{formatWithDay(currentSurvey.deadline)}</div>
                      {!isTimeUp ? (
                        <CountdownTimer deadline={currentSurvey.deadline} onTimeUp={() => setIsTimeUp(true)} />
                      ) : (
                        <div className="countdown-display ended">
                          投票受付終了
                          <div style={{ fontSize: '0.8rem', marginTop: '6px', fontWeight: 'normal', opacity: 0.9, lineHeight: '1.4' }}>
                            🗑️ 自動削除予定日：<br />
                            <span style={{ color: '#fb7185', fontWeight: 'bold' }}>
                              {(() => {
                                const d = new Date(currentSurvey.deadline);
                                d.setDate(d.getDate() + 7);
                                return `${d.getFullYear()}/${formatWithDay(d.toISOString())}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="options-container">
                  {options.map((opt, index) => {
                    const perc = isTotalVotes > 0 ? Math.round((opt.votes / isTotalVotes) * 100) : 0;
                    return (
                      <div key={opt.id} className="result-bar-container">
                        {votedOption || isTimeUp ? (
                          <>
                            <div className="result-info">
                              <span className="choice-name">
                                {index + 1}. {opt.name}
                                {(String(votedOption) === String(opt.id) || votedOption === opt.name) && ' ✅'}
                              </span>
                              <span className="vote-count-meta">
                                <span className="vote-count-num">{opt.votes || 0}票</span>
                                <span className="vote-count-perc">({perc}%)</span>
                              </span>
                            </div>
                            <div className="result-bar-bg"><div className="result-bar-fill" style={{ width: `${perc}%` }}></div></div>
                          </>
                        ) : <button className="option-button" onClick={() => handleVote(opt)}>{index + 1}. {opt.name}</button>}
                      </div>
                    );
                  })}
                </div>
                <div className="share-result-area">
                  <button
                    className={`like-survey-btn ${likedSurveys.some(id => String(id) === String(currentSurvey.id)) ? 'liked' : ''}`}
                    onClick={handleLikeSurvey}
                    style={{
                      background: likedSurveys.some(id => String(id) === String(currentSurvey.id)) ? '#ec4899' : '#fbcfe8',
                      color: likedSurveys.some(id => String(id) === String(currentSurvey.id)) ? 'white' : '#be185d',
                      border: 'none', padding: '12px 24px', borderRadius: '24px', cursor: 'pointer',
                      fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(236,72,153,0.3)',
                    }}
                  >
                    {likedSurveys.some(id => String(id) === String(currentSurvey.id)) ? '👍 いいね！ (' : '🤍 いいね！ ('} {currentSurvey.likes_count || 0} )
                  </button>
                  <button className="share-copy-btn" onClick={() => handleShareResult('copy')}>📋 結果をコピー</button>
                  <button className="share-x-btn" onClick={() => handleShareResult('x')}>𝕏 シェア</button>
                  {user && (
                    <button className="report-content-btn" onClick={() => handleReportContent('アンケート', currentSurvey.id, currentSurvey.title)} style={{
                      background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px 20px', borderRadius: '24px', cursor: 'pointer',
                      fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', transition: 'all 0.2s'
                    }}>🚩 通報</button>
                  )}
                  {(user && (currentSurvey.user_id === user.id || isAdmin)) && (
                    <>
                      {currentSurvey.user_id === user.id && (
                        <button className="delete-survey-btn" onClick={async () => {
                          const input = window.prompt("どれくらい延長しますか？\n例: 「1d12h30m」で1日と12時間30分、「3d」や「3」で3日延長\n※未入力の場合は1日延長されます", "1d");
                          if (input !== null) {
                            const valStr = input.trim() || '1d';
                            // まずは数字のみかをチェック
                            let addMs = 0;
                            let displayStr = "";
                            if (/^\d+$/.test(valStr)) {
                              addMs = parseInt(valStr, 10) * 24 * 60 * 60 * 1000;
                              displayStr = `${valStr}日 `;
                            } else {
                              // d, h, m の各要素を取り出す
                              const dMatch = valStr.match(/(\d+)d/i);
                              const hMatch = valStr.match(/(\d+)h/i);
                              const mMatch = valStr.match(/(\d+)m/i);

                              if (!dMatch && !hMatch && !mMatch) return alert("😿 入力形式が正しくありません。(例: 1d12h30m, 3d, 3)");

                              const d = dMatch ? parseInt(dMatch[1], 10) : 0;
                              const h = hMatch ? parseInt(hMatch[1], 10) : 0;
                              const m = mMatch ? parseInt(mMatch[1], 10) : 0;

                              addMs = (d * 24 * 60 * 60 * 1000) + (h * 60 * 60 * 1000) + (m * 60 * 1000);

                              if (d > 0) displayStr += `${d}日 `;
                              if (h > 0) displayStr += `${h}時間 `;
                              if (m > 0) displayStr += `${m}分 `;
                            }

                            const currentDeadline = currentSurvey.deadline ? new Date(currentSurvey.deadline) : new Date();
                            currentDeadline.setTime(currentDeadline.getTime() + addMs);

                            const newIso = currentDeadline.toISOString();

                            const { error } = await supabase.from('surveys').update({ deadline: newIso }).eq('id', currentSurvey.id);
                            if (!error) {
                              setCurrentSurvey({ ...currentSurvey, deadline: newIso });
                              setIsTimeUp(currentDeadline < new Date());
                              alert(`⏳ ${displayStr.trim()} 延長しました！`);
                            } else {
                              alert("😿 延長に失敗しました");
                            }
                          }
                        }}>⏳ 延長する</button>
                      )}
                      <button className="delete-survey-btn" onClick={() => handleDeleteSurvey(currentSurvey.id)}>🗑️ 削除{isAdmin && currentSurvey.user_id !== user.id && ' (管理)'}</button>
                    </>
                  )}
                </div>
                <AdSenseBox slot="detail_after_votes_placeholder" affiliateType="amazon" />
                {user && (currentSurvey.user_id === user.id || isAdmin) && (
                  <div className="owner-visibility-panel">
                    <span className="owner-vis-label">🔒 公開設定変更{isAdmin && currentSurvey.user_id !== user.id && ' (管理)'}:</span>
                    <div className="visibility-selector">
                      {[{ val: 'public', label: '🌐 公開' }, { val: 'limited', label: '🔗 限定公開' }, { val: 'private', label: '🔒 非公開' }].map(v => (
                        <button key={v.val}
                          className={`vis-btn ${currentSurvey.visibility === v.val ? 'active' : ''}`}
                          onClick={() => handleUpdateVisibility(v.val)}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button className="back-to-list-link" onClick={() => navigateTo('list')}>← 戻る</button>

                {/* 💬 コメント（掲示板）セクションル */}
                <div className="comments-section-area">
                  <h3 className="comments-title">💬 みんなのコメント</h3>

                  {/* 投稿フォームル */}
                  <div className="comment-form-card">
                    <input
                      type="text"
                      placeholder="名無し"
                      value={commentName}
                      onChange={e => setCommentName(e.target.value)}
                      className="comment-name-input"
                      autoComplete="off"
                      name="comment-author-name-random-str"
                    />
                    <textarea
                      placeholder="コメントを書いてね！みんなでワイワイ話そう🐰✨"
                      value={commentContent}
                      onChange={e => setCommentContent(e.target.value)}
                      className="comment-textarea"
                    />
                    <button
                      className="comment-submit-btn"
                      onClick={handlePostComment}
                      disabled={isPostingComment}
                    >
                      {isPostingComment ? '送信中...' : 'コメントを投稿する'}
                    </button>
                  </div>

                  {/* コメントリストル */}
                  <div className="comments-list">
                    {/* 📄 コメントのページネーションロジック */}
                    {(() => {
                      const itemsPerPage = 5; // 5件ごとにページを分けるよ！🐰✨
                      const totalPages = Math.ceil(comments.length / itemsPerPage);
                      const startIndex = (currentCommentPage - 1) * itemsPerPage;
                      const paginatedComments = comments.slice(startIndex, startIndex + itemsPerPage);

                      return (
                        <>
                          {paginatedComments.length > 0 ? paginatedComments.map((c, localIdx) => {
                            const index = startIndex + localIdx;
                            return (
                              <div key={c.id} className={`comment-item-card ${c.user_name?.includes('らび🐰') ? 'comment-labi' : ''}`}>
                                <div className="comment-item-header">
                                  <div className="comment-author-wrap">
                                    <span className="comment-res-num" onClick={() => {
                                      setCommentContent(prev => prev + `>>${comments.length - index} `);
                                    }}>
                                      {comments.length - index}
                                    </span>
                                    <span className="comment-author">👤 {c.user_name}</span>
                                    {myCommentKeys[c.id] && (
                                      <span className="my-comment-badge" title="このブラウザで投稿した内容です（ログイン不要で修正・削除が可能）">
                                        ★ あなたの投稿
                                      </span>
                                    )}
                                  </div>
                                  <span className="comment-date">{new Date(c.created_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {editingCommentId === c.id ? (
                                  <div className="comment-edit-form">
                                    <textarea
                                      className="comment-edit-textarea"
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                    />
                                    <div className="comment-edit-actions">
                                      <button className="comment-edit-save" onClick={handleUpdateComment} disabled={isActionLoading}>保存</button>
                                      <button className="comment-edit-cancel" onClick={() => setEditingCommentId(null)}>キャンセル</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`comment-item-body ${c.content === '[[DELETED]]' ? 'deleted-text' : ''}`}>
                                    {c.content === '[[DELETED]]' ? (
                                      <span style={{ color: '#ef4444', fontWeight: '500' }}>⚠️ このコメントは削除されました。</span>
                                    ) : (
                                      renderCommentContent(c.content)
                                    )}
                                  </div>
                                )}

                                {c.content !== '[[DELETED]]' && (
                                  <div className="comment-footer-row">
                                    <div className="comment-reactions">
                                      <button
                                        className={`reaction-btn up ${myReactions[`${c.id}_up`] ? 'active' : ''}`}
                                        onClick={() => handleReaction(c.id, 'up')}
                                      >
                                        👍 {c.reactions?.up || 0}
                                      </button>
                                      <button
                                        className={`reaction-btn down ${myReactions[`${c.id}_down`] ? 'active' : ''}`}
                                        onClick={() => handleReaction(c.id, 'down')}
                                      >
                                        👎 {c.reactions?.down || 0}
                                      </button>
                                      {user && (
                                        <button className="comment-report-btn" onClick={() => handleReportContent('コメント', c.id, c.content.slice(0, 30), `アンケート: ${currentSurvey.title}\nレス番号: ${comments.length - index}`)} style={{
                                          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px'
                                        }}>🚩</button>
                                      )}
                                    </div>
                                    {(myCommentKeys[c.id] || isAdmin) && !editingCommentId && (
                                      <div className="comment-owner-actions">
                                        {myCommentKeys[c.id] && <button className="comment-owner-edit" onClick={() => startEditComment(c)}>修正</button>}
                                        <button className="comment-owner-delete" onClick={() => handleDeleteComment(c.id)}>削除{isAdmin && !myCommentKeys[c.id] && ' (管理)'}</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }) : (
                            <div className="no-comments-msg">まだコメントはないよ。一番乗りで書いてみない？🐰🥕</div>
                          )}

                          <Pagination
                            current={currentCommentPage}
                            total={totalPages}
                            onPageChange={(p) => {
                              setCurrentCommentPage(p);
                              const target = document.querySelector('.comments-section-area');
                              if (target) {
                                target.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Sidebar />
        </div>
      </div>

      {/* 🏁 プレミアムフッター復元 */}
      {(view === 'list' || view === 'details') && (
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
            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ec4899', fontWeight: 'bold' }}>🐰 らびと「おりぴ」を応援する 🥕</p>
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
      )}

      {/* 📖 各種モーダル復元 */}
      {showingTerms && (
        <div className="modal-overlay" onClick={() => setShowingTerms(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📖 利用規約</h3>
            <div className="modal-body">
              <p>アンケート広場をご利用いただきありがとうございます。以下の規約をよくお読みになり、同意の上でご利用ください。</p>
              <ul>
                <li>他のユーザーが不快になるような内容の投稿はご遠慮ください。</li>
                <li>誹謗中傷・差別的な表現・違法なコンテンツの投稿は禁止です。</li>
                <li>不適切と判断された投稿は、予告なく削除することがあります。</li>
                <li>終了したアンケートデータは、締切後7日で自動的に完全削除されます。</li>
                <li>本サービスは予告なく内容を変更・終了する場合があります。</li>
                <li>本サービスの利用によって生じたいかなる損害についても、運営は責任を負いません。</li>
              </ul>
            </div>
            <button onClick={() => setShowingTerms(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}
      {showingPrivacy && (
        <div className="modal-overlay" onClick={() => setShowingPrivacy(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📄 プライバシーポリシー</h3>
            <div className="modal-body">
              <p>当サービスは、以下の方針に基づき個人情報を取り扱います。</p>
              <ul>
                <li><strong>収集する情報：</strong>Googleアカウントでログインした場合、お名前・メールアドレス・プロフィール画像URLを取得します。</li>
                <li><strong>利用目的：</strong>取得した情報はアンケート機能の提供・改善のためにのみ使用します。</li>
                <li><strong>第三者への提供：</strong>法令に基づく場合を除き、個人情報を第三者に提供することはありません。</li>
                <li><strong>Cookie・広告：</strong>当サイトではGoogle AdSenseを使用しています。広告配信に際してCookieが使用される場合があります。詳細は<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Googleのプライバシーポリシー</a>をご確認ください。</li>
                <li><strong>お問い合わせ：</strong>個人情報の取り扱いに関するご質問は、お問い合わせフォームよりご連絡ください。</li>
              </ul>
            </div>
            <button onClick={() => setShowingPrivacy(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}
      {showingAbout && (
        <div className="modal-overlay" onClick={() => setShowingAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🌟 アンケート広場について</h3>
            <div className="modal-body">
              <p>アンケート広場は、誰でも簡単にアンケートを作って、みんなに投票してもらえる参加型サービスです。</p>
              <ul>
                <li>🗳️ ログインなしでも投票できます</li>
                <li>🔒 Googleログインでマイアンケートの管理ができます</li>
                <li>⭐ 気になるアンケートをウォッチリストに追加できます</li>
                <li>🕒 締切時間を設定したアンケートも作れます</li>
                <li>🏷️ カテゴリ別に絞り込んで見ることができます</li>
                <li>🗑️ 終了したアンケートは、公平を期すために<span style={{ fontWeight: 'bold' }}>締切から7日後</span>に自動的に削除されます</li>
              </ul>
              <p>みんなの「ちょっと気になる」を気軽に集められる場所です。ぜひ楽しく使ってください！🌈</p>
            </div>
            <button onClick={() => setShowingAbout(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}
      {showingContact && (
        <div className="modal-overlay" onClick={() => setShowingContact(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📩 お問い合わせ</h3>
            <div className="modal-body">
              <p>削除依頼・不具合報告・ご意見などは、下記よりお気軽にご連絡ください。</p>
              <div className="contact-form-item">
                <label>お問い合わせ種別</label>
                <select className="contact-select" value={contactType} onChange={e => setContactType(e.target.value)}>
                  <option>削除依頼</option>
                  <option>不具合報告</option>
                  <option>ご意見・ご要望</option>
                  <option>その他</option>
                </select>
              </div>
              <div className="contact-form-item">
                <label>メールアドレス（返信希望の場合）</label>
                <input className="contact-input" type="email" placeholder="example@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
              <div className="contact-form-item">
                <label>内容</label>
                <textarea className="contact-textarea" placeholder="お問い合わせ内容をご記入ください..." value={contactMessage} onChange={e => setContactMessage(e.target.value)} />
              </div>
              <p className="contact-notice">※ 自動返信はありません。返信が必要な場合はメールアドレスをご記入ください。</p>
            </div>
            <div className="modal-actions-contact">
              <button
                className="send-btn"
                onClick={handleSubmitInquiry}
                disabled={isSendingInquiry}
              >{isSendingInquiry ? '⌛ 送信中...' : '📧 送信する'}</button>
              <button className="cancel-btn" onClick={() => setShowingContact(false)} disabled={isSendingInquiry}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
