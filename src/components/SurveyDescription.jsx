import React from 'react';

// Deploy Kick v2: 2026-03-18 14:40 🚀🐰
const SurveyDescription = ({ description, renderCommentContent }) => {
  if (!description) return null;

  return (
    <div className="survey-description-container" style={{
      margin: '0 auto 30px auto',
      maxWidth: '860px',
      position: 'relative'
    }}>
      {/* キャッチーなラベル 🏷️ */}
      <div style={{
        position: 'absolute',
        top: '-12px',
        left: '24px',
        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        color: 'white',
        padding: '4px 16px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        zIndex: 1,
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span>📝</span>
        <span>解説 / 参考元</span>
      </div>

      <div className="survey-description-box" style={{
        fontSize: '0.95rem',
        color: '#334155',
        lineHeight: '1.9',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        padding: '32px 24px 24px 24px',
        borderRadius: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景の装飾アクセント 🎨 */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 0 }}>
          {renderCommentContent(description)}
        </div>
      </div>
    </div>
  );
};

export default SurveyDescription;
