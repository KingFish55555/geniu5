// src/OocCommandEditorModal.js

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const OocCommandEditorModal = ({ command, onSave, onClose }) => {
  const [notes, setNotes] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    // 如果是編輯模式，就載入現有的資料
    if (command) {
      setNotes(command.notes || '');
      setContent(command.content || '');
    }
  }, [command]);

  const handleSave = () => {
    if (!notes.trim()) {
      alert('請為您的指令輸入一個備註！');
      return;
    }
    // 將新的備註和內容傳回給父元件
    onSave({ notes, content });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{command ? '編輯 OOC 指令' : '新增 OOC 指令'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>備註 (顯示在選單中)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：讓角色繼續寫"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>指令內容 (填入輸入框)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="例如：(OOC: {{char}}，請繼續寫下去。)"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn">
            <Save size={16} /> 儲存指令
          </button>
        </div>
      </div>
    </div>
  );
};

export default OocCommandEditorModal;