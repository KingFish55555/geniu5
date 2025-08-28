// src/OocCommandSelectorModal.js

import React from 'react';
import { X, MessageSquarePlus } from 'lucide-react';

const OocCommandSelectorModal = ({ commands, onSelect, onClose }) => {
  
  const handleSelect = (command) => {
    onSelect(command.content); // 只將 content 傳回去
    onClose(); // 選擇後自動關閉
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>選擇 OOC 指令</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {commands.length > 0 ? (
            <div className="character-list">
              {commands.map((command) => (
                <div
                  key={command.id}
                  className="character-list-item"
                  onClick={() => handleSelect(command)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="character-select-area">
                    <div className="character-avatar-large" style={{ backgroundColor: 'transparent', border: 'none' }}>
                      <MessageSquarePlus size={24} color={'var(--text-secondary)'} />
                    </div>
                    <div className="character-info">
                      {/* 這裡只顯示備註 */}
                      <h4>{command.notes}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>您尚未在「設定」頁面中新增任何 OOC 指令。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OocCommandSelectorModal;