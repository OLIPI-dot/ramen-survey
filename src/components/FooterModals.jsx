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
              <p>「みんなのアンケート広場」（以下「当サイト」）をご利用いただきありがとうございます。当サイトは、健全でオープンな意見交換の場を提供することを目的に運営されています。利用者の皆様には、以下の規約に同意いただいた上でご利用をお願いしております。</p>
              
              <h4 style={{ color: '#475569', marginBottom: '8px' }}>1. 禁止事項</h4>
              <p>当サイトのコミュニティの平穏を保つため、以下の行為を禁止します。</p>
              <ul>
                <li>特定の個人・団体への誹謗中傷、差別的な発言、または名誉毀損にあたる投稿。</li>
                <li>過度に暴力的な表現、性的なコンテンツ、その他公序良俗に反する内容の投稿。</li>
                <li>スパム行為、宣伝・勧誘、または当サイトの運営を妨害する行為。</li>
                <li>他者の著作権、肖像権、プライバシー権を侵害する行為。</li>
              </ul>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>2. コンテンツの取り扱い</h4>
              <ul>
                <li>投稿されたアンケートやコメントの権利は投稿者に帰属しますが、当サイトの運営・改善のために無償で使用・改変できるものとします。</li>
                <li>不適切と判断されたコンテンツは、運営側の裁量で予告なく修正または削除することがあります。</li>
                <li><strong>データの永久保存：</strong> 当サイトでは皆様の歩みを大切に保管するため、終了したアンケートデータは「アーカイブ」として永久保存され、いつでも振り返ることが可能です。</li>
              </ul>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>3. 免責事項</h4>
              <p>当サイトの利用によって生じたいかなる損害についても、運営者は一切の責任を負いません。本規約は、必要に応じて事前通知なく変更される場合があります。</p>
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
              <p>当サイトは、利用者の皆様に安心してサービスをご利用いただけるよう、個人情報の保護に最大限の配慮を払っています。以下に、情報の収集方法、利用目的、および管理方針を定めます。</p>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>1. 収集する情報の種類</h4>
              <ul>
                <li><strong>認証情報：</strong> Googleアカウントを利用してログインされた場合、Googleより提供される公開プロフィール情報（ユーザー名、メールアドレス、プロフィール画像URL）を取得します。</li>
                <li><strong>活動ログ：</strong> IPアドレス、ブラウザの種類、アクセス日時、投票・投稿履歴などの情報を、サービス改善や不正防止の目的で取得します。</li>
              </ul>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>2. 情報の利用目的</h4>
              <p>取得した情報は、以下の目的以外には使用しません。</p>
              <ul>
                <li>アンケート管理機能（マイアンケート・ウォッチリスト）の提供。</li>
                <li>不適切な投稿の監視およびスパム行為の防止。</li>
                <li>サービスの利用動向の分析、および新機能の開発・改善。</li>
              </ul>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>3. 広告配信とCookieについて</h4>
              <p>当サイトでは、第三者配信事業者であるGoogleの広告サービス「Google AdSense」を利用しています。広告配信事業者は、利用者の興味に応じた広告を表示するために、Cookie（クッキー）を使用することがあります。詳細およびCookieを無効化する方法については、<a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Googleのプライバシーポリシー</a>をご確認ください。</p>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>4. 情報の管理と提供</h4>
              <p>当サイトは、法令に基づき開示が必要な場合を除き、個人情報を同意なく第三者に提供することはありません。取得した情報は、適切なセキュリティ対策を講じて厳重に管理します。</p>
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
              <p>「みんなのアンケート広場」は、日常のちょっとした疑問や、世の中の新しいトレンドについて、誰もが気軽に「本音」で投票・意見交換ができるオンライン・プラットフォームです。多様な価値観に触れ、新しい気づきや共感を見つける場所として運営されています。</p>
              
              <h4 style={{ color: '#475569', marginBottom: '8px' }}>💡 自由な意見交換と安心の両立</h4>
              <p>私たちは、「匿名性」による自由な発言をサポートすると同時に、AI技術（守護霊キャラクター「らび」）と運営による24時間体制の監視を組み合わせ、誰もが安心して参加できる温かい空間作りを大切にしています。</p>

              <h4 style={{ color: '#475569', marginBottom: '8px' }}>🚀 主な機能と特徴</h4>
              <ul>
                <li><strong>即時投票：</strong> 会員登録なしで、最新の話題に1タップで参加可能です。</li>
                <li><strong>マイアンケート：</strong> Googleログインにより、自分の興味関心を反映した独自のアンケートを管理・公開できます。</li>
                <li><strong>アーカイブ機能：</strong> 終了したアンケートも「アーカイブ」として広場に残り続け、コメントやリアクションを通じた交流が継続可能です。</li>
                <li><strong>多彩なカテゴリ：</strong> エンタメ、グルメ、ビジネス、テクノロジーなど、12以上のジャンルを網羅。</li>
              </ul>
              <p>あなたの声が、誰かの新しい発見につながります。ぜひ、この広場を一緒に盛り上げてください！🌈✨</p>
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
