// src/ModuleEditorModal.js

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const ModuleEditorModal = ({ module, onSave, onClose }) => {
  const [editedModule, setEditedModule] = useState(null);

  useEffect(() => {
    if (module) {
      const safeModule = {
        ...module,
        role: module.role || 'system',
        order: module.order ?? 100,
        position: module.position ?? { type: 'relative', depth: 4 },
        triggers: module.triggers ?? { enabled: false, text: '' }
      };
      setEditedModule(structuredClone(safeModule));
    }
  }, [module]);

  const handleChange = (field, value) => {
    setEditedModule(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePositionChange = (field, value) => {
      const isNumeric = ['depth'].includes(field); // 'order' is now top-level
      const finalValue = isNumeric ? Number(value) : value;

      if (field === 'type') {
          setEditedModule(prev => ({
              ...prev,
              position: { type: finalValue, depth: 4 }
          }));
      } else {
          setEditedModule(prev => ({
              ...prev,
              position: { ...prev.position, [field]: finalValue }
          }));
      }
  };
  
  const handleTriggerChange = (field, value) => {
      setEditedModule(prev => ({
          ...prev,
          triggers: { ...(prev.triggers || {}), [field]: value }
      }));
  };

  const handleSave = () => {
    onSave(editedModule);
  };

  if (!editedModule) return null;
  
  const isAbsoluteMode = editedModule.position.type === 'absolute';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>編輯提示詞模組</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">

          {/* ✨ ==== 全新！統一的網格佈局 ==== ✨ */}
          <div className="module-editor-grid">
            {/* 第一行 */}
            <div className="form-group-st" style={{ gridColumn: 'span 2' }}>
              <label>名稱</label>
              <input type="text" value={editedModule.name} onChange={(e) => handleChange('name', e.target.value)} disabled={editedModule.readOnly || editedModule.locked} />
            </div>
            <div className="form-group-st" style={{ gridColumn: 'span 2' }}>
              <label>角色 (Role)</label>
              <select className="setting-select" value={editedModule.role} onChange={(e) => handleChange('role', e.target.value)} disabled={editedModule.readOnly}>
                <option value="system">系統</option>
                <option value="user">使用者</option>
                <option value="assistant">AI 助手</option>
              </select>
            </div>

            {/* 第二行 */}
            <div className="form-group-st" style={{ gridColumn: 'span 2' }}>
              <label>位置</label>
              <select className="setting-select" value={editedModule.position.type} onChange={(e) => handlePositionChange('type', e.target.value)} disabled={editedModule.readOnly}>
                <option value="relative">相對位置 (提示詞管理)</option>
                <option value="absolute">絕對位置 (聊天中)</option>
              </select>
            </div>
            <div className="form-group-st" style={{ opacity: isAbsoluteMode ? 1 : 0.5, transition: 'opacity 0.2s' }}>
              <label>深度</label>
              <input type="number" className="slider-value-input" value={editedModule.position.depth} onChange={(e) => handlePositionChange('depth', e.target.value)} 
                     disabled={!isAbsoluteMode || editedModule.readOnly} />
            </div>
            <div className="form-group-st">
              <label>順序</label>
              <input type="number" className="slider-value-input" value={editedModule.order} onChange={(e) => handleChange('order', Number(e.target.value))} disabled={editedModule.readOnly} />
            </div>
          </div>
          
          <div className="form-group trigger-group">
            <div className="form-label-group">
              <label>觸發器 (Triggers)</label>
              <label className="switch">
                <input type="checkbox" checked={editedModule.triggers.enabled} onChange={(e) => handleTriggerChange('enabled', e.target.checked)} disabled={editedModule.readOnly} />
                <span className="slider round"></span>
              </label>
            </div>
            {editedModule.triggers.enabled && (
              <input type="text" placeholder="輸入觸發關鍵字，用逗號分隔" value={editedModule.triggers.text} onChange={(e) => handleTriggerChange('text', e.target.value)} disabled={editedModule.readOnly} />
            )}
          </div>

          <div className="form-group">
            <label>提示詞內容 (Content)</label>
            <textarea
              value={editedModule.content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="edit-textarea"
              style={{ minHeight: '200px' }}
              disabled={editedModule.readOnly}
              placeholder={editedModule.readOnly ? "此為核心模組，內容由系統自動生成。" : "在此輸入提示詞內容..."}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn" disabled={editedModule.readOnly}>
            <Save size={16} /> 儲存變更
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleEditorModal;