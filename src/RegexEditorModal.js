import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const RegexEditorModal = ({ rule, onSave, onClose }) => {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [notes, setNotes] = useState(''); // 我們也加上一個備註欄位

  useEffect(() => {
    if (rule) {
      setFind(rule.find || '');
      setReplace(rule.replace || '');
      setNotes(rule.notes || '');
    }
  }, [rule]);

  const handleSave = () => {
    if (!find.trim()) {
      alert('請輸入要尋找的正規表示式！');
      return;
    }
    // 檢查正規表示式是否有效，防止使用者輸入錯誤導致 App 崩潰
    try {
      new RegExp(find, 'g');
    } catch (error) {
      alert(`正規表示式格式錯誤：\n\n${error.message}\n\n請檢查您的輸入。`);
      return;
    }
    onSave({ find, replace, notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{rule ? '編輯正規表示式' : '新增正規表示式'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>備註 (方便您辨識用途)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：刪除 AI 的思考過程"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>尋找 (Find) - 請輸入正規表示式</label>
            <textarea
              value={find}
              onChange={(e) => setFind(e.target.value)}
              rows={3}
              placeholder="例如：<thinking>[\\s\\S]*?<\\/thinking>"
            />
          </div>
          <div className="form-group">
            <label>替換為 (Replace) - 留空代表刪除</label>
            <textarea
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              rows={3}
              placeholder="例如：留空"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn">
            <Save size={16} /> 儲存規則
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegexEditorModal;