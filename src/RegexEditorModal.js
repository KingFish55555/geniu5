// --- START OF FILE RegexEditorModal.js (V5 - Ultimate ST Clone) ---

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

// ==================== 全新！SillyTavern 風格 Regex 編輯器 (V2 - 功能完整版) ====================
const RegexEditorModal = ({ rule, onSave, onClose, isGlobal }) => {
  // === 基礎欄位 State ===
  const [notes, setNotes] = useState('');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [flags, setFlags] = useState('g');
  
  // === 選項 State ===
  const [enabled, setEnabled] = useState(true);
  const [runOnEdit, setRunOnEdit] = useState(false);
  const [promptOnly, setPromptOnly] = useState(false);

  // === Placement State ===
  const [placement, setPlacement] = useState([1]); // 預設為 [AI 輸出]

  // 當 Modal 打開或編輯的規則變更時，載入資料
  useEffect(() => {
    if (rule && !rule.isNew) {
      // 載入現有規則
      setNotes(rule.notes || '');
      setFind(rule.find || '');
      setReplace(rule.replace || '');
      setFlags(rule.flags || 'g');
      setEnabled(rule.enabled === undefined ? true : rule.enabled);
      setRunOnEdit(rule.runOnEdit || false);
      setPromptOnly(rule.promptOnly || false);
      setPlacement(rule.placement || [1]); // 如果沒有 placement，預設為 AI 輸出
    } else {
      // 重設為新增規則的預設值
      setNotes('');
      setFind('');
      setReplace('');
      setFlags('g');
      setEnabled(true);
      setRunOnEdit(false);
      setPromptOnly(false);
      setPlacement([1]);
    }
  }, [rule]);

  // 處理 Placement 勾選框的變更
  const handlePlacementChange = (value) => {
    setPlacement(prev => {
      if (prev.includes(value)) {
        return prev.filter(item => item !== value); // 取消勾選
      } else {
        return [...prev, value]; // 新增勾選
      }
    });
  };
  
  // 處理 "暫時性" 選項的變更 (它們是互斥的)
  const handleTemporaryChange = (isPromptOnly) => {
      setPromptOnly(isPromptOnly);
  };

  // 處理儲存
  const handleSave = () => {
    if (!find.trim()) {
      alert('請輸入要尋找的正規表示式！');
      return;
    }
    try {
      new RegExp(find, flags);
    } catch (error) {
      alert(`正規表示式或旗標(Flag)格式錯誤：\n\n${error.message}`);
      return;
    }
    
    // 將所有 state 組合回一個物件並傳遞出去
    onSave({ notes, find, replace, flags, enabled, runOnEdit, promptOnly, placement });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
        <div className="modal-header">
          <h3>{isGlobal ? '編輯全域規則' : '編輯區域規則'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>腳本名稱</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="新規則" autoFocus />
          </div>
          <div className="form-group">
            <label>尋找正規表示式 (包含旗標)</label>
            <div className="regex-with-flags">
                <textarea className="regex-find-input" value={find} onChange={(e) => setFind(e.target.value)} rows={4} placeholder="在此輸入樣式..."/>
                <div className="regex-flags-container">
                    <span>/</span>
                    <input type="text" className="regex-flags-input" value={flags} onChange={(e) => setFlags(e.target.value.toLowerCase())} placeholder="g"/>
                </div>
            </div>
          </div>
          <div className="form-group">
            <label>取代為 (使用 $1, $2... 來捕獲群組)</label>
            <textarea value={replace} onChange={(e) => setReplace(e.target.value)} rows={4} placeholder="留空代表刪除..." />
          </div>
          
          {/* ✨ 全新的選項 UI ✨ */}
          <div className="st-regex-grid">
            <div className="st-grid-group">
              <h4 className="option-group-title">影響條目 (Placement)</h4>
              <div className="checkbox-grid-st">
                <label><input type="checkbox" checked={placement.includes(0)} onChange={() => handlePlacementChange(0)} /> 使用者輸入</label>
                <label><input type="checkbox" checked={placement.includes(1)} onChange={() => handlePlacementChange(1)} /> AI 輸出</label>
                <label><input type="checkbox" checked={placement.includes(3)} onChange={() => handlePlacementChange(3)} /> 斜線命令</label>
                <label><input type="checkbox" checked={placement.includes(4)} onChange={() => handlePlacementChange(4)} /> 世界資訊</label>
              </div>
            </div>
            <div className="st-grid-group">
              <h4 className="option-group-title">其他選項</h4>
              <div className="checkbox-grid-st">
                <label><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> 啟用</label>
                <label><input type="checkbox" checked={runOnEdit} onChange={(e) => setRunOnEdit(e.target.checked)} /> 編輯時執行</label>
              </div>
            </div>
             <div className="st-grid-group full-span">
                <h4 className="option-group-title">暫時性 (Temporary)</h4>
                <div className="checkbox-grid-inline" style={{justifyContent: 'flex-start'}}>
                    <label><input type="checkbox" checked={!promptOnly} onChange={() => handleTemporaryChange(false)} /> 僅修改聊天顯示</label>
                    <label><input type="checkbox" checked={promptOnly} onChange={() => handleTemporaryChange(true)} /> 僅修改系統提示詞</label>
                </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn"><Save size={16} /> 儲存</button>
        </div>
      </div>
    </div>
  );
};

export default RegexEditorModal;