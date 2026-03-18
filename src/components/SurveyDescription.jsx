import React from 'react';

// Deploy Kick v2: 2026-03-18 14:40 🚀🐰
const SurveyDescription = ({ description, renderCommentContent }) => {
  if (!description) return null;

  return (
    <div className="survey-description-box" style={{
      fontSize: '0.95rem',
      color: '#334155',
      lineHeight: '1.8',
      background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
      padding: '20px',
      borderRadius: '16px',
      margin: '0 auto 30px auto', // 上下の余白を調整
      maxWidth: '860px', // widthを調整してスッキリ
      borderLeft: '6px solid #8b5cf6',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
      whiteSpace: 'pre-wrap', // 改行を反映
      textAlign: 'left' // テキストは左揃え
    }}>
      {renderCommentContent(description)}
    </div>
  );
};

export default SurveyDescription;
