import React from 'react';

const RecommendedSection = ({ surveys, navigateTo }) => {
  if (!surveys || surveys.length === 0) return null;

  return (
    <div className="recommended-section" style={{
      marginBottom: '40px',
      padding: '24px',
      background: 'linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%)',
      borderRadius: '28px',
      border: '1px solid #f0e7ff',
      animation: 'fadeInRecommend 0.8s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '1.6rem' }}>✨</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#4c1d95', margin: 0 }}>
          あなたにぴったりの話題 <span style={{ fontSize: '0.8rem', fontWeight: 'normal', opacity: 0.7, marginLeft: '8px' }}>おすすめ</span>
        </h2>
      </div>

      <div className="recommended-scroll-container" style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '16px',
        paddingBottom: '16px',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity'
      }}>
        {surveys.map(s => {
          let thumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400';
          if (s.image_url) {
            const parts = s.image_url.split(',')[0].trim();
            if (parts.startsWith('yt:')) thumb = `https://img.youtube.com/vi/${parts.substring(3)}/mqdefault.jpg`;
            else if (!parts.startsWith('nico:')) thumb = parts;
          }

          return (
            <div 
              key={s.id} 
              className="rec-card" 
              onClick={() => navigateTo('details', s)}
              style={{
                background: '#fff',
                borderRadius: '20px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '220px',
                flex: '0 0 220px',
                scrollSnapAlign: 'start'
              }}
            >
              <div style={{ width: '100%', height: '100px', borderRadius: '14px', overflow: 'hidden' }}>
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '0.88rem', 
                  lineHeight: '1.4',
                  height: '2.8em',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  color: '#1e293b'
                }}>
                  {s.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>🗳️ {s.total_votes || 0}票</span>
                  <span style={{ color: '#8b5cf6', fontWeight: '800' }}>#{s.category}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .recommended-scroll-container::-webkit-scrollbar { height: 6px; }
        .recommended-scroll-container::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .recommended-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .recommended-scroll-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .rec-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 24px rgba(139, 92, 246, 0.15);
          border-color: #8b5cf6;
        }
        @keyframes fadeInRecommend {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RecommendedSection;
