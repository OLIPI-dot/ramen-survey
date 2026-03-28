import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
// Deploy Kick: 2026-03-26 18:45 🚀🐰 (Category Fix Forced)
import { createClient } from '@supabase/supabase-js';
import FooterModals from './components/FooterModals';
import AnimatedCounter from './components/AnimatedCounter';
import {
  ADMIN_EMAILS,
  NG_WORDS,
  hasNGWord,
  DEFAULT_SURVEY_IMAGE,
  LABI_RESPONSES,
  CATEGORY_ICON_STYLE,
  BASE_CATEGORIES,
  FILTER_CATEGORIES,
  STAMPS,
  VIEW_COOLDOWN_MS,
  SUBMISSION_COOLDOWN_MS,
  SCORE_VOTE_WEIGHT
} from './constants';
import './App.css';

// 🚀 コード分割（遅延読み込み）で初期ロードを高速化らび！
const Sidebar = lazy(() => import('./components/Sidebar'));
const SurveyListView = lazy(() => import('./components/SurveyListView'));
const SurveyDetailView = lazy(() => import('./components/SurveyDetailView'));
const SiteConceptSection = lazy(() => import('./components/SiteConceptSection'));
const AdSenseBox = lazy(() => import('./components/AdSenseBox'));
const CountdownTimer = lazy(() => import('./components/CountdownTimer'));

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🚀 Last Deploy: 2026-03-26 18:48:00 (Force Refresh for Category Logic)

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




