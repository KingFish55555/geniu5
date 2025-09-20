import React from 'react';
import { X, ShieldAlert } from 'lucide-react'; // 我們用一個盾牌圖示

const DisclaimerModal = ({ show, onClose }) => {
  // 如果外部沒有指令要顯示，我們就什麼都不渲染
  if (!show) {
    return null;
  }

  return (
    // 我們完全重用您現有的 modal 樣式
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={24} />
              <span>免責聲明</span>
            </div>
          </h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

            
        <div className="modal-body">
        <p style={{textAlign: 'center', fontWeight: 'bold'}}>服務條款與免責聲明</p>
        <p>&nbsp;</p>
        <p>歡迎使用 GENIU5（以下簡稱「本服務」）！在您開始與 AI 互動前，請詳細閱讀以下條款。當您使用本服務時，即表示您已詳閱、理解並完全同意接受本條款的所有內容。</p>
        <p>&nbsp;</p>
        <p><strong>第一條：服務性質與內容警告</strong></p>
        <ul>
            <li><strong>虛構性質：</strong> 本服務提供與 AI 虛擬角色的互動體驗。所有角色、對話與情節皆為大型語言模型（LLM）基於演算法生成的純屬虛構產物，不代表任何真實人物或事件，亦不保證其準確性或適當性。</li>
            <li><strong>成人內容 (NSFW)：</strong> 本服務的內容可能導向成人主題，其設計僅為娛樂目的。請務必將所有互動內容視為虛構，切勿將其與現實世界混淆。</li>
        </ul>
        <p>&nbsp;</p>
        <p><strong>第二條：使用者資格與年齡限制</strong></p>
        <p>本服務僅供達到您所在地區法定成年年齡（通常為18歲或以上）的使用者。若您未滿法定成年年齡，您必須立即停止使用本服務。</p>
        <p>&nbsp;</p>
        <p><strong>第三條：使用者行為準則</strong></p>
        <p>您同意對您在本服務中的所有行為（包括您輸入的提示詞）負全部責任。您承諾絕不利用本服務從事、生成或誘導任何違反當地法律法規的內容，尤其是嚴禁任何涉及真實世界中兒童剝削、非法活動、真實暴力威脅或仇恨言論的行為。</p>
        <p>&nbsp;</p>
        <p><strong>第四條：免責聲明與責任限制</strong></p>
        <ul>
            <li><strong>按「現狀」提供：</strong> 本服務乃依「現狀」提供，開發者不對服務的穩定性、可靠性、準確性或持續可用性做出任何明示或暗示的保證。</li>
            <li><strong>AI 內容免責：</strong> AI 生成的內容可能無法預測、不準確或不符合您的預期。開發者對 AI 產出的任何資訊或情節不承擔任何形式的保證或法律責任。</li>
            <li><strong>非專業建議：</strong> 本服務的所有內容均不構成且不能替代任何專業的醫療、法律、財務或心理建議。</li>
        </ul>
        <p>&nbsp;</p>
        <p><strong>第五條：資料儲存與隱私</strong></p>
        <p><strong>您的隱私至關重要。</strong>本服務的一大核心設計是您的所有資料，包括角色、對話紀錄、API金鑰及個人設定，皆完整儲存在您目前使用的裝置瀏覽器中 (IndexedDB)。本服務沒有中央伺服器，開發者不會、也無法存取、查看或上傳您的任何個人資料。</p>
        <p>因此，您對您的資料擁有完全的控制權，但也需自行承擔保管責任。若您清除瀏覽器資料、更換裝置或瀏覽器，本地資料將會遺失。請務必定期使用「設定」頁面中的「資料管理」功能進行手動備份。</p>
        <p>&nbsp;</p>
        <p><strong>第六條：條款變更</strong></p>
        <p>開發者可能隨時修訂本條款。您在條款變更後繼續使用本服務，將被視為已接受修訂後的條款。建議您定期查看本聲明。</p>
        <p>&nbsp;</p>
        <p>Regex（區域正規表示式）功能目前仍有bug，請斟酌使用，如影響正常遊玩請自行移除Regex，感謝配合！祝遊玩愉快！</p>
        </div>

      </div>
    </div>
  );
};

export default DisclaimerModal;