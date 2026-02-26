import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Supabaseの初期設定（.envファイルから読み込みます）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [votedOption, setVotedOption] = useState(null);
  const [isTotalVotes, setIsTotalVotes] = useState(0);

  // --- アンケートの設定 ---
  const [surveyTitle, setSurveyTitle] = useState('🍜 らーめんは何味がすき？');
  const [useTimer, setUseTimer] = useState(true);
  const [deadline, setDeadline] = useState(''); // 締め切り日時（ISO文字列）
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isTimerStarted, setIsTimerStarted] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // --- 投票済みの情報をブラウザから読み込む ---
        const savedVote = localStorage.getItem('voted_survey');
        if (savedVote) {
          setVotedOption(savedVote);
          setIsTimerStarted(true);
        }

        const { data, error } = await supabase
          .from('options')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setOptions(data);
        const total = data.reduce((sum, item) => sum + Number(item.votes), 0);
        setIsTotalVotes(total);
      } catch (error) {
        console.error("データの読み込みに失敗しました", error);
      }
    };

    fetchOptions();

    // --- 【重要】リアルタイムの魔法！データの変化を監視する ---
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 追加、更新、削除すべて
          schema: 'public',
          table: 'options'
        },
        () => {
          // 何か変化があったら最新データを読み直す
          fetchOptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // 期限までのカウントダウン処理
  useEffect(() => {
    if (!useTimer || !deadline || !isTimerStarted || votedOption || isTimeUp) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = Math.floor((end - now) / 1000);

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft(0);
        setIsTimeUp(true);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [useTimer, deadline, isTimerStarted, votedOption, isTimeUp]);

  const handleAddOption = async () => {
    if (newOption.trim() !== '') {
      try {
        // Supabaseに新しい選択肢を追加します
        const { data, error } = await supabase
          .from('options')
          .insert([{ name: newOption, votes: 0 }])
          .select();

        if (error) throw error;

        setOptions([...options, data[0]]);
        setNewOption('');
      } catch (error) {
        console.error("追加に失敗しました", error);
      }
    }
  };

  const handleVote = async (selectedItem) => {
    if (useTimer && isTimeUp) return;
    setVotedOption(selectedItem.name);

    try {
      const updatedVotes = Number(selectedItem.votes) + 1;

      // --- ブラウザの記憶箱に保存する ---
      localStorage.setItem('voted_ramen', selectedItem.name);

      // Supabaseのデータを更新します
      const { data, error } = await supabase
        .from('options')
        .update({ votes: updatedVotes })
        .eq('id', selectedItem.id)
        .select();

      if (error) throw error;

      const updatedOptions = options.map(opt =>
        opt.id === selectedItem.id ? data[0] : opt
      );
      setOptions(updatedOptions);
      setIsTotalVotes(isTotalVotes + 1);

    } catch (error) {
      console.error("投票に失敗しました", error);
    }
  };

  const handleStartSurvey = () => {
    if (useTimer && !deadline) {
      alert("締め切り日時を設定してくださいね");
      return;
    }
    setIsTimerStarted(true);
  };

  if (!isTimerStarted) {
    return (
      <div className="app-container">
        <div className="survey-card">
          <h2 className="setup-title">📝 アンケートを作成</h2>

          <div className="settings-container">
            <div className="setting-item">
              <label>お題（タイトル）:</label>
              <input
                type="text"
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                className="title-input"
                placeholder="例：今日のおやつは何がいい？"
              />
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={useTimer}
                  onChange={(e) => setUseTimer(e.target.checked)}
                />
                締め切り時間を決める
              </label>
            </div>

            {useTimer && (
              <div className="setting-item">
                <label>いつまで？:</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="time-input"
                />
              </div>
            )}

            <button onClick={handleStartSurvey} className="start-button">
              このお題で開始！
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="survey-card">
        <h1 className="survey-title">{surveyTitle}</h1>
        <p className="survey-subtitle">あなたの意見を教えてね！</p>

        {useTimer && !votedOption && (
          <div className={`timer-container ${timeLeft <= 5 && timeLeft > 0 ? 'danger' : ''}`}>
            <span>残り時間: </span>
            <span className="time-number">{timeLeft}</span>
            <span> 秒</span>
          </div>
        )}

        {useTimer && isTimeUp && !votedOption && (
          <div className="timeup-message">
            時間切れです！⏳
          </div>
        )}

        {!votedOption && (!useTimer || !isTimeUp) && (
          <div className="add-option-container">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="新しい選択肢を入力..."
              className="add-input"
            />
            <button onClick={handleAddOption} className="add-button">追加</button>
          </div>
        )}

        <div className="options-container">
          {options.map((option) => {
            // 「投票済み」または「タイムアップ時」は結果のバーを表示する
            if (votedOption || isTimeUp) {
              const isSelected = option.name === votedOption;
              const percentage = isTotalVotes > 0
                ? Math.round((option.votes / (isTotalVotes)) * 100)
                : 0;

              return (
                <div key={option.id} className={`result-bar-container ${isSelected ? 'selected' : ''}`}>
                  <div className="result-info">
                    <span className="result-name">
                      {option.name} {isSelected && '✅'}
                      <span className="vote-count" style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '14px' }}>({option.votes}票)</span>
                    </span>
                    <span className="result-percent">{percentage}%</span>
                  </div>
                  <div className="result-bar-bg">
                    <div
                      className="result-bar-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            }

            const isDisabled = useTimer ? isTimeUp : false;

            return (
              <button
                key={option.id}
                className={`option-button ${isDisabled ? 'disabled' : ''}`}
                onClick={() => handleVote(option)}
                disabled={isDisabled}
              >
                {option.name}
              </button>
            );
          })}
        </div>

        {votedOption && (
          <div className="voted-message">
            投票ありがとうございました！🍜
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

