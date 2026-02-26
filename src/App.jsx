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

  // アンケート一覧を取得する
  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*, options(votes)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // 各アンケートの合計投票数を計算
      const surveysWithVotes = (data || []).map(s => {
        const total = (s.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0);
        return { ...s, total_votes: total };
      });

      setSurveys(surveysWithVotes);
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

  // 広場の実況：新しいお題が作られたら通知を受け取る魔法
  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase.from('surveys').select('*, options(votes)').order('created_at', { ascending: false }).limit(5);
      if (data) {
        const withVotes = data.map(s => ({
          ...s,
          total_votes: (s.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0)
        }));
        setLiveSurveys(withVotes);
      }
    };
    const fetchPopular = async () => {
      const { data } = await supabase.from('surveys').select('*, options(votes)');
      if (data) {
        const withVotes = data.map(s => ({
          ...s,
          total_votes: (s.options || []).reduce((sum, opt) => sum + (opt.votes || 0), 0)
        })).sort((a, b) => b.total_votes - a.total_votes).slice(0, 3);
        setPopularSurveys(withVotes);
      }
    };
    fetchLatest();
    fetchPopular();

    const surveyChannel = supabase
      .channel('live-surveys')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => {
        fetchLatest();
        fetchPopular();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'options' }, () => {
        fetchLatest();
        fetchPopular();
      })
      .subscribe();

    return () => supabase.removeChannel(surveyChannel);
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
      // お題の言葉（キーワード）を使って、ぴったりの写真を自動で探してくる魔法
      const keyword = encodeURIComponent(surveyTitle);
      const finalImage = surveyImage || `https://loremflickr.com/800/400/${keyword}`;

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

  // 共有機能
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}`;
    const shareText = `🌟 アンケート広場で「${currentSurvey.title}」の投票を受け付けてるよ！\nあなたの意見も教えてね！ #アンケート広場`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'アンケート広場',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('共有をキャンセルしました', error);
      }
    } else {
      // シェア機能が使えないブラウザ（PCなど）の場合はクリップボードへ
      copyToClipboard(shareUrl, "リンクをコピーしたよ！お友達に送ってね✨");
    }
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

  // 画面：一覧
  if (view === 'list') {
    return (
      <div className="app-container">
        <div className="survey-card">
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
          <button className="create-new-button" onClick={() => user ? setView('create') : alert("ログインしてね！")}>
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
                    <div key={s.id} className="survey-item-card" onClick={() => {
                      setCurrentSurvey(s);
                      setIsTimeUp(isEnded);
                      setView('details');
                    }}>
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
        </div>
      </div>
    );
  }

  // 画面：作成
  if (view === 'create') {
    return (
      <div className="app-container">
        <div className="create-layout">
          <div className="survey-card">
            <div className="card-header">
              <button className="back-button" onClick={() => setView('list')}>← 戻る</button>
              <h2 className="setup-title">📝 新しく作る</h2>
            </div>

            <div className="create-form">
              {/* --- 以前と同じフォームの内容 --- */}
              <div className="setting-item-block">
                <label>お題（タイトル）:</label>
                <input type="text" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} className="title-input" placeholder="例：今日のおやつは何がいい？" />
              </div>
              <div className="setting-item-block">
                <label>イメージ写真のURL（空でもOK）:</label>
                <input type="text" value={surveyImage} onChange={(e) => setSurveyImage(e.target.value)} className="title-input" placeholder="https://images.unsplash.com/..." />
              </div>
              <div className="setting-item-block">
                <label>項目を追加:</label>
                <div className="setup-add-container">
                  <input type="text" value={tempOption} onChange={(e) => setTempOption(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddSetupOption()} className="add-input" placeholder="項目を入力..." />
                  <button onClick={handleAddSetupOption} className="add-button">＋</button>
                </div>
                <div className="setup-options-list">
                  {setupOptions.map((opt, i) => (
                    <div key={i} className="setup-option-tag">{opt}
                      <span onClick={() => setSetupOptions(setupOptions.filter((_, idx) => idx !== i))} className="remove-tag">×</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="setting-item-block">
                <label className="checkbox-label"><input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} /> 締め切りを決める</label>
              </div>
              {useTimer && (
                <div className="setting-item-block">
                  <label>いつまで？：</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="time-input"
                  />
                  <div className="quick-time-buttons">
                    <button onClick={() => setDeadlineFromNow(5)}>🕒 5分</button>
                    <button onClick={() => setDeadlineFromNow(10)}>⚡ 10分</button>
                    <button onClick={() => setDeadlineFromNow(60)}>🚀 1時間</button>
                    <button onClick={() => setDeadlineFromNow(1440)}>📅 1日</button>
                  </div>
                  <div className="deadline-preview">
                    📅 決定：<strong>{formatWithDay(deadline)}</strong>
                  </div>
                </div>
              )}
              <button onClick={handleStartSurvey} className="start-button">公開する！</button>
            </div>
          </div>

          {/* 🌟 ライブ実況サイドバー */}
          <div className="live-feed-sidebar">
            <div className="live-feed-title">✨ 広場の最新ニュース</div>
            <div className="live-feed-content">
              {liveSurveys.length === 0 ? (
                <div className="empty-msg">まだお題はありません…</div>
              ) : (
                liveSurveys.slice(0, 3).map(s => (
                  <div key={s.id} className="live-item">
                    <strong>{s.title}</strong> が公開されました！
                  </div>
                ))
              )}
            </div>

            <div className="live-feed-title" style={{ marginTop: '24px' }}>🔥 人気ランキング</div>
            <div className="live-feed-content">
              {popularSurveys.map((s, idx) => (
                <div key={s.id} className="live-item popular">
                  <span className="rank-label">{idx === 0 ? '👑' : idx === 1 ? '🥈' : '🥉'}</span>
                  <strong>{s.title}</strong>
                  <div className="live-item-meta">{s.total_votes || 0} 票</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 画面：詳細
  return (
    <div className="app-container">
      <div className="survey-card">
        <div className="card-header">
          <button className="back-button" onClick={() => setView('list')}>← 広場へ戻る</button>
        </div>

        {currentSurvey.image_url && (
          <div className="survey-banner">
            <img src={currentSurvey.image_url} alt="survey banner" className="banner-img" />
          </div>
        )}

        {currentSurvey.deadline && (
          <div className="detail-deadline-box">
            ⏰ 〆切: {formatWithDay(currentSurvey.deadline)}
          </div>
        )}

        <h1 className="survey-title">{currentSurvey.title}</h1>

        {currentSurvey.deadline && !votedOption && !isTimeUp && (
          <div className={`timer-container ${timeLeft <= 60 && timeLeft > 0 ? 'danger' : ''}`}>
            <span>残り時間: </span>
            <span className="time-number">
              {timeLeft > 3600
                ? `${Math.floor(timeLeft / 3600)}時間${Math.floor((timeLeft % 3600) / 60)}分${timeLeft % 60}秒`
                : `${Math.floor(timeLeft / 60)}分${timeLeft % 60}秒`
              }
            </span>
          </div>
        )}
        {isTimeUp && !votedOption && <div className="timeup-message">このアンケートは終了しました。⏳</div>}

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
            return (
              <button key={option.id} className="option-button" onClick={() => handleVote(option)}>{option.name}</button>
            );
          })}
        </div>
        <div className="share-actions">
          <button className="share-button" onClick={handleShare}>
            📢 このアンケートを友達に教える（シェア）
          </button>
        </div>

        {/* 倉庫の名札（user_id）と今のユーザーIDが一致すれば削除ボタンを出す */}
        {user && currentSurvey.user_id === user.id && (
          <div className="admin-actions">
            <button className="delete-button" onClick={handleDeleteSurvey}>
              🗑 このアンケートをお掃除する
            </button>
          </div>
        )}

        <div className="bottom-nav">
          <button className="back-to-list-link" onClick={() => setView('list')}>
            ← 広場に戻る
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
