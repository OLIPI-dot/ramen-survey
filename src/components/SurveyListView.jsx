import React from 'react';
import RecommendedSection from './RecommendedSection';
import TrendingHeadline from './TrendingHeadline';

const SurveyListView = ({
  searchQuery, setSearchQuery,
  sortMode, setSortMode,
  popularMode, setPopularMode,
  filterCategory, setFilterCategory,
  filterTag, setFilterTag,
  setView,
  activeTab, setActiveTab,
  filteredBaseSurveys,
  surveys,
  currentPage, setCurrentPage,
  navigateTo,
  watchedIds, toggleWatch,
  CATEGORY_ICON_STYLE,
  SCORE_VOTE_WEIGHT,
  formatWithDay,
  Pagination,
  SiteConceptSection,
  AdSenseBox,
  user, isAdmin,
  isLoading,
  totalVotes,
  surveyTitle, setSurveyTitle,
  surveyDescription, setSurveyDescription,
  surveyYoutube, setSurveyYoutube,
  surveyCategory, setSurveyCategory,
  setupOptions, setSetupOptions,
  tempOption, setTempOption,
  surveyVisibility, setSurveyVisibility,
  deadline, setDeadline,
  surveyTags, setSurveyTags,
  tempTag, setTempTag,
  handleStartSurvey,
  totalOfficialCount,
  totalUserCount,
  recommendedSurveys,
  debouncedSearchQuery,
  searchStats = { categories: {}, official: 0, user: 0 },
  supabase,
  baseCategories = [],
  filterCategories = [],
}) => {
  const ITEMS_PER_PAGE = 15;
  const listRef = React.useRef(null);

  // ⚡ useMemoによりソート・フィルタの計算結果をキャッシュ化。filter/sortはレンダーのたびに実行されず、必要な時だけ実行される。
  const trendingHeadlineSurveys = React.useMemo(() => {
    if (!surveys || surveys.length === 0) return [];
    const now = new Date();
    return [...surveys]
      .filter(s => !s.tags?.includes('お知らせ')) // お知らせは除外
      .filter(s => !s.deadline || new Date(s.deadline) > now) // 終了済み(受付終了)を除外
      .sort((a, b) => {
        const scoreA = (a.total_votes || 0) * 10 + (a.view_count || 0);
        const scoreB = (b.total_votes || 0) * 10 + (b.view_count || 0);
        return scoreB - scoreA;
      })
      .slice(0, 5); // 上位5件をピックアップ
  }, [surveys]);

  // ⚡ サーバー側でフィルタ・ソート済みの surveys をそのまま使うらび！
  // ただし、公式/ユーザー切り替えタブの client-side filtering だけは残すらび（将来的にサーバーへ移行可能）
  const finalItems = React.useMemo(() => {
    return surveys
      .filter(s => {
        // ⚡ 検索中（デバウンス後）やタグフィルタ中以外は、タブごとの出し分けを確実に維持するらび！
        // 検索中まで制限しちゃうと「HITしない」と混乱しちゃうので、わざと緩めるらび🥕
        if (!debouncedSearchQuery && !filterTag) {
          if (activeTab === 'official' && !s.is_official) return false;
          if (activeTab === 'user' && s.is_official) return false;
        }
        return true;
      });
  }, [surveys, debouncedSearchQuery, filterTag, activeTab]);

  return (
    <>
      {/* 🔐 認証ヘッダー */}
      <div className="auth-header">
        {user ? (
          <div className="user-info">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                className="user-avatar" 
                alt={`${user.user_metadata?.full_name || 'ユーザー'}さんのアバター`} 
              />
            )}
            <span className="user-name">
              {user.user_metadata?.full_name || user.email.split('@')[0]}さん
            </span>
            <button className="logout-button" onClick={() => supabase.auth.signOut()}>ログアウト</button>
          </div>
        ) : (
          <button
            className="google-login-btn"
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          >
            <div className="google-icon-wrapper">
              <svg viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
                <path fill="#34A853" d="M16.04 18.013c-1.09.693-2.43 1.077-4.04 1.077-3.327 0-6.14-2.223-7.141-5.226L.833 17.03c1.98 3.86 5.989 6.511 10.655 6.511 2.872 0 5.48-.95 7.554-2.54l-3.003-2.988z" />
                <path fill="#4285F4" d="M22.027 12.188c0-.627-.052-1.245-.152-1.841H12v3.481h5.624c-.244 1.314-1 2.428-2.112 3.179l3.003 2.988c1.758-1.623 2.774-4.009 2.774-6.807z" />
                <path fill="#FBBC05" d="M5.266 14.235A7.065 7.065 0 0 1 4.909 12c0-.795.131-1.559.357-2.235L1.24 6.65c-.792 1.636-1.24 3.46-1.24 5.35 0 1.89.448 3.714 1.24 5.35l4.026-3.115z" />
              </svg>
            </div>
            <span>Googleでログイン</span>
          </button>
        )}
      </div>

      <button
        className="create-new-button"
        onClick={() => user ? setView('create') : alert("🌟 広場をもっと楽しもう！\n\nアンケートを作るには、ログインが必要だよ。上の「Googleでログイン」から、らびと一緒に始めよう！🐰🥕")}
      >＋ 新しいアンケートを作る</button>

      {!user && <SiteConceptSection totalVotes={totalVotes} />}

      {/* 🔍 検索 */}
      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 アンケートを検索する..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
          aria-label="アンケートを検索"
        />
        {searchQuery && (
          <button 
            className="search-clear" 
            onClick={() => setSearchQuery('')}
            title="検索をクリア"
            aria-label="検索内容をクリア"
          >
            ✕
          </button>
        )}
      </div>

      {/* 📌 タブ切り替え */}
      <div className="tab-switcher">
        <button className={sortMode === 'today' ? 'active' : ''} onClick={() => setSortMode('today')}>☀️ 今日の話題 {searchQuery && (searchStats?.sortModes?.today || 0) > 0 && <span className="tab-hit-badge">{searchStats.sortModes.today}</span>}</button>
        <button className={sortMode === 'latest' ? 'active' : ''} onClick={() => setSortMode('latest')}>🆕 新着順 {searchQuery && (searchStats?.sortModes?.latest || 0) > 0 && <span className="tab-hit-badge">{searchStats.sortModes.latest}</span>}</button>
        <button className={sortMode === 'popular' ? 'active' : ''} onClick={() => setSortMode('popular')}>🔥 人気 {searchQuery && (searchStats?.sortModes?.popular || 0) > 0 && <span className="tab-hit-badge">{searchStats.sortModes.popular}</span>}</button>
        <button className={sortMode === 'watching' ? 'active' : ''} onClick={() => setSortMode('watching')}>⭐ ウォッチ中</button>
        <button className={sortMode === 'ended' ? 'active' : ''} onClick={() => setSortMode('ended')}>📁 アーカイブ {searchQuery && (searchStats?.sortModes?.ended || 0) > 0 && <span className="tab-hit-badge">{searchStats.sortModes.ended}</span>}</button>
        <button
          className={sortMode === 'mine' ? 'active' : ''}
          onClick={() => {
            if (!user) return alert("👤 マイアンケートはログインしていないと使えません🙇‍♀️\n上の「Googleでログイン」ボタンからログインしてね！");
            setSortMode('mine');
          }}
        >👤 マイアンケート</button>
      </div>

      {sortMode === 'popular' && (
        <div className="popular-sub-tabs">
          <button className={popularMode === 'trending' ? 'active' : ''} onClick={() => setPopularMode('trending')}>🔥 盛り上がり</button>
          <button className={popularMode === 'score' ? 'active' : ''} onClick={() => setPopularMode('score')}>⚡ 総合</button>
          <button className={popularMode === 'votes' ? 'active' : ''} onClick={() => setPopularMode('votes')}>🗳️ 投票人気</button>
          <button className={popularMode === 'views' ? 'active' : ''} onClick={() => setPopularMode('views')}>👁️ 閲覧人気</button>
        </div>
      )}

      {/* 🚥 カテゴリフィルターバー (横スクロール) */}
      <div className="category-filter-bar" style={{
        display: 'flex', overflowX: 'auto', gap: '15px', padding: '15px 10px',
        marginBottom: '20px', WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity', borderBottom: '1px solid #f1f5f9'
      }}>
        {filterCategories.map(cat => (
          <button
            key={cat}
            style={{
              background: filterCategory === cat ? (CATEGORY_ICON_STYLE[cat]?.color || '#8b5cf6') : 'white',
              border: filterCategory === cat ? 'none' : '1px solid #e2e8f0',
              padding: filterCategory === cat ? '12px 24px' : '10px 20px',
              minWidth: 'max-content', flexShrink: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '6px', borderRadius: '20px',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: filterCategory === cat ? '1rem' : '0.85rem',
              fontWeight: filterCategory === cat ? '900' : '700',
              color: filterCategory === cat ? '#fff' : '#64748b',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: filterCategory === cat ? `0 10px 25px ${(CATEGORY_ICON_STYLE[cat]?.color || '#8b5cf6')}44` : 'none',
              transform: filterCategory === cat ? 'scale(1.05)' : 'scale(1)',
              whiteSpace: 'nowrap', scrollSnapAlign: 'center'
            }}
            onClick={() => {
              setFilterCategory(cat);
              setFilterTag('');
              setView('list');
              const url = new URL('/', window.location.origin);
              if (cat && cat !== 'すべて') url.searchParams.set('c', cat);
              url.searchParams.delete('t');
              url.searchParams.delete('s');
              window.history.pushState({}, '', url);
            }}
          >
            <span style={{ fontSize: filterCategory === cat ? '1.8rem' : '1.4rem', transition: 'font-size 0.3s' }}>
              {CATEGORY_ICON_STYLE[cat]?.icon || '📁'}
            </span>
            <span style={{ lineHeight: 1.2, position: 'relative' }}>
              {cat}
              {searchStats?.categories[cat] > 0 && (
                <span className="cat-hit-count" style={{
                  position: 'absolute',
                  top: '-18px',
                  right: '-18px',
                  background: filterCategory === cat ? '#fff' : (CATEGORY_ICON_STYLE[cat]?.color || '#8b5cf6'),
                  color: filterCategory === cat ? (CATEGORY_ICON_STYLE[cat]?.color || '#8b5cf6') : '#fff',
                  fontSize: '0.7rem',
                  padding: '1px 5px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '10px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  zIndex: 2
                }}>{searchStats.categories[cat]}</span>
              )}
            </span>
          </button>
        ))}
        <style>{`
          .category-filter-bar::-webkit-scrollbar { height: 14px; }
          .category-filter-bar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
          .category-filter-bar::-webkit-scrollbar-thumb { 
            background: #cbd5e1; 
            border-radius: 10px; 
            border: 2px solid #f1f5f9;
            transition: all 0.3s;
          }
          .category-filter-bar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </div>
      
      {/* 🏷️ 人気のタグバー（おりぴさんリクエスト） */}
      <div className="tag-filter-bar" style={{
        display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 10px 16px',
        marginBottom: '5px', WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
        scrollbarWidth: 'thin'
      }}>
        {[...new Set(['Switch', 'PS5', 'Steam', 'AI', 'グルメ', 'アニメ', 'YouTuber', 'VTuber', 'スマホ', 'ライフハック', '映画', 'マンガ', 'VTuber', 'ライフスタイル', '経済'])].map(tag => (
          <span
            key={tag}
            className={`tag-bubble ${filterTag === tag ? 'active' : ''}`}
            style={{
              cursor: 'pointer',
              padding: '8px 18px',
              borderRadius: '25px',
              fontSize: '0.82rem',
              fontWeight: '900',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: filterTag === tag ? 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)' : '#fff',
              color: filterTag === tag ? '#fff' : '#64748b',
              border: filterTag === tag ? 'none' : '1.5px solid #e2e8f0',
              boxShadow: filterTag === tag ? '0 4px 12px rgba(76, 29, 149, 0.25)' : 'none',
              transform: filterTag === tag ? 'scale(1.05)' : 'scale(1)',
              scrollSnapAlign: 'start',
              flex: '0 0 auto'
            }}
            onClick={() => {
              const nextTag = filterTag === tag ? '' : tag;
              setFilterTag(nextTag);
              const url = new URL('/', window.location.origin);
              if (nextTag) url.searchParams.set('t', nextTag);
              url.searchParams.delete('c');
              url.searchParams.delete('s');
              window.history.pushState({}, '', url);
            }}
          >
            #{tag}
          </span>
        ))}
        <style>{`
          .tag-filter-bar::-webkit-scrollbar { height: 14px; }
          .tag-filter-bar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
          .tag-filter-bar::-webkit-scrollbar-thumb { 
            background: #cbd5e1; 
            border-radius: 10px; 
            border: 2px solid #f1f5f9;
            transition: all 0.3s;
          }
          .tag-filter-bar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </div>

      {/* ✨ あなたへのおすすめセクション (検索が確定するまでは表示を維持してガタつきを防ぐらび！) */}
      {!debouncedSearchQuery && !filterTag && filterCategory === 'すべて' && (
        <>
          <TrendingHeadline 
            surveys={trendingHeadlineSurveys} 
            navigateTo={navigateTo} 
          />
          <RecommendedSection 
            surveys={recommendedSurveys} 
            navigateTo={navigateTo} 
          />
        </>
      )}

      {/* ⚖️ 公式・ユーザー切り替えタブ (常に表示してレイアウトを安定させるらび！) */}
      <div className="official-tab-navigation" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '4px' }}>
          <button
            onClick={() => setActiveTab('official')}
            className={`tab-btn ${activeTab === 'official' ? 'active' : ''}`}
            style={{
              padding: '8px 4px', fontSize: '1.1rem', fontWeight: 'bold',
              color: activeTab === 'official' ? '#8b5cf6' : '#94a3b8',
              background: 'none', border: 'none',
              borderBottom: activeTab === 'official' ? '3px solid #8b5cf6' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
            }}
          >
            📢 公式・ニュース ({totalOfficialCount})
            {activeTab === 'official' && (
              <span style={{ position: 'absolute', top: '-4px', right: '-8px', fontSize: '0.7rem', background: '#ec4899', color: '#fff', borderRadius: '10px', padding: '1px 5px' }}>HOT</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`}
            style={{
              padding: '8px 4px', fontSize: '1.1rem', fontWeight: 'bold',
              color: activeTab === 'user' ? '#8b5cf6' : '#94a3b8',
              background: 'none', border: 'none',
              borderBottom: activeTab === 'user' ? '3px solid #8b5cf6' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            👥 みんなの投稿 ({totalUserCount})
          </button>
      </div>

      {/* 📋 アンケートリスト */}
      <div className="survey-list" ref={listRef}>
        {isLoading ? (
          <div className="skeleton-container" style={{ width: '100%', minHeight: '500px' }}>
            {[...Array(15)].map((_, n) => (
              <div key={`skel-${n}`} className="skeleton-card">
                <div className="skeleton skeleton-thumb"></div>
                <div className="skeleton-content">
                  <div className="skeleton skeleton-title"></div>
                  <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
                  <div className="skeleton-meta">
                    <div className="skeleton skeleton-meta-item"></div>
                    <div className="skeleton skeleton-meta-item"></div>
                    <div className="skeleton skeleton-meta-item"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (() => {
          const countToUse = activeTab === 'official' ? totalOfficialCount : totalUserCount;
          const totalPages = Math.ceil(countToUse / ITEMS_PER_PAGE);
          const currentItems = finalItems; // finalItems は既に 15件になっているはずらび！

          if (currentItems.length === 0) {
            return <div className="empty-msg">該当するアンケートがないよ〜🐰🥕</div>;
          }

          return (
            <>
              {currentItems.map((s, idx) => {
                const realIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                const isEnded = s.deadline && new Date(s.deadline) < new Date();
                const isPopularRanking = sortMode === 'popular';
                const showScoreBadge = isPopularRanking; // 全てのアンケートにスコアバッジを表示するらび！✨
                let badgeLabel = '';
                if (showScoreBadge) {
                  if (popularMode === 'trending') {
                    badgeLabel = `🔥 ${Math.round(((s.total_votes || 0) * 10 + (s.view_count || 0)) / Math.pow(Math.max(0.5, (new Date() - new Date(s.created_at)) / 3600000) + 2, 1.2))}`;
                  } else if (popularMode === 'views') {
                    badgeLabel = `👁️ ${s.view_count || 0} View`;
                  } else if (popularMode === 'score') {
                    badgeLabel = `⚡ ${(s.total_votes || 0) * SCORE_VOTE_WEIGHT + (s.view_count || 0)} pt`;
                  } else {
                    badgeLabel = `🗳️ ${s.total_votes || 0} 票`;
                  }
                }

                const catStyle = CATEGORY_ICON_STYLE[s.category] || CATEGORY_ICON_STYLE[s.category?.trim()] || CATEGORY_ICON_STYLE['その他'];

                let thumbSrc = null;
                if (s.image_url) {
                  const entries = s.image_url.split(',').map(v => v.trim()).filter(Boolean);
                  const yt = entries.find(v => v.startsWith('yt:'));
                  const nico = entries.find(v => v.startsWith('nico:'));
                  if (yt) thumbSrc = `https://img.youtube.com/vi/${yt.substring(3)}/mqdefault.jpg`;
                  else if (nico) {
                    const fullId = nico.substring(5);
                    const numericId = fullId.replace(/^[a-z]+/, '');
                    thumbSrc = `https://nicovideo.cdn.nimg.jp/thumbnails/${numericId}/${numericId}`;
                  }
                  else if (entries[0]) thumbSrc = entries[0]; // コロンが含まれていても画像URLなら採用
                }

                return (
                  <React.Fragment key={s.id}>
                    <div
                      className={`survey-item-card ${s.tags?.includes('お知らせ') ? 'announcement-card' : ''}`}
                      onClick={() => navigateTo('details', s)}
                      style={s.tags?.includes('お知らせ') ? {
                        background: 'linear-gradient(135deg, #fffbeb, #fff7ed)',
                        border: '2px solid #fbbf24',
                        boxShadow: '0 8px 15px -3px rgba(251, 191, 36, 0.15)',
                        position: 'relative', '--cat-color': '#fbbf24'
                      } : {
                        background: 'white',
                        border: `2px solid ${catStyle.color}44`,
                        '--cat-color': catStyle.color
                      }}
                    >
                      {thumbSrc ? (
                        <div className="video-thumb-wrapper" style={{ position: 'relative' }}>
                          <div className="category-icon-thumb placeholder-base" style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            background: catStyle.color, opacity: 0.1, zIndex: 0,
                            borderRadius: 'inherit'
                          }} />
                          <img
                            src={thumbSrc} 
                            alt={`${s.title} のサムネイル`}
                            className="survey-item-thumb" 
                            loading={idx < 4 ? "eager" : "lazy"}
                            {...(idx < 4 ? { fetchpriority: "high" } : {})}
                            onLoad={e => e.target.classList.add('ready')}
                            onError={e => {
                               if (!e.target.src.includes('nico_fallback.jpg')) {
                                 e.target.src = '/assets/images/nico_fallback.jpg';
                               } else {
                                 e.target.style.display = 'none';
                               }
                             }}
                            style={{ position: 'relative', zIndex: 1 }}
                          />
                          <div className="thumb-category-badge" style={{
                            color: catStyle.color,
                            border: `1.5px solid ${catStyle.color}44`,
                            background: 'rgba(255, 255, 255, 0.95)', zIndex: 2
                          }}>
                            <span style={{ fontSize: '1.2em' }}>{catStyle.icon}</span>
                            <span>{s.category || 'その他'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="category-badge-placeholder" style={{
                          flex: '0 0 auto',
                          marginRight: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '100px'
                        }}>
                          <div className="thumb-category-badge" style={{
                            color: catStyle.color,
                            border: `1.5px solid ${catStyle.color}88`,
                            background: 'rgba(255, 255, 255, 0.95)',
                            padding: '6px 14px',
                            fontSize: '0.9rem',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: `0 4px 12px ${catStyle.color}15`
                          }}>
                            <span style={{ fontSize: '1.2em' }}>{catStyle.icon}</span>
                            <span>{s.category || 'その他'}</span>
                          </div>
                        </div>
                      )}

                      <div className="survey-item-content">
                        <div className="survey-item-info">
                          <span className="survey-item-title" style={{
                            backgroundColor: 'transparent', padding: '4px 0', borderRadius: '0',
                            display: 'block', marginBottom: '10px', boxShadow: 'none',
                            border: 'none', color: '#1e293b'
                          }}>
                            {isPopularRanking && (realIdx === 0 ? '👑 ' : realIdx === 1 ? '🥈 ' : realIdx === 2 ? '🥉 ' : `${realIdx + 1}位 `)}
                            {s.tags?.includes('お知らせ') && s.title.includes('||')
                              ? s.title.split('||')[0].trim()
                              : s.title}
                            {s.tags?.includes('お知らせ') && (
                              <span style={{ marginLeft: '8px', fontSize: '1.2rem', display: 'inline-block', verticalAlign: 'middle' }}>✨</span>
                            )}
                          </span>
                          <div className="card-right-actions">
                            <button
                              className={`watch-star-btn ${watchedIds.includes(s.id) ? 'active' : ''}`}
                              onClick={e => toggleWatch(e, s.id)}
                              aria-label={watchedIds.includes(s.id) ? "ウォッチリストから削除" : "ウォッチリストに追加"}
                            >{watchedIds.includes(s.id) ? '★' : '☆'}</button>
                            <span className={`status-badge ${isEnded ? 'ended' : 'active'}`}>
                              {isEnded ? '終了' : '受付中'}
                            </span>
                          </div>
                        </div>

                        <div className="survey-item-meta-row">
                          {showScoreBadge && <span className="popular-score-badge">{badgeLabel}</span>}
                          <span className="survey-item-created-at" title="作成日時">🐣 {formatWithDay(s.created_at)}</span>
                          {s.deadline && <span className="survey-item-deadline">〆: {formatWithDay(s.deadline)}</span>}
                          <div className="card-stats-row">
                            <span className="survey-item-votes" title="投票数">🗳️ {s.total_votes || 0}</span>
                            <span className="survey-item-views" title="閲覧数">👁️ {s.view_count || 0}</span>
                            <span className="survey-item-likes" title="いいね数">👍 {s.likes_count || 0}</span>
                            <span className="survey-item-comments" title="コメント数">💬 {s.comment_count || 0}</span>
                          </div>
                        </div>

                        {s.tags && s.tags.length > 0 && (
                          <div className="tag-bubble-row">
                            {s.tags
                              .filter(tag => !tag.startsWith('_STAMP:'))
                              .map(tag => (
                                <span
                                  key={tag}
                                  className={`tag-bubble ${filterTag === tag ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFilterTag(filterTag === tag ? '' : tag);
                                  }}
                                >#{tag}</span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

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

      {/* 📁 アーカイブ・ダイジェスト */}
      {sortMode === 'latest' && searchQuery === '' && filterCategory === 'すべて' && !filterTag && currentPage === 1 && (
        <div className="archive-digest-section" style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#64748b' }}>📁 アーカイブ・ダイジェスト</h3>
            <button onClick={() => setSortMode('ended')} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 'bold', cursor: 'pointer' }}>もっと見る ⇠</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {(surveys || [])
              .filter(s => s.deadline && new Date(s.deadline) < new Date())
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(0, 3)
              .map(s => (
                <div
                  key={s.id}
                  className="archive-mini-card"
                  onClick={() => navigateTo('details', s)}
                  style={{ background: 'white', padding: '12px', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>🗳️ {s.total_votes || 0} 票 / 💬 {s.comment_count || 0}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 📄 ページネーション */}
      <div className="pagination-container-outer">
        <Pagination
          current={currentPage}
          total={Math.ceil((activeTab === 'official' ? totalOfficialCount : totalUserCount) / ITEMS_PER_PAGE)}
          onPageChange={p => { 
            setCurrentPage(p); 
            if (listRef.current) {
              const yOffset = -120; // ヘッダーやフィルターバーの分を考慮して調整
              const y = listRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }
          }}
        />
      </div>
    </>
  );
};

export default SurveyListView;
