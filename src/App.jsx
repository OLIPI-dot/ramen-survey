import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 🌟 アプリ全体で使うデフォルト画像（空欄のとき用）
// 指定のロゴ画像が読み込めないため、安定したオシャレな画像に戻します
const DEFAULT_SURVEY_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000';

// 日付と曜日を綺麗に表示する魔法
const formatWithDay = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');

  return `${y}/${m}/${d} (${day}) ${hh}:${mm}`;
};

function App() {
  const [view, setView] = useState('list'); // 'list', 'create', 'details'
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [votedOption, setVotedOption] = useState(null);

  // ライブ実況用の最新お題リスト
  const [liveSurveys, setLiveSurveys] = useState([]);
  const [popularSurveys, setPopularSurveys] = useState([]);
  const [isTotalVotes, setIsTotalVotes] = useState(0);

  // --- アンケート作成用のState ---
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyImage, setSurveyImage] = useState('');
  const [surveyCategory, setSurveyCategory] = useState(''); // 空にして「未選択」状態を作る
  const [setupOptions, setSetupOptions] = useState([]);

  // 表示モードとカテゴリフィルタ
  const [sortMode, setSortMode] = useState('latest');
  const [filterCategory, setFilterCategory] = useState('すべて');
  const [tempOption, setTempOption] = useState('');
  const [useTimer, setUseTimer] = useState(true);

  // ⭐ ウォッチ（お気に入り）機能の管理
  const [watchedIds, setWatchedIds] = useState(() => {
    return JSON.parse(localStorage.getItem('watched_surveys') || '[]');
  });

  const toggleWatch = (e, surveyId) => {
    e.stopPropagation(); // 詳細画面へ移動するのを防ぐ
    let newIds;
    if (watchedIds.includes(surveyId)) {
      newIds = watchedIds.filter(id => id !== surveyId);
    } else {
      newIds = [...watchedIds, surveyId];
    }
    setWatchedIds(newIds);
    localStorage.setItem('watched_surveys', JSON.stringify(newIds));
  };

  // 今の時刻を初期値にする魔法
  const getInitialDeadline = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };
  const [deadline, setDeadline] = useState(getInitialDeadline());
  const [showingTerms, setShowingTerms] = useState(false);
  const [showingPrivacy, setShowingPrivacy] = useState(false);
  const [showingContact, setShowingContact] = useState(false);
  const [contactType, setContactType] = useState('削除依頼');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactHoneypot, setContactHoneypot] = useState(''); // 🍯 罠
  const [isHuman, setIsHuman] = useState(false); // 🤖 チェック
  const [searchQuery, setSearchQuery] = useState(''); // 🔍 検索用

  const handleSendInquiry = async () => {
    // 砦1：罠
    if (contactHoneypot) return;

    // 砦2：連投制限（5分間）
    const lastTime = localStorage.getItem('last_inquiry_time');
    if (lastTime && new Date().getTime() - Number(lastTime) < 300000) {
      return alert("連投防止のため、少し時間を置いてから送ってくださいね。🍵");
    }

    if (!isHuman) return alert("「私はロボットではありません」にチェックをお願いします。🛡️");
    if (!contactMessage.trim()) return alert("内容を入力してくださいね");
    if (!contactEmail.trim() || !contactEmail.includes('@')) return alert("正しいメールアドレスを入力してくださいね。");

    try {
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          type: contactType,
          email: contactEmail,
          message: contactMessage,
          target_survey: currentSurvey ? currentSurvey.title : 'なし',
          user_id: user?.id || null
        }]);

      if (error) throw error;

      localStorage.setItem('last_inquiry_time', new Date().getTime().toString());
      alert("お問い合わせを送信しました！内容を確認し、必要に応じてご連絡いたします。✨");
      setShowingContact(false);
      setContactMessage('');
      setIsHuman(false);
    } catch (error) {
      console.error("送信エラー:", error);
      alert("申し訳ありません、送信に失敗しました。");
    }
  };

  // 締め切り時間をポチポチ足したり引いたりする魔法
  const modifyDeadlineMinutes = (minutes) => {
    let baseDate = deadline ? new Date(deadline) : new Date();
    // もし過去の時間を指していたら、今この瞬間をベースにする
    if (baseDate < new Date()) baseDate = new Date();

    baseDate.setMinutes(baseDate.getMinutes() + minutes);

    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const day = String(baseDate.getDate()).padStart(2, '0');
    const hh = String(baseDate.getHours()).padStart(2, '0');
    const mm = String(baseDate.getMinutes()).padStart(2, '0');
    setDeadline(`${y}-${m}-${day}T${hh}:${mm}`);
  };

  // --- 実行中のタイマーState ---
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // ログイン状態の監視
  useEffect(() => {
    // 現在のユーザー情報を取得
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // ログイン・ログアウトの変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Googleログイン実行
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) alert("ログインに失敗しました: " + error.message);
  };

  // ログアウト実行
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert("ログアウトに失敗しました: " + error.message);
  };

  // --- URLと画面を連動させる魔法 ---
  useEffect(() => {
    const search = window.location.search;
    if (!search) return;

    const params = new URLSearchParams(search);
    const surveyId = params.get('s');

    if (view === 'list') {
      const cleanUrl = () => {
        // パラメータを完全に消して、元のパスだけにリセットする魔法
        window.history.replaceState({}, '', window.location.pathname);
      };

      if (!surveyId) {
        // sパラメータ以外のゴミ（v=freshなど）があれば即お掃除
        cleanUrl();
      } else if (surveys.length > 0) {
        // アンケート一覧を読み込み終わったら、そのIDが本物かチェック
        const target = surveys.find(s => s.id === surveyId);
        if (target) {
          // 本物なら詳細画面へジャンプ！
          navigateTo('details', target);
        } else {
          // ニセモノ（削除済みなど）なら即お掃除
          cleanUrl();
        }
      }
    }
  }, [view, surveys]);

  // ブラウザの戻るボタンにも対応
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const surveyId = params.get('s');
      if (!surveyId) {
        setView('list');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 画面遷移をURLと同期させる関数
  const navigateTo = (nextView, survey = null) => {
    // 古いおまじない（v=freshなど）を全部消した「きれいなURL」をまず作る魔法
    const url = new URL(window.location.origin + window.location.pathname);

    if (nextView === 'details' && survey) {
      url.searchParams.set('s', survey.id);
      window.history.pushState({}, '', url);
      setCurrentSurvey(survey);
      const isEnded = survey.deadline && new Date(survey.deadline) < new Date();
      setIsTimeUp(isEnded);
    } else if (nextView === 'list') {
      // 一覧に戻るときはパラメータを完全に消す
      window.history.pushState({}, '', url);
    }
    setView(nextView);
  };

  // アンケート一覧を取得する
  const fetchSurveys = async () => {
    try {
      // 1. まずアンケートを全部持ってくる（シンプルに！）
      const { data: surveysData, error: surveysError } = await supabase
        .from('surveys')
        .select('*');
      if (surveysError) throw surveysError;

      // 2. 次に全ての選択肢を持ってきて、あとで集計する
      const { data: optionsData, error: optionsError } = await supabase
        .from('options')
        .select('survey_id, votes');
      if (optionsError) throw optionsError;

      // 各アンケートに合計表をくっつける魔法
      const result = (surveysData || []).map(s => {
        const total = (optionsData || [])
          .filter(o => o.survey_id === s.id)
          .reduce((sum, opt) => sum + (opt.votes || 0), 0);
        return { ...s, total_votes: total };
      });

      // 最後にしっかり「新しい順」に並び替える
      const sorted = result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setSurveys(sorted);
    } catch (error) {
      console.error("アンケート一覧の取得に失敗しました", error);
    }
  };

  // 選んだアンケートの選択肢を取得する
  const fetchOptions = async (surveyId) => {
    try {
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .eq('survey_id', surveyId)
        .order('id', { ascending: true });
      if (error) throw error;
      setOptions(data || []);
      const total = (data || []).reduce((sum, item) => sum + Number(item.votes), 0);
      setIsTotalVotes(total);

      const savedVote = localStorage.getItem(`voted_survey_${surveyId}`);
      setVotedOption(savedVote);
    } catch (error) {
      console.error("選択肢の取得に失敗しました", error);
    }
  };

  useEffect(() => {
    fetchSurveys();
    const surveyChannel = supabase
      .channel('surveys-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => fetchSurveys())
      .subscribe();
    return () => supabase.removeChannel(surveyChannel);
  }, []);

  useEffect(() => {
    if (view === 'details' && currentSurvey) {
      fetchOptions(currentSurvey.id);
      const optionsChannel = supabase
        .channel(`options-changes-${currentSurvey.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'options',
          filter: `survey_id=eq.${currentSurvey.id}`
        }, () => fetchOptions(currentSurvey.id))
        .subscribe();
      return () => {
        supabase.removeChannel(optionsChannel);
      };
    }
  }, [view, currentSurvey]);

  // 広場の実況：サイドバー用のデータを取得する魔法
  const refreshSidebar = async () => {
    try {
      const { data: surveysData } = await supabase.from('surveys').select('*');
      const { data: optionsData } = await supabase.from('options').select('survey_id, votes');

      if (surveysData && optionsData) {
        const withVotes = surveysData.map(s => ({
          ...s,
          total_votes: optionsData.filter(o => o.survey_id === s.id).reduce((sum, opt) => sum + (opt.votes || 0), 0)
        }));

        // 最新3件
        setLiveSurveys([...withVotes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3));
        // 人気トップ3
        setPopularSurveys([...withVotes].sort((a, b) => b.total_votes - a.total_votes).slice(0, 3));
      }
    } catch (e) {
      console.error("サイドバーの更新に失敗しました", e);
    }
  };

  useEffect(() => {
    refreshSidebar();

    const channel = supabase
      .channel('sidebar-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => refreshSidebar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'options' }, () => refreshSidebar())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // タイマー
  useEffect(() => {
    if (view !== 'details' || !currentSurvey || !currentSurvey.deadline || votedOption || isTimeUp) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(currentSurvey.deadline).getTime();
      const diff = Math.floor((end - now) / 1000);
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        setIsTimeUp(true);
      } else {
        setTimeLeft(diff);
        setIsTimeUp(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [view, currentSurvey, votedOption, isTimeUp]);

  // アンケート作成
  const handleStartSurvey = async () => {
    if (!user) return alert("アンケートを作るにはログインが必要です！");
    if (!surveyTitle.trim()) return alert("アンケートのお題（タイトル）を入力してね！");
    if (!surveyCategory) return alert("カテゴリを選んでね！");
    if (useTimer && !deadline) return alert("締め切りを設定してね");
    if (setupOptions.length < 2) return alert("選択肢は2つ以上入れてね");

    try {
      // 🌟 画像が空欄なら、おりぴさん指定のデフォルト画像を使う
      const finalImage = surveyImage.trim() || DEFAULT_SURVEY_IMAGE;

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          title: surveyTitle,
          deadline: useTimer ? deadline : null,
          user_id: user.id,
          image_url: finalImage,
          category: surveyCategory // 🏷️ カテゴリを保存
        }])
        .select();
      if (surveyError) throw surveyError;

      const newSurveyId = surveyData[0].id;
      const newOptions = setupOptions.map(name => ({ name, votes: 0, survey_id: newSurveyId }));
      const { error: optionsError } = await supabase
        .from('options')
        .insert(newOptions);
      if (optionsError) throw optionsError;

      setView('list');
      setSurveyTitle('');
      setSetupOptions([]);
      setDeadline('');
      fetchSurveys(); // 🌟 手動で一覧を最新にする魔法！
    } catch (error) {
      alert("作成に失敗しました: " + error.message);
    }
  };

  // 削除
  const handleDeleteSurvey = async () => {
    if (!window.confirm("本当にこのアンケートを削除してもいいですか？")) return;
    try {
      await supabase.from('options').delete().eq('survey_id', currentSurvey.id);
      await supabase.from('surveys').delete().eq('id', currentSurvey.id);
      setView('list');
      alert("削除しました！お掃除完了です✨");
    } catch (error) {
      alert("削除に失敗しました: " + error.message);
    }
  };

  // 投票
  const handleVote = async (option) => {
    if (isTimeUp) return;
    try {
      await supabase.from('options').update({ votes: option.votes + 1 }).eq('id', option.id);
      localStorage.setItem(`voted_survey_${currentSurvey.id}`, option.name);
      setVotedOption(option.name);
    } catch (error) {
      alert("投票に失敗しました: " + error.message);
    }
  };

  // X（旧Twitter）へ爆速シェア！
  const handleShare = () => {
    const currentUrl = window.location.href; // いま開いているページのURL
    const shareText = `アンケート広場「${currentSurvey.title}」の投票を受け付けています！みんなの意見を聞かせてね！\n#アンケート広場\n`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;

    // Xの投稿画面を別ウィンドウで開く魔法
    window.open(xUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text);
    alert(message);
  };

  const handleAddSetupOption = () => {
    if (tempOption.trim()) {
      setSetupOptions([...setupOptions, tempOption.trim()]);
      setTempOption('');
    }
  };

  // 共通のサイドバーコンポーネント
  const Sidebar = () => (
    <div className="live-feed-sidebar">
      <div className="sidebar-section-card">
        <div className="live-feed-title">✨ 広場の最新ニュース</div>
        <div className="live-feed-content">
          {liveSurveys.length === 0 ? (
            <div className="empty-msg">まだお題はありません…</div>
          ) : (
            liveSurveys.slice(0, 3).map(s => (
              <div key={s.id} className="live-item clickable" onClick={() => navigateTo('details', s)}>
                <strong>{s.title || '無題のアンケート'}</strong> が公開されました！
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-section-card" style={{ marginTop: '24px' }}>
        <div className="live-feed-title">🔥 人気ランキング</div>
        <div className="live-feed-content">
          {popularSurveys.map((s, idx) => (
            <div key={s.id} className="live-item popular clickable" onClick={() => navigateTo('details', s)}>
              <span className="rank-label">{idx === 0 ? '👑' : idx === 1 ? '🥇' : '🥉'}</span>
              <div className="popular-item-info">
                <strong>{s.title}</strong>
                <div className="live-item-meta">{s.total_votes || 0} 票</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="survey-main-portal">
      <div className="main-wrap">
        <div className="layout-grid-3">
          {/* 🌟 左側のナビゲーションカラム */}
          <div className="nav-sidebar-left">
            {view !== 'list' && (
              <button className="side-back-btn" onClick={() => navigateTo('list')}>
                <span className="back-icon">⇠</span>
                <span className="back-text">広場へ戻る</span>
              </button>
            )}
          </div>

          <div className="survey-card">
            {/* 一覧画面の内容 */}
            {view === 'list' && (
              <>
                <div className="auth-header">
                  {user ? (
                    <div className="user-info">
                      {user.user_metadata?.avatar_url && (
                        <img src={user.user_metadata.avatar_url} alt="user avatar" className="user-avatar" />
                      )}
                      <span className="user-name">
                        {user.user_metadata?.full_name || user.email.split('@')[0]}さん
                      </span>
                      <button className="logout-button" onClick={handleLogout}>ログアウト</button>
                    </div>
                  ) : (
                    <button className="login-button-top" onClick={handleLogin}>Googleでログイン</button>
                  )}
                </div>
                <button className="create-new-button" onClick={() => user ? navigateTo('create') : alert("ログインしてね！")}>
                  ＋ 新しいアンケートを作る
                </button>

                <div className="search-container">
                  <input
                    type="text"
                    placeholder="🔍 アンケートを検索する..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>

                <div className="tab-switcher">
                  <button className={sortMode === 'latest' ? 'active' : ''} onClick={() => setSortMode('latest')}>⏳ 新着</button>
                  <button className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>🔥 人気</button>
                  <button className={sortMode === 'watching' ? 'active' : ''} onClick={() => setSortMode('watching')}>⭐ ウォッチ中</button>
                </div>

                {/* 🔍 カテゴリ絞り込みタブ */}
                <div className="category-filter-bar">
                  {['すべて', 'エンタメ', 'グルメ', 'IT・テクノロジー', '生活', 'ゲーム', 'その他'].map(cat => (
                    <button
                      key={cat}
                      className={`filter-cat-btn ${filterCategory === cat ? 'active' : ''}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="survey-list">
                  {surveys.length === 0 ? <p className="empty-msg">まだアンケートがないよ。作ってみる？</p> : (
                    [...surveys]
                      .filter(s => {
                        const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesWatch = sortMode === 'watching' ? watchedIds.includes(s.id) : true;
                        const matchesCategory = filterCategory === 'すべて' ? true : s.category === filterCategory;
                        return matchesSearch && matchesWatch && matchesCategory;
                      })
                      .sort((a, b) => sortMode === 'popular' ? b.total_votes - a.total_votes : 0)
                      .map((s, index) => {
                        const isEnded = s.deadline && new Date(s.deadline) < new Date();
                        const showBadge = sortMode === 'popular' && index < 3;
                        const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : '🥉';
                        const isWatched = watchedIds.includes(s.id);

                        return (
                          <div key={s.id} className="survey-item-card" onClick={() => navigateTo('details', s)}>
                            {s.image_url && <img src={s.image_url} alt="" className="survey-item-thumb" />}
                            <div className="survey-item-content">
                              <div className="survey-item-info">
                                <span className="survey-item-title">
                                  {showBadge && <span className="rank-emoji">{rankEmoji} </span>}
                                  {s.title}
                                  {s.category && <span className="category-tag">{s.category}</span>}
                                </span>
                                <div className="card-right-actions">
                                  <button
                                    className={`watch-star-btn ${isWatched ? 'active' : ''}`}
                                    onClick={(e) => toggleWatch(e, s.id)}
                                    title={isWatched ? "ウォッチ解除" : "ウォッチする"}
                                  >
                                    {isWatched ? '★' : '☆'}
                                  </button>
                                  <span className={`status-badge ${isEnded ? 'ended' : 'active'}`}>
                                    {isEnded ? '終了' : '受付中'}
                                  </span>
                                </div>
                              </div>
                              <div className="survey-item-meta-row">
                                {s.deadline && (
                                  <span className="survey-item-deadline">
                                    〆切: {formatWithDay(s.deadline)}
                                  </span>
                                )}
                                <span className="survey-item-votes">
                                  🗳️ {s.total_votes || 0} 票
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                  {sortMode === 'watching' && surveys.filter(s => watchedIds.includes(s.id)).length === 0 && (
                    <div className="empty-msg">まだウォッチしているアンケートはありません。⭐ボタンを押して保存してね！</div>
                  )}
                </div>
              </>
            )}

            {/* 作成画面の内容 */}
            {view === 'create' && (
              <>
                <h2 className="setup-title">📝 新しく作る</h2>
                <div className="create-form">
                  <div className="setting-item-block">
                    <label>お題（タイトル）:</label>
                    <input type="text" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} className="title-input" placeholder="例：今日のおやつは何がいい？" />
                  </div>
                  <div className="setting-item-block">
                    <label>イメージ写真のURL（空でもOK）:</label>
                    <input type="text" value={surveyImage} onChange={(e) => setSurveyImage(e.target.value)} className="title-input" placeholder="https://images.unsplash.com/..." />
                  </div>
                  <div className="setting-item-block">
                    <label className="setting-label">🏷️ カテゴリを選ぶ：</label>
                    <div className="category-selector">
                      {['エンタメ', 'グルメ', 'IT・テクノロジー', '生活', 'ゲーム', 'その他'].map(cat => (
                        <button
                          key={cat}
                          className={`cat-btn ${surveyCategory === cat ? 'active' : ''}`}
                          onClick={() => setSurveyCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="setting-item-block">
                    <label className="setting-label">🗳️ 投票項目を決める：</label>
                    <div className="setup-add-container">
                      <input
                        type="text"
                        value={tempOption}
                        onChange={(e) => setTempOption(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSetupOption()}
                        className="add-input"
                        placeholder="例：チョコレート、バニラ..."
                      />
                      <button onClick={handleAddSetupOption} className="add-button">追加</button>
                    </div>

                    <div className="setup-options-vertical-list">
                      {setupOptions.map((opt, i) => (
                        <div key={i} className="setup-option-item">
                          <span className="option-number">{i + 1}</span>
                          <span className="option-text">{opt}</span>
                          <button className="remove-option-btn" onClick={() => setSetupOptions(setupOptions.filter((_, idx) => idx !== i))}>×</button>
                        </div>
                      ))}
                      {setupOptions.length < 2 && (
                        <div className="option-hint">※ あと {2 - setupOptions.length} つ以上追加してね</div>
                      )}
                    </div>
                  </div>
                  <div className="setting-item-block">
                    <label className="checkbox-label"><input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} /> 締め切りを決める</label>
                  </div>
                  {useTimer && (
                    <div className="setting-item-block">
                      <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="time-input" />
                      <div className="quick-time-buttons-v2">
                        <div className="time-adjust-group">
                          <button onClick={() => modifyDeadlineMinutes(-1)}>−</button>
                          <span>1分</span>
                          <button onClick={() => modifyDeadlineMinutes(1)}>+</button>
                        </div>
                        <div className="time-adjust-group">
                          <button onClick={() => modifyDeadlineMinutes(-5)}>−</button>
                          <span>5分</span>
                          <button onClick={() => modifyDeadlineMinutes(5)}>+</button>
                        </div>
                        <div className="time-adjust-group">
                          <button onClick={() => modifyDeadlineMinutes(-10)}>−</button>
                          <span>10分</span>
                          <button onClick={() => modifyDeadlineMinutes(10)}>+</button>
                        </div>
                        <div className="time-adjust-group">
                          <button onClick={() => modifyDeadlineMinutes(-60)}>−</button>
                          <span>1時間</span>
                          <button onClick={() => modifyDeadlineMinutes(60)}>+</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={handleStartSurvey} className="start-button">公開する！</button>
                </div>
              </>
            )}

            {/* 詳細画面の内容 */}
            {view === 'details' && currentSurvey && (
              <>
                {currentSurvey.image_url && (
                  <div className="survey-banner">
                    <img src={currentSurvey.image_url} alt="survey banner" className="banner-img" />
                  </div>
                )}
                <h1 className="survey-title">{currentSurvey.title}</h1>
                <div className="options-container">
                  {options.map((option) => {
                    const isVoted = votedOption === option.name;
                    if (votedOption || isTimeUp) {
                      const percentage = isTotalVotes > 0 ? Math.round((option.votes / isTotalVotes) * 100) : 0;
                      return (
                        <div key={option.id} className={`result-bar-container ${isVoted ? 'selected' : ''}`}>
                          <div className="result-info">
                            <span>{option.name} {isVoted && '✅'} <small>({option.votes}票)</small></span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="result-bar-bg"><div className="result-bar-fill" style={{ width: `${percentage}%` }}></div></div>
                        </div>
                      );
                    }
                    return <button key={option.id} className="option-button" onClick={() => handleVote(option)}>{option.name}</button>;
                  })}
                </div>
                <div className="share-actions">
                  <button className="share-button" onClick={handleShare}>🚀 X(Twitter)でシェアする</button>
                </div>
                {user && currentSurvey.user_id === user.id && (
                  <div className="admin-actions">
                    <button className="delete-button" onClick={handleDeleteSurvey}>🗑 このアンケートをお掃除する</button>
                  </div>
                )}
                <div className="bottom-nav">
                  <button className="back-to-list-link" onClick={() => navigateTo('list')}>← 広場に戻る</button>
                </div>
              </>
            )}

          </div>
          <Sidebar />
        </div>
      </div>

      <footer className="app-footer">
        <p>© 2026 アンケート広場</p>
        <div className="footer-links">
          <span onClick={() => setShowingTerms(true)} className="footer-link-text">利用規約</span>
          <span onClick={() => setShowingPrivacy(true)} className="footer-link-text">プライバシーポリシー</span>
          <span onClick={() => setShowingContact(true)} className="footer-link-text">お問い合わせ</span>
        </div>
      </footer>

      {showingTerms && (
        <div className="modal-overlay" onClick={() => setShowingTerms(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📖 利用規約</h3>
            <div className="modal-body">
              <p>アンケート広場を楽しく安全にご利用いただくためのルールです。</p>
              <ul>
                <li>みんなが不快になるような言葉や、嫌がらせはやめましょう。</li>
                <li>不適切なアンケートは、運営の判断で削除することがあります。</li>
                <li>本サービスを利用して起きたトラブルには責任を負いかねます。</li>
                <li><strong>【削除の注意】</strong>ログインせずに作成した場合、ブラウザの情報を消去すると後から削除できなくなりますのでご注意ください。</li>
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
              <p>アンケート広場（以下、「当サイト」といいます。）では、ユーザーの個人情報の保護に最大限の注意を払っています。本ポリシーでは、当サイトにおける個人情報の取り扱いについて説明します。</p>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>1. 個人情報の利用目的</h4>
              <p>当サイトでは、お問い合わせの際にメールアドレス等の個人情報をご入力いただく場合があります。<br />
                取得した個人情報は、お問い合わせへの回答や必要な情報を電子メールなどでご連絡する場合にのみ利用し、それ以外の目的では利用いたしません。</p>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>2. 広告について（Google AdSense）</h4>
              <p>当サイトでは、第三者配信の広告サービス「Google AdSense」を利用する予定です。<br />
                Googleを含む広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookie（クッキー）を使用することがあります。<br />
                Cookieを使用することで、当サイトはユーザーのコンピュータを識別できるようになりますが、個人を特定するものではありません。<br />
                Cookieを無効にする方法やGoogle AdSenseに関する詳細は、Googleの広告ポリシーをご確認ください。</p>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>3. アクセス解析ツールについて</h4>
              <p>当サイトでは、サイトの改善や利用状況の分析のためにアクセス解析ツールを利用する場合があります。<br />
                これらのツールはトラフィックデータ収集のためにCookieを使用することがありますが、匿名で収集されており、個人を特定するものではありません。</p>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>4. 個人情報の第三者への開示</h4>
              <p>当サイトでは、以下の場合を除いて個人情報を第三者に開示することはありません。</p>
              <ul>
                <li>本人の同意がある場合</li>
                <li>法令に基づき開示が必要となる場合</li>
              </ul>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>5. 免責事項</h4>
              <p>当サイトに掲載されている情報については、可能な限り正確な情報を提供するよう努めていますが、その正確性や安全性を保証するものではありません。<br />
                当サイトの利用によって生じた損害等について、一切の責任を負いかねますのでご了承ください。</p>

              <h4 style={{ marginTop: '20px', marginBottom: '8px', fontSize: '1.05rem', color: '#334155' }}>6. プライバシーポリシーの変更</h4>
              <p>本ポリシーは、法令の変更やサービス内容の変更に応じて、予告なく改定することがあります。</p>

              <div style={{ marginTop: '30px', textAlign: 'right', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                【制定日】2026年2月27日<br />
                アンケート広場
              </div>
            </div>
            <button onClick={() => setShowingPrivacy(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}

      {showingContact && (
        <div className="modal-overlay" onClick={() => setShowingContact(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📩 お問い合わせ</h3>
            <div className="modal-body">
              {currentSurvey && view === 'details' && (
                <div className="contact-context">
                  対象：<strong>{currentSurvey.title}</strong>
                </div>
              )}
              <div className="contact-form-item">
                <label>お問い合わせの種類:</label>
                <select value={contactType} onChange={(e) => setContactType(e.target.value)} className="contact-select">
                  <option value="削除依頼">🗑 削除してほしい</option>
                  <option value="不具合報告">🐛 バグを見つけた</option>
                  <option value="ご意見・ご要望">✨ こうしてほしい！</option>
                  <option value="その他">💬 その他</option>
                </select>
              </div>
              <div className="contact-form-item">
                <label>返信先メールアドレス:</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="contact-input"
                />
              </div>
              <div className="contact-form-item">
                <label>具体的な内容:</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="ここに詳しく書いてね"
                  className="contact-textarea"
                />
              </div>

              {/* 🍯 ロボットを釣る罠（人間には見えません） */}
              <div style={{ display: 'none' }}>
                <input
                  type="text"
                  value={contactHoneypot}
                  onChange={(e) => setContactHoneypot(e.target.value)}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              {/* 🛡️ 人間チェック */}
              <div className="bot-check-area">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isHuman}
                    onChange={(e) => setIsHuman(e.target.checked)}
                  /> 🦺 私はロボットではありません
                </label>
              </div>

              <div className="contact-notice">
                ※ 悪質な依頼（いたずら）には対応いたしかねます。内容を確認のうえ、運営が判断させていただきます。
              </div>
            </div>
            <div className="modal-actions-contact">
              <button onClick={handleSendInquiry} className="send-btn">内容を確定して送信</button>
              <button onClick={() => setShowingContact(false)} className="cancel-btn">戻る</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