function App() {
  const [view, setView] = useState('list');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [surveys, setSurveys] = useState([]);
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
  const [lastReactionEvent, setLastReactionEvent] = useState(null); // 📡 リアルタイム・エフェクト用らび！
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalOfficialCount, setTotalOfficialCount] = useState(0); // 📊 公式の総件数
  const [totalUserCount, setTotalUserCount] = useState(0); // 📊 ユーザー投稿の総件数
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
  const [searchStats, setSearchStats] = useState({ categories: {}, official: 0, user: 0, sortModes: { today: 0, latest: 0, ended: 0, popular: 0 } }); // 🔍 検索ヒット数統計
  const [adjacentSurveys, setAdjacentSurveys] = useState({ prev: null, next: null }); // 🔍 前後のアンケート

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


  const [currentCommentPage, setCurrentCommentPage] = useState(1); // 💬 コメント用ページネーション
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagEditValue, setTagEditValue] = useState('');
  const isVotingProcessingRef = useRef(false); // 🛡️ 投票中の連打ガード

  // 📡 リアルタイム人数
  const [globalOnlineCount, setGlobalOnlineCount] = useState(1);
  const manualUpdatesRef = useRef({}); // 🛡️ { [surveyId]: timestamp } アンケートごとの更新ガード
  const [surveyOnlineCount, setSurveyOnlineCount] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortMode, searchQuery, filterCategory, filterTag, popularMode]);

  // ▼ページネーションUIコンポーネント (メモ化してパフォーマンス向上らび！✨)
  const Pagination = useCallback(({ current, total, onPageChange }) => {
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
      <nav className="pagination-container" aria-label="ページ選択" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '32px', marginBottom: '16px', width: '100%' }}>
        <button 
          onClick={() => { onPageChange(Math.max(1, current - 1)); }} 
          disabled={current === 1} 
          aria-label="前のページへ"
          style={{ background: 'none', border: 'none', cursor: current === 1 ? 'default' : 'pointer', color: current === 1 ? '#cbd5e1' : '#475569', fontSize: '1.2rem', padding: '4px 8px' }}
        >
          &lt;
        </button>
        {pages.map((p, i) => (
          <button 
            key={i} 
            onClick={() => { if (p !== '...') { onPageChange(p); } }} 
            disabled={p === '...'} 
            aria-label={p === '...' ? undefined : `${p}ページ目`}
            aria-current={p === current ? 'page' : undefined}
            style={{ background: p === current ? '#8b5cf6' : 'none', color: p === current ? '#fff' : (p === '...' ? '#94a3b8' : '#475569'), border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p === '...' ? 'default' : 'pointer', fontWeight: p === current ? 'bold' : 'normal', fontSize: '1rem', transition: 'all 0.2s', boxShadow: p === current ? '0 2px 4px rgba(139,92,246,0.3)' : 'none' }}
          >
            {p}
          </button>
        ))}
        <button 
          onClick={() => { onPageChange(Math.min(total, current + 1)); }} 
          disabled={current === total} 
          aria-label="次のページへ"
          style={{ background: 'none', border: 'none', cursor: current === total ? 'default' : 'pointer', color: current === total ? '#cbd5e1' : '#475569', fontSize: '1.2rem', padding: '4px 8px' }}
        >
          &gt;
        </button>
      </nav>
    );
  }, []);

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
        if (!currentSurvey?.id) return;
        console.log("🔄 initDetailView: Fetching details for survey:", currentSurvey.id);
        
        // 1. オプションと投票状況の取得
        const { data: optData, error: optError } = await supabase.from('options').select('*').eq('survey_id', currentSurvey.id).order('id', { ascending: true });
        if (optError) {
          console.error("❌ initDetailView: Error fetching options:", optError);
        } else if (optData) {
          const sId = String(currentSurvey.id);
          const lastUpdate = manualUpdatesRef.current[sId];
          if (lastUpdate && Date.now() - lastUpdate < 15000) {
            console.log("🛡️ initDetailView: Guarding options against stale DB data for survey:", sId);
            // 🗳️ 直近で投票された場合は、DBから来た「古い0票」で上書きしないらび！
          } else {
            console.log("✅ initDetailView: Fetched options count:", optData.length);
            setOptions(optData);
          }
        }
        
        const voted = localStorage.getItem(`voted_survey_${currentSurvey.id}`);
        console.log("🗳️ initDetailView: Voted status:", voted);
        setVotedOption(voted);

        // 2. コメントの取得
        const { data: commData, error: commError } = await supabase
          .from('comments')
          .select('*')
          .eq('survey_id', currentSurvey.id)
          .order('created_at', { ascending: false });
        if (!commError) setComments(commData);
        else console.error("❌ initDetailView: Error fetching comments:", commError);

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

  // 🖱️ 検索・ページ以外のフィルタが変わった時は、リストの先頭に戻って見やすくするらび！

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
      setOptions([]);
      setVotedOption(null);
      
      // 🔗 URLを /s/ID 形式に統一するらび！
      const normalizedPath = `/s/${sv.id}`;
      if (window.location.pathname !== normalizedPath || window.location.search.includes('s=')) {
        console.log("🔗 loadFromUrl: Normalizing URL to", normalizedPath);
        window.history.replaceState({ view: 'details', surveyId: sv.id }, '', normalizedPath);
      } else {
        window.history.replaceState({ view: 'details', surveyId: sv.id }, '', window.location.href);
      }

      setView('details');
      setAdjacentSurveys({ prev: null, next: null }); // リセット
      
      // 🏆 オプションと前後アンケートを並行して取得するらび！
      (async () => {
        try {
          const [{ data: preOpts }, { data: pData }, { data: nData }] = await Promise.all([
            supabase.from('options').select('*').eq('survey_id', sv.id).order('id', { ascending: true }),
            supabase.from('surveys').select('*').eq('visibility', 'public').lt('created_at', sv.created_at).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('surveys').select('*').eq('visibility', 'public').gt('created_at', sv.created_at).order('created_at', { ascending: true }).limit(1).maybeSingle()
          ]);
          if (preOpts) setOptions(preOpts);
          setAdjacentSurveys({ prev: pData, next: nData });
        } catch (fetchErr) {
          console.error("❌ loadFromUrl: Fetching options/adjacent failed:", fetchErr);
        }
      })();
      
      setVotedOption(localStorage.getItem(`voted_survey_${sv.id}`));
    } catch (err) {
      console.error("❌ loadFromUrl CRASHED:", err);
    } finally {
      if (urlTimeoutId) clearTimeout(urlTimeoutId);
      setIsLoading(false);
    }
  };

  // 📥 アンケートデータを取得する (サーバーサイド・ページネーション & フィルタ対応)
  const fetchSurveys = async (currentUser, silent = false, page = 1, category = null, query = '', currentTab = 'official', sort = 'latest', pop = 'trending') => {
    const isFirstLoad = !silent && page === 1 && !category && !query && currentTab === 'official' && sort === 'latest';
    
    if (!silent) {
       setIsLoading(true);
       safetyTimeoutId = setTimeout(() => {
         console.warn("⚠️ fetchSurveys: Safety timeout triggered (10s). Forcing isLoading=false.");
         setIsLoading(false);
       }, 10000);
    }

    try {
      let sData = null;
      let sError = null;
      let count = 0;

      // 🚀 Early Fetch (index.htmlで開始したリクエスト) を活用するらび！
      if (isFirstLoad && window.__INITIAL_DATA_PROMISE__) {
        console.log("⚡ fetchSurveys: Using EARLY FETCH data from window.__INITIAL_DATA_PROMISE__");
        sData = await window.__INITIAL_DATA_PROMISE__;
        window.__INITIAL_DATA_PROMISE__ = null; // 一度使ったらクリア
        count = sData ? sData.length : 0; // 暫定カウント
      }
      const isActuallyAdmin = currentUser && ADMIN_EMAILS.includes(currentUser.email);
      const ITEMS_PER_PAGE = 15;
      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      console.log(`🔍 fetchSurveys: STAGE 1 - Fetching page ${page} (range: ${start}-${end}, sort: ${sort}, query: "${query}")...`);
      
      // 1. 公開アンケートの取得（フィルタ適用）
      let baseQuery = supabase.from('surveys').select('*', { count: 'exact' }).eq('visibility', 'public');
      
      // 🏷️ カテゴリフィルタ（カテゴリが選ばれている時は、検索中であってもそのカテゴリ内を探すのが自然らびに！）
      if (category && category !== 'すべて') {
        baseQuery = baseQuery.eq('category', category);
      }
      
      // 📢 タブフィルタ (公式 vs ユーザー投稿)
      // ⚡ 検索中（文字が入っている時）は、見逃しを防ぐために全タブから探すようにするらび！
      // それ以外の通常時は、今見ているタブの設定をしっかり守るらびに。
      if (currentTab === 'official') {
        baseQuery = baseQuery.eq('is_official', true);
      } else if (currentTab === 'user') {
        baseQuery = baseQuery.eq('is_official', false);
      }

      // 🔍 検索クエリの適用
      if (query.trim()) {
        const q = query.trim();
        // タイトル、説明文、またはタグ配列に含まれる場合
        baseQuery = baseQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{"${q}"}`);
      }

      // 🕒 日付・状態フィルタ (今日の話題 / アーカイブ)
      const now = new Date();
      if (sort === 'today') {
        // 「今日の話題」は、今日（0時0分以降）に投稿されたアクティブなものを出すのが筋らび！ 1週間前のが出ないように確実にガードするらび。
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        baseQuery = baseQuery.gte('created_at', todayStart.toISOString());
        // 終了していないもの
        baseQuery = baseQuery.or(`deadline.is.null,deadline.gt.${now.toISOString()}`);
      } else if (sort === 'ended') {
        // 30日経過 or 期限切れ
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        baseQuery = baseQuery.or(`deadline.lt.${now.toISOString()},created_at.lt.${thirtyDaysAgo.toISOString()}`);
      }

      // 📈 ソート順の適用
      if (sort === 'popular') {
        baseQuery = baseQuery.order('total_votes', { ascending: false });
      } else {
        // デフォルトは新着順
        baseQuery = baseQuery.order('created_at', { ascending: false });
      }

      if (!sData) {
        const { data, error, count: c } = await baseQuery.range(start, end);
        sData = data;
        sError = error;
        count = c;
      }
      
      if (sError) console.error("❌ fetchSurveys: PUBLIC FETCH ERROR:", sError);
      if (sData) {
        console.log(`✅ fetchSurveys: Fetched ${sData.length} surveys for query "${query}". Total matching count: ${count}`);
        if (query && sData.length === 0) {
          console.warn("⚠️ fetchSurveys: Search returned 0 results for:", query);
        }
      // 📊 タブのカウント表示を同期するらび！
      if (!query.trim()) {
        (async () => {
          // 💡 現在のソートやカテゴリの条件を、カウント用クエリにも反映させるらび！
          const getCountQuery = (isOff) => {
            let q = supabase.from('surveys').select('*', { count: 'exact', head: true }).eq('visibility', 'public').eq('is_official', isOff);
            if (category && category !== 'すべて') q = q.eq('category', category);
            
            const now = new Date();
            if (sort === 'today') {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              q = q.gte('created_at', todayStart.toISOString());
              q = q.or(`deadline.is.null,deadline.gt.${now.toISOString()}`);
            } else if (sort === 'ended') {
              const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              q = q.or(`deadline.lt.${now.toISOString()},created_at.lt.${thirtyDaysAgo.toISOString()}`);
            }
            return q;
          };

          const [{ count: offCount }, { count: uCount }] = await Promise.all([
            getCountQuery(true),
            getCountQuery(false)
          ]);
          setTotalOfficialCount(offCount || 0);
          setTotalUserCount(uCount || 0);
          console.log(`🔢 Filtered Counts Updated: Official(${offCount}), User(${uCount}) [Sort: ${sort}, Cat: ${category}]`);
        })();
      }
      }

      // ログイン中なら自分の非公開/限定公開アンケートも別枠で取得（とりあえず最新20件）
      let mine = [];
      if (currentUser && page === 1 && !category && !query) {
        console.log("🔍 fetchSurveys: STAGE 2 - Fetching private/limited surveys for user:", currentUser.id);
        let mQuery = supabase.from('surveys').select('*').neq('visibility', 'public');
        if (!isActuallyAdmin) {
          mQuery = mQuery.eq('user_id', currentUser.id);
        }
        const { data: mData, error: mError } = await mQuery.order('id', { ascending: false }).limit(20);
        if (mError) console.error("❌ fetchSurveys: PRIVATE FETCH ERROR:", mError);
        if (mData) mine = mData;
      }

      // 🛡️ 重複排除 & 合体
      const uniqueMap = new Map();
      [...mine, ...(sData || [])].forEach(s => {
        if (s && s.id) uniqueMap.set(String(s.id), s);
      });
      const allSurveys = Array.from(uniqueMap.values());

      if (allSurveys.length > 0) {
        const updatedList = allSurveys.map(s => {
          let isOfficialPattern = s.is_official === true;
          const isLegacy = new Date(s.created_at) < new Date('2026-03-19T00:00:00Z');
          
          if (isLegacy && !isOfficialPattern) {
            const hasOfficialTag = s.tags && s.tags.some(tag => ['お知らせ', 'ニュース', '話題', '速報', '注目', '2chまとめアンテナ'].includes(tag) || tag.includes('トピックス') || tag.includes('新聞'));
            const hasOfficialTitle = s.title && /^(【.*?】|「.*?」)/.test(s.title);
            if (hasOfficialTag || hasOfficialTitle) isOfficialPattern = true;
          }

          // 💡 カテゴリの正規化（存在しない古いカテゴリを適切に読み替えるらび！）
          const isStandardCategory = BASE_CATEGORIES.includes(s.category);
          const effectiveCategory = isStandardCategory
                                   ? s.category 
                                   : ((s.title || '').includes('【コラム】') ? 'コラム' : 
                                      (s.title || '').includes('【レビュー】') ? 'レビュー' :
                                      (s.title || '').includes('【ネタ】') ? 'ネタ' : (s.category || 'その他'));

          return {
            ...s,
            category: effectiveCategory,
            is_official: isOfficialPattern,
            total_votes: s.total_votes ?? 0,
            likes_count: s.likes_count ?? 0,
            view_count: s.view_count ?? 0,
            comment_count: s.comment_count ?? 0
          };
        });

        // 🛡️ Flicker Guard: currentSurvey の合計票数も守るらび！
        setCurrentSurvey(prev => {
          if (!prev) return null;
          const sId = String(prev.id);
          const lastUpdate = manualUpdatesRef.current[sId];
          if (lastUpdate && Date.now() - lastUpdate < 15000) {
             // 🗳️ 投票直後は、DBから来た古いtotal_votesで上書きしない！
             const latest = updatedList.find(s => String(s.id) === sId);
             return latest ? { ...latest, total_votes: prev.total_votes } : prev;
          }
          const latest = updatedList.find(s => String(s.id) === sId);
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
      if (!silent) setIsLoading(false);
    }
  };

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
          setOptions([]); // お掃除らび！
          setVotedOption(null); // お掃除らび！
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

      // ⚡ ラグ解消のため、即座に表示を切り替えるらび！
      setView('details');
      setTimeout(() => window.scrollTo(0, 0), 10);

      // 🔗 履歴に「詳細だよ！」という確実なラベルを貼るらび！
      window.history.pushState({ view: 'details', surveyId: survey.id }, '', `/s/${survey.id}`);
      
      // 🏘️ 魔法の残り香をお掃除！新しいページを「真っ白」から始めるらび！
      setOptions([]);
      setVotedOption(null);
      setCurrentSurvey(survey);
      setAdjacentSurveys({ prev: null, next: null }); // 前後も一旦リセット
      setIsTimeUp(survey.deadline && new Date(survey.deadline) < new Date());

      console.log("🚀 navigateTo: Navigating to details for survey:", survey.id);

      // 🏆 非同期で続きを取得するらび！（これでラグが消えるよ！）
      (async () => {
        // 💫 もし渡されたアンケートデータが不完全（id, titleしかない等）なら、ここで情報を補完するらび！
        if (!survey.created_at || survey.youtube_id === undefined) {
           const { data: fullSv } = await supabase.from('surveys').select('*').eq('id', survey.id).single();
           if (fullSv) {
             setCurrentSurvey(fullSv);
             survey = fullSv; // 以降の処理（前後取得）のために更新
             setIsTimeUp(fullSv.deadline && new Date(fullSv.deadline) < new Date());
           }
        }

        // 1. オプションの取得
        const { data: preOpts } = await supabase.from('options').select('*').eq('survey_id', survey.id).order('id', { ascending: true });
        if (preOpts) {
          setOptions(preOpts);
        }
        setVotedOption(localStorage.getItem(`voted_survey_${survey.id}`));

        // 2. 前後のアンケートを取得（回遊性アップらび！）
        try {
          const [prevRes, nextRes] = await Promise.all([
            supabase.from('surveys').select('*').eq('visibility', 'public').lt('created_at', survey.created_at).order('created_at', { ascending: false }).limit(1).maybeSingle(),
            supabase.from('surveys').select('*').eq('visibility', 'public').gt('created_at', survey.created_at).order('created_at', { ascending: true }).limit(1).maybeSingle()
          ]);
          setAdjacentSurveys({ prev: prevRes.data, next: nextRes.data });
        } catch (err) {
          console.error("❌ Failed to fetch adjacent surveys:", err);
        }
      })();

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
          } else if (serverCount !== undefined) {
             const mapper = s => String(s.id) === String(survey.id) ? { ...s, view_count: serverCount } : s;
             setSurveys(prev => prev.map(mapper));
             setPopularSurveys(prev => prev.map(mapper));
             setCurrentSurvey(prev => prev && String(prev.id) === String(survey.id) ? { ...prev, view_count: serverCount } : prev);
          }
        })();
      }
      return; // ⚡ これ以降の setView は不要らび！
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

  // 🔄 検索クエリの連打（ガタつき）を防ぐためのデバウンス処理らび！
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms待ってから反映するらび！
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 🔍 検索時に「どこに何件あるか」をサクッと調査する魔法
  useEffect(() => {
    async function fetchSearchDiscovery() {
      if (!debouncedSearchQuery.trim()) {
        setSearchStats({ categories: {}, official: 0, user: 0, sortModes: { today: 0, latest: 0, ended: 0, popular: 0 } });
        return;
      }
      
      const q = debouncedSearchQuery.trim();
      // ⚡ 検索時は、まず全体（全タブ・全期間）からHIT数を確認するらび！
      let dQuery = supabase.from('surveys').select('category, is_official, created_at, deadline, title, description').eq('visibility', 'public');
      dQuery = dQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      
      const { data, error } = await dQuery;
      if (!error && data) {
        const now = new Date();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const stats = data.reduce((acc, s) => {
          const cat = s.category || 'その他';
          acc.categories[cat] = (acc.categories[cat] || 0) + 1;
          acc.categories['すべて'] = (acc.categories['すべて'] || 0) + 1;
          
          if (s.is_official) acc.official++;
          else acc.user++;
          
          const createdAt = new Date(s.created_at);
          const dline = s.deadline ? new Date(s.deadline) : null;
          
          // 📅 各ソートモードでのカウント
          if (createdAt >= todayStart) acc.sortModes.today++;
          if (dline && dline < now) acc.sortModes.ended++;
          else {
            // 受付中なら新着・人気にも入る
            acc.sortModes.latest++;
            acc.sortModes.popular++;
          }
          
          return acc;
        }, { categories: {}, official: 0, user: 0, sortModes: { today: 0, latest: 0, ended: 0, popular: 0 } });
        setSearchStats(stats);

        // 📝 検索中はタブの数字もこれに合わせるらび！
        setTotalOfficialCount(stats.official);
        setTotalUserCount(stats.user);
      }
    }
    fetchSearchDiscovery();
  }, [debouncedSearchQuery]);

  // 🔄 ページやフィルタが変わったら再取得するらび！（リアルタイム監視も兼ねる）
  useEffect(() => {
    // 初回・変更時の取得
    fetchSurveys(user, false, currentPage, filterCategory, debouncedSearchQuery, activeTab, sortMode, popularMode);

    // 📡 リアルタイム監視
    const ch = supabase.channel('global-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'surveys' }, () => {
        fetchSurveys(user, true, currentPage, filterCategory, debouncedSearchQuery, activeTab, sortMode, popularMode);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, currentPage, filterCategory, debouncedSearchQuery, activeTab, sortMode, popularMode]);


  // 📡 サイドバー用の派生データ（DBリクエストを節約するためにステートから計算！）
  const { liveSurveys_derived, popularSurveys_derived, endingSoonSurveys_derived } = useMemo(() => {
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // surveys ステートには現在のページの 15件しかない可能性があるので、
    // サイドバーには全件を見せたいけど、とりあえず手元の surveys から計算するらび（爆速化のため）
    // もし全件から計算したいなら、別途 sidebar 用に 30件だけ取得する refreshSidebar を残してもいいけど、
    // 今は負荷軽減を最優先するらび！
    const regular = surveys.filter(s => s.visibility === 'public' && !s.tags?.includes('お知らせ'));

    return {
      liveSurveys_derived: [...regular].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10),
      popularSurveys_derived: [...regular].sort((a, b) => {
        const scoreA = (a.total_votes || 0) * SCORE_VOTE_WEIGHT + (a.view_count || 0);
        const scoreB = (b.total_votes || 0) * SCORE_VOTE_WEIGHT + (b.view_count || 0);
        return scoreB - scoreA;
      }).slice(0, 10),
      endingSoonSurveys_derived: [...regular]
        .filter(s => s.deadline && new Date(s.deadline) > now && new Date(s.deadline) <= next24h)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    };
  }, [surveys]);

  // 旧 refreshSidebar はお役御免らび！
  // useEffect(() => { refreshSidebar(); }, []);

  const handleStartSurvey = async () => {
    // 🛡️ 暴発防止ガード: 明示的に view が 'create' の時だけ動くようにするらび！
    if (view !== 'create') {
      console.warn("🚫 handleStartSurvey: Blocked because view is not 'create'. Current view:", view);
      return;
    }
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
    if (isVotingProcessingRef.current) return; // 🛡️ 魔法の最中は受け付けないらび！
    const targetId = typeof optionId === 'object' ? optionId.id : optionId;
    const option = options.find(o => o.id === targetId);
    if (!option || isTimeUp || votedOption) return;

    isVotingProcessingRef.current = true; // 🚧 ガード開始！

    // 🏎️ 楽観的UI更新: 瞬時に反映させるらび！
    localStorage.setItem(`voted_survey_${currentSurvey.id}`, String(option.id));
    setVotedOption(String(option.id));

    const currentTotal = (currentSurvey.total_votes || 0) + 1;
    const updatedOptions = options.map(o => o.id === option.id ? { ...o, votes: (o.votes || 0) + 1 } : o);
    const updatedSurvey = {
      ...currentSurvey,
      total_votes: currentTotal,
      options: updatedOptions
    };

    setOptions(updatedOptions);
    setCurrentSurvey(updatedSurvey);
    const mapper = s => String(s.id) === String(currentSurvey.id) ? updatedSurvey : s;
    setSurveys(prev => prev.map(mapper));
    setPopularSurveys(prev => prev.map(mapper));

    // 📊 GA4 キーイベント: 投票成功！らび！
    if (window.gtag) {
      window.gtag('event', 'vote_survey', {
        'survey_id': currentSurvey.id,
        'survey_title': currentSurvey.title,
        'option_name': option.name || option.text
      });
    }

    // 🛡️ ガード開始 (15秒間、DBの反映遅延による巻き戻りを防ぐらび！)
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now();

    // 🆙 裏側でDBへ反映（非同期）
    supabase.rpc('increment_survey_vote', {
      survey_id_arg: currentSurvey.id,
      option_id_arg: option.id
    }).then(({ data: serverTotal, error: voteError }) => {
      isVotingProcessingRef.current = false; // ✅ 終わったらガードを解くらび！
      if (voteError) {
        console.error("❌ Vote update error:", voteError);
      } else if (serverTotal !== undefined) {
        // 🏆 サーバーの最新合計値で最終同期
        const finalMapper = s => String(s.id) === String(currentSurvey.id) ? { ...s, total_votes: serverTotal } : s;
        setSurveys(prev => prev.map(finalMapper));
        setPopularSurveys(prev => prev.map(finalMapper));
        setCurrentSurvey(prev => prev && String(prev.id) === String(currentSurvey.id) ? { ...prev, total_votes: serverTotal } : prev);
      }
    });
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

  const handleSurveyReaction = async (stampId) => {
    if (!currentSurvey) return;

    // 🛡️ ガード開始 (15秒間ラグを防ぐ)
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now();

    // 1. 現在のタグから、該当するスタンプタグを探して更新
    let found = false;
    const currentTags = currentSurvey.tags || [];
    const newTags = currentTags.map(t => {
      if (t.startsWith(`_STAMP:${stampId}:`)) {
        found = true;
        const count = parseInt(t.split(':')[2]) || 0;
        return `_STAMP:${stampId}:${count + 1}`;
      }
      return t;
    });

    if (!found) {
      newTags.push(`_STAMP:${stampId}:1`);
    }

    // 2. 楽観的UI更新
    const updatedSurvey = { ...currentSurvey, tags: newTags };
    setCurrentSurvey(updatedSurvey);
    const mapper = s => String(s.id) === String(currentSurvey.id) ? updatedSurvey : s;
    setSurveys(prev => prev.map(mapper));
    setPopularSurveys(prev => prev.map(mapper));

    // 3. DB更新 (タグ更新と同じ権限設定が適用されるらび！)
    const { data, error } = await supabase.from('surveys').update({ tags: newTags }).eq('id', currentSurvey.id).select('tags');
    if (error) {
      console.error("❌ Stamp update error:", error);
    } else if (data && data.length > 0) {
      // 成功したら最新のタグで同期
      const finalSurvey = { ...currentSurvey, tags: data[0].tags };
      setCurrentSurvey(finalSurvey);
      const finalMapper = s => String(s.id) === String(currentSurvey.id) ? finalSurvey : s;
      setSurveys(prev => prev.map(finalMapper));

      // ✨ おりぴさんリクエスト: 「ふわっ」とアイコンが浮き出る演出を発火させるらび！
      setLastReactionEvent({ stampId, timestamp: Date.now() });
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

  // 🏷️ タグを更新する（だれでも編集可能だが、ロックされたタグは保護する）
  const handleUpdateTags = async () => {
    if (!currentSurvey || !user) return;
    manualUpdatesRef.current[String(currentSurvey.id)] = Date.now(); // 🛡️ ガード開始
    setIsActionLoading(true);

    const inputTags = tagEditValue.split(/[,、，\s\n]+/).map(t => t.trim()).filter(t => t !== "");
    // 🎨 スタンプタグを保護（通常の編集では見えないようにしつつ維持するらび！）
    const existingStamps = (currentSurvey.tags || []).filter(t => t.startsWith('_STAMP:'));
    let finalTags = [...inputTags, ...existingStamps];

    // 🔒 ロック管理
    if (!isAdmin && currentSurvey.user_id !== user.id) {
      // 一般ユーザーの場合：
      // 1. 既存のロックタグを強制的に維持する
      const existingLocked = (currentSurvey.tags || []).filter(t => t.startsWith('[L]'));
      existingLocked.forEach(lt => {
        if (!finalTags.includes(lt)) {
          finalTags.push(lt); // 消されてたら戻す
        }
      });
      // 2. 新しく [L] をつけることは禁止（勝手にロックさせない）
      finalTags = finalTags.map(t => t.startsWith('[L]') && !existingLocked.includes(t) ? t.replace(/^\[L\]/, '') : t);
    }

    const { data, error } = await supabase.from('surveys').update({ tags: finalTags }).eq('id', currentSurvey.id).select();
    setIsActionLoading(false);
    
    if (error) {
      console.error("Update tags error:", error);
      return alert('😿 タグの更新に失敗しました。');
    }
    if (!data || data.length === 0) {
      return alert('😿 タグ保存が反映されませんでした。');
    }

    const merged = { ...currentSurvey, ...data[0] };
    setCurrentSurvey(merged);
    setSurveys(prev => prev.map(s => String(s.id) === String(currentSurvey.id) ? { ...s, ...merged } : s));
    setIsEditingTags(false);
    alert('🏷️ タグを更新しましたらびっ！');
    fetchSurveys(user, true);
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

      // 🚀 動的インポートに変更して初期バンドルサイズを削減らび！
      const emailjsModule = await import('@emailjs/browser');
      const emailjs = emailjsModule.default;
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
      
      const emailjsModule = await import('@emailjs/browser');
      const emailjs = emailjsModule.default;
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
    
    // 🛡️ 公開設定による閲覧制限（プライベート等）
    base = base.filter(s => {
      if (s.visibility === 'private') {
        if (!user) return false;
        if (user.id !== s.user_id && !isAdmin) return false;
      }
      return true;
    });

    // 🔍 タグ絞り込み（サイドバーやタグクリック用）
    if (filterTag) {
      base = base.filter(s => s.tags?.includes(filterTag));
    }

    // 🕒 状態別の最終フィルタリング
    base = base.filter(s => {
      const isEnded = (s.deadline && new Date(s.deadline) < new Date()) || 
                      (new Date() - new Date(s.created_at) > 30 * 24 * 60 * 60 * 1000);

      // 通常リストでは終了したものを非表示（ただし検索中やウォッチ中、マイアンケートは除くらび！）
      if (isEnded && sortMode !== 'ended' && !filterTag && !debouncedSearchQuery.trim()) {
        if (sortMode === 'latest' || sortMode === 'today' || sortMode === 'popular') {
          return false;
        }
      }

      return true;
    });

    return base;
  }, [surveys, filterTag, sortMode, watchedIds, user, isAdmin, debouncedSearchQuery]);

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
              <Suspense fallback={<div className="survey-card" style={{ height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>⌛ 広場を読み込み中...</div>}>
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
                totalOfficialCount={totalOfficialCount}
                totalUserCount={totalUserCount}
                surveys={filteredBaseSurveys}
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
                debouncedSearchQuery={debouncedSearchQuery}
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
                searchStats={searchStats}
                baseCategories={BASE_CATEGORIES}
                  filterCategories={FILTER_CATEGORIES}
                />
              </Suspense>
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
                      {BASE_CATEGORIES.filter(cat => isAdmin || cat !== 'らび').map(cat => (
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
              <Suspense fallback={<div className="survey-card" style={{ height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>⌛ 詳細を読み込み中...</div>}>
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
                baseCategories={BASE_CATEGORIES}
                adjacentSurveys={adjacentSurveys}
                handleSurveyReaction={handleSurveyReaction}
                lastReactionEvent={lastReactionEvent}
                  STAMPS={STAMPS}
                />
              </Suspense>
            )}
          </div>

          <Suspense fallback={<div className="live-feed-sidebar" style={{ minWidth: '320px', background: 'rgba(255,255,255,0.5)', borderRadius: '24px', height: '100vh' }}></div>}>
            <Sidebar 
            liveSurveys={liveSurveys_derived}
            popularSurveys={popularSurveys_derived}
            endingSoonSurveys={endingSoonSurveys_derived}
            showAllEndingSoon={showAllEndingSoon}
            setShowAllEndingSoon={setShowAllEndingSoon}
            navigateTo={navigateTo}
            globalOnlineCount={globalOnlineCount}
            formatWithDay={formatWithDay}
              AnimatedCounter={AnimatedCounter}
            />
          </Suspense>
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
