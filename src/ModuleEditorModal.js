// src/ModuleEditorModal.js

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const ModuleEditorModal = ({ module, onSave, onClose }) => {
  // 使用 state 來管理表單中的所有資料
  const [editedModule, setEditedModule] = useState(null);

  // 當外部傳入的 module prop 改變時，更新我們內部的 state
  useEffect(() => {
    // 進行深度複製，避免直接修改原始 prop
    if (module) {
      setEditedModule(structuredClone(module));
    }
  }, [module]);

  // 處理表單欄位變更的通用函式
  const handleChange = (field, value) => {
    setEditedModule(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // 呼叫從 PromptsPage 傳來的 onSave 函式，並把修改後的資料傳回去
    onSave(editedModule);
  };

  // 如果 state 還沒準備好，就不渲染任何東西
  if (!editedModule) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>編輯提示詞模組</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* 模組名稱 */}
          <div className="form-group">
            <label>模組名稱</label>
            <input
              type="text"
              value={editedModule.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>

          {/* 角色 (下拉選單) */}
          <div className="form-group">
            <label>角色 (Role)</label>
            <select
              className="setting-select"
              value={editedModule.role || 'system'}
              onChange={(e) => handleChange('role', e.target.value)}
            >
              <option value="system">系統 (System)</option>
              <option value="user">使用者 (User)</option>
              <option value="assistant">AI 助手 (Assistant)</option>
            </select>
          </div>

          {/* ▼▼▼ 在這裡插入新的 Triggers UI 區塊 ▼▼▼ */}
          <div className="form-group trigger-group">
            <div className="form-label-group">
              <label>觸發器 (Triggers)</label>
              {/* 一個小開關，用來啟用/禁用觸發器 */}
              <label className="switch">
                <input
                  type="checkbox"
                  checked={editedModule.triggers?.enabled || false}
                  onChange={(e) => handleChange('triggers', { ...editedModule.triggers, enabled: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>
            {/* 只有在啟用時，才顯示文字輸入框 */}
            {editedModule.triggers?.enabled && (
              <input
                type="text"
                placeholder="輸入觸發關鍵字，用逗號分隔"
                value={editedModule.triggers?.text || ''}
                onChange={(e) => handleChange('triggers', { ...editedModule.triggers, text: e.target.value })}
              />
            )}
          </div>
          
          {/* 提示詞內容 */}
          <div className="form-group">
            <label>提示詞內容 (Content)</label>
            <textarea
              value={editedModule.content}
              onChange={(e) => handleChange('content', e.target.value)}
              rows={8}
              readOnly={editedModule.readOnly}
            />
          </div>

          {/* 更多進階設定可以放在這裡，例如 Triggers 和 Position */}
          {/* 目前為了簡化，我們先不加入 Triggers 和 Position 的 UI */}
          
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="secondary-btn">取消</button>
          <button onClick={handleSave} className="primary-btn">
            <Save size={16} /> 儲存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleEditorModal;