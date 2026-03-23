import React from 'react';

const SurveyDescription = ({ description, renderCommentContent }) => {
  if (!description) return null;

  // 🔗 説明文の中からリンクを救出するらび！ [テキスト](URL) 形式を最優先、なければ生のURLを探すよ。
  const mdMatch = description.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
  const rawMatch = description.match(/(https?:\/\/[^\s)]+)/);
  
  const displayLink = mdMatch 
    ? { text: mdMatch[1], url: mdMatch[2] } 
    : (rawMatch ? { text: '出典元（詳細を見る）', url: rawMatch[0] } : null);
  
  // 📝 リンク部分を本文から隠して、ボタンとして別に表示するよ。
  // 本文中にあるリンク（Markdown・生のURL両方）をすべて非表示にするらび。
  let cleanBody = description
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '')
    .replace(/https?:\/\/[^\s)]+/g, '')
    .trim();

  return (
    <div className="survey-description-container" style={{
      margin: '0 auto 50px auto',
      maxWidth: '860px',
      position: 'relative',
    }}>
      {/* プレミアムなラベル 🏷️ */}
      <div style={{
        position: 'absolute',
        top: '-16px',
        left: '40px',
        background: 'linear-gradient(135deg, #FF6B95, #7c3aed)',
        color: 'white',
        padding: '6px 20px',
        borderRadius: '30px',
        fontSize: '0.85rem',
        fontWeight: '900',
        zIndex: 5,
        boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        letterSpacing: '0.08em'
      }}>
        <span style={{ fontSize: '1.2rem' }}>💎</span>
        <span>解説 / ソース元</span>
      </div>

      <div className="survey-description-box" style={{
        fontSize: '1.1rem',
        color: '#1e293b',
        lineHeight: '2.1',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(255, 255, 255, 0.7)',
        borderRadius: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
        whiteSpace: 'pre-wrap',
        textAlign: 'justify',
        position: 'relative',
        fontFamily: "'Inter', 'Noto Sans JP', sans-serif"
      }}>
        {/* 装飾的な背景アート 🎨 */}
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05), transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* 本文 💡 (おりぴさんリクエスト: ホワイトアウト演出) */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          maxHeight: '240px', // ここで長さを制限
          overflow: 'hidden',
          marginBottom: displayLink ? '32px' : '0',
          color: '#334155'
        }}>
          {cleanBody}
          {/* 下部でジワ〜ッと消えていくエフェクトらび！✨ */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.95) 90%)',
            pointerEvents: 'none'
          }} />
        </div>

        {/* 🔗 プレミアム・ソースボタン */}
        {displayLink && (
          <div style={{ textAlign: 'center' }}>
            <a
              href={displayLink.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                borderRadius: '18px',
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                textDecoration: 'none',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 10px 20px rgba(124, 58, 237, 0.25)',
                cursor: 'pointer',
                border: 'none'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(124, 58, 237, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 10px 20px rgba(124, 58, 237, 0.25)';
              }}
            >
              <span>🌐</span>
              <span>続きを読む（出典元に飛びます）</span>
              <span style={{ fontSize: '1.2em' }}>›</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyDescription;
