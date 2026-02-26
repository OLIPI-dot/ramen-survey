import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [setupOptions, setSetupOptions] = useState([]);

  // 表示モード（新着 or 人気）
  const [sortMode, setSortMode] = useState('latest');
  const [tempOption, setTempOption] = useState('');
  const [useTimer, setUseTimer] = useState(true);

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
  const [showingContact, setShowingContact] = useState(false);
  const [contactType, setContactType] = useState('削除依頼');
  const [contactMessage, setContactMessage] = useState('');

  const handleSendInquiry = async () => {
    if (!contactMessage.trim()) return alert("内容を入力してくださいね");

    try {
      // 🚀 Supabaseの「inquiries」テーブルにお問い合わせを保存する魔法
      const { error } = await supabase
        .from('inquiries')
        .insert([{
          type: contactType,
          message: contactMessage,
          user_id: user?.id || null // ログインしてたらその人のIDも一緒に保存
        }]);

      if (error) throw error;

      alert("お問い合わせを送信しました！スタッフが大切に拝見させていただきます。✨");
      setShowingContact(false);
      setContactMessage('');
    } catch (error) {
      console.error("送信エラー:", error);
      alert("申し訳ありません、送信に失敗しました。後でもう一度お試しください。");
    }
  };

  // 〇〇分後、〇時間後をパッと計算する魔法
  const setDeadlineFromNow = (minutesToAdd) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutesToAdd);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
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
    if (useTimer && !deadline) return alert("締め切りを設定してね");
    if (setupOptions.length < 2) return alert("選択肢は2つ以上入れてね");

    try {
      // お題のキーワードを使って、毎回違う素敵な写真を探してくる魔法
      const keyword = encodeURIComponent(surveyTitle);
      const randomSeed = Math.floor(Math.random() * 1000);
      const finalImage = surveyImage || `https://loremflickr.com/800/400/${keyword}?random=${randomSeed}`;

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          title: surveyTitle,
          deadline: useTimer ? deadline : null,
          user_id: user.id,
          image_url: finalImage // ここに自動で選んだ画像のURLを保存！
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
      <div className="live-feed-title">✨ 広場の最新ニュース</div>
      <div className="live-feed-content">
        {liveSurveys.length === 0 ? (
          <div className="empty-msg">まだお題はありません…</div>
        ) : (
          liveSurveys.slice(0, 3).map(s => {
            const isEnded = s.deadline && new Date(s.deadline) < new Date();
            return (
              <div key={s.id} className="live-item clickable" onClick={() => navigateTo('details', s)}>
                <strong>{s.title}</strong> が公開されました！
              </div>
            );
          })
        )}
      </div>

      <div className="live-feed-title" style={{ marginTop: '24px' }}>🔥 人気ランキング</div>
      <div className="live-feed-content">
        {popularSurveys.map((s, idx) => {
          const isEnded = s.deadline && new Date(s.deadline) < new Date();
          return (
            <div key={s.id} className="live-item popular clickable" onClick={() => navigateTo('details', s)}>
              <span className="rank-label">{idx === 0 ? '👑' : idx === 1 ? '🥇' : '🥉'}</span>
              <strong>{s.title}</strong>
              <div className="live-item-meta">{s.total_votes || 0} 票</div>
            </div>
          );
        })}
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

                <div className="tab-switcher">
                  <button className={sortMode === 'latest' ? 'active' : ''} onClick={() => setSortMode('latest')}>⏳ 新着</button>
                  <button className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>🔥 人気</button>
                </div>

                <div className="survey-list">
                  {surveys.length === 0 ? <p className="empty-msg">まだアンケートがないよ。作ってみる？</p> : (
                    [...surveys]
                      .sort((a, b) => sortMode === 'popular' ? b.total_votes - a.total_votes : 0)
                      .map((s, index) => {
                        const isEnded = s.deadline && new Date(s.deadline) < new Date();
                        const showBadge = sortMode === 'popular' && index < 3;
                        const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : '🥉';

                        return (
                          <div key={s.id} className="survey-item-card" onClick={() => navigateTo('details', s)}>
                            {s.image_url && <img src={s.image_url} alt="" className="survey-item-thumb" />}
                            <div className="survey-item-content">
                              <div className="survey-item-info">
                                <span className="survey-item-title">
                                  {showBadge && <span className="rank-emoji">{rankEmoji} </span>}
                                  {s.title}
                                </span>
                                <span className={`status-badge ${isEnded ? 'ended' : 'active'}`}>
                                  {isEnded ? '終了' : '受付中'}
                                </span>
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
                      <div className="quick-time-buttons">
                        <button onClick={() => setDeadlineFromNow(5)}>🕒 5分</button>
                        <button onClick={() => setDeadlineFromNow(60)}>🚀 1時間</button>
                        <button onClick={() => setDeadlineFromNow(1440)}>📅 1日</button>
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

      {showingContact && (
        <div className="modal-overlay" onClick={() => setShowingContact(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📩 お問い合わせ</h3>
            <div className="modal-body">
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
                <label>具体的な内容:</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="ここに詳しく書いてね"
                  className="contact-textarea"
                />
              </div>
              <div className="contact-notice">
                ※ 送信された内容は運営スタッフが大切に拝見し、必要に応じて対応させていただきます。
              </div>
            </div>
            <div className="modal-actions-contact">
              <button onClick={handleSendInquiry} className="send-btn">内容を確定する</button>
              <button onClick={() => setShowingContact(false)} className="cancel-btn">戻る</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
