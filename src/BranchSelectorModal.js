import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit2, Trash2 } from 'lucide-react';

const BranchSelectorModal = ({ 
  show, 
  onClose, 
  parentChat, 
  branches, 
  onSelectBranch, 
  onSaveBranchName,
  onDeleteBranch // ✨ 新增：接收刪除函式
}) => {
  // 這個 state 用來管理「哪一個分支正在被編輯」
  const [editingBranch, setEditingBranch] = useState({ id: null, name: '' });
  const inputRef = useRef(null); // 用來自動對焦輸入框

  useEffect(() => {
    // 當進入編輯模式時，自動對焦到輸入框
    if (editingBranch.id && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingBranch.id]);

  if (!show) return null;

  // 處理儲存名稱
  const handleSave = (e) => {
    e.stopPropagation(); // 防止觸發外層的點擊事件
    if (editingBranch.name.trim()) {
      onSaveBranchName(editingBranch.id, editingBranch.name.trim());
      setEditingBranch({ id: null, name: '' }); // 儲存後退出編輯模式
    } else {
      alert('分支名稱不能為空！');
    }
  };
  
  // 處理刪除分支
  const handleDelete = (e, branch) => {
    e.stopPropagation();
    if (window.confirm(`確定要永久刪除分支「${branch.metadata.name}」嗎？`)) {
        onDeleteBranch(branch.char.id, branch.chatId);
    }
  };

  // 處理選擇分支並跳轉
  const handleSelect = (branch) => {
    onSelectBranch(branch.char.id, branch.chatId);
    onClose(); // 選擇後自動關閉視窗
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {/* 確保 parentChat 存在才讀取 name */}
          <h3>"{parentChat?.metadata?.name || parentChat?.char?.name || '主線'}" 的分支</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {branches.length > 0 ? (
            <div className="character-list">
              {branches.map(branch => (
                <div key={branch.chatId} className="character-list-item">
                  {editingBranch.id === branch.chatId ? (
                    // ====== 編輯模式 ======
                    <>
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingBranch.name}
                        onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        // 按下 Enter 鍵也可以儲存
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(e); }}
                        style={{ flex: 1, marginRight: '8px' }}
                      />
                      <button className="edit-character-btn" onClick={handleSave} title="儲存">
                        <Save size={16} />
                      </button>
                      <button className="edit-character-btn" onClick={(e) => { e.stopPropagation(); setEditingBranch({ id: null, name: '' }); }} title="取消">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    // ====== 正常顯示模式 ======
                    <>
                      <div className="character-select-area" onClick={() => handleSelect(branch)}>
                        <div className="character-info">
                          <h4>{branch.metadata.name}</h4>
                          <p>{branch.metadata.notes}</p>
                        </div>
                      </div>
                      <button 
                        className="edit-character-btn" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingBranch({ id: branch.chatId, name: branch.metadata.name });
                        }}
                        title="編輯名稱"
                      >
                        <Edit2 size={16} />
                      </button>
                      {/* ✨ 新增：刪除按鈕 ✨ */}
                      <button 
                        className="edit-character-btn delete-icon-btn" 
                        onClick={(e) => handleDelete(e, branch)}
                        title="刪除分支"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-list-text">這個聊天室還沒有任何分支。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchSelectorModal;