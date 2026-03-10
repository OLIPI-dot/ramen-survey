import React from 'react';

function FooterModals({
  showingTerms, setShowingTerms,
  showingPrivacy, setShowingPrivacy,
  showingAbout, setShowingAbout,
  showingContact, setShowingContact,
  contactType, setContactType,
  contactEmail, setContactEmail,
  contactMessage, setContactMessage,
  isSendingInquiry, handleSubmitInquiry
}) {
  return (
    <>
      {showingTerms && (
        <div className="modal-overlay" onClick={() => setShowingTerms(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📖 利用規約</h3>
            <div className="modal-body">
              <p>アンケート広場をご利用いただきありがとうございます。以下の規約をよくお読みになり、同意の上でご利用ください。</p>
              <ul>
                <li>他のユーザーが不快になるような内容の投稿はご遠慮ください。</li>
                <li>誹謗中傷・差別的な表現・違法なコンテンツの投稿は禁止です。</li>
                <li>不適切と判断された投稿は、予告なく削除することがあります。</li>
                <li>終了したアンケートデータは、締切後7日で自動的に完全削除されます。</li>
                <li>本サービスは予告なく内容を変更・終了する場合があります。</li>
                <li>本サービスの利用によって生じたいかなる損害についても、運営は責任を負いません。</li>
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
              <p>当サービスは、以下の方針に基づき個人情報を取り扱います。</p>
              <ul>
                <li><strong>収集する情報：</strong>Googleアカウントでログインした場合、お名前・メールアドレス・プロフィール画像URLを取得します。</li>
                <li><strong>利用目的：</strong>取得した情報はアンケート機能の提供・改善のためにのみ使用します。</li>
                <li><strong>第三者への提供：</strong>法令に基づく場合を除き、個人情報を第三者に提供することはありません。</li>
                <li><strong>Cookie・広告：</strong>当サイトではGoogle AdSenseを使用しています。広告配信に際してCookieが使用される場合があります。詳細は<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Googleのプライバシーポリシー</a>をご確認ください。</li>
                <li><strong>お問い合わせ：</strong>個人情報の取り扱いに関するご質問は、お問い合わせフォームよりご連絡ください。</li>
              </ul>
            </div>
            <button onClick={() => setShowingPrivacy(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}
      {showingAbout && (
        <div className="modal-overlay" onClick={() => setShowingAbout(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🌟 アンケート広場について</h3>
            <div className="modal-body">
              <p>アンケート広場は、誰でも簡単にアンケートを作って、みんなに投票してもらえる参加型サービスです。</p>
              <ul>
                <li>🗳️ ログインなしでも投票できます</li>
                <li>🔒 Googleログインでマイアンケートの管理ができます</li>
                <li>⭐ 気になるアンケートをウォッチリストに追加できます</li>
                <li>🕒 締切時間を設定したアンケートも作れます</li>
                <li>🏷️ カテゴリ別に絞り込んで見ることができます</li>
                <li>🗑️ 終了したアンケートは、公平を期すために<span style={{ fontWeight: 'bold' }}>締切から7日後</span>に自動的に削除されます</li>
              </ul>
              <p>みんなの「ちょっと気になる」を気軽に集められる場所です。ぜひ楽しく使ってください！🌈</p>
            </div>
            <button onClick={() => setShowingAbout(false)} className="modal-close-btn">閉じる</button>
          </div>
        </div>
      )}
      {showingContact && (
        <div className="modal-overlay" onClick={() => setShowingContact(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📩 お問い合わせ</h3>
            <div className="modal-body">
              <p>削除依頼・不具合報告・ご意見などは、下記よりお気軽にご連絡ください。</p>
              <div className="contact-form-item">
                <label>お問い合わせ種別</label>
                <select className="contact-select" value={contactType} onChange={e => setContactType(e.target.value)}>
                  <option>削除依頼</option>
                  <option>不具合報告</option>
                  <option>ご意見・ご要望</option>
                  <option>その他</option>
                </select>
              </div>
              <div className="contact-form-item">
                <label>メールアドレス（返信希望の場合）</label>
                <input className="contact-input" type="email" placeholder="example@email.com" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              </div>
              <div className="contact-form-item">
                <label>内容</label>
                <textarea className="contact-textarea" placeholder="お問い合わせ内容をご記入ください..." value={contactMessage} onChange={e => setContactMessage(e.target.value)} />
              </div>
              <p className="contact-notice">※ 自動返信はありません。返信が必要な場合はメールアドレスをご記入ください。</p>
            </div>
            <div className="modal-actions-contact">
              <button
                className="send-btn"
                onClick={handleSubmitInquiry}
                disabled={isSendingInquiry}
              >{isSendingInquiry ? '⌛ 送信中...' : '📧 送信する'}</button>
              <button className="cancel-btn" onClick={() => setShowingContact(false)} disabled={isSendingInquiry}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FooterModals;
