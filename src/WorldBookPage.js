import React, { useState } from 'react';
import { Globe, Plus, Trash2, Edit2, X, Save, ChevronDown, Upload, Download } from 'lucide-react';

// =================================================================================
// ✨ 單一世界書條目編輯器 (V4 - 修正版) ✨
// 這部分保持不變，但為了確保完整性，一併提供
// =================================================================================
const WorldBookEntryEditor = ({ entry, onUpdate, onDelete, isCollapsed, onToggleCollapse }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const positionOptions = [
    { value: 0, label: '角色定義之前' }, { value: 1, label: '角色定義之後' },
    { value: 2, label: '作者備註之前' }, { value: 3, label: '作者備註之後' },
    { value: 4, label: '@D 在指定深度' }, { value: 5, label: '範例訊息之前' },
    { value: 6, label: '範例訊息之後' },
  ];
  const logicOptions = [
    { value: 0, label: '包含任一 (OR)' }, { value: 3, label: '包含全部 (AND)' },
    { value: 1, label: '未完全包含' }, { value: 2, label: '完全不含 (NOR)' },
  ];

  const handleChange = (field, value, type = 'string') => {
    let finalValue = value;
    if (type === 'number') finalValue = value === '' ? null : Number(value);
    else if (type === 'boolean') finalValue = !entry[field];
    onUpdate(entry.uid, { ...entry, [field]: finalValue });
  };
  const handleKeysChange = (value) => {
    const keysArray = value.split(',').map(k => k.trim()).filter(Boolean);
    onUpdate(entry.uid, { ...entry, key: keysArray });
  };
  const getValue = (field, defaultValue) => entry[field] ?? defaultValue;

  return (
    <div className="wb-entry-editor-detailed">
      <div className="wb-entry-header" onClick={onToggleCollapse}>
        <ChevronDown size={18} className={`wb-collapse-icon ${isCollapsed ? 'collapsed' : ''}`} />
        <input
          type="text"
          className="wb-entry-comment"
          placeholder="條目標題/備註"
          value={getValue('comment', '')}
          onChange={(e) => { e.stopPropagation(); handleChange('comment', e.target.value); }}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="wb-entry-header-actions" onClick={(e) => e.stopPropagation()}>
          <label className="switch">
            <input type="checkbox" checked={!getValue('disable', false)} onChange={() => handleChange('disable', null, 'boolean')} />
            <span className="slider round"></span>
          </label>
          <button onClick={() => onDelete(entry.uid)} className="wb-delete-btn"><Trash2 size={14} /></button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="wb-entry-body">
            <div className="form-group">
                <label>主要關鍵字 (用逗號,分隔)</label>
                <input type="text" value={getValue('key', []).join(', ')} onChange={(e) => handleKeysChange(e.target.value)} />
            </div>
            <div className="form-group">
                <label>選填過濾器 (次要關鍵字)</label>
                <input type="text" placeholder="用逗號分隔，如果為空就忽略" value={getValue('keysecondary', []).join(', ')} onChange={(e) => handleChange('keysecondary', e.target.value.split(',').map(k=>k.trim()))} />
            </div>

            <div className="wb-entry-grid-small" style={{gridTemplateColumns: '1fr 1fr'}}>
                <div className="form-group">
                    <label>關鍵字邏輯</label>
                    <select className="setting-select" value={getValue('selectiveLogic', 0)} onChange={(e) => handleChange('selectiveLogic', e.target.value, 'number')}>
                        {logicOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>插入位置</label>
                    <select className="setting-select" value={getValue('position', 0)} onChange={(e) => handleChange('position', e.target.value, 'number')}>
                        {positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
            </div>

            <textarea
                className="wb-entry-content"
                placeholder="當觸發關鍵字時要插入的內容..."
                rows="4"
                value={getValue('content', '')}
                onChange={(e) => handleChange('content', e.target.value)}
            />

            <button className="advanced-toggle-btn" onClick={(e) => { e.stopPropagation(); setIsAdvancedOpen(!isAdvancedOpen); }}>
                <span>進階設定</span>
                <ChevronDown size={16} style={{ transform: isAdvancedOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {isAdvancedOpen && (
                <div className="wb-advanced-content">
                    <div className="wb-entry-grid-small">
                        <div className="form-group"><label>插入順序</label><input type="number" className="slider-value-input" value={getValue('order', 100)} onChange={(e) => handleChange('order', e.target.value, 'number')} /></div>
                        <div className="form-group"><label>插入深度</label><input type="number" className="slider-value-input" value={getValue('depth', 4)} onChange={(e) => handleChange('depth', e.target.value, 'number')} disabled={entry.position !== 4} /></div>
                        <div className="form-group"><label>觸發機率 %</label><input type="number" className="slider-value-input" value={getValue('probability', 100)} max={100} min={0} onChange={(e) => handleChange('probability', e.target.value, 'number')} /></div>
                        <div className="form-group"><label>黏性 (回合)</label><input type="number" className="slider-value-input" value={getValue('sticky', 0)} onChange={(e) => handleChange('sticky', e.target.value, 'number')} /></div>
                        <div className="form-group"><label>冷卻 (回合)</label><input type="number" className="slider-value-input" value={getValue('cooldown', 0)} onChange={(e) => handleChange('cooldown', e.target.value, 'number')} /></div>
                        <div className="form-group"><label>掃描深度</label><input type="number" className="slider-value-input" placeholder="使用全域" value={getValue('scanDepth', '')} onChange={(e) => handleChange('scanDepth', e.target.value, 'number')} /></div>
                    </div>
                    
                    <div className="wb-section">
                        <label className="wb-section-title">遞迴控制</label>
                        <div className="wb-toggles-grid">
                        <label><input type="checkbox" checked={getValue('excludeRecursion', false)} onChange={() => handleChange('excludeRecursion', null, 'boolean')} /> 不可遞迴</label>
                        <label><input type="checkbox" checked={getValue('preventRecursion', false)} onChange={() => handleChange('preventRecursion', null, 'boolean')} /> 防止遞迴</label>
                        </div>
                        <div className="form-group" style={{marginTop: '10px'}}><label>遞迴延遲 (層級)</label><input type="number" className="slider-value-input" value={getValue('delayUntilRecursion', 0)} onChange={(e) => handleChange('delayUntilRecursion', e.target.value, 'number')} /></div>
                    </div>
                    
                    <div className="wb-section">
                        <label className="wb-section-title">額外匹配來源</label>
                        <div className="wb-toggles-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
                        <label><input type="checkbox" checked={getValue('matchPersonaDescription', false)} onChange={() => handleChange('matchPersonaDescription', null, 'boolean')} /> 使用者角色描述</label>
                        <label><input type="checkbox" checked={getValue('matchCharacterDescription', false)} onChange={() => handleChange('matchCharacterDescription', null, 'boolean')} /> 角色描述</label>
                        <label><input type="checkbox" checked={getValue('matchCharacterPersonality', false)} onChange={() => handleChange('matchCharacterPersonality', null, 'boolean')} /> 角色個性</label>
                        <label><input type="checkbox" checked={getValue('matchScenario', false)} onChange={() => handleChange('matchScenario', null, 'boolean')} /> 場景設想</label>
                        <label><input type="checkbox" checked={getValue('matchCreatorNotes', false)} onChange={() => handleChange('matchCreatorNotes', null, 'boolean')} /> 創作者備註</label>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};


// =================================================================================
// ✨✨✨ WorldBookEditorModal (最終修正版) ✨✨✨
// =================================================================================
const WorldBookEditorModal = ({ book, onSave, onClose }) => {
  const [editedBook, setEditedBook] = useState(null);
  
  // ✨ 1. 狀態從單一布林值 -> 物件，用來儲存每個條目的獨立開關狀態
  const [collapsedUids, setCollapsedUids] = useState({});

  React.useEffect(() => {
    if (book) {
      setEditedBook(JSON.parse(JSON.stringify(book)));
      
      // ✨ 2. 初始化：當視窗打開時，強制將所有條目的狀態都設為「收合 (true)」
      const initialCollapsedState = {};
      // 使用 Object.keys 取得所有條目的 uid
      Object.keys(book.entries || {}).forEach(uid => {
        initialCollapsedState[uid] = true; // true 代表收合
      });
      setCollapsedUids(initialCollapsedState);
    }
  }, [book]); // 這個 effect 會在每次點開不同世界書時觸發

  if (!editedBook) return null;

  // ✨ 3. 控制函式：只切換被點擊的那個 uid 的狀態，不影響其他條目
  const toggleCollapse = (uid) => {
    setCollapsedUids(prev => ({
      ...prev,
      [uid]: !prev[uid] // 將 true 變 false，或 false 變 true
    }));
  };

  const handleBookInfoChange = (field, value) => { setEditedBook(prev => ({ ...prev, [field]: value })); };
  
  const handleAddEntry = () => {
    const newEntry = {
      uid: Date.now(), key: [], content: '', comment: '新條目', disable: false, position: 0, order: 100, probability: 100, selectiveLogic: 0, selective: true, constant: false, addMemo: true, depth: 4, sticky: 0, cooldown: 0, excludeRecursion: false, preventRecursion: false, delayUntilRecursion: 0
    };
    setEditedBook(prev => ({ ...prev, entries: { ...prev.entries, [newEntry.uid]: newEntry } }));
    // ✨ 優化：新增的條目預設為「展開 (false)」，方便馬上編輯
    setCollapsedUids(prev => ({...prev, [newEntry.uid]: false}));
  };

  const handleUpdateEntry = (uid, updatedEntry) => { setEditedBook(prev => ({ ...prev, entries: { ...prev.entries, [uid]: updatedEntry }})); };
  
  const handleDeleteEntry = (uid) => {
    if(window.confirm('確定要刪除這個條目嗎？')) {
      const newEntries = { ...editedBook.entries };
      delete newEntries[uid];
      setEditedBook(prev => ({ ...prev, entries: newEntries }));
    }
  };
  
  const handleSave = () => { onSave(editedBook); onClose(); };
  const sortedEntries = Object.values(editedBook.entries || {}).sort((a, b) => (a.uid) - (b.uid));
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>編輯世界書</h3><button onClick={onClose} className="close-btn"><X size={20} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label>世界書名稱</label><input type="text" value={editedBook.name} onChange={(e) => handleBookInfoChange('name', e.target.value)} /></div>
          <div className="form-label-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}><label>條目 ({sortedEntries.length})</label><button onClick={handleAddEntry} className="add-greeting-btn"><Plus size={14}/> 新增條目</button></div>
          <div className="world-book-entries-detailed">
            {sortedEntries.map(entry => (
              // ✨ 4. 傳遞 props：把每個條目「自己的」狀態和「自己的」控制函式傳下去
              <WorldBookEntryEditor 
                key={entry.uid} 
                entry={entry} 
                onUpdate={handleUpdateEntry} 
                onDelete={handleDeleteEntry} 
                isCollapsed={collapsedUids[entry.uid]} 
                onToggleCollapse={() => toggleCollapse(entry.uid)} 
              />
            ))}
          </div>
        </div>
        <div className="modal-footer"><button onClick={handleSave} className="footer-btn save-btn"><Save size={16}/> 儲存</button></div>
      </div>
    </div>
  );
};


// =================================================================================
// ✨✨✨ WorldBookPage (最終修正版) ✨✨✨
// =================================================================================
const WorldBookPage = ({ worldBooks, onSave, onDelete, onAdd, onImport, onExport }) => {
  const [editingBook, setEditingBook] = useState(null);
  const handleEdit = (book) => setEditingBook(book);
  const handleDelete = (bookId) => { if (window.confirm('您確定要永久刪除這整本世界書嗎？')) onDelete(bookId); };
  
  return (
    <div className="page-content">
      <div className="content-area character-list-page">
        {worldBooks.length === 0 ? (
          // --- 這是「沒有世界書」時的畫面 ---
          <div className="empty-state">
            <div className="empty-icon"><Globe size={48} /></div>
            <h3>還沒有世界書</h3><p>建立你的第一本世界書來豐富你的故事背景吧！</p>
            <div className="empty-state-buttons">
                 <button onClick={onAdd} className="import-button"><Plus size={16} /> 創建新世界書</button>
                 {/* 這個 label 現在可以正常工作了 */}
                 <label htmlFor="import-worldbook" className="import-button"><Upload size={16} /> 匯入世界書 (.json)</label>
            </div>
          </div>
        ) : (
          // --- 這是「有世界書」時的畫面 ---
          <>
            <div className="prompt-actions-grid" style={{marginTop: 0}}>
                <button onClick={onAdd}><Plus size={16} /> 創建新世界書</button>
                {/* 這個 label 也一樣可以正常工作 */}
                <label htmlFor="import-worldbook"><Upload size={16} /> 匯入世界書 (.json)</label>
            </div>
            {/* ✨ 核心修正：我們把 <input> 從這裡移除了！ */}
            <div className="character-list" style={{marginTop: '16px'}}>
              {worldBooks.map((book) => (
                <div key={book.id} className="character-list-item">
                  <div className="character-select-area" onClick={() => handleEdit(book)}>
                    <div className="character-avatar-large" style={{ borderRadius: '8px' }}><Globe size={32} /></div>
                    <div className="character-info"><h4>{book.name}</h4><p>{Object.keys(book.entries || {}).length} 條目</p></div>
                  </div>
                  <button className="edit-character-btn" onClick={() => onExport(book.id)}><Download size={16} /></button>
                  <button className="edit-character-btn" onClick={() => handleEdit(book)}><Edit2 size={16} /></button>
                  <button className="edit-character-btn delete-icon-btn" onClick={() => handleDelete(book.id)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
        
        {/* ✨✨✨ 核心修正：將 <input> 元素移到條件判斷的外面 ✨✨✨ */}
        {/* 這樣一來，無論上面顯示哪個畫面，這個隱藏的 input 永遠都在，隨時等待被 label 觸發 */}
        <input type="file" id="import-worldbook" accept=".json" onChange={onImport} style={{ display: 'none' }} multiple />

      </div>
      
      {/* 編輯視窗的 Modal */}
      {editingBook && (<WorldBookEditorModal book={editingBook} onSave={onSave} onClose={() => setEditingBook(null)} />)}
    </div>
  );
};

export default WorldBookPage;