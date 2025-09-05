import React, { useState, useMemo } from 'react';
import { Globe, Plus, Trash2, Edit2, X, Save, ChevronDown, Upload, Download, Link as LinkIcon } from 'lucide-react';

// =================================================================================
// ✨ 單一世界書條目編輯器 (v4 - 最終優化版) ✨
// =================================================================================
const WorldBookEntryEditor = ({ entry, onUpdate, onDelete, isCollapsed, onToggleCollapse }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const modeMenuRef = React.useRef(null);

  // ✨ 1. 修正並重新排序插入位置選項，與 ST 保持一致
  const positionOptions = [
    { value: '0', label: '角色定義之前' },
    { value: '1', label: '角色定義之後' },
    { value: '5', label: '範例訊息之前' },
    { value: '6', label: '範例訊息之後' },
    { value: '2', label: '作者備註之前' },
    { value: '3', label: '作者備註之後' },
    { value: '4_0', label: '@D 在系統深度' },
    { value: '4_1', label: '@D 在使用者深度' },
    { value: '4_2', label: '@D 在 AI 深度' },
  ];

  const logicOptions = [
    { value: 0, label: '包含任一 (OR)' }, { value: 3, label: '包含全部 (AND)' },
    { value: 1, label: '未完全包含' }, { value: 2, label: '完全不含 (NOR)' },
  ];

  const modeOptions = [
    { mode: 'constant', title: '常駐模式', icon: <div className="wb-status-dot blue"></div> },
    { mode: 'selective', title: '選擇模式', icon: <div className="wb-status-dot green"></div> },
    { mode: 'vectorized', title: '向量模式', icon: <LinkIcon size={14} color="#9E9E9E" /> }
  ];

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target)) {
        setIsModeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modeMenuRef]);

  // --- 所有處理函式 (保持不變) ---
  const handleChange = (field, value, type = 'string') => {
    let finalValue = value;
    if (type === 'number') finalValue = value === '' ? null : Number(value);
    else if (type === 'boolean') finalValue = !entry[field];
    onUpdate(entry.uid, { ...entry, [field]: finalValue });
  };
  const handleKeysChange = (value, field = 'key') => {
    const keysArray = value.split(',').map(k => k.trim()).filter(Boolean);
    onUpdate(entry.uid, { ...entry, [field]: keysArray });
  };
  const getValue = (field, defaultValue) => entry[field] ?? defaultValue;
  const handlePositionChange = (e) => {
    const value = e.target.value;
    if (value.includes('_')) {
      const [pos, rol] = value.split('_');
      onUpdate(entry.uid, { ...entry, position: Number(pos), role: Number(rol) });
    } else {
      onUpdate(entry.uid, { ...entry, position: Number(value), role: 0 });
    }
  };
  const handleModeChange = (mode) => {
    onUpdate(entry.uid, { ...entry, selective: mode === 'selective', constant: mode === 'constant', vectorized: mode === 'vectorized' });
    setIsModeMenuOpen(false);
  };
  const currentPositionValue = useMemo(() => {
    if (entry.position === 4) { return `4_${entry.role ?? 0}`; }
    return String(entry.position);
  }, [entry.position, entry.role]);
  const currentMode = useMemo(() => {
    if (entry.constant) return modeOptions[0];
    if (entry.vectorized) return modeOptions[2];
    return modeOptions[1];
  }, [entry.constant, entry.selective, entry.vectorized]);

  // ✨ 2. 全新的 JSX 渲染結構
  return (
    <div className="wb-entry-editor-st"
    style={{ position: 'relative' }} /* ✨✨✨ 核心修改：在這裡加上內聯樣式 ✨✨✨ */
  >
      {/* --- 新的標頭佈局 --- */}
      <div className="wb-entry-header-st" onClick={onToggleCollapse}>
        <ChevronDown size={18} className={`wb-collapse-icon ${isCollapsed ? 'collapsed' : ''}`} />
        {/* ✨ 4. 核心修改：將下拉選單按鈕的邏輯和渲染分離 ✨ */}
        <div className="wb-mode-selector" ref={modeMenuRef} onClick={(e) => e.stopPropagation()}>
          <button className="wb-mode-trigger" onClick={() => setIsModeMenuOpen(!isModeMenuOpen)} title={`目前模式: ${currentMode.title}`}>
            {currentMode.icon}
          </button>
        </div>
        
        <input type="text" className="wb-entry-comment" placeholder="條目標題/備註" value={getValue('comment', '')} onChange={(e) => { e.stopPropagation(); handleChange('comment', e.target.value); }} onClick={(e) => e.stopPropagation()} />
        <label className="switch" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={!getValue('disable', false)} onChange={() => handleChange('disable', null, 'boolean')} />
          <span className="slider round"></span>
        </label>
        <button onClick={(e) => { e.stopPropagation(); onDelete(entry.uid); }} className="wb-delete-btn"><Trash2 size={14} /></button>
      </div>
      
      {/* ✨ 4. 核心修改：將下拉選單本體移到這裡，讓它獨立於 header 渲染 ✨ */}
          {isModeMenuOpen && (
            <div className="wb-mode-menu-floating" ref={modeMenuRef}>
              {modeOptions.map(opt => (
                <button key={opt.mode} className="wb-mode-option-floating" onClick={(e) => { e.stopPropagation(); handleModeChange(opt.mode); }}>
                  {opt.icon}
                </button>
              ))}
            </div>
          )}

      {!isCollapsed && (
        <div className="wb-entry-body-st">
          {/* 主要設定格線 */}
          <div className="wb-entry-grid-main">
            <div className="form-group-st"><label>插入位置</label><select className="setting-select" value={currentPositionValue} onChange={handlePositionChange}>{positionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
            <div className="form-group-st"><label>深度</label><input type="number" className="slider-value-input" value={getValue('depth', 4)} onChange={(e) => handleChange('depth', e.target.value, 'number')} disabled={entry.position !== 4} /></div>
            <div className="form-group-st"><label>順序</label><input type="number" className="slider-value-input" value={getValue('order', 100)} onChange={(e) => handleChange('order', e.target.value, 'number')} /></div>
            <div className="form-group-st"><label>觸發機率 %</label><input type="number" className="slider-value-input" value={getValue('probability', 100)} max={100} min={0} onChange={(e) => handleChange('probability', e.target.value, 'number')} /></div>
          </div>
          {/* 關鍵字區塊 */}
          <div className="form-group-st"><label>主要關鍵字 (用逗號, 分隔)</label><input type="text" value={getValue('key', []).join(', ')} onChange={(e) => handleKeysChange(e.target.value, 'key')} /></div>
          <div className="wb-entry-grid-keywords">
            <div className="form-group-st"><label>關鍵字邏輯</label><select className="setting-select" value={getValue('selectiveLogic', 0)} onChange={(e) => handleChange('selectiveLogic', e.target.value, 'number')}>{logicOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
            <div className="form-group-st"><label>選填過濾器 (次要關鍵字)</label><input type="text" placeholder="用逗號分隔" value={getValue('keysecondary', []).join(', ')} onChange={(e) => handleKeysChange(e.target.value, 'keysecondary')} /></div>
          </div>
          {/* 內容輸入框 */}
          <div className="form-group-st"><label>內容</label><textarea className="wb-entry-content" placeholder="當觸發關鍵字時要插入的內容..." rows="5" value={getValue('content', '')} onChange={(e) => handleChange('content', e.target.value)} /></div>
          
          {/* 進階設定開關 */}
          <button className="advanced-toggle-btn-st" onClick={(e) => { e.stopPropagation(); setIsAdvancedOpen(!isAdvancedOpen); }}>
            <ChevronDown size={16} style={{ transform: isAdvancedOpen ? 'rotate(180deg)' : 'none' }} />
            <span>進階設定</span>
          </button>

          {/* 進階設定區塊 */}
          {isAdvancedOpen && (
            <div className="wb-advanced-content-st">
              <div className="wb-section-st">
                <label className="wb-section-title">遞迴控制</label>
                <div className="wb-toggles-grid-st">
                  <label><input type="checkbox" checked={getValue('excludeRecursion', false)} onChange={() => handleChange('excludeRecursion', null, 'boolean')} /> 不可遞迴</label>
                  <label><input type="checkbox" checked={getValue('preventRecursion', false)} onChange={() => handleChange('preventRecursion', null, 'boolean')} /> 防止遞迴</label>
                  <div className="form-group-st recursion-delay"><label>遞迴延遲</label><input type="number" className="slider-value-input" value={getValue('delayUntilRecursion', 0)} onChange={(e) => handleChange('delayUntilRecursion', e.target.value, 'number')} /></div>
                </div>
              </div>
              <div className="wb-section-st">
                 <label className="wb-section-title">時間控制</label>
                 <div className="wb-entry-grid-advanced">
                    <div className="form-group-st"><label>黏性</label><input type="number" className="slider-value-input" value={getValue('sticky', 0)} onChange={(e) => handleChange('sticky', e.target.value, 'number')} /></div>
                    <div className="form-group-st"><label>冷卻時間</label><input type="number" className="slider-value-input" value={getValue('cooldown', 0)} onChange={(e) => handleChange('cooldown', e.target.value, 'number')} /></div>
                    <div className="form-group-st"><label>延遲</label><input type="number" className="slider-value-input" value={getValue('delay', 0)} onChange={(e) => handleChange('delay', e.target.value, 'number')} /></div>
                 </div>
              </div>
              <div className="wb-section-st">
                <label className="wb-section-title">額外匹配來源</label>
                <div className="wb-toggles-grid-st extra-sources">
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
// ✨✨✨ WorldBookEditorModal (最終修正版，解決獨立收合問題) ✨✨✨
// =================================================================================
const WorldBookEditorModal = ({ book, onSave, onClose }) => {
  const [editedBook, setEditedBook] = useState(null);
  const [collapsedUids, setCollapsedUids] = useState({});

  React.useEffect(() => {
    if (book) {
      setEditedBook(JSON.parse(JSON.stringify(book)));
      const initialCollapsedState = {};
      Object.keys(book.entries || {}).forEach(uid => {
        initialCollapsedState[String(uid)] = true;
      });
      setCollapsedUids(initialCollapsedState);
    }
  }, [book]);

  if (!editedBook) return null;

  const toggleCollapse = (uid) => {
    const stringUid = String(uid);
    setCollapsedUids(prev => ({ ...prev, [stringUid]: !prev[stringUid] }));
  };

  const handleBookInfoChange = (field, value) => { setEditedBook(prev => ({ ...prev, [field]: value })); };
  
  const handleAddEntry = () => {
    const newUid = Date.now();
    const newEntry = {
      uid: newUid, key: [], content: '', comment: '新條目', disable: false, position: 0, order: 100, probability: 100, selectiveLogic: 0, selective: true, constant: false, addMemo: true, depth: 4, sticky: 0, cooldown: 0, excludeRecursion: false, preventRecursion: false, delayUntilRecursion: 0
    };
    setEditedBook(prev => ({ ...prev, entries: { ...prev.entries, [newUid]: newEntry } }));
    setCollapsedUids(prev => ({...prev, [String(newUid)]: false}));
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
  const sortedEntries = Object.values(editedBook.entries || {}).sort((a, b) => {
    // 使用 displayIndex 進行排序，如果某個條目缺少該值，則使用 uid 作為備用
    const indexA = a.displayIndex ?? a.uid;
    const indexB = b.displayIndex ?? b.uid;
    return indexA - indexB;
  });
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>編輯世界書</h3><button onClick={onClose} className="close-btn"><X size={20} /></button></div>
        <div className="modal-body">
          <div className="form-group"><label>世界書名稱</label><input type="text" value={editedBook.name || ''} onChange={(e) => handleBookInfoChange('name', e.target.value)} /></div>
          <div className="form-label-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}><label>條目 ({sortedEntries.length})</label><button onClick={handleAddEntry} className="add-greeting-btn"><Plus size={14}/> 新增條目</button></div>
          <div className="world-book-entries-detailed">
            {sortedEntries.map(entry => (
              <WorldBookEntryEditor 
                key={entry.uid} 
                entry={entry} 
                onUpdate={handleUpdateEntry} 
                onDelete={handleDeleteEntry} 
                isCollapsed={!!collapsedUids[String(entry.uid)]} // ✨ 加上 !! 確保總是布林值
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
// ✨✨✨ WorldBookPage (保持不變) ✨✨✨
// =================================================================================
const WorldBookPage = ({ worldBooks, onSave, onDelete, onAdd, onImport, onExport }) => {
  const [editingBook, setEditingBook] = useState(null);
  const handleEdit = (book) => setEditingBook(book);
  const handleDelete = (bookId) => { if (window.confirm('您確定要永久刪除這整本世界書嗎？')) onDelete(bookId); };
  
  return (
    <div className="page-content">
      <div className="content-area character-list-page">
        {worldBooks.length === 0 ? (
          <div className="empty-state"> <div className="empty-icon"><Globe size={48} /></div> <h3>還沒有世界書</h3><p>建立你的第一本世界書來豐富你的故事背景吧！</p> <div className="empty-state-buttons"> <button onClick={onAdd} className="import-button"><Plus size={16} /> 創建新世界書</button> <label htmlFor="import-worldbook" className="import-button"><Upload size={16} /> 匯入世界書 (.json)</label> </div> </div>
        ) : (
          <>
            <div className="prompt-actions-grid" style={{marginTop: 0}}> <button onClick={onAdd}><Plus size={16} /> 創建新世界書</button> <label htmlFor="import-worldbook"><Upload size={16} /> 匯入世界書 (.json)</label> </div>
            <div className="character-list" style={{marginTop: '16px'}}>
              {worldBooks.map((book) => (
                <div key={book.id} className="character-list-item">
                  <div className="character-select-area" onClick={() => handleEdit(book)}> <div className="character-avatar-large" style={{ borderRadius: '8px' }}><Globe size={32} /></div> <div className="character-info"><h4>{book.name}</h4><p>{Object.keys(book.entries || {}).length} 條目</p></div> </div>
                  <button className="edit-character-btn" onClick={() => onExport(book.id)}><Download size={16} /></button>
                  <button className="edit-character-btn" onClick={() => handleEdit(book)}><Edit2 size={16} /></button>
                  <button className="edit-character-btn delete-icon-btn" onClick={() => handleDelete(book.id)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </>
        )}
        <input type="file" id="import-worldbook" accept=".json" onChange={onImport} style={{ display: 'none' }} multiple />
      </div>
      {editingBook && (<WorldBookEditorModal book={editingBook} onSave={onSave} onClose={() => setEditingBook(null)} />)}
    </div>
  );
};

export default WorldBookPage;