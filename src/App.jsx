import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabaseの初期設定
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [view, setView] = useState('list'); // 'list', 'create', 'details'
  const [surveys, setSurveys] = useState([]);
  const [currentSurvey, setCurrentSurvey] = useState(null);
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [votedOption, setVotedOption] = useState(null);
  const [isTotalVotes, setIsTotalVotes] = useState(0);

  // --- アンケート作成用のState ---
  const [surveyTitle, setSurveyTitle] = useState('');
  const [setupOptions, setSetupOptions] = useState([]);
  const [tempOption, setTempOption] = useState('');
  const [useTimer, setUseTimer] = useState(true);
  const [deadline, setDeadline] = useState('');

  // --- 実行中のタイマーState ---
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // 1. アンケート一覧を取得する
  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSurveys(data);
    } catch (error) {
      console.error("アンケート一覧の取得に失敗しました", error);
    }
  };

  // 2. 選んだアンケートの選択肢を取得する
  const fetchOptions = async (surveyId) => {
    try {
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .eq('survey_id', surveyId)
        .order('id', { ascending: true });
      if (error) throw error;
      setOptions(data);
      const total = data.reduce((sum, item) => sum + Number(item.votes), 0);
      setIsTotalVotes(total);

      // ローカルストレージから投票済みかチェック
      const savedVote = localStorage.getItem(`voted_survey_${surveyId}`);
      setVotedOption(savedVote);
    } catch (error) {
      console.error("選択肢の取得に失敗しました", error);
    }
  };

  useEffect(() => {
    fetchSurveys();

    // リアルタイム更新の監視（アンケート本体と選択肢の両方）
    const surveyChannel = supabase
      .channel('surveys-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveys' }, () => fetchSurveys())
      .subscribe();

    return () => {
      supabase.removeChannel(surveyChannel);
    };
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

  // タイマー処理
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
    if (useTimer && !deadline) return alert("締め切りを設定してね");
    if (setupOptions.length < 2) return alert("選択肢は2つ以上入れてね");

    try {
      // 1. surveysテーブルにお題を保存
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert([{ title: surveyTitle, deadline: useTimer ? deadline : null }])
        .select();
      if (surveyError) throw surveyError;

      const newSurveyId = surveyData[0].id;

      // 2. optionsテーブルに選択肢を保存
      const newOptions = setupOptions.map(name => ({ name, votes: 0, survey_id: newSurveyId }));
      const { error: optionsError } = await supabase
        .from('options')
        .insert(newOptions);
      if (optionsError) throw optionsError;

      // 作成完了、一覧へ戻る
      setView('list');
      setSurveyTitle('');
      setSetupOptions([]);
      setDeadline('');
    } catch (error) {
      console.error("作成に失敗しました", error);
    }
  };

  // 投票
  const handleVote = async (option) => {
    if (isTimeUp) return;
    try {
      const { error } = await supabase
        .from('options')
        .update({ votes: option.votes + 1 })
        .eq('id', option.id);
      if (error) throw error;

      localStorage.setItem(`voted_survey_${currentSurvey.id}`, option.name);
      setVotedOption(option.name);
    } catch (error) {
      console.error("投票に失敗しました", error);
    }
  };

  const handleAddSetupOption = () => {
    if (tempOption.trim()) {
      setSetupOptions([...setupOptions, tempOption.trim()]);
      setTempOption('');
    }
  };

  // --- 画面表示の切り替え ---

  // 一覧画面
  if (view === 'list') {
    return (
      <div className="app-container">
        <div className="survey-card">
          <h1 className="app-main-title">🌟 アンケート広場</h1>
          <button className="create-new-button" onClick={() => setView('create')}>
            ＋ 新しいアンケートを作る
          </button>
          <div className="survey-list">
            {surveys.length === 0 ? <p className="empty-msg">まだアンケートがないよ。作ってみる？</p> : (
              surveys.map(s => {
                const isEnded = s.deadline && new Date(s.deadline) < new Date();
                return (
                  <div key={s.id} className="survey-item-card" onClick={() => {
                    setCurrentSurvey(s);
                    setIsTimeUp(isEnded);
                    setView('details');
                  }}>
                    <div className="survey-item-info">
                      <span className="survey-item-title">{s.title}</span>
                      <span className={`status-badge ${isEnded ? 'ended' : 'active'}`}>
                        {isEnded ? '終了' : '受付中'}
                      </span>
                    </div>
                    {s.deadline && <div className="survey-item-deadline">〆切: {new Date(s.deadline).toLocaleString('ja-JP')}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // 作成画面
  if (view === 'create') {
    return (
      <div className="app-container">
        <div className="survey-card">
          <div className="card-header">
            <button className="back-button" onClick={() => setView('list')}>← 戻る</button>
            <h2 className="setup-title">📝 新しく作る</h2>
          </div>
          <div className="settings-container">
            <div className="setting-item-block">
              <label>お題（タイトル）:</label>
              <input type="text" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} className="title-input" placeholder="例：今日のおやつは何がいい？" />
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
                <label>いつまで？:</label>
                <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="time-input" />
              </div>
            )}
            <button onClick={handleStartSurvey} className="start-button">公開する！</button>
          </div>
        </div>
      </div>
    );
  }

  // 詳細・投票画面
  return (
    <div className="app-container">
      <div className="survey-card">
        <div className="card-header">
          <button className="back-button" onClick={() => setView('list')}>← 広場へ戻る</button>
        </div>
        <h1 className="survey-title">{currentSurvey.title}</h1>

        {currentSurvey.deadline && !votedOption && !isTimeUp && (
          <div className={`timer-container ${timeLeft <= 60 && timeLeft > 0 ? 'danger' : ''}`}>
            <span>残り時間: </span>
            <span className="time-number">
              {timeLeft > 3600 ? `${Math.floor(timeLeft / 3600)}時${Math.floor((timeLeft % 3600) / 60)}分` : `${Math.floor(timeLeft / 60)}分${timeLeft % 60}秒`}
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
        {votedOption && <div className="voted-message">投票ありがとうございました！✨</div>}
      </div>
    </div>
  );
}

export default App;
