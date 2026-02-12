import ReactMarkdown from 'react-markdown';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Settings, ArrowLeft, Key, Globe, Check, X,
  User, AppWindow, FileText, Save, Trash2,
  Download, Upload, Users, MessageCircle, Moon, Sun, Cloud,
  Bot, Database, Info, Camera, UserCircle, Plus, BookOpen, BookMarked, TrainTrack, MessageSquareWarning,
  FileInput, FileOutput,
  MoveRightIcon, Pin, Star, Palette, ChevronDown, ChevronUp, Coffee, Dessert, Cherry, CloudMoon, Edit2, MessageSquarePlus, Waves, TreePine, Split
} from 'lucide-react';
import CaterpillarIcon from './CaterpillarIcon';
import rehypeRaw from 'rehype-raw';
import { db } from './db';
import html2canvas from 'html2canvas';
import PromptsPage from './PromptsPage';
import ModuleEditorModal from './ModuleEditorModal';
import OocCommandEditorModal from './OocCommandEditorModal.js';
import OocCommandSelectorModal from './OocCommandSelectorModal.js';
import RegexEditorModal from './RegexEditorModal.js';
import WorldBookPage, { mapWorldBookEntryFields } from './WorldBookPage.js';
import GoogleSyncManager from './GoogleSyncManager';
import DisclaimerModal from './DisclaimerModal';

// ==================== 長期記憶數量觸發數 ====================

const MEMORY_UPDATE_INTERVAL = 5;

// =================================================================================
// ✨✨✨ 獨立 Regex 處理函數（可被多個組件共用）✨✨✨
// =================================================================================
const applyRegexRules = (text, globalRules, localRules, sender, contextType = 'chat', options = {}) => {
  if (!text) return '';
  let processedText = text;

  const {
    isPrompt = false,
    isWorldInfo = false,
    depth = 0,
  } = options;

  const enabledGlobalRules = globalRules?.filter(r => r.enabled) || [];
  const enabledLocalRules = localRules?.filter(r => r.enabled) || [];
  const allRules = [...enabledLocalRules, ...enabledGlobalRules];

  for (const rule of allRules) {
    const isUser = sender === 'user';
    const placement = rule.placement || [];

    let shouldApply = false;

    // 檢查 promptOnly
    if (rule.promptOnly && !isPrompt) continue;

    // 檢查 minDepth/maxDepth
    if (rule.minDepth !== null && rule.minDepth !== undefined && depth < rule.minDepth) continue;
    if (rule.maxDepth !== null && rule.maxDepth !== undefined && depth > rule.maxDepth) continue;

    // 根據上下文判斷
    if (isWorldInfo) {
      shouldApply = placement.includes(4);
    } else if (contextType === 'chat') {
      if (placement.includes(0) && isUser) shouldApply = true;
      if (placement.includes(1) && !isUser) shouldApply = true;
    } else if (contextType === 'slash') {
      shouldApply = placement.includes(3);
    }

    if (!shouldApply) continue;

    try {
      const regex = new RegExp(rule.find, rule.flags || 'g');
      let newText = processedText.replace(regex, rule.replace);
      if (rule.trimStrings) {
        newText = newText.replace(/\n{3,}/g, '\n\n').trim();
      }
      processedText = newText;
    } catch (error) {
      console.error(`無效的 Regex 規則 (${rule.notes}): "${rule.find}"`, error);
    }
  }
  return processedText;
};

// 頂部導航組件
const TopNavigation = ({ currentPage, navigateToPage }) => (
  <div className="top-navigation">
    <button onClick={() => navigateToPage('characters')} className={`nav-icon ${currentPage === 'characters' ? 'active' : ''}`}>
      <Users size={20} />
    </button>
    <button onClick={() => navigateToPage('chat')} className={`nav-icon ${currentPage === 'chat' ? 'active' : ''}`}>
      <MessageCircle size={20} />
    </button>
    {/* ✨ 在這裡插入新的世界書按鈕 ✨ */}
    <button onClick={() => navigateToPage('worldbooks')} className={`nav-icon ${currentPage === 'worldbooks' ? 'active' : ''}`}>
      <Globe size={20} />
    </button>
    <button onClick={() => navigateToPage('prompts')} className={`nav-icon ${currentPage === 'prompts' ? 'active' : ''}`}>
      <FileText size={20} />
    </button>
    <button onClick={() => navigateToPage('settings')} className={`nav-icon ${currentPage === 'settings' ? 'active' : ''}`}>
      <Settings size={20} />
    </button>
  </div>
);

// ==================== 全新！帶有頭像的使用者選擇器元件 ====================
const UserProfileSelector = ({ profiles, selectedProfileId, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // 找出當前選中的個人檔案是哪一個
  const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const handleSelect = (profileId) => {
    onChange(profileId); // 呼叫父元件傳來的更新函式
    setIsOpen(false);    // 選擇後關閉選單
  };

  // 點擊選單外部時，自動關閉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


  return (
    <div className="custom-select-container" ref={dropdownRef}>
      {/* 這個按鈕顯示當前選中的使用者 */}
      <button className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="selected-option">
          <div className="option-avatar">
            {selectedProfile?.avatar?.type === 'image' ? (
              <img src={selectedProfile.avatar.data} alt={selectedProfile.name} className="avatar-image" />
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          {/* +++ 核心修改：如果備註存在，就把它顯示在名字後面 +++ */}
          <span className="option-name">
            {selectedProfile?.name || '選擇身份'}
            {selectedProfile?.notes ? ` (${selectedProfile.notes})` : ''}
          </span>
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* 這是點擊後彈出的選項列表 */}
      {isOpen && (
        <div className="custom-select-options">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className={`custom-select-option ${selectedProfileId === profile.id ? 'selected' : ''}`}
              onClick={() => handleSelect(profile.id)}
            >
              <div className="option-avatar">
                {profile.avatar?.type === 'image' ? (
                  <img src={profile.avatar.data} alt={profile.name} className="avatar-image" />
                ) : (
                  <UserCircle size={24} />
                )}
              </div>
              {/* +++ 核心修改：選項列表裡也要加上備註 +++ */}
              <span className="option-name">
                {profile.name}
                {profile.notes ? ` (${profile.notes})` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
// 角色編輯器組件 (彈出式視窗)
const CharacterEditor = ({ character, onSave, onClose, onDelete, worldBooks, onOpenLocalRegexEditor }) => {
  // State definitions
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');           // ✨ 新增
  const [scenario, setScenario] = useState('');                 // ✨ 新增
  const [mes_example, setMesExample] = useState('');            // ✨ 新增
  const [firstMessage, setFirstMessage] = useState('');
  const [alternateGreetings, setAlternateGreetings] = useState([]);
  const [avatar, setAvatar] = useState({ type: 'icon', data: 'UserCircle' });
  const [creatorNotes, setCreatorNotes] = useState('');
  const [embeddedRegex, setEmbeddedRegex] = useState([]);
  const [mainLorebookId, setMainLorebookId] = useState('');
  const [fav, setFav] = useState(false);                        // ✨ 新增
  const [post_history_instructions, setPostHistoryInstructions] = useState(''); // ✨ 新增

  // ✨ 核心修正 1：引入 useRef 作為我們的「旗標」
  const isInitialMount = useRef(true);

  // 從 LocalStorage 讀取草稿 (這部分邏輯不變)
  useEffect(() => {
    try {
      const draftString = localStorage.getItem('character_editor_draft');
      if (!draftString) throw new Error("No draft found.");
      
      const draft = JSON.parse(draftString);
      const draftId = draft.id;
      const draftData = draft.data;

      if ((!character && draftId === null) || (character && draftId === character.id)) {
        console.log("發現並載入匹配的草稿... - App.js:152", draftData);
        setName(draftData.name || '');
        setDescription(draftData.description || '');
        setPersonality(draftData.personality || '');           // ✨ 新增
        setScenario(draftData.scenario || '');                 // ✨ 新增
        setMesExample(draftData.mes_example || '');            // ✨ 新增
        setFirstMessage(draftData.firstMessage || '');
        setAlternateGreetings(draftData.alternateGreetings || []);
        setAvatar(draftData.avatar || { type: 'icon', data: 'UserCircle' });
        setMainLorebookId(draftData.mainLorebookId || '');
        setCreatorNotes(draftData.creatorNotes || '');
        setEmbeddedRegex(draftData.embeddedRegex || []);
        setFav(draftData.fav || false);                        // ✨ 新增
        setPostHistoryInstructions(draftData.post_history_instructions || ''); // ✨ 新增
        return;
      }
    } catch (error) {
      // No draft found or matched, proceed to default loading.
    }

    if (character) {
      setName(character.name || '');
      setDescription(character.description || '');
      setPersonality(character.personality || '');             // ✨ 新增
      setScenario(character.scenario || '');                   // ✨ 新增
      setMesExample(character.mes_example || '');              // ✨ 新增
      setFirstMessage(character.firstMessage || '');
      setAlternateGreetings(character.alternateGreetings || []);
      setAvatar(character.avatar || { type: 'icon', data: 'UserCircle' });
      setMainLorebookId(character.mainLorebookId || '');
      setCreatorNotes(character.creatorNotes || '');
      setEmbeddedRegex(character.embeddedRegex ? structuredClone(character.embeddedRegex) : []);
      setFav(character.fav || false);                          // ✨ 新增
      setPostHistoryInstructions(character.post_history_instructions || ''); // ✨ 新增
    } else {
      setName(''); setDescription(''); setPersonality(''); setScenario(''); setMesExample('');
      setFirstMessage(''); setAlternateGreetings([]);
      setAvatar({ type: 'icon', data: 'UserCircle' }); setMainLorebookId('');
      setCreatorNotes(''); setEmbeddedRegex([]); setFav(false); setPostHistoryInstructions('');
    }
  }, []);

  // ✨ 核心修正 2：在寫入草稿前，檢查「旗標」
  useEffect(() => {
    // 如果這是第一次掛載，我們就設置旗標並直接返回，不做任何事
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // 從第二次渲染開始，這個 effect 才會真正執行寫入操作
    const draftData = {
      name, description, personality, scenario, mes_example,  // ✨ 新增字段
      firstMessage, alternateGreetings,
      avatar, mainLorebookId, creatorNotes, embeddedRegex,
      fav, post_history_instructions                          // ✨ 新增字段
    };
    const draftToStore = {
      id: character ? character.id : null,
      data: draftData
    };
    localStorage.setItem('character_editor_draft', JSON.stringify(draftToStore));

  }, [character, name, description, personality, scenario, mes_example, firstMessage, alternateGreetings, avatar, mainLorebookId, creatorNotes, embeddedRegex, fav, post_history_instructions]);

  // handleSave - ✨ 已更新：保存所有字段
  const handleSave = () => {
    if (!name.trim()) {
      alert('請為您的角色命名！');
      return;
    }
    const characterData = {
      id: character ? character.id : Date.now(),
      name,
      description,
      personality,                    // ✨ 新增
      scenario,                       // ✨ 新增
      mes_example,                    // ✨ 新增
      firstMessage,
      alternateGreetings: alternateGreetings.filter(g => g.trim() !== ''),
      avatar,
      mainLorebookId: mainLorebookId,
      creatorNotes,
      embeddedRegex: embeddedRegex,
      fav,                            // ✨ 新增
      post_history_instructions,      // ✨ 新增
    };
    onSave(characterData);
  };
  
  const handleMainLorebookChange = (event) => { setMainLorebookId(event.target.value); };
  const handleDelete = () => { if (character && window.confirm(`⚠️ 確定要刪除角色「${character.name}」嗎？...`) && window.confirm(`🚨最後一次確認🚨\n\n按下「確定」後，角色「${character.name}」和所有對話將被永久銷毀。\n此操作將會連同【所有相關的聊天記錄】一併永久刪除！\n\n確定要這麼做嗎？`)) { onDelete(character.id); } };
  const handleAddRegexRule = () => { setEmbeddedRegex([...embeddedRegex, { find: '', replace: '', enabled: true }]); };
  const handleRegexRuleChange = (index, field, value) => { const updatedRules = [...embeddedRegex]; updatedRules[index] = { ...updatedRules[index], [field]: value }; setEmbeddedRegex(updatedRules); };
  const handleToggleRegexRule = (index) => { const updatedRules = [...embeddedRegex]; updatedRules[index] = { ...updatedRules[index], enabled: !updatedRules[index].enabled }; setEmbeddedRegex(updatedRules); };
  const handleDeleteRegexRule = (index) => { const updatedRules = embeddedRegex.filter((_, i) => i !== index); setEmbeddedRegex(updatedRules); };
  const handleAvatarUpload = (event) => { const file = event.target.files[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { alert('⚠️ 圖片檔案不能超過 5MB - App.js:228'); return; } const reader = new FileReader(); reader.onload = async (e) => { const originalBase64 = e.target.result; try { const compressedBase64 = await compressImage(originalBase64); setAvatar({ type: 'image', data: compressedBase64 }); } catch (error) { console.error("角色頭像壓縮失敗:", error); setAvatar({ type: 'image', data: originalBase64 }); } }; reader.readAsDataURL(file); event.target.value = ''; };
  const handleAddGreeting = () => { setAlternateGreetings([...alternateGreetings, '']); };
  const handleGreetingChange = (index, value) => { const updatedGreetings = [...alternateGreetings]; updatedGreetings[index] = value; setAlternateGreetings(updatedGreetings); };
  const handleRemoveGreeting = (index) => { const updatedGreetings = alternateGreetings.filter((_, i) => i !== index); setAlternateGreetings(updatedGreetings); };
  const handleExportLocalRegex = useCallback(() => { if (embeddedRegex.length === 0) { alert('此角色沒有可匯出的區域規則。'); return; } const jsonString = JSON.stringify(embeddedRegex, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.download = `${name || 'character'}_local_regex.json`; link.href = url; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); }, [embeddedRegex, name]);
  const handleImportLocalRegex = useCallback((event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); let newRules = []; if (Array.isArray(data)) { newRules = data; } else if (data.scriptName && data.findRegex) { const findRegexStr = data.findRegex; let findPattern = findRegexStr; if (findRegexStr.startsWith('/') && findRegexStr.lastIndexOf('/') > 0) { findPattern = findRegexStr.substring(1, findRegexStr.lastIndexOf('/')); } newRules.push({ find: findPattern, replace: data.replaceString || '', enabled: !data.disabled, }); } else { throw new Error('不支援的檔案格式。'); } if (window.confirm(`即將匯入 ${newRules.length} 條規則到此角色。確定嗎？`)) { setEmbeddedRegex(prev => [...prev, ...newRules]); } } catch (error) { alert(`❌ 匯入失敗：${error.message}`); } finally { if (event.target) event.target.value = ''; } }; reader.readAsText(file); }, []);

  // JSX return remains the same
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>{character ? '編輯角色' : '創建新角色'}</h3><button onClick={onClose} className="close-btn"><X size={20} /></button></div>
        <div className="modal-body">
            <div className="form-group avatar-form-group"> <label>角色頭像</label> <div className="avatar-editor"> <div className="avatar-preview-large"> {avatar.type === 'image' ? ( <img src={avatar.data} alt="頭像" className="avatar-image" /> ) : ( <UserCircle size={48} /> )} </div> <div className="avatar-actions"> <label htmlFor="char-avatar-upload" className="action-button-base"> <FileInput size={16} /> 上傳圖片 </label> {character && ( <label onClick={() => onSave(null, true)} className="action-button-base"> <FileOutput size={16} /> 匯出.png卡 </label> )} </div> {character && ( <button onClick={handleDelete} className="delete-character-icon-btn"> <Trash2 size={16} /> </button> )} <input type="file" id="char-avatar-upload" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} /> </div> </div>
            <div className="form-group"> <label>角色名稱</label> <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：夏洛克．福爾摩斯" /> </div>
            <div className="form-group"> <label>創作者備註</label> <textarea value={creatorNotes} onChange={(e) => setCreatorNotes(e.target.value)} rows="2" /> </div>
            <div className="form-group"> <label>角色描述</label> <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="6" placeholder="在這裡輸入角色的所有設定..." /> </div>
                
                  
              <div className="form-group world-book-section">
                <label className="world-book-label"><Globe size={16} /><span>主要知識書</span></label>
                <p className="setting-description">　選定的知識書將作為此角色的主要背景，並會跟隨角色卡一併匯出。
                                  <select className="setting-select" value={mainLorebookId} onChange={handleMainLorebookChange}>
                    <option value="">--- None ---</option>
                    {worldBooks.map(book => (<option key={book.id} value={book.id}>{book.name}</option>))}
                </select>
                </p>
                <div className="form-label-group">
                    <label className="world-book-label" style={{ marginBottom: '0' }}>
                        <FileText size={16} /> <span>區域正規表示式 ({embeddedRegex.length} 條)</span>
                    </label>
                    {/* ✨ 核心修正 2：確保 onOpenLocalRegexEditor 接收 null 來代表新增 */}
                    <button onClick={() => onOpenLocalRegexEditor(null)} className="add-greeting-btn">
                        <Plus size={14} /> 新增規則
                    </button>
                </div>
                {/* 顯示規則列表 */}
                <div className="character-list" style={{maxHeight: '200px', overflowY: 'auto', marginTop: '8px'}}>
                  {(embeddedRegex || []).map((rule, index) => (
                      <div key={index} className="character-list-item">
                          <div className="character-select-area" style={{opacity: !rule.enabled ? 0.5 : 1}}>
                              <div className="character-info">
                                  {/* ✨ 核心修正 1：使用 'notes' 和 'find' 來顯示 */}
                                  <h4>{rule.notes || '(未命名規則)'}</h4>
                                  <p className="st-regex-find-preview">/{rule.find}/{rule.flags || 'g'}</p>
                              </div>
                          </div>
                          <button className="edit-character-btn" onClick={() => onOpenLocalRegexEditor(index)}>
                              <Edit2 size={16} />
                          </button>
                      </div>
                  ))}
                </div>
            </div>

              <div className="form-group"> <label>主要開場白</label> <textarea value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)} rows="4" placeholder="輸入角色的第一句話..." /> </div>
            <div className="form-group alternate-greetings-group"> <div className="form-label-group"> <label>備用開場白</label> <button onClick={handleAddGreeting} className="add-greeting-btn"> <Plus size={14} /> 新增 </button> </div> {alternateGreetings.map((greeting, index) => ( <div key={index} className="greeting-input-group"> <textarea value={greeting} onChange={(e) => handleGreetingChange(index, e.target.value)} rows="2" placeholder={`備用開場白 #${index + 1}`} /> <button onClick={() => handleRemoveGreeting(index)} className="remove-greeting-btn"> <Trash2 size={16} /> </button> </div> ))} </div>
        </div>
        <div className="modal-footer"><button onClick={handleSave} className="footer-btn save-btn"><Save size={16} />{character ? '儲存變更' : '儲存新角色'}</button></div>
      </div>
    </div>
  );
};

// =================================================================================
// CharacterPreview - ✨ 全新升級版，支援身份選擇 ✨
// =================================================================================
const CharacterPreview = ({ character, onClose, onStartChat, userProfiles }) => {
  // ✨ 直接預設選中列表中的第一個使用者
  const [selectedProfileId, setSelectedProfileId] = useState(userProfiles[0]?.id);

  if (!character) return null;
  
  // 找出當前選中的使用者是誰
  const selectedProfile = userProfiles.find(p => p.id === selectedProfileId) || userProfiles[0];

  // 我們用選中的使用者來處理佔位符
  const processedDescription = applyPlaceholders(character.description || '這個角色沒有描述。', character, selectedProfile);
  
  const handleStartChat = () => {
    const initialGreeting = character.firstMessage || '你好！';
    // ✨ 核心修改：將選中的使用者 ID 一起傳出去
    onStartChat(character, initialGreeting, selectedProfileId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content character-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{character.name}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body preview-body">
          <div className="preview-top-section">
            <div className="preview-character-image">
              {character.avatar?.type === 'image' ? (
                <img src={character.avatar.data} alt={character.name} className="avatar-image" />
              ) : (
                <div className="image-placeholder"><UserCircle size={64} /></div>
              )}
            </div>
            <div className="preview-description">
              <p>{processedDescription}</p>
            </div>
          </div>

          {/* ✨✨✨ 全新！使用者身份選擇下拉選單 ✨✨✨ */}
          </div>
        <div className="modal-footer">

          {/* ✨✨✨ 我們把它剪下並貼到這裡，按鈕的上方 ✨✨✨ */}
          <div className="form-group" style={{marginTop: '0'}}> {/* 順便把 marginTop 拿掉 */}
            <label className="setting-label">以...身份開始對話</label>
            {/* 🔥🔥🔥 把原本的 <select>...</select> 整個刪掉，換成下面這一段 🔥🔥🔥 */}
            <UserProfileSelector
              profiles={userProfiles}
              selectedProfileId={selectedProfileId}
              onChange={setSelectedProfileId}
            />
          </div>
          
          <button onClick={handleStartChat} className="footer-btn save-btn">
            開始聊天
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================================
// ✨✨✨ 全新升級！擁有強大排序功能的 CharactersPage ✨✨✨
// =================================================================================
const CharactersPage = ({ characters, onAdd, onEdit, onImport, onPreview, onToggleFavorite }) => {
  const [showFloatMenu, setShowFloatMenu] = useState(false);
  
  // ✨ 1. 新增一個 state 來管理排序設定 ✨
  // 預設是 { key: 'name', order: 'asc' }，代表「依名稱 A->Z」
  const [sortConfig, setSortConfig] = useState({ key: 'name', order: 'asc' });
  
  // ✨ 2. 新增一個 state 來控制排序選單的開關 ✨
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // ✨ 3. 大幅升級 useMemo 中的排序邏輯 (SillyTavern 專業版) ✨
  const sortedCharacters = useMemo(() => {
    // 這個正規表示式用來判斷字串是否以英文字母、數字或常見符號開頭
    const isAscii = /^[a-zA-Z0-9!"#$%&'()*+,-./:;<=>?@[\\\]^_`{|}~]/;

    return [...characters].sort((a, b) => {
      // --- 規則 1: 最愛永遠優先 ---
      if (a.fav !== b.fav) {
        return a.fav ? -1 : 1;
      }

      // --- 規則 2: 根據排序模式，執行完全不同的排序策略 ---
      if (sortConfig.key === 'name') {
        const aIsAscii = isAscii.test(a.name);
        const bIsAscii = isAscii.test(b.name);

        if (sortConfig.order === 'asc') {
          // A -> Z 模式：英文優先
          if (aIsAscii && !bIsAscii) return -1; // a 是英文，b 不是 -> a 在前
          if (!aIsAscii && bIsAscii) return 1;  // b 是英文，a 不是 -> b 在前
          
          // 如果語言相同，則正常比較
          return a.name.localeCompare(b.name, 'zh-Hant');

        } else { // 'desc'
          // Z -> A 模式：中文優先
          if (aIsAscii && !bIsAscii) return 1;  // a 是英文，b 不是 -> a 在後
          if (!aIsAscii && bIsAscii) return -1; // b 是英文，a 不是 -> b 在後

          // 如果語言相同，則反向比較
          return b.name.localeCompare(a.name, 'zh-Hant');
        }
      } else if (sortConfig.key === 'id') {
        // 依加入時間排序 (這個比較簡單，直接反轉即可)
        const comparison = a.id - b.id;
        return sortConfig.order === 'asc' ? comparison : -comparison;
      }
      
      return 0; // 預設情況
    });
  }, [characters, sortConfig]); // ✨ 依賴項新增了 sortConfig ✨

  // ✨ 4. 建立一個排序選項的清單，方便我們渲染按鈕 ✨
  const sortOptions = [
    { key: 'name', order: 'asc', label: '名稱 A -> Z' },
    { key: 'name', order: 'desc', label: '名稱 Z -> A' },
    { key: 'id', order: 'desc', label: '加入時間 (新 -> 舊)' },
    { key: 'id', order: 'asc', label: '加入時間 (舊 -> 新)' },
  ];

  const currentSortLabel = sortOptions.find(
    opt => opt.key === sortConfig.key && opt.order === sortConfig.order
  )?.label;

  return (
    <div className="page-content">
      <div className="content-area character-list-page">
        {/* ✨ 5. 在這裡加入我們的排序 UI ✨ */}
        {characters.length > 0 && (
          <div className="list-header-controls">
            <div className="sort-control-container">
              <button className="sort-control-button" onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}>
                <span>排序方式: {currentSortLabel}</span>
                <ChevronDown size={16} style={{ transform: isSortMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {isSortMenuOpen && (
                <div className="sort-options-menu">
                  {sortOptions.map(option => (
                    <button 
                      key={`${option.key}-${option.order}`}
                      className="sort-option"
                      onClick={() => {
                        setSortConfig({ key: option.key, order: option.order });
                        setIsSortMenuOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {characters.length === 0 ? (
          <div className="empty-state">
          <div className="empty-icon"><Users size={48} /></div>
          <h3>還沒有角色</h3>
          <p>創建或匯入你的第一個角色來開始對話吧！</p>
          <div className="empty-state-buttons">
            <button onClick={onAdd} className="import-button">
              <Plus size={16} /> 創建新角色
            </button>
            <label htmlFor="import-character-json" className="import-button">
              <FileInput size={16} /> 匯入角色 (.png / .json)
            </label>
            <input type="file" id="import-character-json" accept=".json,.jsonc,.png" onChange={onImport} style={{ display: 'none' }} multiple />
          </div>
        </div>
      ) : (
          <div className="character-list">
            {/* ✨ 6. 這裡不需要改，它會自動使用我們上面排好的 sortedCharacters ✨ */}
            {sortedCharacters.map((character) => (
              <div key={character.id} className="character-list-item">
                <div className="character-select-area" onClick={() => onPreview(character)}>
                  <div className="character-avatar-large">
                    {character.avatar?.type === 'image' ? (<img src={character.avatar.data} alt={character.name} className="avatar-image" />) : (<UserCircle size={32} />)}
                  </div>
                  <div className="character-info">
                    <h4>{character.name}</h4>
                    <p>{character.creatorNotes || character.description?.split('\n')[0]}</p>
                  </div>
                </div>
                <button 
                  className={`fav-character-btn ${character.fav ? 'favorited' : ''}`}
                  onClick={() => onToggleFavorite(character.id)}
                >
                  <Star size={16} />
                </button>
                <button className="edit-character-btn" onClick={() => onEdit(character)}><Settings size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {characters.length > 0 && (
          <>
            {showFloatMenu && (
              <div className="floating-options-container">
                <label htmlFor="import-character-float" className="floating-add-button mini">
                  <FileInput size={24} />
                </label>
                <input type="file" id="import-character-float" accept=".json,.jsonc,.png" onChange={(e) => { onImport(e); setShowFloatMenu(false); }} style={{ display: 'none' }} multiple />
                <button onClick={() => { onAdd(); setShowFloatMenu(false); }} className="floating-add-button mini">
                  <Plus size={24} />
                </button>
              </div>
            )}
            <button onClick={() => setShowFloatMenu(!showFloatMenu)} className={`floating-add-button ${showFloatMenu ? 'open' : ''}`}>
              {showFloatMenu ? <X size={24} /> : <Plus size={24} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const ChatLobby = ({ characters, chatHistories, chatMetadatas, onSelectChat, onTogglePin, swipedChatId, setSwipedChatId, onDeleteChat, onEditMetadata }) => {

  // ✨ 步驟 ：現在才來建立要顯示在畫面上的列表，並過濾掉分支。
  const allChats = [];
  for (const char of characters) {
    const charId = char.id;
    const sessions = chatHistories[charId] || {};
    const metas = chatMetadatas[charId] || {};
    for (const chatId in sessions) {
      const history = sessions[chatId];
      const metadata = metas[chatId] || { name: '', notes: '', pinned: false };
      
      // ✨ 核心修改：移除過濾條件，讓所有聊天室都顯示
      if (history) { 
        let lastMessage, lastMessageText, sortKey;

        if (history.length > 0) {
          lastMessage = history[history.length - 1];
          lastMessageText = lastMessage.contents 
            ? lastMessage.contents[lastMessage.activeContentIndex] 
            : lastMessage.text;
          sortKey = lastMessage.id || 0;
        } else {
          lastMessage = { sender: 'system' };
          lastMessageText = "點此開始對話...";
          sortKey = parseInt(chatId.split('_')[1] || Date.now());
        }
        
        allChats.push({
          char,
          chatId,
          lastMessage,
          isPinned: metadata.pinned,
          sortKey,
          lastMessageText,
          metadata
        });
      }
    }
  }

  // 排序邏輯不變
  allChats.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.sortKey - a.sortKey;
  });

  const handleSwipeToggle = (chatId, event) => {
    event.stopPropagation();
    setSwipedChatId(prevId => (prevId === chatId ? null : chatId));
  };

  const handleDeleteChat = (charId, chatId, event) => {
    event.stopPropagation();
    onDeleteChat(charId, chatId);
    setSwipedChatId(null);
  };
  
  const handlePinChat = (charId, chatId, event) => {
      event.stopPropagation();
      onTogglePin(charId, chatId);
      setSwipedChatId(null);
  };

  return (
    <div className="page-content" onClick={() => setSwipedChatId(null)}>
      <div className="content-area character-list-page">
        {allChats.length === 0 ? (
          <div className="empty-state">點選角色開始聊天吧</div>
        ) : (
          <div className="character-list">
            {/* ✨✨✨ 核心修正 2：直接使用我們上面準備好的變數 ✨✨✨ */}
            {allChats.map(({ char, chatId, lastMessage, isPinned, lastMessageText, metadata }) => (
              <div key={chatId} className="swipe-item-wrapper">
                <div className="swipe-actions">
                  <button className="swipe-action-btn pin" onClick={(e) => handlePinChat(char.id, chatId, e)}>
                    {isPinned ? '取消最愛' : '最愛'}
                  </button>
                  <button 
                    className="swipe-action-btn delete" 
                    onClick={(e) => {
                      if (isPinned) {
                        e.stopPropagation();
                        alert('都設成最愛了，怎麼能刪除呢？😢');
                        setSwipedChatId(null);
                      } else {
                        handleDeleteChat(char.id, chatId, e);
                      }
                    }}
                  >
                    刪除
                  </button>
                </div>

                <div 
                  className={`character-list-item swipe-content ${swipedChatId === chatId ? 'swiped' : ''}`}
                  onClick={(e) => {
                    if (swipedChatId === chatId) {
                        handleSwipeToggle(chatId, e);
                    } else {
                        onSelectChat(char.id, chatId);
                    }
                  }}
                >
                  {/* 
                    ✨ 核心修改 1：我們讓這個可點擊區域自動填滿所有剩餘空間。
                    這就是那個「會自動長大的空白區域」。
                  */}
                  <div className="character-select-area" style={{ marginRight: 'auto' }}>
                    <div className="avatar-wrapper">
                        <div className="character-avatar-large">
                        {char.avatar?.type === 'image' ? (<img src={char.avatar.data} alt={char.name} className="avatar-image" />) : (<UserCircle size={32} />)}
                        </div>
                        {isPinned && (
                            <div className="pin-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </div>
                        )}
                    </div>
                    <div className="character-info">
                      <h4>
                        {metadata.name || char.name}
                      </h4>
                      <p>{metadata.notes || (lastMessage.sender === 'user' ? '你: ' : '') + lastMessageText}</p>
                    </div>
                  </div>

                  {/* 
                    ✨ 核心修改 2：我們把所有右側的按鈕都放進一個新的 div 容器裡。
                    這個容器會被上面那個空白區域「推」到最右邊。
                  */}
                  <div className="lobby-item-actions" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    
                    {/* 編輯備註 (齒輪) 按鈕 */}
                    <button 
                      className="edit-character-btn" 
                      style={{ marginRight: '8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMetadata(char.id, chatId);
                      }}
                    >
                      <Settings size={16} />
                    </button>

                    {/* 更多 (...) 按鈕 */}
                    <button className="more-actions-btn" onClick={(e) => handleSwipeToggle(chatId, e)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// =================================================================================
// ✨✨✨ 全新！聊天知識書選擇器 Modal ✨✨✨
// =================================================================================
const AuxiliaryLorebookSelectorModal = ({ show, worldBooks, selectedIds, onSave, onClose }) => {
  // 用一個暫時的 state 來管理使用者在視窗內的勾選，按下儲存後才真正生效
  const [tempSelectedIds, setTempSelectedIds] = useState([]);

  useEffect(() => {
    // 當視窗打開時，將外部傳入的已選 ID 同步到我們的暫時 state
    if (show) {
      setTempSelectedIds(selectedIds || []);
    }
  }, [show, selectedIds]);

  if (!show) return null;

  // 處理勾選/取消勾選的邏輯
  const handleToggle = (bookId) => {
    setTempSelectedIds(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };
  
  const handleSave = () => {
    onSave(tempSelectedIds); // 將最終選定的 ID 列表傳回給父元件
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>選擇聊天知識書</h3><button onClick={onClose} className="close-btn"><X size={20} /></button></div>
        <div className="modal-body">
          <p className="setting-description" style={{ marginBottom: '16px' }}>
            您可以在此為本次聊天額外啟用一本或多本世界書。
          </p>
          <div className="world-book-selector-list">
            {worldBooks.length > 0 ? worldBooks.map(book => (
                <label key={book.id} className="wb-selector-item">
                    <input
                        type="checkbox"
                        checked={tempSelectedIds.includes(book.id)}
                        onChange={() => handleToggle(book.id)}
                    />
                    <span className="wb-selector-name">{book.name}</span>
                </label>
            )) : (
                <p className="empty-list-text">還沒有建立任何世界書。</p>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn"><Save size={16}/> 儲存選擇</button>
        </div>
      </div>
    </div>
  );
};

// ================== ✨ 最終版！完美支援 Markdown 和引號變色 ✨ ==================
const ChatMessage = ({ msg, processedText, currentUserProfile, character, setEditingMessage, activeChatId, handleDeleteMessage, showActionsMessageId, setShowActionsMessageId, handleRegenerate, isLastMessage, onChangeVersion, isScreenshotMode, isSelected, onSelectMessage, onBranch }) => {
  const showActions = showActionsMessageId === msg.id;

  const handleBubbleClick = () => {
    setShowActionsMessageId(showActions ? null : msg.id);
  };
  
  const onStartEditing = () => {
    setEditingMessage({ chatId: activeChatId, messageId: msg.id, text: msg.contents[msg.activeContentIndex] });
    setShowActionsMessageId(null);
  };

  const onDelete = () => {
    handleDeleteMessage(msg.id);
    setShowActionsMessageId(null);
  };

  const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZHRoPSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXVzZXItY2lyY2xlIj48cGF0aCBkPSJNMjAgMjFhOCAzIDAgMCAwLTE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMSIgcj0iNCIvPjwvc3ZnPg==';
  const userAvatar = currentUserProfile.avatar?.type === 'image' ? currentUserProfile.avatar.data : DEFAULT_AVATAR;
  const charAvatar = character.avatar?.type === 'image' ? character.avatar.data : DEFAULT_AVATAR;
  const avatarUrl = msg.sender === 'user' ? userAvatar : charAvatar;
  const messageClass = msg.sender === 'user' ? 'user-message' : msg.sender === 'system' ? 'system-message' : 'ai-message';

  // ==========================================================
  // ✨✨✨ 在這裡進行冒號的處理 ✨✨✨
  // ==========================================================
  
  // 步驟 1: 先複製一份原始訊息
  let textToProcess = processedText;

  // 步驟 2: 使用正規表示式，找到所有「全形冒號後面緊跟著一個上引號」的地方
  // g 的意思是 global，代表取代所有符合條件的地方，而不只是第一個
  const regex = /(：|，|。|；|？|！|…|、|—|"|『)(「|“|"|『|【)/g;
  // 處理引號後緊跟星號的情況
  const quoteStarRegex = /(「|“|"|『|【)\*/g;
  
  // 步驟 3: 進行替換
  // '$1' 代表的是第一個括號裡捕捉到的內容 (也就是那個上引號本身)
  // 所以 '：「' 會被換成 '： 「'
  textToProcess = textToProcess.replace(regex, '$1 $2');
  textToProcess = textToProcess.replace(quoteStarRegex, '$1 *');
  
  // 步驟 4: 將處理過的文字，再交給我們原本的引號高亮函式
  const finalRenderText = highlightQuotedText(textToProcess);

  return (
    // ==================================================
    // ✨✨✨ 修改最外層的這個 div ✨✨✨
    // ==================================================
    <div
      className={`message ${messageClass} ${isScreenshotMode ? 'screenshot-mode' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelectMessage(msg.id)} // 點擊時，呼叫從 props 傳來的函式
      data-message-id={msg.id} // 新增一個屬性，方便我們之後在 DOM 中找到它
    >
      {msg.sender !== 'system' && (
        <div className="message-avatar">
          <img src={avatarUrl} alt={msg.sender} className="avatar-image" />
        </div>
      )}
      <div className="message-content">
        {/*
          ✨ 關鍵修改：在截圖模式下，我們不希望點擊泡泡還會觸發顯示編輯按鈕，
          所以我們把 onClick 事件從 bubble-wrapper 移到了最外層的 div。
          但在正常模式下，我們保留原本的功能。
        */}
        <div className="bubble-wrapper" onClick={!isScreenshotMode ? handleBubbleClick : undefined}>

          {/* ▼▼▼ ✨✨✨ 全新的思考過程渲染邏輯 ✨✨✨ ▼▼▼ */}
          {msg.thought && !isScreenshotMode && (
            <details className="ai-thought-details">
              <summary className="ai-thought-summary">
                <Bot size={16} />
                <span>AI 正在思考...</span>
              </summary>
              <pre className="ai-thought-content">
                {msg.thought}
              </pre>
            </details>
          )}
          {/* ▲▲▲ ✨✨✨ 渲染邏輯結束 ✨✨✨ ▲▲▲ */}

          <ReactMarkdown
            rehypePlugins={[rehypeRaw]}
            // ▼▼▼ 【✨ 核心修正就在這裡！ ✨】 ▼▼▼
            components={{
              // 我們告訴 ReactMarkdown：
              // 當你遇到一個叫做 'filtered' 的標籤時...
              filtered: ({node, ...props}) => 
                // ...請你把它渲染成一個 <span> 標籤
                // 並且把它的內容（props.children）原封不動地放進去
                <span {...props} /> 
            }}
          >
            {/* 4. ✨ 在這裡使用我們新的變數名 */}
            {finalRenderText}
          </ReactMarkdown>

          {/* 我們不希望截圖中出現時間戳，所以在截圖模式下隱藏它 */}
          {!isScreenshotMode && <span className="timestamp">{msg.timestamp}</span>}

          {/* 下面的編輯、刪除、版本切換等按鈕，在截圖模式下也都不顯示 */}
          {!isScreenshotMode && (
            <>
              {/* 1. 刪除按鈕 */}
              <button
                onClick={onDelete}
                className={`delete-message-btn ${showActions ? 'visible' : ''}`}
                title={msg.sender === 'system' ? '刪除系統訊息' : '刪除訊息'}
              >
                <Trash2 size={14} />
              </button>

              {/* 2. 分支按鈕 */}
              {msg.sender !== 'system' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const branchName = window.prompt("請為這個新的分支命名：", "");
                    if (branchName && branchName.trim() !== "") {
                      onBranch(msg.id, branchName.trim());
                    }
                  }}
                  className={`branch-message-btn ${showActions ? 'visible' : ''}`}
                  title="從此訊息建立分支"
                >
                  <Split size={14} />
                </button>
              )}

              {msg.sender !== 'system' && (
                <button onClick={onStartEditing} className={`edit-message-btn ${showActions ? 'visible' : ''}`} title="編輯訊息">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
              )}

              {msg.sender === 'ai' && msg.contents.length > 1 && showActions && (
                  <div className="message-actions-toolbar">
                      <button
                      className="action-btn"
                      disabled={msg.activeContentIndex === 0}
                      onClick={(e) => { e.stopPropagation(); onChangeVersion(msg.id, 'prev'); }}
                      >
                      ‹
                      </button>
                      <span className="version-indicator">
                      {msg.activeContentIndex + 1} / {msg.contents.length}
                      </span>
                      <button
                      className="action-btn"
                      disabled={msg.activeContentIndex === msg.contents.length - 1}
                      onClick={(e) => { e.stopPropagation(); onChangeVersion(msg.id, 'next'); }}
                      >
                      ›
                      </button>
                  </div>
              )}

              {isLastMessage && msg.sender === 'ai' && showActions && (
                 <button className="regenerate-btn" onClick={(e) => { e.stopPropagation(); handleRegenerate(); }} title="重新生成">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M3 21a9 9 0 0 1 .5-4.5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
const MessageEditorModal = ({ editingMessage, onSave, onClose }) => {
  const [modalText, setModalText] = useState('');

  useEffect(() => {
    if (editingMessage) {
      setModalText(editingMessage.text);
    }
  }, [editingMessage]);

  if (!editingMessage) {
    return null;
  }
  
  const handleSave = () => {
    onSave(editingMessage.chatId, editingMessage.messageId, modalText);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>編輯訊息</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <textarea
            value={modalText}
            onChange={(e) => setModalText(e.target.value)}
            className="edit-textarea"
            style={{ minHeight: '250px' }}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="edit-btn cancel">取消</button>
          <button onClick={handleSave} className="edit-btn save">儲存</button>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！長期記憶編輯 Modal 元件 ====================
const LongTermMemoryModal = ({ memory, onSave, onUpdate, onClose, isLoading }) => {
  // 用一個 state 來記住使用者在 Modal 輸入框裡的文字
  const [memoryText, setMemoryText] = useState('');
  
  // 當 Modal 彈出時，將外部傳入的 memory 設為初始值
  useEffect(() => {
    setMemoryText(memory || ''); // 如果 memory 是 null 或 undefined，就顯示空字串
  }, [memory]);

  // 如果沒有觸發這個 Modal (外部傳進來的 memory 是 null)，就不顯示任何東西
  if (memory === null) {
    return null;
  }

  // 處理手動儲存
  const handleSave = () => {
    onSave(memoryText);
  };
  
  // 處理點擊「AI 自動更新」
  const handleUpdate = () => {
    // 呼叫外部傳進來的 onUpdate 函式，它會觸發 AI 運算
    onUpdate(); 
  };

  return (
    // 我們可以重用大部分 modal 的樣式
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>長期記憶摘要</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="setting-label" style={{ marginBottom: '12px' }}>
            AI 會在每次對話時參考這份摘要。您可以手動編輯，或讓 AI 根據最近的對話自動更新。
          </p>
          <textarea
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            className="edit-textarea" // 重用編輯訊息的樣式
            style={{ minHeight: '250px' }}
            placeholder="目前沒有任何記憶摘要..."
          />
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
           <button 
             onClick={handleUpdate} 
             className="edit-btn secondary" // 使用次要按鈕樣式
             disabled={isLoading}
            >
             {isLoading ? '更新中...' : '長期記憶更新'}
           </button>
          <div>
            <button onClick={onClose} className="edit-btn cancel">取消</button>
            <button onClick={handleSave} className="edit-btn save">儲存</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！作者備註編輯 Modal ====================
const AuthorsNoteModal = ({ initialNote, onSave, onClose }) => {
  const [authorsNote, setAuthorsNote] = useState('');

  useEffect(() => {
    setAuthorsNote(initialNote || '');
  }, [initialNote]);
  
  const handleSave = () => {
    onSave(authorsNote);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Author's Note (Author's Note)</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="setting-label" style={{ marginBottom: '12px' }}>
            在這裡輸入給 AI 的指令，這個指令只對當前聊天室有效。
          </p>
          <textarea
            value={authorsNote}
            onChange={(e) => setAuthorsNote(e.target.value)}
            className="edit-textarea"
            rows={5}
            placeholder="例如：Focus on the character's internal thoughts."
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="edit-btn cancel">取消</button>
          <button onClick={handleSave} className="edit-btn save">儲存</button>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！聊天室資訊編輯 Modal 元件 ====================
const ChatMetadataEditorModal = ({ metadata, onSave, onClose }) => {
  // ✨ 1. 新增一個 state 來管理「名稱」
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  // ✨ 2. 當視窗打開時，同時載入名稱和備註
  useEffect(() => {
    if (metadata) {
      setName(metadata.name || ''); // 如果沒有自訂名稱，就顯示空字串
      setNotes(metadata.notes || '');
    }
  }, [metadata]);

  if (!metadata) {
    return null;
  }
  
  // ✨ 3. 儲存時，把名稱和備註打包成一個物件傳出去
  const handleSave = () => {
    onSave({ name: name.trim(), notes });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {/* 標題改得更通用 */}
          <h3>編輯聊天室資訊</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* ✨ 4. 新增名稱輸入框 ✨ */}
          <div className="form-group">
            <label>聊天室自訂名稱 (可選)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="留空則會顯示角色原名"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>聊天室備註</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="edit-textarea"
              style={{ minHeight: '150px' }}
              placeholder="紀錄的文字會放在名稱下面，角色不會看到的"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="edit-btn cancel">取消</button>
          {/* 按鈕文字也改得更通用 */}
          <button onClick={handleSave} className="edit-btn save">儲存變更</button>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！主題選擇彈出式 Modal 元件 ====================
const ThemeSwitcherModal = ({ currentTheme, onSelect, onClose }) => {
  // 我們在這裡定義所有可用的主題，和上次一樣
  const themes = [
    { id: 'light', name: '淺色主題', Icon: Sun },
    { id: 'dark', name: '深色主題', Icon: Moon },
    { id: '蟲餡包綠', name: '蟲餡包綠', Icon: CaterpillarIcon },
    { id: '牛奶可可', name: '牛奶可可', Icon: Coffee },
    { id: 'old-books', name: '懷舊書頁', Icon: BookOpen },
    { id: 'old-blue', name: '舊時光藍', Icon: AppWindow },
    { id: 'hyacinth-mauve', name: '芋泥奶凍', Icon: Dessert },
    { id: 'misty forest', name: '靜霧森語', Icon: TreePine },
    { id: 'dark-hyacinth', name: '深林莓果', Icon: Cherry },
    { id: 'blue-moon', name: '夜色月輪', Icon: CloudMoon },
    { id: 'moriarty', name: '塵墜滝下', Icon: Waves },
  ];

  const handleSelect = (themeId) => {
    onSelect(themeId); // 呼叫父層傳來的函式來設定主題
    onClose();      // 選擇後自動關閉 Modal
  };

  return (
    // 我們可以重用大部分 modal 的樣式
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>選擇您的主題</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* 我們可以重用 character-list 的樣式來顯示列表 */}
          <div className="character-list">
            {themes.map((theme) => (
              <div
                key={theme.id}
                // 如果是當前選中的主題，就加上 active 的 class 讓它高亮
                className={`character-list-item ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => handleSelect(theme.id)}
                style={{ cursor: 'pointer' }} // 確保顯示手指圖示
              >
                <div className="character-select-area">
                  {/* 這裡我們用一個簡單的 div 來放圖示 */}
                  <div className="character-avatar-large" style={{ backgroundColor: 'transparent', border: 'none' }}>
                    <theme.Icon size={24} color={currentTheme === theme.id ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                  </div>
                  <div className="character-info">
                    {/* 我們把 h4 改成 span，讓語意更合適 */}
                    <h4>{theme.name}</h4>
                  </div>
                </div>
                {/* 如果是當前選中的主題，就顯示一個勾勾 */}
                {currentTheme === theme.id && (
                  <div className="active-check-icon">
                    <Check size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！使用者個人檔案編輯器 Modal ====================
const UserProfileEditor = ({ profile, onSave, onClose }) => {
  // State definitions remain the same
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState({ type: 'icon', data: 'UserCircle' });

  // ✨ 1. 引入 useRef 作為「首次渲染」的旗標
  const isInitialMount = useRef(true);

  // ✨ 2. 從 LocalStorage 讀取草稿 (僅在組件掛載時執行)
  useEffect(() => {
    try {
      const draftString = localStorage.getItem('user_profile_editor_draft');
      if (!draftString) throw new Error("No draft found.");
      
      const draft = JSON.parse(draftString);
      const draftId = draft.id;
      const draftData = draft.data;

      // 判斷是否應該載入這個草稿
      if ((!profile && draftId === null) || (profile && draftId === profile.id)) {
        console.log("發現並載入匹配的使用者個人檔案草稿... - App.js:1165", draftData);
        setName(draftData.name || '');
        setNotes(draftData.notes || '');
        setDescription(draftData.description || '');
        setAvatar(draftData.avatar || { type: 'icon', data: 'UserCircle' });
        return; // 成功載入草稿，結束函式
      }
    } catch (error) {
      // 找不到草稿或草稿不匹配，這是正常情況，繼續執行預設載入邏輯
    }

    // 如果沒有成功載入草稿，就執行預設的載入邏輯
    if (profile) {
      setName(profile.name || '');
      setNotes(profile.notes || '');
      setDescription(profile.description || '');
      setAvatar(profile.avatar || { type: 'icon', data: 'UserCircle' });
    } else {
      setName('');
      setNotes('');
      setDescription('');
      setAvatar({ type: 'icon', data: 'UserCircle' });
    }
  }, []); // 空陣列 [] 確保只在掛載時執行一次

  // ✨ 3. 即時將變更寫入 LocalStorage
  useEffect(() => {
    // 如果是第一次掛載，我們就設置旗標並直接返回，避免用空值覆蓋草稿
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const draftData = { name, notes, description, avatar };
    const draftToStore = {
      id: profile ? profile.id : null, // 記下我們正在為哪個個人檔案寫草稿
      data: draftData
    };
    localStorage.setItem('user_profile_editor_draft', JSON.stringify(draftToStore));
  }, [profile, name, notes, description, avatar]);


  const handleSave = () => {
    if (!name.trim()) {
      alert('請為您的個人檔案命名！');
      return;
    }
    onSave({ name, notes, description, avatar });
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ 圖片檔案不能超過 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalBase64 = e.target.result;
      try {
        const compressedBase64 = await compressImage(originalBase64);
        setAvatar({ type: 'image', data: compressedBase64 });
      } catch (error) {
        console.error("使用者頭像壓縮失敗: - App.js:1229", error);
        setAvatar({ type: 'image', data: originalBase64 });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // JSX return remains the same
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{profile ? '編輯個人檔案' : '建立新個人檔案'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group avatar-form-group">
            <label>你的頭像</label>
            <div className="avatar-editor">
              <div className="avatar-preview-large">
                {avatar.type === 'image' ? (
                  <img src={avatar.data} alt="頭像" />
                ) : (
                  <UserCircle size={48} />
                )}
              </div>
              <div className="avatar-actions">
                <label htmlFor="user-avatar-upload" className="action-button-base">
                  <FileInput size={16} /> 上傳圖片
                </label>
                 <input
                  type="file"
                  id="user-avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>你的名稱/暱稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：華生"
            />
          </div>
          <div className="form-group">
            <label>備註</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：醫生"
            />
          </div>
          <div className="form-group">
            <label>你的角色描述 (AI 會參考這份資料)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              placeholder="描述一下你的個性和特色。例如：男性，偵探助手，個性務實、忠誠。"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn">
            <Save size={16} /> {profile ? '儲存變更' : '儲存檔案'}
          </button>
        </div>
      </div>
    </div>
  );
};

// =================================================================================
// ✨✨✨ 全新！提示詞預設集選擇器 Modal ✨✨✨
// =================================================================================
const PromptSwitcherModal = ({ prompts, currentPromptId, onSelect, onClose, onAddNew, onDelete }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>選擇提示詞預設集</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {/* 我們可以重用 character-list 的樣式 */}
          <div className="character-list">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`character-list-item ${currentPromptId === prompt.id ? 'active' : ''}`}
                >
                {/* ✨ 核心修改 1：將 onClick 從外層 div 移到這個新的 div 上 ✨ */}
                <div 
                  className="character-select-area"
                  onClick={() => { onSelect(prompt); onClose(); }}
                >
                  <div className="character-avatar-large" style={{ backgroundColor: 'transparent', border: 'none' }}>
                    <FileText size={24} color={currentPromptId === prompt.id ? 'var(--primary-color)' : 'var(--text-secondary)'} />
                  </div>
                  <div className="character-info">
                    <h4>{prompt.name}</h4>
                  </div>
                </div>

                {/* ✨ 核心修改 2：在右側新增刪除按紐 ✨ */}
                <button
                  className="edit-character-btn delete-icon-btn" // 重用現有的 CSS 格式
                  onClick={(e) => {
                    e.stopPropagation(); // ✨ 這行非常重要，防止點擊按鈕時觸發外層 div 的 onSelect
                    if (window.confirm(`確定要永久刪掉提示詞「${prompt.name}」嗎？`)) {
                      onDelete(prompt.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onAddNew} className="footer-btn save-btn">
            <Plus size={16} /> 建立新的預設集
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== 全新！使用者個人檔案切換器 Modal ====================
const UserProfileSwitcherModal = ({ profiles, currentProfileId, onSelect, onClose }) => {
  return (
    // 我們可以重用大部分 modal 的樣式
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>切換您的身份</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="setting-label" style={{ marginBottom: '12px' }}>
            選擇一個身份來繼續目前的對話。
          </p>
          {/* 我們可以重用 character-list 的樣式來顯示列表 */}
          <div className="character-list">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                // 如果是當前選中的 profile，就加上 active 的 class 讓它高亮
                className={`character-list-item ${currentProfileId === profile.id ? 'active' : ''}`}
                onClick={() => onSelect(profile.id)}
              >
                <div className="character-select-area">
                  <div className="character-avatar-large">
                    {profile.avatar?.type === 'image' ? (
                      <img src={profile.avatar.data} alt={profile.name} className="avatar-image" />
                    ) : (
                      <UserCircle size={32} />
                    )}
                  </div>
                  <div className="character-info">
                    <h4>{profile.name || '(未命名身份)'}</h4>
                    <p>{profile.notes || profile.description?.split('\n')[0]}</p>
                  </div>
                </div>
                {/* 如果是當前選中的 profile，就顯示一個勾勾 */}
                {currentProfileId === profile.id && (
                  <div className="active-check-icon">
                    <Check size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatPage = ({ worldBooks, chatMetadatas, onOpenAuxLorebookSelector, regexRules, oocCommands, onOpenOocSelector, onSelectOocCommand, messages, inputMessage, setInputMessage, isLoading, sendMessage, continueGeneration, currentUserProfile, currentCharacter, currentPrompt, isApiConnected, apiProviders, apiProvider, messagesEndRef, setEditingMessage, handleUpdateMessage, handleDeleteMessage, activeChatId, showActionsMessageId, setShowActionsMessageId, handleRegenerate, onChangeVersion, isInputMenuOpen, setIsInputMenuOpen, loadedConfigName, apiModel, setIsMemoryModalOpen, setIsAuthorsNoteModalOpen, exportChat, handleImport, isScreenshotMode, selectedMessageIds, handleToggleScreenshotMode, handleSelectMessage, handleGenerateScreenshot, onSwitchProfile, onBranch }) => {
  
  const textareaRef = useRef(null);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  // ✨ 1. 核心新增：計算當前啟用的「聊天知識書」
  const activeAuxiliaryBooks = useMemo(() => {
    if (!currentCharacter || !activeChatId) return [];
    
    // 從 metadata 中讀取這個聊天室儲存的額外世界書 ID 列表
    const auxBookIds = chatMetadatas[currentCharacter.id]?.[activeChatId]?.auxiliaryBookIds || [];
    
    // 從總世界書列表中，篩選出 ID 匹配的書
    return worldBooks.filter(book => auxBookIds.includes(book.id));
  }, [worldBooks, chatMetadatas, currentCharacter, activeChatId]);

  // ✨✨✨ 1. 在這裡加入計算主要知識書的 useMemo ✨✨✨
  const activeMainBook = useMemo(() => {
    if (!currentCharacter?.mainLorebookId || !worldBooks) return null;
    return worldBooks.find(book => book.id === currentCharacter.mainLorebookId);
  }, [worldBooks, currentCharacter]);

    
// =================================================================================
// ✨✨✨ applyAllRegex - 使用獨立函數的 wrapper ✨✨✨
// =================================================================================
  const applyAllRegex = useCallback((text, char, sender, contextType = 'chat', options = {}) => {
    return applyRegexRules(text, regexRules, char?.embeddedRegex, sender, contextType, options);
  }, [regexRules]);

  // ✨ 同時，我們也需要更新 ChatPage 中呼叫它的地方 ✨
  // (這一步需要在 ChatPage 元件的 return JSX 中修改)
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, messagesEndRef]);
  useEffect(() => { const textarea = textareaRef.current; if (textarea) { textarea.style.height = 'auto'; textarea.style.height = `${textarea.scrollHeight}px`; } }, [inputMessage]);
  const handleSend = () => { if (inputMessage.trim()) { sendMessage(); } else { continueGeneration(); } };
  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const isButtonDisabled = isLoading || (!inputMessage.trim() && messages.length === 0);

  return (
    <div className="page-content">
      <div className="chat-header-container">
        <button className="info-panel-toggle-btn" onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}> {isInfoPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />} </button>
        {isInfoPanelOpen && (
          <div className="chat-header-panel">
            <div className="chat-info current-user-display">
              <div className="message-avatar"> <img src={currentUserProfile.avatar?.type === 'image' ? currentUserProfile.avatar.data : 'data:image/svg+xml;base64,...'} alt="User Avatar" className="avatar-image" /> </div>
              <div className="chat-info-details">
                <span className="current-prompt">{currentUserProfile.name || '(未命名身份)'}{currentUserProfile.notes ? ` (${currentUserProfile.notes})` : ''}</span>
                {/* ✨ 核心修改：動態顯示聊天室標題 ✨ */}
                <span className="current-character">
                  正在與 {currentCharacter.name} 對話
                </span>
                {currentPrompt && (<span className="current-prompt" style={{ opacity: 0.7 }}>使用: {currentPrompt.name}</span>)}
                
                {/* ✨✨✨ 2. 在 JSX 中加入顯示主要知識書的 span ✨✨✨ */}
                {activeMainBook && (
                  <span className="current-prompt" style={{ opacity: 0.7 }}>
                    主要知識書: {activeMainBook.name}
                  </span>
                )}

                {/* ✨ 2. 核心新增：顯示已啟用的聊天知識書 */}
                {activeAuxiliaryBooks.length > 0 && (
                  <span className="current-prompt" style={{ opacity: 0.7, fontStyle: 'italic' }}>
                    聊天知識書: {activeAuxiliaryBooks.map(book => book.name).join('， ')}
                  </span>
                )}

              </div>
            </div>
            <div className={`connection-status ${isApiConnected ? 'connected' : 'disconnected'}`}> {isApiConnected ? (<span>{loadedConfigName ? `${loadedConfigName} (${apiModel})` : apiProviders[apiProvider]?.name}</span>) : (<span>未連接</span>)} </div>
          </div>
        )}
      </div>
  
      <div className="messages-area">
        {messages.length > 0 && messages.map((message, index) => { 
    const originalText = message.contents[message.activeContentIndex]; 
    // ✨ 傳入 message.sender
    const processedTextForMessage = applyAllRegex(originalText, currentCharacter, message.sender); 
    return ( <ChatMessage key={message.id} msg={message} processedText={processedTextForMessage} currentUserProfile={currentUserProfile} character={currentCharacter} activeChatId={activeChatId} setEditingMessage={setEditingMessage} handleDeleteMessage={handleDeleteMessage} showActionsMessageId={showActionsMessageId} setShowActionsMessageId={setShowActionsMessageId} handleRegenerate={handleRegenerate} onChangeVersion={onChangeVersion} isScreenshotMode={isScreenshotMode} isSelected={selectedMessageIds.includes(message.id)} onSelectMessage={handleSelectMessage} isLastMessage={index === messages.length - 1} onBranch={onBranch} /> ); })}
        {isLoading && ( <div className="loading-message"> <div className="loading-dots"><span></span><span></span><span></span></div> <p>{currentCharacter.name} 正在輸入中...</p> </div> )}
        <div ref={messagesEndRef} />
      </div>
  
      <div className="input-area-wrapper">
        {isScreenshotMode ? ( <div className="screenshot-toolbar"> <button className="screenshot-btn cancel" onClick={handleToggleScreenshotMode}><X size={18} /><span>取消</span></button> <span className="screenshot-info">已選擇 {selectedMessageIds.length} 則訊息</span> <button className="screenshot-btn confirm" onClick={handleGenerateScreenshot} disabled={selectedMessageIds.length === 0}><Check size={18} /><span>生成圖片</span></button> </div>
        ) : (
          <>
            {isInputMenuOpen && (
              <div className="input-menu">
                <button className="input-menu-item" onClick={() => { onSwitchProfile(); setIsInputMenuOpen(false); }}> <Users size={20} /> <span>切換身份</span> </button>
                
                {/* ✨ 3. 核心新增：加入「聊天知識書」按鈕 */}
                <button className="input-menu-item" onClick={() => { onOpenAuxLorebookSelector(); setIsInputMenuOpen(false); }}>
                  <Globe size={20} />
                  <span>聊天知識書</span>
                </button>

                <button className="input-menu-item" onClick={() => { onOpenOocSelector(); setIsInputMenuOpen(false); }}> <MessageSquarePlus size={20} /> <span>OOC 指令</span> </button>
                <button className="input-menu-item" onClick={() => { setIsMemoryModalOpen(true); setIsInputMenuOpen(false); }}> <BookOpen size={20} /> <span>長期記憶</span> </button>
                <button className="input-menu-item" onClick={() => { setIsAuthorsNoteModalOpen(true); setIsInputMenuOpen(false); }}> <Settings size={20} /> <span>Author's Note</span> </button>
                <button className="input-menu-item" onClick={() => { exportChat(); setIsInputMenuOpen(false); }}> <FileOutput size={20} /> <span>匯出聊天 (.jsonl)</span> </button>
                <button className="input-menu-item" onClick={() => { document.getElementById('st-import-input').click(); setIsInputMenuOpen(false); }}> <FileInput size={20} /> <span>匯入聊天 (.jsonl)</span> </button>
                <button className="input-menu-item" onClick={handleToggleScreenshotMode}> <Camera size={20} /> <span>訊息截圖</span> </button>
              </div>
            )}

            <input type="file" id="st-import-input" accept=".jsonl" style={{ display: 'none' }} onChange={handleImport} />
            <div className="input-area">
              <button className={`input-menu-btn ${isInputMenuOpen ? 'open' : ''}`} onClick={() => setIsInputMenuOpen(!isInputMenuOpen)}> <Plus size={22} /> </button>
              <textarea ref={textareaRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder={currentCharacter ? `向 ${currentCharacter.name} 說話` : "輸入訊息..."} className="message-input" disabled={isLoading} rows={1} />
              <button onClick={handleSend} disabled={isButtonDisabled} className="send-button"> {inputMessage.trim() ? <Send size={18} /> : <MoveRightIcon size={20} />} </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};



// ==================== 全新！主題選擇器下拉選單元件 ====================
const ThemeSelector = ({ currentTheme, onSetTheme, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✨ 2. 建立一個統一的開關函式 ✨
  const toggleDropdown = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (onToggle) { // 如果父層傳來了 onToggle 函式
      onToggle(newIsOpen); // 就把新的開關狀態告訴父層
    }
  };

  // 定義所有可用的主題
  const themes = [
    { id: 'light', name: '淺色主題', Icon: Sun },
    { id: 'dark', name: '深色主題', Icon: Moon },
    { id: 'forest', name: '蟲餡包綠', Icon: CaterpillarIcon },
    { id: 'cocoa', name: '牛奶可可', Icon: Coffee },
    { id: 'old-books', name: '懷舊書頁', Icon: BookOpen },
    { id: 'old-blue', name: '舊時光藍', Icon: AppWindow },
    { id: 'hyacinth-mauve', name: '芋泥奶凍', Icon: Dessert },
    { id: 'misty forest', name: '靜霧森語', Icon: TreePine },
    { id: 'dark-hyacinth', name: '深林莓果', Icon: Cherry },
    { id: 'blue-moon', name: '夜色月輪', Icon: CloudMoon },
    { id: 'moriarty', name: '塵墜滝下', Icon: Waves },
// ✨ 在這裡加入新主題
  ];

  const selectedTheme = themes.find(t => t.id === currentTheme) || themes[0];

  const handleSelect = (themeId) => {
    onSetTheme(themeId);
    toggleDropdown(); // 選擇後也呼叫開關函式来關閉選單
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <button className="custom-select-trigger" onClick={toggleDropdown}>
        <div className="selected-option">
          <div className="option-avatar" style={{ backgroundColor: 'transparent' }}>
            <selectedTheme.Icon size={20} />
          </div>
          <span className="option-name">{selectedTheme.name}</span>
        </div>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="custom-select-options" style={{ bottom: 'auto', top: '100%' }}>
          {themes.map(theme => (
            <div
              key={theme.id}
              className={`custom-select-option ${currentTheme === theme.id ? 'selected' : ''}`}
              onClick={() => handleSelect(theme.id)} // ✨ 這裡也要用 handleSelect
            >
              <div className="option-avatar" style={{ backgroundColor: 'transparent' }}>
                <theme.Icon size={20} />
              </div>
              <span className="option-name">{theme.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =================================================================================
// SettingsPage - ✨ 全新升級版 ✨
// =================================================================================
const SettingsPage = ({
    // ✨ OOC 指令相關 props
    oocCommands,
    onNewOocCommand,
    onEditOocCommand,
    onDeleteOocCommand,
    regexRules,
    onNewRegexRule,
    onEditRegexRule,
    onDeleteRegexRule,
    onToggleRegexRule,
    onExportRegex,      // ✨ 新增
    onImportRegex,      // ✨ 新增
    availableModels, // ✨ 新參數
    onFetchModels,   // ✨ 新參數
    // ✨ 新傳入的 props
    userProfiles,
    onNewUserProfile,
    onEditUserProfile,
    onDeleteUserProfile,
    // --- (舊 props 保持不變) ---
    apiProvider, apiKey, apiModel, setApiModel, apiProviders,
    handleProviderChange, handleApiKeyChange, testApiConnection, apiTestLoading,
    theme, onOpenThemeSwitcher,
    fontSize, setFontSize,
    exportChatHistory, handleImportChat, clearAllData,
    apiConfigs, configName, setConfigName,
    loadedConfigId,
    onUpdateConfiguration,
    onSaveAsNewConfiguration, loadApiConfiguration, deleteApiConfiguration,
    getBackupData,
    restoreFromBackupData,
    onOpenDisclaimer,
}) => {
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState('null'); // 預設展開使用者區塊
    const [selectedConfigId, setSelectedConfigId] = useState('');
  
    const toggleSection = useCallback((section) => {
      setExpandedSection(prev => (prev === section ? null : section));
    }, []);
  
    const handleLoadConfig = (id) => {
      setSelectedConfigId(id);
      if (id) { loadApiConfiguration(id); }
    };
  
    const handleDeleteConfig = () => {
      if (selectedConfigId) {
        deleteApiConfiguration(selectedConfigId);
        setSelectedConfigId('');
      }
    };
  
    return (
      <div className="page-content">
        <div className="settings-content">
          {/* ==================== ✨ 全新！使用者個人檔案管理區塊 ✨ ==================== */}
          <div className={`setting-card ${isThemeSelectorOpen ? 'is-dropdown-open' : ''}`}>
            <button
              className={`card-header ${expandedSection === 'user' ? 'expanded' : ''}`}
              onClick={() => toggleSection('user')}
            >
              <div className="card-title">
                <Users size={20} />
                <span>使用者個人檔案</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'user' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'user' && (
              <div className="card-content">
                <div className="setting-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <label className="setting-label" style={{marginBottom: 0}}>個人檔案列表</label>
                    <button onClick={onNewUserProfile} className="add-greeting-btn">
                      <Plus size={14} /> 新增
                    </button>
                  </div>
                  <div className="character-list">
                    {userProfiles.map((profile) => (
                      <div key={profile.id} className="character-list-item">
                         <div className="character-select-area">
                          <div className="character-avatar-large">
                            {profile.avatar?.type === 'image' ? (<img src={profile.avatar.data} alt={profile.name} className="avatar-image" />) : (<UserCircle size={32} />)}
                          </div>
                          <div className="character-info">
                            <h4>
                              {profile.name}
                              {profile.notes ? ` (${profile.notes})` : ''}
                            </h4>
                            <p>{profile.description?.split('\n')[0]}</p>
                          </div>
                        </div>
                        <button className="edit-character-btn" onClick={() => onEditUserProfile(profile.id)}><Settings size={16} /></button>
                        <button
                          onClick={() => onDeleteUserProfile(profile.id)}
                          // 同時使用這兩個 class，並移除 inline style
                          className="edit-character-btn delete-icon-btn"
                          disabled={userProfiles.length <= 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

            <div className="setting-card">
              <button
                className={`card-header ${expandedSection === 'api' ? 'expanded' : ''}`}
                onClick={() => toggleSection('api')}
              >
                <div className="card-title"><Bot size={20} /><span>API 設定</span></div>
                <span className="expand-arrow">{expandedSection === 'api' ? '▲' : '▼'}</span>
              </button>
              {expandedSection === 'api' && (
                <div className="card-content">
                <div className="setting-group">
                  <label className="setting-label">已儲存的配置</label>
                  <div className="config-management">
                    <select
                      value={selectedConfigId}
                      onChange={(e) => handleLoadConfig(e.target.value)}
                      className="setting-select"
                    >
                      <option value="">-- 選擇以載入配置 --</option>
                      {apiConfigs.map(config => (
                        <option key={config.id} value={config.id}>
                          {config.name} ({apiProviders[config.provider]?.name})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleDeleteConfig}
                      disabled={!selectedConfigId}
                      className="delete-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <hr className="divider" />
                <div className="setting-group">
                  <label className="setting-label">AI 服務提供商</label>
                  <div className="provider-grid">
                    {Object.entries(apiProviders).map(([key, provider]) => (
                      <button
                        key={key}
                        onClick={() => handleProviderChange(key)}
                        className={`provider-btn ${apiProvider === key ? 'active' : ''}`}
                      >
                        {provider.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="setting-group">
                  <label className="setting-label">API 金鑰 (每行一個金鑰)，輸入完按下測試連線。一定要保存好金鑰，請勿隨意分享</label>
                  <p className="setting-description">
                      請一定不要隨意的分享您的 API 金鑰，尤其是在公開場合或是開源專案中！截圖的時候也請注意不要讓金鑰入鏡，謝謝您！<br/>
                      先輸入API之後才可以按下【更新模型】，選好模型之後請務必按下【測試連線】確保API能夠使用<br/>
                      別忘了最後在底下按下更新配置/另存新配置<br/>
                  </p>
                  <div className="api-key-input">
                    {/* 🔥🔥🔥 核心修改：將 input 換成 textarea 🔥🔥🔥 */}
                    <textarea
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder={`每行貼上一個 ${apiProviders[apiProvider]?.name} API 金鑰...`}
                      className="setting-input" // 您可以繼續使用現有樣式
                      rows="4" // 給它一點預設高度
                    />
                    <button
                      onClick={testApiConnection}
                      disabled={apiTestLoading || !apiKey.trim()}
                      className="test-btn"
                    >
                      {apiTestLoading ? '測試中...' : '測試連線'}
                    </button>
                  </div>
                </div>
                <div className="setting-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label className="setting-label">AI 模型</label>
                    {/* ✨ 新增這個刷新按鈕 ✨ */}
                    <button 
                      onClick={onFetchModels} 
                      className="add-greeting-btn" 
                      style={{marginBottom: '4px'}}
                      title="從 API 獲取最新模型列表"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                      更新列表
                    </button>
                  </div>
                  
                  <select
                    value={apiModel}
                    onChange={(e) => setApiModel(e.target.value)}
                    className="setting-select"
                  >
                    {/* ✨ 這裡改用 availableModels 來渲染，而不是寫死的 apiProviders[...].models ✨ */}
                    {availableModels && availableModels.length > 0 ? (
                        availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))
                    ) : (
                        // 如果還沒抓到，就顯示預設的
                        apiProviders[apiProvider]?.models.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))
                    )}
                  </select>
                </div>
                <div className="setting-group">
                  <label className="setting-label">配置名稱</label>
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="為此配置命名 (例如: 我的工作用 Key)"
                    className="setting-input"
                  />
                </div>
                <div className="editor-buttons">
                  <button
                    onClick={onUpdateConfiguration}
                    className="save-btn" // 可以繼續使用現有樣式
                    disabled={!loadedConfigId} // ✨ 核心：只有載入了配置才能更新
                  >
                    <Save size={16} />
                    更新配置
                  </button>
                  <button
                    onClick={onSaveAsNewConfiguration}
                    className="save-btn secondary" // 您可以為它新增一個次要樣式
                    disabled={!configName.trim() || !apiKey.trim()}
                  >
                    <Plus size={16} />
                    另存新配置
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ==================== ✨ 全新！OOC 指令集管理區塊 ✨ ==================== */}
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'ooc' ? 'expanded' : ''}`}
              onClick={() => toggleSection('ooc')}
            >
              <div className="card-title">
                <MessageSquarePlus size={20} />
                <span>OOC 指令集</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'ooc' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'ooc' && (
              <div className="card-content">
                <div className="setting-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <label className="setting-label" style={{marginBottom: 0}}>常用指令列表 (所有角色共用)</label>
                    <button onClick={onNewOocCommand} className="add-greeting-btn">
                      <Plus size={14} /> 新增
                    </button>
                  </div>
                  <div className="character-list">
                    {oocCommands.length > 0 ? oocCommands.map((command) => (
                      <div key={command.id} className="character-list-item">
                         <div className="character-select-area">
                          <div className="character-info">
                            <h4>{command.notes}</h4>
                            <p>{command.content}</p>
                          </div>
                        </div>
                        <button className="edit-character-btn" onClick={() => onEditOocCommand(command)}><Edit2 size={16} /></button>
                        <button
                          onClick={() => onDeleteOocCommand(command.id)}
                          className="edit-character-btn delete-icon-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0'}}>尚未新增任何指令。</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* ▼▼▼ 【✨ 在主題設定卡片之前，插入一個全新的正規表示式卡片 ✨】 ▼▼▼ */}
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'regex' ? 'expanded' : ''}`}
              onClick={() => toggleSection('regex')}
            >
              <div className="card-title">
                {/* 借用一個圖示 */}
                <FileText size={20} /> 
                <span>全域正規表示式</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'regex' ? '▲' : '▼'}</span>
            </button>
{expandedSection === 'regex' && (
              <div className="card-content">
                <div className="setting-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <label className="setting-label" style={{marginBottom: 0}}>規則列表 (由上至下執行)</label>
                    <button onClick={onNewRegexRule} className="add-greeting-btn">
                      <Plus size={14} /> 新增
                    </button>
                  </div>
                  {/* ▼▼▼ 【✨ 在這裡加入匯入/匯出按鈕 ✨】 ▼▼▼ */}
                  <div className="prompt-actions-grid" style={{ marginTop: '12px', marginBottom: '12px' }}>
                    <label htmlFor="import-global-regex" className="action-button-base">
                      <FileInput size={16} /> 匯入規則
                    </label>
                    <button onClick={onExportRegex}>
                      <FileOutput size={16} /> 匯出規則
                    </button>
                  </div>
                  <input
                    type="file"
                    id="import-global-regex"
                    accept=".json"
                    onChange={onImportRegex}
                    style={{ display: 'none' }}
                  />
                  {/* 我們可以重用 character-list 的樣式 */}
                  <div className="character-list">
                    {regexRules.length > 0 ? regexRules.map((rule) => (
                      <div key={rule.id} className="character-list-item">
                        {/* 開關 */}
                        <label className="switch" style={{marginRight: '12px'}}>
                          <input 
                            type="checkbox" 
                            checked={rule.enabled}
                            onChange={() => onToggleRegexRule(rule.id)}
                          />
                          <span className="slider round"></span>
                        </label>
                        {/* 規則內容 */}
                        <div className="character-select-area" style={{opacity: rule.enabled ? 1 : 0.5}}>
                          <div className="character-info">
                            <h4>{rule.notes || '(未命名規則)'}</h4>
                            <p>Find: {rule.find}</p>
                            <p>Replace: {rule.replace}</p>
                          </div>
                        </div>
                        {/* 操作按鈕 */}
                        <button className="edit-character-btn" onClick={() => onEditRegexRule(rule)}><Edit2 size={16} /></button>
                        <button
                          onClick={() => onDeleteRegexRule(rule.id)}
                          className="edit-character-btn delete-icon-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )) : (
                      <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0'}}>尚未新增任何規則。</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'theme' ? 'expanded' : ''}`}
              onClick={() => toggleSection('theme')}
            >
              <div className="card-title">
                <Palette size={20} />
                <span>主題設定</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'theme' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'theme' && (
              <div className="card-content">
                <div className="setting-group">
                  <label className="setting-label">外觀主題</label>
                  {/* 🔥🔥🔥 用下面這個【單一按鈕】，取代掉原本的 <ThemeSelector> 或按鈕群 🔥🔥🔥 */}
              <button 
                className="custom-select-trigger"
                onClick={onOpenThemeSwitcher}
              >
                <span>
                  {
                    // 1. 先定義所有主題，確保和 Modal 裡的一致
                    [
                      { id: 'light', name: '淺色主題' },
                      { id: 'dark', name: '深色主題' },
                      { id: '蟲餡包綠', name: '蟲餡包綠' },
                      { id: '牛奶可可', name: '牛奶可可' },
                      { id: 'old-books', name: '懷舊書頁' },
                      { id: 'old-blue', name: '舊時光藍' },
                      { id: 'hyacinth-mauve', name: '芋泥奶凍' },
                      { id: 'misty forest', name: '靜霧森語' },
                      { id: 'dark-hyacinth', name: '深林莓果' },
                      { id: 'blue-moon', name: '夜色月輪' },
                      { id: 'moriarty', name: '塵墜滝下' }
                    ]
                    // 2. 根據當前的 theme ID 找到對應的主題物件
                    .find(t => t.id === theme)
                    // 3. 安全地取出 name 屬性，如果找不到，就顯示一個備用文字
                    ?.name || '選擇主題' 
                  }
                </span>
                <span className="dropdown-arrow">▼</span>
              </button>
                </div>
                <div className="setting-group">
                  <label className="setting-label">字體大小</label>
                  <div className="theme-options"> {/* 我們可以重用 theme-options 的樣式 */}
                    <button
                      onClick={() => setFontSize('small')}
                      className={`theme-btn ${fontSize === 'small' ? 'active' : ''}`}
                    >
                      小
                    </button>
                    <button
                      onClick={() => setFontSize('medium')}
                      className={`theme-btn ${fontSize === 'medium' ? 'active' : ''}`}
                    >
                      中
                    </button>
                    <button
                      onClick={() => setFontSize('large')}
                      className={`theme-btn ${fontSize === 'large' ? 'active' : ''}`}
                    >
                      大
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* ▼▼▼ ✨ 全新！實用網站分享卡片 ✨ ▼▼▼ */}
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'tools' ? 'expanded' : ''}`}
              onClick={() => toggleSection('tools')}
            >
              <div className="card-title">
                {/* 我們可以借用一個像工具箱的圖示 */}
                <BookMarked size={20} /> 
                <span>實用網站分享</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'tools' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'tools' && (
              <div className="card-content">
                {/* 我們可以重用 .about-links 的樣式 */}
                <div className="about-links">
                  
                  {/* 第一個按鈕 */}
                  <a
                    href="https://lenlenaris.github.io/ChroniclerEditor/"
                    target="_blank" // 確保在新分頁開啟
                    rel="noopener noreferrer" // 增加安全性
                    className="about-btn" // 重用現有按鈕樣式
                  >
                    {/* 這裡可以放一個合適的圖示，例如 Edit2 */}
                    <Moon size={16} />
                    角色卡編輯器 - LEN
                  </a>

                  {/* 第二個按鈕 */}
                  <a
                    href="https://rmt120430.github.io/RMTStation_SimpleCreationAssistant/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="about-btn"
                  >
                     {/* 這裡可以放另一個圖示，例如 Bot */}
                    <TrainTrack size={16} />
                    簡易創作助手 - RMT
                  </a>

                </div>
              </div>
            )}
          </div>
          {/* ▲▲▲ ✨ 新卡片結束 ✨ ▲▲▲ */}

          <div className="setting-card">
                    <button className={`card-header ${expandedSection === 'cloud' ? 'expanded' : ''}`} onClick={() => toggleSection('cloud')}>
                        <div className="card-title">
                            <Cloud size={20} />
                            <span>Google 雲端同步</span>
                        </div>
                        <span className="expand-arrow">{expandedSection === 'cloud' ? '▲' : '▼'}</span>
                    </button>
                    {expandedSection === 'cloud' && (
                        <div className="card-content">
                            <p className="data-management-note">
                                將您的所有資料（角色、對話、設定等）安全地備份到您的個人 Google 雲端硬碟。
                            </p>
                            <GoogleSyncManager 
                                getBackupData={getBackupData}
                                restoreFromBackupData={restoreFromBackupData}
                            />
                        </div>
                    )}
                </div>
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'data' ? 'expanded' : ''}`}
              onClick={() => toggleSection('data')}
            >
              <div className="card-title">
                <Database size={20} />
                <span>資料管理</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'data' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'data' && (
              <div className="card-content">
                {/* ▼▼▼ 【✨ 在這裡插入您的說明文字 ✨】 ▼▼▼ */}
                <p className="data-management-note">
                  提示：除了 API 金鑰以外，應用程式中的所有資料（包含角色、對話紀錄、提示詞等）都會被匯出成單一的 .json 檔案。
                </p>
                {/* ▲▲▲ 【✨ 新增結束 ✨】 ▲▲▲ */}

                <div className="setting-group">
                  <label className="setting-label">匯出資料</label>
                  <div className="data-buttons">
                    {/* ✨ 修改按鈕文字和功能 ✨ */}
                    <button onClick={exportChatHistory} className="data-btn export">
                      <FileOutput size={16} />
                      匯出全站資料 (.json)
                    </button>
                  </div>
                </div>
                <div className="setting-group">
                  <label className="setting-label">匯入資料</label>
                  <div className="data-buttons">
                    {/* ✨ 修改檔案選擇器的 accept 屬性和綁定的函式 ✨ */}
                    <input
                      type="file"
                      id="import-chat"
                      accept=".json" 
                      onChange={handleImportChat}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="import-chat" className="data-btn import">
                      <FileInput size={16} />
                      匯入全站資料 (.json)
                    </label>
                  </div>
                </div>
                <div className="setting-group">
                  <label className="setting-label">危險操作</label>
                  <div className="data-buttons">
                    <button onClick={clearAllData} className="data-btn danger">
                      <Trash2 size={16} />
                      清除所有資料
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'about' ? 'expanded' : ''}`}
              onClick={() => toggleSection('about')}
            >
              <div className="card-title">
                <Info size={20} />
                <span>關於與回饋</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'about' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'about' && (
              <div className="card-content">
                <div className="about-info">
                  <h4>GENIU5</h4>
                  <p>aka 55小手機</p>
                  <p>版本：0.5.9</p>
                  <p>為了想要在手機上玩AI聊天的小東西</p>
                </div>
                <div className="about-links">
                  <a
                    href="https://www.notion.so/GENIU5-2547bc2e84ff80aa8024d28b1c964afe?source=copy_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="about-btn"
                  >
                    <FileText size={16} />
                    公告 x 說明 x 回饋
                  </a>
                  <button onClick={onOpenDisclaimer} className="about-btn">
                    <MessageSquareWarning size={16} />
                    免責聲明
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
};


  
// =================================================================================
// ✨✨✨ 全新！基於 SillyTavern 官方 Default.json 的內建提示詞 ✨✨✨
// =================================================================================
const BUILT_IN_PROMPTS = [
  {
    id: 'st-official-default-v1',
    name: '預設提示詞 (SillyTavern 官方風格)',
    // ✨ 依照您的要求進行修改
    temperature: 1,
    maxTokens: 1000,
    contextLength: 30000,
    modules: [
      {
        id: 'main',
        name: 'Main Prompt',
        content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.",
        enabled: true,
        locked: false, readOnly: false, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'worldInfoBefore',
        name: 'World Info (before)',
        content: '',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'personaDescription',
        name: 'Persona Description',
        // 我們使用 {{persona}} 來載入完整的使用者描述
        content: '{{persona}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'charDescription',
        name: 'Char Description',
        // 我們使用 {{description}} 來載入完整的角色描述
        content: '{{description}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'charPersonality',
        name: 'Char Personality',
        content: '{{personality}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'scenario',
        name: 'Scenario',
        content: '{{scenario}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'enhanceDefinitions',
        name: 'Enhance Definitions',
        content: "If you have more knowledge of {{char}}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.",
        enabled: false,
        locked: false, readOnly: false, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'nsfw',
        name: 'Auxiliary Prompt',
        content: '',
        enabled: true,
        locked: false, readOnly: false, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'worldInfoAfter',
        name: 'World Info (after)',
        content: '',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'dialogueExamples',
        name: 'Chat Examples',
        content: '{{example_dialogue}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'chatHistory',
        name: 'Chat History',
        content: '{{chat_history}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'jailbreak',
        name: 'Post-History Instructions',
        content: '{{post_history_instructions}}',
        enabled: true,
        locked: false, readOnly: false, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      }
    ]
  }
];

// =================================================================================
// ✨✨✨ 全新！新角色草稿暫存區 ✨✨✨
// =================================================================================
let newCharacterDraft = {
  name: '',
  description: '',
  creatorNotes: '',
  firstMessage: '',
  alternateGreetings: [],
  avatar: { type: 'icon', data: 'UserCircle' },
  mainLorebookId: '',
  embeddedRegex: [],
};

// 用於在成功儲存後清除草稿
const clearNewCharacterDraft = () => {
  newCharacterDraft = {
    name: '',
    description: '',
    creatorNotes: '',
    firstMessage: '',
    alternateGreetings: [],
    avatar: { type: 'icon', data: 'UserCircle' },
    mainLorebookId: '',
    embeddedRegex: [],
  };
};

const ChatApp = () => {
  // ✨ 全新的時間格式化輔助函式 ✨
  const getFormattedTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 月份是從 0 開始的
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  const [currentPage, setCurrentPage] = useState('characters');
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('app_font_size') || 'medium');

  const [characters, setCharacters] = useState([]);
  const [chatHistories, setChatHistories] = useState({});
  const [chatMetadatas, setChatMetadatas] = useState({});
  const [longTermMemories, setLongTermMemories] = useState({});
  const [prompts, setPrompts] = useState([]);
  const [apiConfigs, setApiConfigs] = useState([]);
  const [oocCommands, setOocCommands] = useState([]); // ✨ 1. OOC 指令庫
  const [regexRules, setRegexRules] = useState([]);
  const [isOocCommandEditorOpen, setIsOocCommandEditorOpen] = useState(false); // ✨ 2. 設定頁的編輯器開關
  const [editingOocCommand, setEditingOocCommand] = useState(null); // ✨ 3. 正在編輯的指令
  const [isOocCommandSelectorOpen, setIsOocCommandSelectorOpen] = useState(false); // ✨ 4. 聊天室的選擇器開關
  const [isRegexEditorOpen, setIsRegexEditorOpen] = useState(false);
  const [editingRegexRule, setEditingRegexRule] = useState(null);
  const [editingLocalRegex, setEditingLocalRegex] = useState({charId: null, ruleIndex: null});// ✨ 新增 state 來管理區域規則的編輯

  // ✨✨✨ 全新！使用者個人檔案管理 State ✨✨✨
  const [userProfiles, setUserProfiles] = useState([]); // 儲存所有使用者個人檔案的列表

  // ==================== 當前活動狀態 ====================
  const [activeChatCharacterId, setActiveChatCharacterId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [currentCharacter, setCurrentCharacter] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  
  // ==================== 使用者輸入與 API 狀態 ====================
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [configName, setConfigName] = useState('');
  const [loadedConfigName, setLoadedConfigName] = useState('');
  // ✨✨✨ 新增一個 state 來追蹤當前載入的配置 ID ✨✨✨
  const [loadedConfigId, setLoadedConfigId] = useState(null);

  // ✨ ==================== 全新！世界書 State ==================== ✨
  const [worldBooks, setWorldBooks] = useState([]);

  // ==================== UI 彈出視窗與選單狀態 ====================
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [isLocalRegexEditorOpen, setIsLocalRegexEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewingCharacter, setPreviewingCharacter] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isAuthorsNoteModalOpen, setIsAuthorsNoteModalOpen] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(null);
  const [isInputMenuOpen, setIsInputMenuOpen] = useState(false);
  const [swipedChatId, setSwipedChatId] = useState(null);
  const [showActionsMessageId, setShowActionsMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const [isAuxLorebookSelectorOpen, setIsAuxLorebookSelectorOpen] = useState(false);

  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  // ✨✨✨ 全新！使用者個人檔案編輯器 Modal 的 State ✨✨✨
  const [isUserProfileEditorOpen, setIsUserProfileEditorOpen] = useState(false);
  const [editingUserProfileId, setEditingUserProfileId] = useState(null);
  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
  // ✨ 1. 在這裡新增一行 state，用來控制身份切換器的開關 ✨
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isPromptSwitcherOpen, setIsPromptSwitcherOpen] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // ✨ 標記資料是否已從 DB 載入

  const [apiProvider, setApiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  // ✨✨✨ 1. 新增我們的API大腦："通訊錄" state ✨✨✨
  const [apiKeysByProvider, setApiKeysByProvider] = useState({}); 
  const [apiModel, setApiModel] = useState('gpt-3.5-turbo');
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [apiTestLoading, setApiTestLoading] = useState(false);
  // ✨✨✨ 1. 新增一個 state 來追蹤當前使用的金鑰索引 ✨✨✨
  const [currentApiKeyIndex, setCurrentApiKeyIndex] = useState(0);

  const apiProviders = {
    openai: {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      models: ['gpt-5', 'gpt-5-2025-08-07', 'gpt-5-chat-latest', 'gpt-5-mini', 'gpt-5-mini-2025-08-07', 'gpt-5-nano', 'gpt-5-nano-2025-08-07',
            'gpt-4o', 'gpt-4o-2024-11-20', 'gpt-4o-2024-08-06', 'gpt-4o-2024-05-13', 'chatgpt-4o-latest',
            'gpt-4.1', 'gpt-4.1-2025-04-14', 'gpt-4.1-mini', 'gpt-4.1-mini-2025-04-14', 'gpt-4.1-nano', 'gpt-4.1-nano-2025-04-14',
            'gpt-4-turbo', 'gpt-3.5-turbo'],
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    },
    gemini: {
      name: 'Google Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
      models: ['gemini-3-pro-preview','gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro-preview-03-25', 'gemini-2.5-pro-exp-03-25', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-flash-preview-04-17',],
      headers: () => ({ 'Content-Type': 'application/json' }),
      isGemini: true
    },
    claude: {
      name: 'Anthropic Claude',
      endpoint: 'https://api.wangfishpro.workers.dev/https://api.anthropic.com/v1/messages',
      models: ['claude-3-7-sonnet-latest', 'claude-opus-4-1', 'claude-opus-4-1-20250805', 'claude-opus-4-0', 'claude-opus-4-20250514',
            'claude-sonnet-4-0', 'claude-sonnet-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-latest', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet-20240620',
            'claude-3-5-haiku-latest', 'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      })
    },
    grok: {
      name: 'xAI Grok',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      models: ['grok-4-0709', 'grok-3-beta', 'grok-3-fast-beta', 'grok-3-mini-beta', 'grok-3-mini-fast-beta', 'grok-1'],
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    },
    mistral: {
      name: 'Mistral AI',
      endpoint: 'https://api.mistral.ai/v1/chat/completions',
      models: ['mistral-medium-2508', 'mistral-large-latest', 'mistral-small-latest', 'mistral-large-2411'],
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    },
    openrouter: {
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      models: [
        // --- Anthropic ---
        'anthropic/claude-3.7-sonnet',
        'anthropic/claude-sonnet-4.5',
        // --- OpenAI ---
        'openai/ChatGPT-4o',
        'openai/GPT-4.1',
      ],
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // OpenRouter 建議加上這兩行，讓他們知道流量來自哪個應用
        'HTTP-Referer': 'https://your-app-url.com', // 您可以換成您的應用網址
        'X-Title': 'GENIU5' // 您的應用名稱
      })
    },
    deepseek: {
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/chat/completions',
      models: ['deepseek-chat', 'deepseek-reasoner'], 
      headers: (apiKey) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      })
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // ✨✨✨ 核心修正：在這裡加上自動存檔 ✨✨✨
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // ✨✨✨ 全新！字體大小的應用與儲存管家 ✨✨✨
  useEffect(() => {
    // 1. 應用設定到 HTML 根元素上
    document.documentElement.setAttribute('data-font-size', fontSize);
    // 2. 將新設定儲存到 localStorage
    localStorage.setItem('app_font_size', fontSize);
  }, [fontSize]); // 這個管家只監控 fontSize

  // ✨✨✨ 請用下面這整段程式碼，來取代您原本從 localStorage 讀取資料的 useEffect ✨✨✨
useEffect(() => {
  const loadData = async () => {
    try {
      console.log("正在從 IndexedDB 載入資料... - App.js:2571");

      // 1. 先嘗試從 IndexedDB 讀取所有資料
      const [
        savedCharacters, savedPrompts, savedApiConfigs,
        savedHistories, savedMetadatas, savedMemories,
        savedUserProfiles, // ✨ 新增讀取使用者個人檔案
        activeProfileId,
        savedOocCommands,
        savedRegexRules,
        savedWorldBooks
      ] = await db.transaction('r', db.characters, db.prompts, db.apiConfigs, db.kvStore, async () => {
        const chars = await db.characters.toArray();
        const proms = await db.prompts.toArray();
        const configs = await db.apiConfigs.toArray();
        const hist = (await db.kvStore.get('chatHistories'))?.value; 
        const meta = (await db.kvStore.get('chatMetadatas'))?.value; 
        const mem = (await db.kvStore.get('longTermMemories'))?.value;
        const profiles = (await db.kvStore.get('userProfiles'))?.value; 
        const ooc = (await db.kvStore.get('oocCommands'))?.value; // ✨ 加入這行
        const regex = (await db.kvStore.get('regexRules'))?.value;
        const wb = (await db.kvStore.get('worldBooks'))?.value;
        const activeId = (await db.kvStore.get('activeUserProfileId'))?.value; // ✨ 讀取預設 ID
        return [chars, proms, configs, hist, meta, mem, profiles, activeId, ooc, regex, wb];
      });
      
      // 2. 處理使用者個人檔案 (如果不存在，就建立一個預設的)
      if (savedUserProfiles && savedUserProfiles.length > 0) {
        setUserProfiles(savedUserProfiles);
        // 確保儲存的 active ID 是有效的
      } else {
        // 如果資料庫是空的，就建立一個預設的「你」
        const defaultProfile = { 
          id: `user_${Date.now()}`, 
          name: '', 
          notes: '', // +++ 在這裡加上一行，給他一個空的備註 +++
          description: '', 
          avatar: { type: 'icon', data: 'UserCircle' } 
        };
        setUserProfiles([defaultProfile]);
        // 同時也寫回資料庫
        await db.kvStore.put({ key: 'userProfiles', value: [defaultProfile] });
      }

      // 3. 處理角色、提示詞等其他資料 (這部分邏輯不變，但我們移除舊的 localstorage 搬家邏輯，假設資料都在 IndexedDB)
      setCharacters(savedCharacters || []);
      setPrompts(savedPrompts && savedPrompts.length > 0 ? savedPrompts : BUILT_IN_PROMPTS);
      if (savedPrompts.length === 0) await db.prompts.bulkPut(BUILT_IN_PROMPTS);
      setApiConfigs(savedApiConfigs || []);
      const allAvailablePrompts = (savedPrompts && savedPrompts.length > 0) ? savedPrompts : BUILT_IN_PROMPTS;
      const lastUsedPromptId = localStorage.getItem('app_last_used_prompt_id');

      if (lastUsedPromptId) {
        const lastUsedPrompt = allAvailablePrompts.find(p => p.id === lastUsedPromptId);
        if (lastUsedPrompt) {
          // 如果找到了上次用的提示詞，就直接設定它
          setCurrentPrompt(lastUsedPrompt);
          console.log(`成功載入上次使用的提示詞: ${lastUsedPrompt.name} - App.js:2628`);
        } else {
          // 如果找不到 (可能被刪了)，就預設選擇列表中的第一個
          setCurrentPrompt(allAvailablePrompts[0] || null);
        }
      } else {
        // 如果是第一次使用，沒有任何紀錄，也預設選擇第一個
        setCurrentPrompt(allAvailablePrompts[0] || null);
      }
      setChatHistories(savedHistories || {});
      setChatMetadatas(savedMetadatas || {});
      setLongTermMemories(savedMemories || {});
      setOocCommands(savedOocCommands || []);
      setOocCommands(Array.isArray(savedOocCommands) ? savedOocCommands : []);
      setRegexRules(Array.isArray(savedRegexRules) ? savedRegexRules : []);
      setWorldBooks(Array.isArray(savedWorldBooks) ? savedWorldBooks : []);

      // 4. 載入上次的聊天狀態和 API 設定 (這部分邏輯不變)
      const savedActiveCharId = localStorage.getItem('app_active_character_id');
      const savedActiveChatId = localStorage.getItem('app_active_chat_id');
      const activeChar = (savedCharacters || []).find(c => c.id == savedActiveCharId);
      if (activeChar) {
        setActiveChatCharacterId(activeChar.id);
        setCurrentCharacter(activeChar);
        const activeChatIsValid = (savedHistories || {})[activeChar.id]?.[savedActiveChatId];
        if (activeChatIsValid) {
          setActiveChatId(savedActiveChatId);
        }
      }
      
      // ==================== ✨ 全新 API 載入邏輯 ✨ ====================
      const savedKeysByProvider = JSON.parse(localStorage.getItem('app_api_keys_by_provider'));
      if (savedKeysByProvider) {
        setApiKeysByProvider(savedKeysByProvider);
      }
      
      const activeConfigId = localStorage.getItem('app_active_api_config_id');
      let configLoaded = false;

      // 優先策略：嘗試載入使用者選定的預設配置
      if (activeConfigId && savedApiConfigs && savedApiConfigs.length > 0) {
        const configToLoad = savedApiConfigs.find(c => c.id == activeConfigId);
        if (configToLoad) {
          console.log(`正在載入預設 API 配置：「${configToLoad.name}」 - App.js:2671`);
          setLoadedConfigId(configToLoad.id);
          setApiProvider(configToLoad.provider);
          const loadedKeys = configToLoad.keysByProvider || {};
          setApiKeysByProvider(loadedKeys);
          setApiKey(loadedKeys[configToLoad.provider] || '');
          setApiModel(configToLoad.model);
          setLoadedConfigName(configToLoad.name);
          setConfigName(configToLoad.name);
          setCurrentApiKeyIndex(0);
          if (loadedKeys[configToLoad.provider]) {
             // 默默設定為已連線狀態，使用者可以手動再測試
             setIsApiConnected(true);
          }
          configLoaded = true;
        }
      }

      // 備用策略：如果沒有預設配置，則使用舊的「最後一次使用」邏輯
      if (!configLoaded) {
        console.log("未找到預設配置，回退至載入上次使用的 API 設定。 - App.js:2691");
        const lastUsedApi = JSON.parse(localStorage.getItem('app_last_used_api'));
        if (lastUsedApi) {
          setApiProvider(lastUsedApi.provider || 'openai');
          setApiKey(savedKeysByProvider?.[lastUsedApi.provider] || '');
          setApiModel(lastUsedApi.model || (apiProviders[lastUsedApi.provider]?.models[0] || 'gpt-3.5-turbo'));
          if (lastUsedApi.apiKey) setIsApiConnected(true);
        }
      }
      setIsDataLoaded(true);
    } catch (error) {
      console.error('從 IndexedDB 載入資料失敗: - App.js:2702', error);
    }
  };

  loadData();
}, []); // 這個 effect 只在啟動時執行一次，所以依賴項是空的
      
  // ✨ 全新！提示詞選擇的專屬存檔管家 ✨
  useEffect(() => {
    // 確保 currentPrompt 有值，且資料已從 DB 載入完成，避免啟動時存入 null
    if (currentPrompt && isDataLoaded) {
      console.log(`偵測到提示詞變更，正在儲存 ID: ${currentPrompt.id} 到 localStorage... - App.js:2713`);
      localStorage.setItem('app_last_used_prompt_id', currentPrompt.id);
    }
  }, [currentPrompt, isDataLoaded]); // 這個管家會監控 currentPrompt 和 isDataLoaded 的變化

  // ✨✨✨ 全新！聊天記錄的專屬存檔管家 ✨✨✨  <--- 就是這一段！
  useEffect(() => {
      // 加上這個判斷，是為了避免在程式剛啟動、資料還沒載入時就存入一筆空資料
      if (Object.keys(chatHistories).length > 0) {
          console.log("偵測到聊天記錄變更，正在存入 IndexedDB... - App.js:2722");
          db.kvStore.put({ key: 'chatHistories', value: chatHistories });
      }
  }, [chatHistories]); // 這個管家只監控 chatHistories

  // ✨✨✨ 全新！聊天室元數據 (備註/作者備註) 的存檔管家 ✨✨✨
  useEffect(() => {
      if (Object.keys(chatMetadatas).length > 0) {
          console.log("偵測到聊天室元數據變更，正在存入 IndexedDB... - App.js:2730");
          db.kvStore.put({ key: 'chatMetadatas', value: chatMetadatas });
      }
  }, [chatMetadatas]); // 這個管家只監控 chatMetadatas

  // ✨✨✨ 全新！長期記憶的存檔管家 ✨✨✨
  useEffect(() => {
      if (Object.keys(longTermMemories).length > 0) {
          console.log("偵測到長期記憶變更，正在存入 IndexedDB... - App.js:2738");
          db.kvStore.put({ key: 'longTermMemories', value: longTermMemories });
      }
  }, [longTermMemories]); // 這個管家只監控 longTermMemories

  // ✨ 全新！OOC 指令的存檔管家 (修正版) ✨
  useEffect(() => {
    // 避免在程式剛啟動、資料還沒載入完成時，就用一個空陣列覆蓋掉資料庫
    if (!isDataLoaded) return; 
    console.log("偵測到 OOC 指令變更，正在存入 IndexedDB... - App.js:2747");
    db.kvStore.put({ key: 'oocCommands', value: oocCommands });
  }, [oocCommands, isDataLoaded]);

  // ✨ 全新！正規表示式規則的存檔管家 ✨
  useEffect(() => {
    if (!isDataLoaded) return;
    console.log("偵測到正規表示式規則變更，正在存入 IndexedDB... - App.js:2754");
    db.kvStore.put({ key: 'regexRules', value: regexRules });
  }, [regexRules, isDataLoaded]);

  useEffect(() => {
    if (!isDataLoaded) return;
    console.log("偵測到世界書變更，正在存入 IndexedDB... - App.js:2760");
    db.kvStore.put({ key: 'worldBooks', value: worldBooks });
  }, [worldBooks, isDataLoaded]);

  // ✨✨✨ 全新！API 金鑰 "通訊錄" 的專屬存檔管家 ✨✨✨
  useEffect(() => {
    // 避免在程式剛啟動時存入一筆空資料
    if (Object.keys(apiKeysByProvider).length > 0) {
      localStorage.setItem('app_api_keys_by_provider', JSON.stringify(apiKeysByProvider));
    }
  }, [apiKeysByProvider]);

// ✨✨✨ 全新！動態計算當前使用者 (最終版) ✨✨✨
    const currentUserProfile = useMemo(() => {
      // 規則 1: 優先從當前聊天室的 metadata 中尋找 userProfileId
      if (activeChatCharacterId && activeChatId) {
        const chatMeta = chatMetadatas[activeChatCharacterId]?.[activeChatId];
        if (chatMeta?.userProfileId) {
          // 如果找到了，就從總列表中找出對應的 profile
          const profile = userProfiles.find(p => p.id === chatMeta.userProfileId);
          if (profile) return profile; // 如果找到了就直接回傳
        }
      }

      // 規則 2: 如果以上情況都沒找到 (例如在聊天大廳、或舊的聊天室沒有綁定ID)，
      // 就回傳使用者列表中的第一個 profile 作為最終備用。
      return userProfiles[0];
      
    }, [activeChatCharacterId, activeChatId, chatMetadatas, userProfiles]);

    const navigateToPage = useCallback((page) => {
      if (page === 'chat' && currentPage === 'chat' && activeChatCharacterId !== null) {
        setActiveChatCharacterId(null);
        setActiveChatId(null);
        setCurrentCharacter(null);
      } else {
        setCurrentPage(page);
      }
    }, [currentPage, activeChatCharacterId]);

  // =================================================================================
  // ✨✨✨ 全新！截圖模式相關函式 ✨✨✨
  // =================================================================================

  // 1. 負責進入與退出截圖模式
  const handleToggleScreenshotMode = useCallback(() => {
    setIsScreenshotMode(prev => !prev);
    // 退出模式時，清空所有已選擇的訊息
    setSelectedMessageIds([]);
    // 順便關閉可能還開著的輸入框選單
    setIsInputMenuOpen(false);
  }, []);

  // 2. 負責處理使用者點擊訊息的行為
  const handleSelectMessage = useCallback((messageId) => {
    // 只有在截圖模式下才允許選擇
    if (!isScreenshotMode) return;

    setSelectedMessageIds(prevIds => {
      if (prevIds.includes(messageId)) {
        // 如果已經在裡面，就把它過濾掉 (取消選擇)
        return prevIds.filter(id => id !== messageId);
      } else {
        // 如果不在裡面，就把它加進去 (選擇)
        return [...prevIds, messageId];
      }
    });
  }, [isScreenshotMode]);

  // =================================================================================
  // ✨✨✨ 核心！負責生成圖片的函式 (v6 - Promise.all 終極版) ✨✨✨
  // =================================================================================
    const handleGenerateScreenshot = useCallback(async () => {
      if (selectedMessageIds.length === 0) {
        alert('請先選擇至少一則訊息！');
        return;
      }
      alert(`正在生成 ${selectedMessageIds.length} 則訊息的截圖，按下確定後請稍候...`);

      const screenshotContainer = document.createElement('div');
      // ... (樣式設定保持不變) ...
      screenshotContainer.style.backgroundColor = 'var(--surface-color)';
      screenshotContainer.style.padding = '25px';
      screenshotContainer.style.width = '600px';
      screenshotContainer.style.display = 'flex';
      screenshotContainer.style.flexDirection = 'column';
      screenshotContainer.style.gap = '15px';
      screenshotContainer.style.position = 'absolute';
      screenshotContainer.style.left = '-9999px';
      screenshotContainer.style.top = '0px';

      const currentHistory = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
      const sortedSelectedIds = currentHistory
        .map(msg => msg.id)
        .filter(id => selectedMessageIds.includes(id));
      const allMessagesInDom = Array.from(document.querySelectorAll('.messages-area .message'));
      
      // ▼▼▼ 【✨ 全新的、最穩定的處理流程！ ✨】 ▼▼▼
      
      // 步驟 1: 先複製所有需要的節點
      const clonedNodes = sortedSelectedIds.map(msgId => {
        const originalNode = allMessagesInDom.find(node => node.dataset.messageId == msgId);
        if (!originalNode) return null;
        
        const clonedNode = originalNode.cloneNode(true);
        clonedNode.classList.remove('screenshot-mode', 'selected');
        const bubbleWrapper = clonedNode.querySelector('.bubble-wrapper');
        if (bubbleWrapper) bubbleWrapper.onclick = null;
        
        return clonedNode;
      }).filter(Boolean); // 過濾掉可能為 null 的結果

      // 步驟 2: 建立一個陣列，用來存放所有「畫家」的工作承諾 (Promises)
      const avatarDrawingPromises = clonedNodes.map(clonedNode => {
        // 為每一個節點的頭像繪製工作，建立一個新的承諾
        return new Promise(resolve => {
          const clonedAvatarContainer = clonedNode.querySelector('.message-avatar');
          const clonedAvatarImg = clonedNode.querySelector('.avatar-image');

          // 如果沒有頭像，直接回報「我這邊沒事了」
          if (!clonedAvatarContainer || !clonedAvatarImg) {
            resolve();
            return;
          }

          const tempImg = new Image();
          tempImg.crossOrigin = "Anonymous";
          
          // 當這位畫家【完成】他的畫作時...
          tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            const containerSize = clonedAvatarContainer.offsetWidth || 42; // Fallback size
            const scale = 3; 
            canvas.width = containerSize * scale;
            canvas.height = containerSize * scale;
            canvas.style.width = `${containerSize}px`;
            canvas.style.height = `${containerSize}px`;
            // ▼▼▼ 【✨ 核心修正就在這裡！ ✨】 ▼▼▼
            // 告訴 Canvas，它的 display 類型是 block，這會讓它更穩定地參與 Flexbox 佈局
            canvas.style.display = 'block';
            // ▲▲▲ 【✨ 修正結束 ✨】 ▲▲▲
            const ctx = canvas.getContext('2d');
            
            const imgRatio = tempImg.naturalWidth / tempImg.naturalHeight;
            const canvasRatio = canvas.width / canvas.height;
            let sx, sy, sWidth, sHeight;

            if (imgRatio > canvasRatio) {
              sHeight = tempImg.naturalHeight;
              sWidth = sHeight * canvasRatio;
              sx = (tempImg.naturalWidth - sWidth) / 2;
              sy = 0;
            } else {
              sWidth = tempImg.naturalWidth;
              sHeight = sWidth / canvasRatio;
              sy = (tempImg.naturalHeight - sHeight) / 2;
              sx = 0;
            }

            ctx.drawImage(tempImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

            clonedAvatarContainer.innerHTML = ''; // 清空容器
            clonedAvatarContainer.appendChild(canvas);
            
            // ...他就會舉手回報：「我畫完了！」(resolve a promise)
            resolve();
          };

          // 如果畫家找不到顏料（圖片載入失敗），他也必須回報，不能讓大家空等
          tempImg.onerror = () => resolve();
          tempImg.src = clonedAvatarImg.src;
        });
      });
      
      // 步驟 3: 【最關鍵的一步】等待【所有】的畫家都回報他們完成了工作
      await Promise.all(avatarDrawingPromises);

      // 步驟 4: 在確認所有畫作都完成後，才把這些成品掛到牆上（放進 container）
      clonedNodes.forEach(node => screenshotContainer.appendChild(node));

      // ▲▲▲ 【✨ 修正結束 ✨】 ▲▲▲

      document.body.appendChild(screenshotContainer);

      try {
        // 步驟 5: 現在，攝影師可以安心拍照了，因為他知道所有畫都已經在牆上了
        const canvas = await html2canvas(screenshotContainer, {
          scale: 3,
          useCORS: true,
          backgroundColor: null,
        });

        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
        link.download = `chat-screenshot-${timestamp}.png`;
        link.href = image;
        link.click();

      } catch (error) {
        console.error('截圖生成失敗: - App.js:2960', error);
        alert('抱歉，生成截圖時發生錯誤，請查看主控台以獲取詳細資訊。');
      } finally {
        document.body.removeChild(screenshotContainer);
        handleToggleScreenshotMode();
      }
    }, [selectedMessageIds, theme, handleToggleScreenshotMode, chatHistories, activeChatCharacterId, activeChatId]);

// =================================================================================
  // ✨ 修正點 1：把 handleCreateBranch 整個函式區塊移動到這裡！ ✨
  // =================================================================================
  const handleCreateBranch = useCallback((branchMessageId, branchName) => {
    if (!activeChatCharacterId || !activeChatId) return;

    // 1. 取得原始聊天室的資料
    const currentHistory = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    const originalMetadata = chatMetadatas[activeChatCharacterId]?.[activeChatId] || {};
    
    // 2. 找到分支點在歷史紀錄中的位置
    const branchMessageIndex = currentHistory.findIndex(msg => msg.id === branchMessageId);
    if (branchMessageIndex === -1) {
      alert('錯誤：找不到分支點訊息。');
      return;
    }

    // 3. 複製從頭到分支點為止的所有歷史訊息
    const historyToCopy = currentHistory.slice(0, branchMessageIndex + 1);
    const branchMessageText = historyToCopy[historyToCopy.length - 1].contents[0];

    // 4. 建立新的聊天室 ID 和 Metadata
    const newChatId = `chat_branch_${Date.now()}`;
    const newMetadata = {
      name: branchName, // ✨ 2. 直接使用傳入的名稱
      notes: branchMessageText.substring(0, 40), // 備註
      pinned: false,
      userProfileId: originalMetadata.userProfileId || currentUserProfile.id,
      auxiliaryBookIds: originalMetadata.auxiliaryBookIds || [],
      branchSource: {
        parentChatId: activeChatId,
        branchMessageId: branchMessageId,
      }
    };

    // 5. 更新 State
    setChatHistories(prev => {
      const newHistories = { ...prev };
      if (!newHistories[activeChatCharacterId]) newHistories[activeChatCharacterId] = {};
      newHistories[activeChatCharacterId][newChatId] = historyToCopy;
      return newHistories;
    });

    setChatMetadatas(prev => {
      const newMetas = { ...prev };
      if (!newMetas[activeChatCharacterId]) newMetas[activeChatCharacterId] = {};
      newMetas[activeChatCharacterId][newChatId] = newMetadata;
      return newMetas;
    });

    // 6. 自動切換
    setActiveChatId(newChatId);
    
    // 7. 提示使用者
    setShowActionsMessageId(null);
    alert('✅ 已建立新分支，並自動切換！');

  }, [activeChatCharacterId, activeChatId, chatHistories, chatMetadatas, currentCharacter, currentUserProfile, setShowActionsMessageId, setActiveChatId]); // ✨ 修正點 2：補上完整的依賴項，避免 ESLint 警告

// =====================================================================
// ✨✨✨ 全新！「更新」函式 ✨✨✨
// =====================================================================
const handleUpdateConfiguration = useCallback(async () => {
  // 安全檢查：如果沒有載入任何配置，這個函式不應該被執行
  if (!loadedConfigId) {
    alert('錯誤：沒有載入任何配置可供更新。');
    return;
  }

  console.log(`正在更新現有配置 ID: ${loadedConfigId} - App.js:3002`);
  const configToUpdate = {
    id: loadedConfigId, // 使用已存在的 ID
    name: configName,   // 使用輸入框中當前的名稱
    provider: apiProvider,
    keysByProvider: apiKeysByProvider,
    model: apiModel,
    // 從舊配置中找出原始創建時間，如果找不到就用現在的時間
    createdAt: apiConfigs.find(c => c.id === loadedConfigId)?.createdAt || new Date().toISOString()
  };

  try {
    await db.apiConfigs.put(configToUpdate);
    
    // 更新畫面上的配置列表
    const updatedConfigs = apiConfigs.map(c => c.id === loadedConfigId ? configToUpdate : c);
    setApiConfigs(updatedConfigs);
    
    setLoadedConfigName(configName);
    // ✨ 核心新增：確保更新後的API配置仍然是預設
    localStorage.setItem('app_active_api_config_id', loadedConfigId);
    alert(`✅ 已更新配置：「${configName}」`);
  } catch (error) {
    console.error("更新 API 配置失敗: - App.js:3025", error);
    alert('❌ 更新 API 配置失敗！');
  }
}, [
  configName, 
  apiProvider, 
  apiModel, 
  apiConfigs, 
  apiKeysByProvider,
  loadedConfigId // 核心依賴項
]);


// =====================================================================
// ✨✨✨ 全新！「另存為」函式 ✨✨✨
// =====================================================================
const handleSaveAsNewConfiguration = useCallback(async () => {
  if (!configName.trim() || Object.keys(apiKeysByProvider).length === 0) {
    alert('請輸入配置名稱，並至少為一個供應商設定 API 金鑰！');
    return;
  }
  
  console.log("正在另存為新配置... - App.js:3047");
  const newId = Date.now();
  const newConfig = {
    id: newId, // 使用全新的 ID
    name: configName,
    provider: apiProvider,
    keysByProvider: apiKeysByProvider,
    model: apiModel,
    createdAt: new Date().toISOString()
  };

  try {
    await db.apiConfigs.add(newConfig); // 使用 .add() 明確表示新增
    
    const updatedConfigs = [...apiConfigs, newConfig];
    setApiConfigs(updatedConfigs);
    
    // 另存後，新的配置就變成了 "當前載入的配置"
    setLoadedConfigId(newId); 
    setLoadedConfigName(configName);
    // ✨ 核心新增：將新儲存的API配置設為預設
    localStorage.setItem('app_active_api_config_id', newId);
    
    alert(`✅ 已另存為新配置：「${configName}」`);
  } catch (error) {
    console.error("另存新配置失敗: - App.js:3072", error);
    alert('❌ 另存新配置失敗！');
  }
}, [
  configName, 
  apiProvider, 
  apiModel, 
  apiConfigs, 
  apiKeysByProvider
]);

  const loadApiConfiguration = useCallback((configId) => {
  // configId 是字串，我們要轉成數字來比對
  const configToLoad = apiConfigs.find(c => c.id === Number(configId));
  if (configToLoad) {
    // ✨✨✨ 告訴 "小祕書" 我們正在編輯這個 ID ✨✨✨
    setLoadedConfigId(configToLoad.id); 
    
    // (以下邏輯和您上一版的幾乎一樣)
    setApiProvider(configToLoad.provider);
    const loadedKeys = configToLoad.keysByProvider || {};
    setApiKeysByProvider(loadedKeys);
    setApiKey(loadedKeys[configToLoad.provider] || '');
    setApiModel(configToLoad.model);
    setIsApiConnected(false);
    setLoadedConfigName(configToLoad.name); 
    setConfigName(configToLoad.name);
    setCurrentApiKeyIndex(0);
    localStorage.setItem('app_active_api_config_id', configToLoad.id);
    alert(`✅ 已載入配置：「${configToLoad.name}」`);
  }
}, [apiConfigs]); // 依賴項不變

  const deleteApiConfiguration = useCallback(async (configId) => {
    const configToDelete = apiConfigs.find(c => c.id === Number(configId));
    if (configToDelete && window.confirm(`確定要刪除配置「${configToDelete.name}」嗎？`)) {
      try {
        await db.apiConfigs.delete(Number(configId));
        const updatedConfigs = apiConfigs.filter(c => c.id !== Number(configId));
        setApiConfigs(updatedConfigs);
        alert('🗑️ 配置已刪除');
      } catch (error) {
        console.error("刪除 API 配置失敗: - App.js:3114", error);
        alert('❌ 刪除 API 配置失敗！');
      }
    }
  }, [apiConfigs]);

  // ✨ 新增一個 silent 參數，預設為 false
  const savePrompt = useCallback(async (promptData, silent = false) => { 
    try {
      await db.prompts.put(promptData);
      const existingIndex = prompts.findIndex(p => p.id === promptData.id);
      let updatedPrompts = existingIndex > -1
        ? prompts.map(p => p.id === promptData.id ? promptData : p)
        : [...prompts, promptData];
      setPrompts(updatedPrompts);
      
      // ✨ 只有在不是 silent 模式時才顯示提示
      if (!silent) {
        alert(existingIndex > -1 ? `✅ 已更新提示詞：「${promptData.name}」` : `✅ 已儲存新提示詞：「${promptData.name}」`);
      }
    } catch (error) {
      console.error("儲存提示詞失敗: - App.js:3135", error);
      // ✨ 在 silent 模式下，錯誤也只在 console 提示
      if (!silent) {
        alert('❌ 儲存提示詞失敗！');
      }
    }
  }, [prompts]);

  const deletePrompt = useCallback(async (promptId) => {
    try {
      await db.prompts.delete(promptId);
      const updatedPrompts = prompts.filter(p => p.id !== promptId);
      setPrompts(updatedPrompts);
      if (currentPrompt?.id === promptId) setCurrentPrompt(null);
      alert('🗑️ 提示詞已刪除');
    } catch (error) {
      console.error("刪除提示詞失敗: - App.js:3151", error);
      alert('❌ 刪除提示詞失敗！');
    }
  }, [prompts, currentPrompt]);

  const restoreDefaultPrompts = useCallback(async () => {
    if (window.confirm('您確定要還原所有內建提示詞嗎？\n\n這會覆蓋掉您對它們的任何修改。')) {
      try {
        const customPrompts = prompts.filter(p => !BUILT_IN_PROMPTS.some(bp => bp.id === p.id));
        const newPrompts = [...customPrompts, ...BUILT_IN_PROMPTS];
        const uniquePrompts = newPrompts.filter((prompt, index, self) =>
          index === self.findIndex((p) => p.id === prompt.id)
        );
        
        await db.prompts.clear();
        await db.prompts.bulkPut(uniquePrompts);
        
        setPrompts(uniquePrompts);
        alert('✅ 所有內建提示詞已成功還原！');
      } catch (error)
      {
        console.error("還原提示詞失敗: - App.js:3172", error);
        alert('❌ 還原提示詞失敗！');
      }
    }
  }, [prompts]);

// ✨ 全新的，打開區域規則編輯器的函式 (兼容新增與編輯)
  const handleOpenLocalRegexEditor = (ruleIndex) => {
    if (!editingCharacter) return;
    
    // 如果 ruleIndex 是 null，代表是新增，我們傳入一個空物件
    // 否則，我們從陣列中取出對應的規則來編輯
    const ruleToEdit = ruleIndex !== null ? editingCharacter.embeddedRegex[ruleIndex] : { isNew: true };

    setEditingRegexRule(ruleToEdit); // 複用全域編輯器的 state
    
    // 我們不再需要 editingLocalRegex 這個 state 了，可以直接判斷 ruleToEdit.isNew
    setIsRegexEditorOpen(true); // 打開同一個編輯器 Modal
  };

  // ✨ 全新的，儲存區域規則的函式 (兼容新增與編輯)
  const handleSaveLocalRegexRule = (updatedRuleData) => {
    if (!editingCharacter) return;

    const currentRules = [...(editingCharacter.embeddedRegex || [])];
    
    // 檢查我們正在編輯的規則是否帶有 isNew 標記
    if (editingRegexRule?.isNew) {
      // 新增規則
      // 移除 isNew 標記，並加上 id 和 enabled 預設值
      const { isNew, ...newRule } = updatedRuleData;
      currentRules.push({ 
        ...newRule, 
        id: `local_${generateUniqueId()}`, 
        enabled: true 
      });
    } else {
      // 編輯現有規則
      // 找到原始規則在陣列中的索引
      const ruleIndex = currentRules.findIndex(r => r.id === editingRegexRule.id);
      if (ruleIndex > -1) {
        currentRules[ruleIndex] = { ...currentRules[ruleIndex], ...updatedRuleData };
      }
    }
    
    // 直接更新正在編輯的角色物件
    const updatedChar = { ...editingCharacter, embeddedRegex: currentRules };
    setEditingCharacter(updatedChar);

    setIsRegexEditorOpen(false); // 關閉 Modal
    setEditingRegexRule(null);   // 清理狀態
  };

  // =================================================================================
// ✨✨✨ 全新！提示詞模組管理函式 ✨✨✨
// =================================================================================

  const handleAddPromptModule = useCallback(() => {
    if (!currentPrompt) {
      alert('請先選擇一個提示詞預設集才能新增模組。');
      return null; // ✨ 返回 null 表示失敗
    }

    // ✨ 參照 ST 格式，加入 position 和 order 預設值
    const newModule = {
      id: `module_${Date.now()}`,
      name: '新模組',
      content: '',
      enabled: true,
      locked: false,
      readOnly: false,
      role: 'system',
      // ✨ 新增的欄位
      order: 100,
      position: {
        type: 'relative', // 'relative' (在提示詞管理中) 或 'absolute' (在聊天中)
        depth: 4 
      }
    };

    const updatedPrompt = {
      ...currentPrompt,
      modules: [...(currentPrompt.modules || []), newModule],
    };

    savePrompt(updatedPrompt, true); // ✨ 使用 silent 儲存
    setCurrentPrompt(updatedPrompt);
    
    // ✨ 核心修改：返回新建的模組物件
    return newModule; 
  }, [currentPrompt, savePrompt]);

  const handleDeletePromptModule = useCallback((moduleId) => {
    if (!currentPrompt) return;

    // 找到要刪除的模組，以便在確認視窗中顯示名稱
    const moduleToDelete = currentPrompt.modules.find(m => m.id === moduleId);
    if (!moduleToDelete) return;

    // 彈出防呆確認視窗
    if (window.confirm(`您確定要永久刪除模- 「${moduleToDelete.name}」嗎？`)) {
      const updatedModules = currentPrompt.modules.filter(m => m.id !== moduleId);
      const updatedPrompt = { ...currentPrompt, modules: updatedModules };

      savePrompt(updatedPrompt);
      // ✨ 同樣，立即更新當前狀態
      setCurrentPrompt(updatedPrompt);

      alert('🗑️ 模組已刪除。');
    }
  }, [currentPrompt, savePrompt]);

  const handleModuleOrderChange = useCallback((reorderedModules) => {
    if (!currentPrompt) return;

    const updatedPrompt = { ...currentPrompt, modules: reorderedModules };
    
    // 安靜地儲存順序變更
    savePrompt(updatedPrompt, true); 
    setCurrentPrompt(updatedPrompt);

  }, [currentPrompt, savePrompt]);

  const openEditorForNew = () => {
    setEditingCharacter(null);
    setIsEditorOpen(true);
  };

  const openEditorForEdit = (character) => {
    setEditingCharacter(character);
    setIsEditorOpen(true);
  };

  const closeEditor = () => setIsEditorOpen(false);

  const openPreview = (character) => {
    setPreviewingCharacter(character);
    setIsPreviewOpen(true);
  };

  const closePreview = () => setIsPreviewOpen(false);

    const saveCharacter = useCallback(async (characterData, isExport = false) => {
    // ✨ 如果是匯出請求 ✨
    if (isExport && editingCharacter) {
      // 確保頭像是圖片格式
      if (editingCharacter.avatar.type !== 'image' || !editingCharacter.avatar.data) {
        alert('❌ 只有設定了圖片頭像的角色才能匯出為 PNG 角色卡。');
        return;
      }
      
      // 準備符合社群標準的 JSON 資料
      const cardData = {
        spec: 'chara_card_v2',
        data: {
          name: editingCharacter.name,
          description: editingCharacter.description,
          first_mes: editingCharacter.firstMessage,
          alternate_greetings: editingCharacter.alternateGreetings,
          character_book: editingCharacter.characterBook,
          // 我們不儲存頭像的 base64，因為它已經是圖片本身了
          creator_notes: editingCharacter.creatorNotes,
        }
      };

      try {
        // 呼叫我們的核心引擎來生成 PNG Blob
        const pngBlob = await createPngWithCharaChunk(editingCharacter.avatar.data, cardData);
        
        // 觸發下載
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pngBlob);
        link.download = `${editingCharacter.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

      } catch (error) {
        console.error("生成角色卡失敗: - App.js:3351", error);
        alert('❌ 生成 PNG 角色卡失敗，請檢查主控台中的錯誤訊息。');
      }
      return; // 匯出後，結束函式，不做儲存操作
    }

    if (characterData) {
      try {
        await db.characters.put(characterData);
        
        const existingIndex = characters.findIndex(c => c.id === characterData.id);
        let updatedCharacters = existingIndex > -1
          ? characters.map(c => c.id === characterData.id ? characterData : c)
          : [...characters, characterData];
        setCharacters(updatedCharacters);
        
        // ✨ 核心修正：儲存成功後，立刻清除 localStorage 中的草稿
        localStorage.removeItem('character_editor_draft');

        closeEditor();
        alert(existingIndex > -1 ? `✅ 已更新角色：「${characterData.name}」` : `✅ 已創建新角色：「${characterData.name}」`);
      
      } catch (error) {
        console.error("儲存角色失敗: - App.js:3374", error);
        alert('❌ 儲存角色失敗！');
      }
    }
  }, [characters, editingCharacter]); // 依賴項保持不變

  const deleteCharacter = useCallback(async (characterId) => {
    try {
      await db.characters.delete(characterId); // 從資料庫刪除這本書
      
      // 同時也刪除這個角色附帶的所有聊天紀錄
      const currentHistories = chatHistories;
      delete currentHistories[characterId];
      await db.kvStore.put({ key: 'chatHistories', value: currentHistories });
      setChatHistories(currentHistories);

      const updatedCharacters = characters.filter(c => c.id !== characterId);
      setCharacters(updatedCharacters);
      if (currentCharacter?.id === characterId) setCurrentCharacter(null);

      // ✨ 核心修正：刪除成功後，也清除 localStorage 中的草稿
      localStorage.removeItem('character_editor_draft');
      alert('🗑️......角色已離開');
      closeEditor();
      closePreview();

    } catch (error) {
      console.error("刪除角色失敗: - App.js:3401", error);
      alert('❌ 刪除角色失敗！');
    }
  }, [characters, currentCharacter, chatHistories]);

// ==================== ✨ 全新！切換角色收藏狀態的函式 ✨ ====================
  const handleToggleFavoriteCharacter = useCallback(async (characterId) => {
    // 步驟 1: 從目前的角色列表中找到我們要修改的那一個
    const characterToUpdate = characters.find(c => c.id === characterId);
    if (!characterToUpdate) return;

    // 步驟 2: 建立一個更新後的角色物件，並將 fav 狀態反轉 (true 變 false, false 變 true)
    const updatedCharacter = { ...characterToUpdate, fav: !characterToUpdate.fav };

    // 步驟 3: 更新 React 的 state，讓畫面立刻重新渲染
    setCharacters(prevCharacters => 
      prevCharacters.map(c => c.id === characterId ? updatedCharacter : c)
    );

    // 步驟 4: 將更新後的角色資料存回 IndexedDB，確保永久保存
    try {
      await db.characters.put(updatedCharacter);
    } catch (error) {
      console.error("更新角色收藏狀態失敗: - App.js:3424", error);
      // 如果儲存失敗，可以選擇是否要還原畫面狀態
    }
  }, [characters]);  
  
// =================================================================================
// ✨✨✨ 全新！更強大的角色卡 Regex 解析引擎 (V4 - 完整 SillyTavern 兼容版) ✨✨✨
// =================================================================================
const parseRegexFromCard = (cardData, originalJsonData = null) => {
  let rawRegexArray = [];

  // 1. 檢查所有已知的 Regex 儲存路徑（按優先順序）
  // SillyTavern 可能將 regex 存在多個位置
  const possiblePaths = [
    cardData?.extensions?.regex_scripts,
    cardData?.extensions?.regex,
    cardData?.regex_scripts,
    cardData?.regex,
    originalJsonData?.extensions?.regex_scripts,
    originalJsonData?.extensions?.regex,
    originalJsonData?.data?.extensions?.regex_scripts,
    originalJsonData?.data?.extensions?.regex,
  ];

  for (const path of possiblePaths) {
    if (Array.isArray(path) && path.length > 0) {
      rawRegexArray = path;
      console.log(`【Regex 導入】找到 ${path.length} 條規則`);
      break;
    }
  }

  if (rawRegexArray.length === 0) {
    console.log('【Regex 導入】未找到任何 regex 規則');
    return [];
  }

  // 2. 將讀取到的原始資料，"翻譯" 成我們應用程式內部統一且完整的格式
  const translatedRegex = rawRegexArray.map((rule, index) => {
    // 從 findRegex 欄位中分離出 pattern 和 flags
    let find = rule.findRegex || rule.find || '';
    let flags = rule.flags || 'g'; // 預設 flag

    // 處理 /pattern/flags 格式
    if (find.startsWith('/') && find.lastIndexOf('/') > 0) {
      const lastSlash = find.lastIndexOf('/');
      flags = find.substring(lastSlash + 1) || 'g';
      find = find.substring(1, lastSlash);
    }

    // ✨ SillyTavern placement 格式轉換
    // ST: [0=user input, 1=AI output, 2=slash command (舊), 3=slash command, 4=world info]
    // 我們: [0=user, 1=AI, 2=both (不使用), 3=slash, 4=world info]
    let placement = rule.placement;
    if (!Array.isArray(placement) || placement.length === 0) {
      // 預設為 AI 輸出
      placement = [1];
    }

    // 驗證 regex 是否有效
    try {
      new RegExp(find, flags);
    } catch (e) {
      console.warn(`【Regex 導入】跳過無效規則 #${index}: ${find}`, e.message);
      return null;
    }

    return {
      id: generateUniqueId(),
      find: find,
      flags: flags,
      replace: rule.replaceString ?? rule.replace ?? '',
      notes: rule.scriptName || rule.name || rule.notes || `導入規則 #${index + 1}`,
      enabled: rule.disabled === undefined ? (rule.enabled !== false) : !rule.disabled,
      runOnEdit: Boolean(rule.runOnEdit),
      promptOnly: Boolean(rule.promptOnly),
      markdownOnly: Boolean(rule.markdownOnly),
      placement: placement,
      // ✨ 新增 SillyTavern 特有欄位
      trimStrings: Boolean(rule.trimStrings),
      substituteRegex: Number(rule.substituteRegex) || 0,
      minDepth: rule.minDepth ?? null,
      maxDepth: rule.maxDepth ?? null,
    };
  }).filter(rule => rule !== null && rule.find);

  console.log(`【Regex 導入】成功解析 ${translatedRegex.length} 條規則`);
  return translatedRegex;
};

// ==================== ✨ 全新升級版 v4！能自動匯入並關聯世界書，且兼容多種 Regex 格式 ✨ ====================
  const handleImportCharacter = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let failureCount = 0;
    const newlyImportedCharacters = [];
    const newlyCreatedWorldBooks = [];

    const existingBookFingerprints = new Map(
      worldBooks.map(book => [JSON.stringify(book.entries), book.id])
    );

    for (const file of files) {
      try {
        let characterJsonData;
        let characterAvatar = { type: 'icon', data: 'UserCircle' };
        // --- 檔案解析邏輯 (保持不變) ---
        const getCharacterDataFromPng = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => { try { const buffer = e.target.result; const view = new DataView(buffer); if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) { return reject(new Error('不是有效的 PNG 檔案。')); } let offset = 8; const textDecoder = new TextDecoder('utf-8'); while (offset < view.byteLength) { const length = view.getUint32(offset); const type = textDecoder.decode(buffer.slice(offset + 4, offset + 8)); if (type === 'tEXt') { const chunkData = buffer.slice(offset + 8, offset + 8 + length); let keyword = ''; let i = 0; while (i < length) { const charCode = new DataView(chunkData).getUint8(i); if (charCode === 0) { break; } keyword += String.fromCharCode(charCode); i++; } if (keyword === 'chara') { const base64Data = textDecoder.decode(chunkData.slice(i + 1)); const decodedJsonString = base64ToUtf8(base64Data); resolve(JSON.parse(decodedJsonString)); return; } } offset += 12 + length; } reject(new Error('在 PNG 檔案中找不到角色資料 (tEXt chunk)。')); } catch (err) { reject(new Error('解析 PNG 檔案失敗：' + err.message)); } }; reader.onerror = () => reject(new Error('讀取檔案失敗。')); reader.readAsArrayBuffer(file); });
        if (file.type === 'application/json' || file.name.endsWith('.json')) { characterJsonData = JSON.parse(await file.text()); } else if (file.type === 'image/png') { characterJsonData = await getCharacterDataFromPng(file); const originalBase64 = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); }); const compressedBase64 = await compressImage(originalBase64); characterAvatar = { type: 'image', data: compressedBase64 }; } else { failureCount++; continue; }
        const cardData = characterJsonData.spec?.startsWith('chara_card_v') ? characterJsonData.data : characterJsonData;
        if (!cardData.name && !cardData.char_name) { failureCount++; continue; }
        // --- 檔案解析邏輯結束 ---

        const newCharacter = {
          id: generateUniqueId(),
          name: cardData.name || cardData.char_name,
          description: cardData.description || '',
          personality: cardData.personality || '',
          scenario: cardData.scenario || '',
          firstMessage: cardData.first_mes || '',
          alternateGreetings: cardData.alternate_greetings || [],
          creatorNotes: cardData.creator_notes || characterJsonData.creatorcomment || '',
          avatar: characterAvatar,
          fav: cardData.fav || false,

          // ✨ 範例對話 (mes_example)
          mes_example: cardData.mes_example || '',

          // ✨ 歷史後指令 (post_history_instructions)
          post_history_instructions: cardData.post_history_instructions || '',

          // ✨✨✨ 核心修改！我們用新的解析引擎來處理 Regex ✨✨✨
          embeddedRegex: parseRegexFromCard(cardData, characterJsonData),

          mainLorebookId: '',
        };
        
        if (cardData.character_book && (
          (Array.isArray(cardData.character_book.entries) && cardData.character_book.entries.length > 0) ||
          (!Array.isArray(cardData.character_book.entries) && Object.keys(cardData.character_book.entries || {}).length > 0)
        )) {
          const incomingBookEntries = cardData.character_book.entries;
          let sanitizedEntries = {};
          if (Array.isArray(incomingBookEntries)) {
            let currentUid = 0;
            incomingBookEntries.forEach((entry, index) => {
              if (entry && typeof entry === 'object') {
                const mappedEntry = mapWorldBookEntryFields(entry);
                mappedEntry.uid = currentUid;
                mappedEntry.displayIndex = currentUid;
                sanitizedEntries[String(currentUid)] = mappedEntry;
                currentUid++;
              }
            });
          } else {
            let currentUid = 0;
            Object.keys(incomingBookEntries).forEach(key => {
              const entry = incomingBookEntries[key];
              if (entry && typeof entry === 'object') {
                const mappedEntry = mapWorldBookEntryFields(entry);
                mappedEntry.uid = currentUid;
                mappedEntry.displayIndex = currentUid;
                sanitizedEntries[String(currentUid)] = mappedEntry;
                currentUid++;
              }
            });
          }
          const incomingBookFingerprint = JSON.stringify(sanitizedEntries);
          if (existingBookFingerprints.has(incomingBookFingerprint)) {
            const existingBookId = existingBookFingerprints.get(incomingBookFingerprint);
            newCharacter.mainLorebookId = existingBookId;
          } else {
            const newBook = {
              id: `wb_imp_${generateUniqueId()}`,
              name: cardData.character_book.name || `${newCharacter.name}的角色書`,
              entries: sanitizedEntries,
            };
            newlyCreatedWorldBooks.push(newBook);
            newCharacter.mainLorebookId = newBook.id;
            existingBookFingerprints.set(incomingBookFingerprint, newBook.id);
          }
        }

        newlyImportedCharacters.push(newCharacter);
        successCount++;

      } catch (error) {
        console.error(`匯入檔案 ${file.name} 失敗: - App.js:3567`, error);
        failureCount++;
      }
    }

    // --- 更新 state 和資料庫 (保持不變) ---
    if (newlyCreatedWorldBooks.length > 0) { const updatedBooks = [...worldBooks, ...newlyCreatedWorldBooks]; setWorldBooks(updatedBooks); await db.kvStore.put({ key: 'worldBooks', value: updatedBooks }); }
    if (newlyImportedCharacters.length > 0) { const updatedCharacters = [...characters, ...newlyImportedCharacters]; setCharacters(updatedCharacters); await db.characters.bulkPut(newlyImportedCharacters); }
    let summaryMessage = `✅ 批次匯入完成！\n`;
    if (successCount > 0) summaryMessage += `成功匯入 ${successCount} 個角色。\n`;
    if (newlyCreatedWorldBooks.length > 0) summaryMessage += `並自動創建了 ${newlyCreatedWorldBooks.length} 本新的主要知識書。\n`;
    if (failureCount > 0) summaryMessage += `有 ${failureCount} 個檔案匯入失敗。`;
    alert(summaryMessage);
    if (event.target) event.target.value = '';
    
}, [characters, worldBooks]);

  // =================================================================================
  // ✨✨✨ 全新！使用者個人檔案管理函式 ✨✨✨
  // =================================================================================

  // 開啟編輯器 (新增模式)
  const openNewUserProfileEditor = () => {
    setEditingUserProfileId(null); // 清空 ID 代表是新增
    setIsUserProfileEditorOpen(true);
  };

  // 開啟編輯器 (編輯模式)
  const openEditUserProfileEditor = (profileId) => {
    setEditingUserProfileId(profileId); // 傳入要編輯的 ID
    setIsUserProfileEditorOpen(true);
  };

  // 關閉編輯器
  const closeUserProfileEditor = () => {
    setIsUserProfileEditorOpen(false);
  };

  // 儲存個人檔案 (核心邏輯)
  const handleSaveUserProfile = useCallback(async (profileData) => {
    let updatedProfiles;
    if (editingUserProfileId) {
      updatedProfiles = userProfiles.map(p => 
        p.id === editingUserProfileId ? { ...p, ...profileData } : p
      );
    } else {
      const newProfile = { id: `user_${Date.now()}`, ...profileData };
      updatedProfiles = [...userProfiles, newProfile];
    }
    
    setUserProfiles(updatedProfiles);
    await db.kvStore.put({ key: 'userProfiles', value: updatedProfiles });
    
    // ✨ 核心新增：儲存成功後，清除草稿
    localStorage.removeItem('user_profile_editor_draft');

    closeUserProfileEditor();
    alert('✅ 個人檔案已儲存！');
  }, [userProfiles, editingUserProfileId]);


  const handleDeleteUserProfile = useCallback(async (profileId) => {
    if (userProfiles.length <= 1) {
      alert('❌ 至少需要保留一個個人檔案。');
      return;
    }

    if (window.confirm('確定要刪除這個個人檔案嗎？')) {
      const updatedProfiles = userProfiles.filter(p => p.id !== profileId);
      setUserProfiles(updatedProfiles);
      await db.kvStore.put({ key: 'userProfiles', value: updatedProfiles });
      
      // ✨ 核心新增：刪除成功後，也清除草稿
      localStorage.removeItem('user_profile_editor_draft');
    
      alert('🗑️ 個人檔案已刪除。');
    }
  }, [userProfiles]);

  // =================================================================================
  // ✨✨✨ 全新！世界書管理函式 ✨✨✨
  // =================================================================================
  const handleAddWorldBook = useCallback(async () => {
    const newBook = {
      id: `wb_${Date.now()}`,
      name: '新的世界書',
      description: '',
      entries: {},
    };
    
    // 使用 functional update 確保拿到最新的狀態
    const updatedBooks = [...worldBooks, newBook];
    setWorldBooks(updatedBooks);
    
    // 立即寫入資料庫確保同步
    try {
      await db.kvStore.put({ key: 'worldBooks', value: updatedBooks });
    } catch (error) {
      console.error("新增世界書後寫入 DB 失敗: - App.js:3665", error);
    }
  }, [worldBooks]); // 依賴項保持不變

  const handleSaveWorldBook = useCallback(async (bookData) => {
    let savedBookName = '未知';
    setWorldBooks(prevBooks => {
        const updatedBooks = prevBooks.map(b => {
            if (b.id === bookData.id) {
                savedBookName = bookData.name;
                return bookData;
            }
            return b;
        });
        
        db.kvStore.put({ key: 'worldBooks', value: updatedBooks }).catch(error => {
          console.error("儲存世界書後寫入 DB 失敗: - App.js:3681", error);
        });
        
        return updatedBooks;
    });

    alert(`✅ 已儲存世界書：「${savedBookName}」`);
  }, [worldBooks]); // ✨✨✨ 核心修改：將依賴項從 [] 改為 [worldBooks] ✨✨✨

  const handleDeleteWorldBook = useCallback(async (bookId) => {
      const updatedBooks = worldBooks.filter(b => b.id !== bookId);
      setWorldBooks(updatedBooks);
      await db.kvStore.put({ key: 'worldBooks', value: updatedBooks });
      alert('🗑️ 世界書已刪除。');
  }, [worldBooks]);

  // ✨✨✨ 在這裡貼上以下兩個函式 ✨✨✨
  const handleExportWorldBook = useCallback((bookId) => {
    const bookToExport = worldBooks.find(b => b.id === bookId);
    if (!bookToExport) return;

    const { id, ...exportData } = bookToExport;

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${bookToExport.name}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [worldBooks]);

  const handleImportWorldBook = useCallback(async (event) => {
  const files = event.target.files;
  if (!files) return;

  const importedBooks = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 驗證是否為有效的世界書格式
      if (!data.entries || typeof data.entries !== 'object') {
        console.warn(`檔案 ${file.name} 格式不正確，已跳過。 - App.js:3729`);
        continue;
      }

// ✨ 處理陣列或物件格式的 entries（與角色卡匯入邏輯統一）
let sanitizedEntries = {};

if (Array.isArray(data.entries)) {
  // 陣列格式：重新分配連續的 uid
  let currentUid = 0;
  data.entries.forEach((entry, index) => {
    if (entry && typeof entry === 'object') {
      const mappedEntry = mapWorldBookEntryFields(entry);
      mappedEntry.uid = currentUid;
      mappedEntry.displayIndex = currentUid;
      sanitizedEntries[String(currentUid)] = mappedEntry;
      currentUid++;
    }
  });
} else {
  // 物件格式：確保 uid 連續
  let currentUid = 0;
  Object.keys(data.entries).forEach(key => {
    const entry = data.entries[key];
    if (entry && typeof entry === 'object') {
      const mappedEntry = mapWorldBookEntryFields(entry);
      mappedEntry.uid = currentUid;
      mappedEntry.displayIndex = currentUid;
      sanitizedEntries[String(currentUid)] = mappedEntry;
      currentUid++;
    }
  });
}

      const bookName = data.name || file.name.replace(/\.json$/i, '');
      const newBook = {
        id: `wb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: bookName,
        description: String(data.description || ''),
        entries: sanitizedEntries
      };
      
      importedBooks.push(newBook);
      
    } catch (error) {
      console.error(`匯入世界書 ${file.name} 失敗: - App.js:3774`, error);
      alert(`匯入檔案 "${file.name}" 時發生錯誤：${error.message}`);
    }
  }

  if (importedBooks.length > 0) {
    const finalBooks = [...worldBooks, ...importedBooks];
    setWorldBooks(finalBooks);

    // 立即寫入資料庫
    try {
      await db.kvStore.put({ key: 'worldBooks', value: finalBooks });
      alert(`✅ 成功匯入 ${importedBooks.length} 本世界書！`);
    } catch (error) {
      console.error("匯入世界書後寫入 DB 失敗: - App.js:3788", error);
      alert('⚠️ 匯入成功但儲存時發生錯誤，請重新啟動應用。');
    }
  }

  if (event.target) event.target.value = '';
}, [worldBooks]);

  // =================================================================================
  // ✨✨✨ 全新！OOC 指令管理函式 ✨✨✨
  // =================================================================================

  // 開啟編輯器 (新增模式)
  const handleOpenOocCommandEditorForNew = () => {
    setEditingOocCommand({ isNew: true }); // 用一個特殊標記來表示是新增
    setIsOocCommandEditorOpen(true);
  };

  // 開啟編輯器 (編輯模式)
  const handleOpenOocCommandEditorForEdit = (command) => {
    setEditingOocCommand(command);
    setIsOocCommandEditorOpen(true);
  };

  // 儲存或更新指令
  const handleSaveOocCommand = useCallback(async (commandData) => {
    if (editingOocCommand?.isNew) {
      // 新增
      const newCommand = { id: `ooc_${Date.now()}`, ...commandData };
      const updatedCommands = [...oocCommands, newCommand];
      setOocCommands(updatedCommands);
      await db.kvStore.put({ key: 'oocCommands', value: updatedCommands });
      alert('✅ 新 OOC 指令已儲存！');
    } else {
      // 更新
      const updatedCommands = oocCommands.map(cmd =>
        cmd.id === editingOocCommand.id ? { ...cmd, ...commandData } : cmd
      );
      setOocCommands(updatedCommands);
      await db.kvStore.put({ key: 'oocCommands', value: updatedCommands });
      alert('✅ OOC 指令已更新！');
    }
    setIsOocCommandEditorOpen(false);
    setEditingOocCommand(null);
  }, [oocCommands, editingOocCommand]);

  // 刪除指令
  const handleDeleteOocCommand = useCallback(async (commandId) => {
    if (window.confirm('確定要刪除這個 OOC 指令嗎？')) {
      const updatedCommands = oocCommands.filter(cmd => cmd.id !== commandId);
      setOocCommands(updatedCommands);
      await db.kvStore.put({ key: 'oocCommands', value: updatedCommands });
      alert('🗑️ OOC 指令已刪除。');
    }
  }, [oocCommands]);
  const handleSelectOocCommand = useCallback((commandContent) => {
    // 將收到的指令內容，附加到目前輸入框文字的後面
    setInputMessage(prev => prev + commandContent);
  }, []);

  // =================================================================================
  // ✨✨✨ 全新！正規表示式 (Regex) 規則管理函式 ✨✨✨
  // =================================================================================

  // 開啟 Regex 編輯器 (新增模式)
  const handleOpenRegexEditorForNew = () => {
    setEditingRegexRule({ isNew: true });
    setIsRegexEditorOpen(true);
  };

  // 開啟 Regex 編輯器 (編輯模式)
  const handleOpenRegexEditorForEdit = (rule) => {
    setEditingRegexRule(rule);
    setIsRegexEditorOpen(true);
  };

  // 儲存 Regex 規則
  const handleSaveRegexRule = useCallback((ruleData) => {
    if (editingRegexRule?.isNew) {
      const newRule = { id: generateUniqueId(), enabled: true, ...ruleData };
      setRegexRules(prev => [...prev, newRule]);
    } else {
      setRegexRules(prev => prev.map(r => 
        r.id === editingRegexRule.id ? { ...r, ...ruleData } : r
      ));
    }
    setIsRegexEditorOpen(false);
    setEditingRegexRule(null);
  }, [regexRules, editingRegexRule]);

  // 刪除 Regex 規則
  const handleDeleteRegexRule = useCallback((ruleId) => {
    if (window.confirm('確定要刪除這條正規表示式規則嗎？')) {
      setRegexRules(prev => prev.filter(r => r.id !== ruleId));
    }
  }, [regexRules]);

  // 切換 Regex 規則的啟用狀態
  const handleToggleRegexRule = useCallback((ruleId) => {
    setRegexRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  }, [regexRules]);

  // =================================================================================
  // ✨✨✨ 全新！全域 Regex 的匯入/匯出函式 ✨✨✨
  // =================================================================================

  const handleExportGlobalRegex = useCallback(() => {
    if (regexRules.length === 0) {
      alert('目前沒有可匯出的全域規則。');
      return;
    }
    const jsonString = JSON.stringify(regexRules, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `geniu5_global_regex_backup.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [regexRules]);

  const handleImportGlobalRegex = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        let newRules = [];

        // 判斷是 ST 的單一檔案，還是我們自己的陣列檔案
        if (Array.isArray(data)) {
          // 這是我們自己的備份檔
          newRules = data.map(rule => ({ ...rule, id: generateUniqueId() }));
        } else if (data.scriptName && data.findRegex) {
          // 這是 ST 的單一腳本檔
          const findRegexStr = data.findRegex;
          let findPattern = findRegexStr;
          // 移除 ST 格式中的斜線和標記
          if (findRegexStr.startsWith('/') && findRegexStr.lastIndexOf('/') > 0) {
            findPattern = findRegexStr.substring(1, findRegexStr.lastIndexOf('/'));
          }
          newRules.push({
            id: generateUniqueId(),
            find: findPattern,
            replace: data.replaceString || '',
            enabled: !data.disabled,
            notes: data.scriptName || '從 ST 匯入的腳本',
          });
        } else {
          throw new Error('不支援的檔案格式。');
        }

        if (window.confirm(`即將匯入 ${newRules.length} 條規則。確定要將它們新增到您的全域列表中嗎？`)) {
          setRegexRules(prev => [...prev, ...newRules]);
          alert('✅ 規則已成功匯入！');
        }

      } catch (error) {
        alert(`❌ 匯入失敗：${error.message}`);
      } finally {
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  }, []); // 依賴項為空，因為 setRegexRules 會自動取得最新狀態

  // ✨✨✨ 在這裡加入全新的「儲存聊天知識書」函式 ✨✨✨
  const handleSaveAuxiliaryLorebooks = useCallback((selectedIds) => {
    if (!activeChatCharacterId || !activeChatId) return;

    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      // 確保路徑存在
      if (!newMetas[activeChatCharacterId]) newMetas[activeChatCharacterId] = {};
      if (!newMetas[activeChatCharacterId][activeChatId]) {
        newMetas[activeChatCharacterId][activeChatId] = { pinned: false, name: '', notes: '' };
      }
      
      // ✨ 核心：將選擇的 ID 陣列儲存到這個聊天室的 metadata 中
      newMetas[activeChatCharacterId][activeChatId].auxiliaryBookIds = selectedIds;
      return newMetas;
    });

    setIsAuxLorebookSelectorOpen(false); // 儲存後自動關閉視窗
    alert(`✅ 已更新 ${selectedIds.length} 本聊天知識書。`);
  }, [activeChatCharacterId, activeChatId]);


  // ✨✨✨ 用這個新版本【覆蓋】舊的 handleStartChat ✨✨✨
  const handleStartChat = useCallback((character, greeting, selectedProfileId) => {
    setCurrentCharacter(character);
    const startingProfile = userProfiles.find(p => p.id === selectedProfileId) || userProfiles[0];
    const allGreetings = [ character.firstMessage, ...(character.alternateGreetings || []) ].filter(Boolean).map(g => applyPlaceholders(g, character, startingProfile));
    const newChatId = `chat_${Date.now()}`;
    let initialHistory = [];
    if (allGreetings.length > 0) {
      const selectedIndex = allGreetings.indexOf(applyPlaceholders(greeting, character, startingProfile));
      const firstMessage = { id: Date.now(), sender: 'ai', contents: allGreetings, activeContentIndex: selectedIndex !== -1 ? selectedIndex : 0, timestamp: getFormattedTimestamp(), };
      initialHistory = [firstMessage];
    }
    setChatHistories(prev => { const newHistories = { ...prev }; if (!newHistories[character.id]) newHistories[character.id] = {}; newHistories[character.id][newChatId] = initialHistory; return newHistories; });
    
    setChatMetadatas(prev => {
      const newMetas = { ...prev };
      if (!newMetas[character.id]) newMetas[character.id] = {};
      newMetas[character.id][newChatId] = { 
        name: '', notes: '', pinned: false, 
        userProfileId: selectedProfileId,
        auxiliaryBookIds: [], // ✨ 核心：為新聊天室初始化一個空的聊天知識書陣列
      };
      return newMetas;
    });
    
    setActiveChatCharacterId(character.id);
    setActiveChatId(newChatId);
    closePreview();
    navigateToPage('chat');
  }, [navigateToPage, getFormattedTimestamp, userProfiles]);

  const testApiConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      alert('請至少輸入一個 API 金鑰！');
      return;
    }
    setApiTestLoading(true);
  
    // 1. 將輸入的文字拆分成金鑰陣列，並過濾掉空行
    const allKeys = apiKey.split('\n').map(k => k.trim()).filter(k => k);
    let isConnectionSuccessful = false;
  
    // 2. 遍歷所有金鑰，逐一測試
    for (let i = 0; i < allKeys.length; i++) {
      const currentKey = allKeys[i];
      console.log(`正在測試金鑰 #${i + 1}... - App.js:4027`);
      try {
        const provider = apiProviders[apiProvider];
        // (這裡的測試邏輯和您原本的一樣，只是用了 currentKey)
        let requestBody;
        let endpoint = provider.endpoint;
        const testMessage = '你好';
  
        if (provider.isGemini) {
          endpoint = `${provider.endpoint}${apiModel}:generateContent?key=${currentKey}`;
          requestBody = { contents: [{ parts: [{ text: testMessage }] }] };
        } else {
          requestBody = { model: apiModel, messages: [{ role: 'user', content: testMessage }], max_tokens: 10 };
        }
  
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: provider.headers(currentKey),
          body: JSON.stringify(requestBody)
        });
  
        if (response.ok) {
          // 3. 只要有一個金鑰成功，就立刻設定狀態並結束
          setIsApiConnected(true);
          const lastUsed = { provider: apiProvider, model: apiModel }; // 儲存所有金鑰
          localStorage.setItem('app_last_used_api', JSON.stringify(lastUsed));
          setCurrentApiKeyIndex(i); // ✨ 記住這個成功的金鑰索引！
          alert(`✅ 金鑰 #${i + 1} 連接成功！`);
          isConnectionSuccessful = true;
          break; // 成功後就跳出 for 迴圈
        } else {
           console.warn(`金鑰 #${i + 1} 失敗，狀態碼: ${response.status} - App.js:4058`);
        }
      } catch (error) {
        console.error(`金鑰 #${i + 1} 發生錯誤: - App.js:4061`, error);
      }
    }
  
    // 4. 如果所有金鑰都試完了還是失敗，才顯示最終的失敗訊息
    if (!isConnectionSuccessful) {
      setIsApiConnected(false);
      alert('❌ 所有 API 金鑰均無法連接。請檢查金鑰、網路連線或 API 服務狀態。');
    }
  
    setApiTestLoading(false);
  }, [apiKey, apiProvider, apiModel, apiProviders]);

// ✨ 1. 補上缺少的狀態
  const [availableModels, setAvailableModels] = useState([]);

  // ✨ 2. 更新版的 handleProviderChange (切換供應商時重置列表)
  const handleProviderChange = useCallback((provider) => {
    setApiProvider(provider);
    
    // 先讀取該服務商的「預設寫死模型」
    const defaultModels = apiProviders[provider].models;
    setAvailableModels(defaultModels); // 更新列表狀態
    setApiModel(defaultModels[0]);     // 預設選中第一個

    // 從 "通訊錄" 中讀取新供應商的金鑰
    setApiKey(apiKeysByProvider[provider] || '');

    // 重置連線狀態
    setIsApiConnected(false);
    setLoadedConfigName('');
    setCurrentApiKeyIndex(0);
  }, [apiProviders, apiKeysByProvider]);

  // ✨ 3. 找回遺失的 handleApiKeyChange (這是原本報錯的原因！)
  const handleApiKeyChange = useCallback((value) => {
    setApiKey(value);
    setApiKeysByProvider(prev => ({
      ...prev,
      [apiProvider]: value 
    }));
    
    // 任何修改都應該重置連線狀態
    setIsApiConnected(false);
    setLoadedConfigName('');
  }, [apiProvider]);

  // ✨ 4. 補上缺少的 fetchModels (抓取模型功能)
  const fetchModels = useCallback(async () => {
    if (!apiKey.trim()) {
      alert('請先輸入 API 金鑰！');
      return;
    }
    
    const provider = apiProviders[apiProvider];
    const allKeys = apiKey.split('\n').map(k => k.trim()).filter(Boolean);
    const currentKey = allKeys[0]; // 抓取時我們先用第一把金鑰測試
    
    if (!currentKey) return;

    alert(`正在向 ${provider.name} 請求最新的模型列表...按下【確定】後繼續`);
    
    try {
      let fetchedModels = [];
      
      // === 情況 A: Google Gemini ===
      if (provider.isGemini) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${currentKey}`);
        const data = await response.json();
        
        if (data.models) {
          fetchedModels = data.models
            .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
            .map(m => m.name.replace('models/', '')); 
        }
      } 
      // === 情況 B: Claude (Anthropic) ===
      else if (apiProvider === 'claude') {
        try {
           const response = await fetch(provider.endpoint.replace('/messages', '/models'), {
             method: 'GET',
             headers: { 
               'x-api-key': currentKey,
               'anthropic-version': '2023-06-01'
             }
           });
           if (response.ok) {
             const data = await response.json();
             fetchedModels = data.data.map(m => m.id);
           } else {
             throw new Error("Proxy 不支援列表抓取");
           }
        } catch (e) {
           alert('Claude API 通常不支援從瀏覽器直接抓取列表 (CORS 限制)。已保留預設列表。');
           return;
        }
      }
      // === 情況 C: OpenAI / OpenRouter / 其他標準格式 ===
      else {
        const listEndpoint = provider.endpoint.replace('chat/completions', 'models');
        const response = await fetch(listEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${currentKey}`,
            ...(apiProvider === 'openrouter' ? {
                'HTTP-Referer': 'https://your-app-url.com',
                'X-Title': 'GENIU5'
            } : {})
          }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          fetchedModels = data.data.map(m => m.id);
          fetchedModels.sort();
        }
      }

      if (fetchedModels.length > 0) {
        setAvailableModels(fetchedModels);
        alert(`✅ 成功抓取！共找到 ${fetchedModels.length} 個模型。`);
        if (!fetchedModels.includes(apiModel)) {
            setApiModel(fetchedModels[0]);
        }
      } else {
        alert('⚠️ API 有回應，但沒有找到任何模型資料。');
      }

    } catch (error) {
      console.error('抓取模型失敗:', error);
      alert(`❌ 抓取模型列表失敗：${error.message}\n\n(將維持使用預設列表)`);
    }
  }, [apiKey, apiProvider, apiProviders, apiModel]);

// =================================================================================
// ✨✨✨ 全新升級！processWorldBookEntries v3 (完整 SillyTavern 邏輯版) ✨✨✨
// =================================================================================
const processWorldBookEntries = (activeBooks, contextScanSources) => {
  console.log("世界書處理引擎 v3 啟動...");
  let allEntries = [];
  activeBooks.forEach(book => {
    if (book.entries && typeof book.entries === 'object') {
        allEntries.push(...Object.values(book.entries));
    }
  });

  if (allEntries.length === 0) {
    console.log("沒有啟用任何世界書條目，處理結束。");
    return [];
  }
  console.log(`總共掃描 ${allEntries.length} 個條目...`);

  // ✨ 輔助函數：關鍵字匹配（支援大小寫敏感和全字匹配）
  const matchKeyword = (text, keyword, caseSensitive, matchWholeWords) => {
    if (!keyword || keyword.trim() === '') return false;

    let searchText = text;
    let searchKeyword = keyword;

    // 處理大小寫敏感
    if (!caseSensitive) {
      searchText = text.toLowerCase();
      searchKeyword = keyword.toLowerCase();
    }

    // 處理全字匹配
    if (matchWholeWords) {
      // 使用正則表達式進行全字匹配
      const escapedKeyword = searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, caseSensitive ? 'g' : 'gi');
      return regex.test(text);
    }

    return searchText.includes(searchKeyword);
  };

  // --- 階段一：掃描與觸發 ---
  const triggeredEntries = allEntries.filter(entry => {
    // 規則 1：如果條目被停用，直接跳過
    if (entry.disable) return false;

    // 規則 2：處理 🔵 常駐模式 (藍燈)
    if (entry.constant) return true;

    // 規則 3：處理 🟢 選擇模式 (綠燈) - 關鍵字掃描
    if (entry.selective) {
      // 組合需要掃描的文本來源
      let scanText = contextScanSources.chatHistory || '';

      // ✨ 支援自訂掃描深度 (scanDepth)
      if (entry.scanDepth && entry.scanDepth > 0) {
        const lines = (contextScanSources.chatHistory || '').split('\n');
        scanText = lines.slice(-entry.scanDepth).join('\n');
      }

      if (entry.matchPersonaDescription) scanText += '\n' + (contextScanSources.personaDescription || '');
      if (entry.matchCharacterDescription) scanText += '\n' + (contextScanSources.characterDescription || '');
      if (entry.matchCharacterPersonality) scanText += '\n' + (contextScanSources.characterPersonality || '');
      if (entry.matchScenario) scanText += '\n' + (contextScanSources.scenario || '');
      if (entry.matchCreatorNotes) scanText += '\n' + (contextScanSources.creatorNotes || '');

      const primaryKeys = entry.key || [];
      const secondaryKeys = entry.keysecondary || [];

      // 取得匹配設定（預設值）
      const caseSensitive = entry.caseSensitive ?? false;
      const matchWholeWords = entry.matchWholeWords ?? false;

      // 如果沒有主要關鍵字且不是常駐，則不觸發
      if (primaryKeys.length === 0) return false;

      // ✨✨✨ 核心升級：實作完整的 selectiveLogic ✨✨✨
      const logic = entry.selectiveLogic || 0;
      let primaryMatch = false;

      // 主要關鍵字匹配
      const checkPrimaryKey = (k) => matchKeyword(scanText, k, caseSensitive, matchWholeWords);

      switch (logic) {
        case 0: // ANY (包含任一)
          primaryMatch = primaryKeys.some(checkPrimaryKey);
          break;
        case 1: // NOT ALL (未完全包含) - 至少有一個但不是全部
          primaryMatch = primaryKeys.some(checkPrimaryKey) && !primaryKeys.every(checkPrimaryKey);
          break;
        case 2: // NOT ANY (完全不含)
          primaryMatch = !primaryKeys.some(checkPrimaryKey);
          break;
        case 3: // ALL (包含全部)
          primaryMatch = primaryKeys.every(checkPrimaryKey);
          break;
        default:
          primaryMatch = primaryKeys.some(checkPrimaryKey);
      }

      // ✨✨✨ 新增：次要關鍵字邏輯 ✨✨✨
      // 如果有次要關鍵字，則主要和次要都必須通過
      if (primaryMatch && secondaryKeys.length > 0) {
        const checkSecondaryKey = (k) => matchKeyword(scanText, k, caseSensitive, matchWholeWords);
        // 次要關鍵字使用 AND 邏輯：必須包含全部次要關鍵字
        const secondaryMatch = secondaryKeys.every(checkSecondaryKey);
        return primaryMatch && secondaryMatch;
      }

      return primaryMatch;
    }

    // 如果不是 constant 也不是 selective，則預設進行關鍵字掃描
    // （這是 SillyTavern 的預設行為）
    const primaryKeys = entry.key || [];
    if (primaryKeys.length > 0) {
      const scanText = contextScanSources.chatHistory || '';
      const caseSensitive = entry.caseSensitive ?? false;
      const matchWholeWords = entry.matchWholeWords ?? false;
      return primaryKeys.some(k => matchKeyword(scanText, k, caseSensitive, matchWholeWords));
    }

    return false;
  });

  console.log(`階段一 (觸發)：有 ${triggeredEntries.length} 個條目被觸發`);

  // --- 階段二：過濾 (機率) ---
  const filteredByProbability = triggeredEntries.filter(entry => {
    if (entry.useProbability && entry.probability < 100) {
      return (Math.random() * 100) < (entry.probability || 100);
    }
    return true;
  });

  console.log(`階段二 (機率過濾)：剩下 ${filteredByProbability.length} 個條目`);

  // --- 階段三：群組競賽 ---
  // ✨✨✨ 新增：同一群組內只保留權重最高的條目 ✨✨✨
  const groupedEntries = new Map();
  const ungroupedEntries = [];

  filteredByProbability.forEach(entry => {
    if (entry.group && entry.group.trim() !== '') {
      const groupName = entry.group.trim();
      if (!groupedEntries.has(groupName)) {
        groupedEntries.set(groupName, []);
      }
      groupedEntries.get(groupName).push(entry);
    } else {
      ungroupedEntries.push(entry);
    }
  });

  // 從每個群組中選擇一個條目（基於權重的加權隨機）
  const selectedFromGroups = [];
  groupedEntries.forEach((entries, groupName) => {
    if (entries.length === 1) {
      selectedFromGroups.push(entries[0]);
    } else {
      // 加權隨機選擇
      const totalWeight = entries.reduce((sum, e) => sum + (e.groupWeight || 100), 0);
      let random = Math.random() * totalWeight;
      for (const entry of entries) {
        random -= (entry.groupWeight || 100);
        if (random <= 0) {
          selectedFromGroups.push(entry);
          break;
        }
      }
      // 備用：如果沒選到就選第一個
      if (random > 0 && entries.length > 0) {
        selectedFromGroups.push(entries[0]);
      }
    }
  });

  const afterGroupCompetition = [...ungroupedEntries, ...selectedFromGroups];
  console.log(`階段三 (群組競賽)：剩下 ${afterGroupCompetition.length} 個條目`);

  // --- 階段四：排序 ---
  const sortedEntries = afterGroupCompetition.sort((a, b) => (a.order || 100) - (b.order || 100));

  console.log("世界書處理完成，最終將插入的條目:", sortedEntries.map(e => e.comment || '無標題條目'));
  return sortedEntries;
};

// =================================================================================
// ✨✨✨ 最終版：sendToAI (v11) - 採用標準 System Prompt 結構 ✨✨✨
// =================================================================================
  const sendToAI = useCallback(async (userInput, currentMessages) => {
    try {
      // --- 步驟 1: API 檢查 (保持不變) ---
      const provider = apiProviders[apiProvider];
      if (!provider) throw new Error(`API provider "${apiProvider}" not found.`);
      const allKeys = apiKey.split('\n').map(k => k.trim()).filter(Boolean);
      if (allKeys.length === 0) throw new Error('尚未設定 API 金鑰。');
      const currentKey = allKeys[currentApiKeyIndex];
      if (!currentKey) throw new Error(`金鑰 #${currentApiKeyIndex + 1} 無效或不存在。`);
      
      console.log(`正在使用金鑰 #${currentApiKeyIndex + 1} 進行請求...`);

      // --- 步驟 2: 準備所有「文字原料」(與舊版類似) ---
      const activeMemory = longTermMemories[activeChatCharacterId]?.[activeChatId] || null;
      const activeAuthorsNote = chatMetadatas[activeChatCharacterId]?.[activeChatId]?.authorsNote || null;
      const userDescription = `[User Persona]\nName: ${currentUserProfile.name || 'Not Set'}\nDescription: ${currentUserProfile.description || 'Not Set'}`;
      
      const chatHistoryForScanning = currentMessages.slice(-20)
        .map(msg => msg.contents[msg.activeContentIndex]).join('\n');      
      
      // --- 世界書處理引擎 (邏輯不變) ---
      const mainBookId = currentCharacter.mainLorebookId;
      const auxiliaryBookIds = chatMetadatas[activeChatCharacterId]?.[activeChatId]?.auxiliaryBookIds || [];
      const allActiveBookIds = [...new Set([mainBookId, ...auxiliaryBookIds].filter(Boolean))];
      const activeBooks = worldBooks.filter(book => allActiveBookIds.includes(book.id));
      
      const contextScanSources = {
          chatHistory: chatHistoryForScanning,
          personaDescription: userDescription,
          characterDescription: currentCharacter.description || '',
          characterPersonality: currentCharacter.personality || '',
          scenario: currentCharacter.scenario || '',
          creatorNotes: currentCharacter.creatorNotes || ''
      };
      const triggeredEntries = processWorldBookEntries(activeBooks, contextScanSources);
      console.log(`【世界書引擎】: 觸發了 ${triggeredEntries.length} 條目`);
      
      // ✨ 輔助函數：處理世界資訊內容（移除隱藏文字 + 應用 regex）
      const processWorldInfoContent = (content) => {
        let processed = removeHiddenText(content);
        processed = applyRegexRules(processed, regexRules, currentCharacter?.embeddedRegex, 'system', 'chat', { isWorldInfo: true });
        return processed;
      };

      const worldInfoByPosition = {
        'before_char': triggeredEntries.filter(e => e.position === 0).map(e => processWorldInfoContent(e.content)).join('\n'),
        'after_char': triggeredEntries.filter(e => e.position === 1).map(e => processWorldInfoContent(e.content)).join('\n'),
        'before_example': triggeredEntries.filter(e => e.position === 5).map(e => processWorldInfoContent(e.content)).join('\n'),
        'after_example': triggeredEntries.filter(e => e.position === 6).map(e => processWorldInfoContent(e.content)).join('\n'),
        'before_an': triggeredEntries.filter(e => e.position === 2).map(e => processWorldInfoContent(e.content)).join('\n'),
        'after_an': triggeredEntries.filter(e => e.position === 3).map(e => processWorldInfoContent(e.content)).join('\n'),
      };

      // ✨ 處理深度模式 (at_depth, position=4) 的條目
      const atDepthEntries = triggeredEntries.filter(e => e.position === 4);
      
      // --- 步驟 3: 【核心修改】建立符合 SillyTavern 邏輯的單一 System Prompt ---
      const chatHistoryForPrompt = currentMessages
        .map(msg => `${msg.sender === 'user' ? (currentUserProfile.name || 'User') : currentCharacter.name}: ${msg.contents[msg.activeContentIndex]}`)
        .join('\n');

      const placeholderMap = {
        '{{char}}': currentCharacter.name || 'Character',
        '{{user}}': currentUserProfile.name || 'User',
        '{{persona}}': userDescription,
        '{{description}}': [worldInfoByPosition.before_char, currentCharacter.description, worldInfoByPosition.after_char].filter(Boolean).join('\n'),
        '{{personality}}': currentCharacter.personality || '',
        '{{scenario}}': currentCharacter.scenario || '',
        '{{example_dialogue}}': [worldInfoByPosition.before_example, currentCharacter.mes_example, worldInfoByPosition.after_example].filter(Boolean).join('\n'),
        '{{chat_history}}': chatHistoryForPrompt, // ✨ 聊天記錄現在會被直接插入
        '{{memory}}': activeMemory || '',
        '{{authors_note}}': [worldInfoByPosition.before_an, activeAuthorsNote, worldInfoByPosition.after_an].filter(Boolean).join('\n'),
        '{{post_history_instructions}}': currentCharacter.post_history_instructions || '',
      };

      let finalSystemPrompt = '';
      // ✨ 我們現在遍歷所有啟用的模組，不再過濾 chat_history
      const enabledModules = currentPrompt?.modules?.filter(m => m.enabled) || [];

      for (const module of enabledModules) {
        let moduleContent = module.content || '';
        for (const [placeholder, value] of Object.entries(placeholderMap)) {
          const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
          moduleContent = moduleContent.replace(regex, value || '');
        }
        moduleContent = removeHiddenText(moduleContent);
        if (moduleContent.trim()) {
          finalSystemPrompt += moduleContent + '\n';
        }
      }
      finalSystemPrompt = finalSystemPrompt.trim();

      // ✨ 應用 promptOnly 的 Regex 規則到系統提示詞
      finalSystemPrompt = applyRegexRules(finalSystemPrompt, regexRules, currentCharacter?.embeddedRegex, 'system', 'chat', { isPrompt: true });

      // --- 步驟 4: 準備獨立的、乾淨的聊天記錄 ---
      let chatHistoryForApi = currentMessages.map(msg => {
          // 將我們的 sender 轉換為 API 需要的 role
          const role = msg.sender === 'user' ? 'user' : 'assistant'; // Gemini/Claude 使用 'assistant'
          const content = msg.contents[msg.activeContentIndex];
          return { role, content };
      });

      // ✨ 處理深度模式：將 at_depth 條目插入到聊天歷史的指定深度
      if (atDepthEntries.length > 0) {
        // 按深度分組
        const entriesByDepth = {};
        atDepthEntries.forEach(entry => {
          const depth = entry.depth || 4;
          if (!entriesByDepth[depth]) entriesByDepth[depth] = [];
          entriesByDepth[depth].push(entry);
        });

        // 從最大深度開始插入（避免索引錯位）
        const depths = Object.keys(entriesByDepth).map(Number).sort((a, b) => b - a);
        depths.forEach(depth => {
          const entries = entriesByDepth[depth];
          const combinedContent = entries.map(e => removeHiddenText(e.content)).join('\n');

          // 計算插入位置（從聊天歷史末尾往前數）
          const insertIndex = Math.max(0, chatHistoryForApi.length - depth);

          // 決定插入的角色（預設為 system，但某些 API 不支援）
          const insertRole = entries[0]?.role === 1 ? 'assistant' : 'user';

          // 插入深度內容
          chatHistoryForApi.splice(insertIndex, 0, {
            role: insertRole,
            content: `[World Info]\n${combinedContent}`
          });
        });

        console.log(`【深度模式】: 已將 ${atDepthEntries.length} 個條目插入到聊天歷史中`);
      }

      // --- 步驟 5: 根據不同 API 供應商，組合最終的請求 Body ---
      let requestBody;
      let endpoint = provider.endpoint;
      const headers = provider.headers(currentKey);
      const maxOutputTokens = currentPrompt?.maxTokens || 4000;
      const temperature = currentPrompt?.temperature || 1.0;

      if (provider.isGemini) {
        // Gemini 的新格式支援 system_instruction
        endpoint = `${provider.endpoint}${apiModel}:generateContent?key=${currentKey}`;
        requestBody = {
          system_instruction: { parts: [{ text: finalSystemPrompt }] },
          contents: chatHistoryForApi.map(turn => ({
              role: turn.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: turn.content }]
          })),
          generationConfig: {
            temperature, maxOutputTokens,
            topP: currentPrompt?.top_p ?? 0.95, topK: currentPrompt?.top_k ?? 15,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        };
      } else if (apiProvider === 'claude') {
        // Claude V1 API 的標準格式
        requestBody = {
          model: apiModel,
          system: finalSystemPrompt, // ✨ 使用專用的 system 欄位
          messages: chatHistoryForApi,
          max_tokens: maxOutputTokens,
          temperature,
        };
      } else {
        // OpenAI 和其他相容 API 的標準格式
        requestBody = {
          model: apiModel,
          messages: [
            { role: 'system', content: finalSystemPrompt }, // ✨ 將劇本放入 system 角色
            ...chatHistoryForApi // ✨ 展開乾淨的聊天記錄
          ],
          max_tokens: maxOutputTokens,
          temperature,
        };
      }

      console.log("【最終版 System Prompt 請求 Body】:", JSON.stringify(requestBody, null, 2));

      // --- 步驟 6: 發送請求與處理回應 (保持不變) ---
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(requestBody) });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 請求失敗 (${response.status})：${errorText}`);
      }
      const data = await response.json();
      let aiText = null;
      if (provider.isGemini) aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      else if (apiProvider === 'claude') aiText = data.content?.[0]?.text;
      else aiText = data.choices?.[0]?.message?.content;
      
      if (data.promptFeedback && data.promptFeedback.blockReason) {
        throw new Error(`請求被 Gemini 安全系統攔截，原因：${data.promptFeedback.blockReason}`);
      }
      
      if (aiText && aiText.trim() !== '') {
        return aiText;
      } else {
        throw new Error('AI 回應為空或格式不正確');
      }

    } catch (error) {
      console.error(`sendToAI 函式發生錯誤:`, error);
      throw error;
    }
  }, [
      apiKey, apiProvider, apiModel, currentCharacter, currentPrompt, apiProviders,
      currentUserProfile, longTermMemories, activeChatCharacterId, activeChatId,
      chatMetadatas, currentApiKeyIndex, worldBooks, regexRules
  ]);
  
  //*記憶摘要 (已修正 400 錯誤與優化 Prompt)
  const triggerMemoryUpdate = useCallback(async (isSilent = false) => {
      if (!activeChatCharacterId || !activeChatId) {
        if (!isSilent) alert('請先選擇一個對話。');
        return null;
      }
      const history = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
      if (history.length < 4) {
        if (!isSilent) alert('對話長度不足，無法生成有意義的記憶摘要。');
        return null;
      }

      try {
        // 1. 準備對話文本
        const conversationText = history.map(m => `${m.sender === 'user' ? (currentUserProfile?.name || 'User') : currentCharacter.name}: ${m.contents[m.activeContentIndex]}`).join('\n');
        
        // 2. 使用優化過的英文 Prompt (這就是我們剛剛討論的內容)
        const summaryPrompt = `Ignore previous instructions. You are an objective narrator. Summarize the most important facts and events in the story so far based on the provided text. Write in third person. Do not use any bold formatting (**text**). Limit the summary to 200 words or less. Your response should include nothing but the summary.\n\nStory Context:\n${conversationText}`;

        // 3. ✨【關鍵修正】✨
        // 我們不能傳空陣列 [] 給 sendToAI，因為那會導致 Google API 收到空的 contents 而報錯 400。
        // 我們必須假裝這是一個使用者傳送的訊息：
        const payloadMessage = {
            sender: 'user',
            contents: [summaryPrompt],
            activeContentIndex: 0
        };

        // 4. 發送請求 (第一個參數是為了觸發世界書掃描，第二參數才是真正送給 API 的內容)
        const summary = await sendToAI(summaryPrompt, [payloadMessage]);

        // 5. 更新狀態
        setLongTermMemories(prev => {
          const newMemories = JSON.parse(JSON.stringify(prev));
          if (!newMemories[activeChatCharacterId]) {
            newMemories[activeChatCharacterId] = {};
          }
          newMemories[activeChatCharacterId][activeChatId] = summary;
          return newMemories;
        });
        
        return summary;
      } catch (error) {
        console.error("記憶更新失敗: - App.js:4396", error);
        if (!isSilent) alert(`記憶更新失敗: ${error.message}`);
        return null;
      }
  }, [activeChatCharacterId, activeChatId, chatHistories, sendToAI, currentUserProfile, currentCharacter]);

  // ✨ 2. 新增一個專門用來儲存「作者備註」的函式 ✨
  const handleSaveAuthorsNote = useCallback((newNote) => {
    if (!activeChatCharacterId || !activeChatId) return;
    
    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      // 確保物件路徑存在
      if (!newMetas[activeChatCharacterId]) newMetas[activeChatCharacterId] = {};
      if (!newMetas[activeChatCharacterId][activeChatId]) newMetas[activeChatCharacterId][activeChatId] = { pinned: false };
      
      // 只更新 authorsNote 欄位
      newMetas[activeChatCharacterId][activeChatId].authorsNote = newNote;
      return newMetas;
    });

    setIsAuthorsNoteModalOpen(false); // 關閉編輯視窗
    alert('✅ 作者備註已儲存！');
  }, [activeChatCharacterId, activeChatId]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !activeChatCharacterId || !activeChatId) return;

    const originalInput = inputMessage; 
    const currentHistoryArray = chatHistories[activeChatCharacterId]?.[activeChatId] || [];

    const processedInput = applyPlaceholders(originalInput, currentCharacter, currentUserProfile);

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      contents: [processedInput],
      activeContentIndex: 0,
      timestamp: getFormattedTimestamp(),
    };
    
    const historyWithUserMessage = [...currentHistoryArray, userMessage];

    setChatHistories(prev => ({
      ...prev,
      [activeChatCharacterId]: {
        ...prev[activeChatCharacterId],
        [activeChatId]: historyWithUserMessage
      }
    }));

    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await sendToAI(userMessage.contents[0], historyWithUserMessage);

      // ▼▼▼ ✨ 核心修改就在這裡 ✨ ▼▼▼
      const { cleanedText, thought } = filterCoT(aiResponse);

      // 如果提取到了思考過程，就在主控台印出來
      if (thought) {
        console.log("【AI 思考過程 (CoT)】: - App.js:4458", thought);
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        contents: [cleanedText],
        activeContentIndex: 0,
        timestamp: getFormattedTimestamp(),
        thought: thought, // ✨✨✨ 核心修改：將思考過程存進訊息物件！
      };

      const finalHistoryArray = [...historyWithUserMessage, aiMessage];
      
      setChatHistories(prev => ({
        ...prev,
        [activeChatCharacterId]: {
          ...prev[activeChatCharacterId],
          [activeChatId]: finalHistoryArray
        }
      }));
      
      if (finalHistoryArray.length > 0 && finalHistoryArray.length % MEMORY_UPDATE_INTERVAL === 0) {
        console.log(`對話達到 ${finalHistoryArray.length} 則，正在背景自動更新長期記憶... - App.js:4481`);
        await triggerMemoryUpdate(true); 
        console.log("背景記憶更新完成！ - App.js:4483");
      }
    } catch (error) {
      console.error("訊息發送失敗: - App.js:4486", error);
      alert(`訊息發送失敗：\n\n${error.message}`);

      setChatHistories(prev => ({
        ...prev,
        [activeChatCharacterId]: {
          ...prev[activeChatCharacterId],
          [activeChatId]: currentHistoryArray
        }
      }));

      setInputMessage(originalInput);

      const allKeys = apiKey.split('\n').map(k => k.trim()).filter(Boolean);
      if (allKeys.length > 1) {
        setCurrentApiKeyIndex(prevIndex => {
          const newIndex = (prevIndex + 1) % allKeys.length;
          console.log(`API 金鑰失敗，已準備切換至下一把金鑰 (索引 ${newIndex}) - App.js:4503`);
          return newIndex;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, activeChatCharacterId, activeChatId, chatHistories, sendToAI, triggerMemoryUpdate, getFormattedTimestamp, currentCharacter, currentUserProfile, apiKey]);

  const continueGeneration = useCallback(async () => {
    if (!activeChatCharacterId || !activeChatId) return;
    
    const currentHistory = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    if (currentHistory.length === 0) return;

    setIsLoading(true);

    try {
      const aiResponse = await sendToAI(null, currentHistory);
      
      // ▼▼▼ ✨ 核心修改就在這裡 ✨ ▼▼▼
      const { cleanedText, thought } = filterCoT(aiResponse);

      if (thought) {
        console.log("【AI 思考過程 (CoT)】: - App.js:4527", thought);
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        contents: [cleanedText],
        activeContentIndex: 0,
        timestamp: getFormattedTimestamp(),
        thought: thought, // ✨✨✨ 核心修改：將思考過程存進訊息物件！
      };

      const finalHistory = [...currentHistory, aiMessage];
      
      // 核心修正：先建立完整的、新的 histories 物件
      const newHistories = {
          ...chatHistories,
          [activeChatCharacterId]: {
              ...(chatHistories[activeChatCharacterId] || {}),
              [activeChatId]: finalHistory
          }
      };

      // 再用這個新物件去同步更新畫面和資料庫
      setChatHistories(newHistories);
      await db.kvStore.put({ key: 'chatHistories', value: newHistories });
      
      if (finalHistory.length > 0 && finalHistory.length % MEMORY_UPDATE_INTERVAL === 0) {
        await triggerMemoryUpdate(true); 
      }
    } catch (error) {
    console.error("續寫失敗: - App.js:4558", error);
    // 直接彈出警告視窗，不新增系統訊息
    alert(`續寫失敗：\n\n${error.message}`);

    } finally {
      setIsLoading(false);
    }
}, [activeChatCharacterId, activeChatId, chatHistories, sendToAI, triggerMemoryUpdate, getFormattedTimestamp]);

  const handleRegenerate = useCallback(async () => {
    if (!activeChatId || !activeChatCharacterId) return;

    const currentHistory = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    if (currentHistory.length === 0 || currentHistory[currentHistory.length - 1].sender !== 'ai') {
      return;
    }

    let lastUserMessageIndex = -1;
    for (let i = currentHistory.length - 2; i >= 0; i--) {
      if (currentHistory[i].sender === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }
    if (lastUserMessageIndex === -1) return;

    const contextForRegeneration = currentHistory.slice(0, lastUserMessageIndex + 1);
    const triggerUserMessage = contextForRegeneration[contextForRegeneration.length - 1];
    
    setIsLoading(true);

    try {
      const aiResponse = await sendToAI(triggerUserMessage.contents[0], contextForRegeneration);

      // ▼▼▼ ✨ 核心修改就在這裡 ✨ ▼▼▼
      const { cleanedText, thought } = filterCoT(aiResponse);

      if (thought) {
        console.log("【AI 思考過程 (CoT)】: - App.js:4596", thought);
      }

      if (typeof aiResponse !== 'undefined') { // 這裡還是用 aiResponse 判斷，因為 cleanedText 可能是空的
        const newHistoryArray = JSON.parse(JSON.stringify(currentHistory));
        const messageToUpdate = newHistoryArray[newHistoryArray.length - 1];
        messageToUpdate.contents.push(cleanedText);
        messageToUpdate.activeContentIndex = messageToUpdate.contents.length - 1;
        messageToUpdate.thought = thought; // ✨✨✨ 核心修改：重新生成時，也要更新思考過程！
        
        // 建立要儲存的完整物件
        const newHistories = {
            ...chatHistories,
            [activeChatCharacterId]: {
                ...(chatHistories[activeChatCharacterId] || {}),
                [activeChatId]: newHistoryArray
            }
        };
        // 同步更新畫面和資料庫
        setChatHistories(newHistories);
        await db.kvStore.put({ key: 'chatHistories', value: newHistories });
      }
    } catch (error) {
      alert(`重新生成失敗: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeChatId, activeChatCharacterId, chatHistories, sendToAI]);

  const handleChangeVersion = useCallback((messageId, direction) => {
    setChatHistories(prev => {
        const newHistories = JSON.parse(JSON.stringify(prev));
        const historyToUpdate = newHistories[activeChatCharacterId]?.[activeChatId];
        if (!historyToUpdate) return prev;

        const messageToUpdate = historyToUpdate.find(msg => msg.id === messageId);
        if (!messageToUpdate) return prev;

        const maxIndex = messageToUpdate.contents.length - 1;
        let newIndex = messageToUpdate.activeContentIndex;

        if (direction === 'next' && newIndex < maxIndex) {
            newIndex++;
        } else if (direction === 'prev' && newIndex > 0) {
            newIndex--;
        }

        messageToUpdate.activeContentIndex = newIndex;
        return newHistories;
    });
  }, [activeChatCharacterId, activeChatId]);

  const handleUpdateMessage = useCallback((chatId, messageId, newText) => {
    setChatHistories(prevHistories => {
      const newHistories = JSON.parse(JSON.stringify(prevHistories));
      const charId = Object.keys(newHistories).find(cId => newHistories[cId][chatId]);
      if (!charId) return prevHistories;

      const chatHistory = newHistories[charId][chatId];
      const messageToUpdate = chatHistory.find(msg => msg.id === messageId);
      
      if (messageToUpdate) {
        messageToUpdate.contents[messageToUpdate.activeContentIndex] = newText;
      }
      
      return newHistories;
    });
    setEditingMessage(null);
  }, []);

// ================== ✨ 請把下面這整段全新的函式，貼在這裡 ✨ ==================
  const handleDeleteMessage = useCallback((messageId) => {
    if (!activeChatCharacterId || !activeChatId) return;

    if (window.confirm('確定要永久刪除這則訊息嗎？\n\n再想一下喔')) {
      setChatHistories(prev => {
        const newHistories = JSON.parse(JSON.stringify(prev));
        const currentHistory = newHistories[activeChatCharacterId][activeChatId];
        
        // 使用 .filter() 產生一個不包含被刪除訊息的新陣列
        const updatedHistory = currentHistory.filter(msg => msg.id !== messageId);
        
        newHistories[activeChatCharacterId][activeChatId] = updatedHistory;
        return newHistories;
      });
    }
  }, [activeChatCharacterId, activeChatId]);
// ======================================================================  

  const handleUpdateMemory = useCallback(async () => {
      setIsLoading(true);
      const summary = await triggerMemoryUpdate(false);
      if (summary) {
        alert('長期記憶已由 AI 自動更新！');
      }
      setIsLoading(false);
  }, [triggerMemoryUpdate]);  

// ==================== 全新！手動儲存長期記憶的函式 ====================
  const handleSaveMemory = useCallback((newMemoryText) => {
    if (!activeChatCharacterId || !activeChatId) return;

    setLongTermMemories(prev => {
      const newMemories = JSON.parse(JSON.stringify(prev));
      if (!newMemories[activeChatCharacterId]) {
        newMemories[activeChatCharacterId] = {};
      }
      newMemories[activeChatCharacterId][activeChatId] = newMemoryText;
      return newMemories;
    });

    setIsMemoryModalOpen(false); // 儲存後自動關閉 Modal
    alert('長期記憶已儲存！');
  }, [activeChatCharacterId, activeChatId]);

// ==================== 全新！開啟聊天備註編輯器的函式 ====================
  const handleOpenMetadataEditor = useCallback((charId, chatId) => {
    // 步驟 1: 先從 chatMetadatas 中，根據 ID 找出完整的元數據物件
    const fullMetadata = chatMetadatas[charId]?.[chatId] || {}; // 使用 || {} 避免 undefined

    // 步驟 2: 將 ID 和完整的元數據合併後，再設定給 state
    setEditingMetadata({
      charId,
      chatId,
      ...fullMetadata // 這會把 .notes, .pinned 等所有已存在的屬性都放進來
    });
  }, [chatMetadatas]); // ✨ 非常重要：要把 chatMetadatas 加入依賴項！

  // ✨ 2. 新增儲存聊天備註的函式 ✨
  // ✨ 函式改名並升級，現在可以儲存所有 metadata
  const handleSaveChatMetadata = useCallback((updatedMetadata) => {
    if (!editingMetadata) return;
    const { charId, chatId } = editingMetadata;
    
    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      if (!newMetas[charId]) newMetas[charId] = {};
      if (!newMetas[charId][chatId]) newMetas[charId][chatId] = { pinned: false };
      
      // ✨ 核心修改：將傳入的新資料與舊資料合併
      newMetas[charId][chatId] = { ...newMetas[charId][chatId], ...updatedMetadata };
      
      return newMetas;
    });

    setEditingMetadata(null); // 關閉編輯視窗
    alert('✅ 聊天室資訊已更新！');
  }, [editingMetadata]);

  // ✨ 3. 全新！處理聊天中切換使用者身份的核心函式 (放到正確的位置) ✨
  const handleSwitchUserProfile = useCallback((newProfileId) => {
    if (!activeChatCharacterId || !activeChatId || !newProfileId) return;

    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      // 確保物件路徑存在
      if (!newMetas[activeChatCharacterId]) newMetas[activeChatCharacterId] = {};
      if (!newMetas[activeChatCharacterId][activeChatId]) {
        newMetas[activeChatCharacterId][activeChatId] = { pinned: false, name: '', notes: '' };
      }
      
      // ✨ 核心：更新這個聊天室綁定的 userProfileId
      newMetas[activeChatCharacterId][activeChatId].userProfileId = newProfileId;
      return newMetas;
    });

    // 選擇後自動關閉 Modal
    setIsProfileSwitcherOpen(false);
  }, [activeChatCharacterId, activeChatId]);  

  const handleTogglePinChat = useCallback((charId, chatId) => {
    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      const meta = newMetas[charId]?.[chatId];
      if (meta) {
        meta.pinned = !meta.pinned;
      }
      return newMetas;
    });
  }, []);

  const handleDeleteChat = useCallback((charId, chatIdToDelete) => {
    if (window.confirm('確定要永久刪除這段對話紀錄嗎？\n\n此操作無法復原！')) {
      
      setChatHistories(prev => {
        const newHistories = JSON.parse(JSON.stringify(prev));
        if (newHistories[charId]) {
          delete newHistories[charId][chatIdToDelete];
        }
        return newHistories;
      });

      setChatMetadatas(prev => {
        const newMetadatas = JSON.parse(JSON.stringify(prev));
        if (newMetadatas[charId]) {
          delete newMetadatas[charId][chatIdToDelete];
        }
        return newMetadatas;
      });
      
      setLongTermMemories(prev => {
        const newMemories = JSON.parse(JSON.stringify(prev));
        if (newMemories[charId]) {
          delete newMemories[charId][chatIdToDelete];
        }
        return newMemories;
      });
      
      if (activeChatId === chatIdToDelete) {
          setActiveChatCharacterId(null);
          setActiveChatId(null);
          setCurrentCharacter(null);
      }
    }
  }, [activeChatId]); // ✨ 核心修改：移除了 branchSelectorState.isOpen

  // ==================== 全新！SillyTavern 時間格式化輔助函式 ====================
const formatStDate = (date, type = 'send_date') => {
  const d = new Date(date);
  if (isNaN(d.getTime())) { // 如果傳入的日期無效，返回一個預設值
      return type === 'create_date' ? '2025-01-01@00h00m00s' : 'January 1, 2025 12:00am';
  }

  if (type === 'create_date') {
    // 格式化成 "2025-08-16@16h11m21s"
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}@${hours}h${minutes}m${seconds}s`;
  } else { // 預設是 'send_date'
    // 格式化成 "August 21, 2025 12:33am"
    return d.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(' at', ''); // en-US 地區可能會多一個 " at"，我們把它去掉
  }
};

  // ==================== 全新！匯出聊天紀錄到 SillyTavern 格式的函式 ====================
  const exportChatToSillyTavernFormat = useCallback(() => {
    // 步驟 1: 檢查是否有聊天紀錄可以匯出
    const currentMessages = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    if (currentMessages.length === 0) {
        alert('📝 目前沒有聊天紀錄可以匯出');
        return;
    }

    // 步驟 2: 準備「封面資訊頁」(第一行)
    const header = {
      user_name: currentUserProfile?.name || "User",
      character_name: currentCharacter.name || "Character",
      create_date: formatStDate(new Date(), 'create_date'), // 使用標準時間格式
      // 其他 SillyTavern 可能需要的元數據可以留空或使用預設值
      chat_metadata: {}, 
    };

    // 步驟 3: 開始組合 .jsonl 檔案的內容
    // 我們先放入封面，並加上一個換行符號
    let fileContent = JSON.stringify(header) + '\n';

    // 步驟 4: 遍歷每一句對話，並把它們「翻譯」成 SillyTavern 格式
    for (const message of currentMessages) {
      // 系統訊息 (例如錯誤訊息) 通常不需要匯出，我們跳過它
      if (message.sender === 'system') continue;

      const isUser = message.sender === 'user';

      // ✨ 處理我們的時間格式，確保它能被 new Date() 正確解析 ✨
      const messageDate = new Date(message.timestamp.replace(/\//g, '-'));
      
      const sillyTavernMessage = {
        name: isUser ? (currentUserProfile?.name || "User") : (currentCharacter.name || "Character"),
        is_user: isUser,
        is_system: false,
        send_date: formatStDate(new Date(message.timestamp.replace(/\//g, '-')), 'send_date'), // 直接使用我們自己的時間戳
        mes: message.contents[message.activeContentIndex], // 當前選擇的訊息版本
        swipes: message.contents, // 所有的訊息版本
        swipe_info: [], // 這個欄位我們先留空
        extra: {}, // 同上
      };
      
      // 將翻譯好的訊息物件轉換成文字，並在後面加上換行符號
      fileContent += JSON.stringify(sillyTavernMessage) + '\n';
    }

    // 步驟 5: 產生可以下載的檔案
    const charName = currentCharacter.name || 'Chat';
    const blob = new Blob([fileContent], { type: 'application/jsonl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // 檔名會像這樣：ST_Export_測試角色_2025-08-22.jsonl
    link.download = `ST_Export_${charName}_${new Date().toISOString().split('T')[0]}.jsonl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`✅ 聊天紀錄已準備匯出！包含 ${currentMessages.length} 則對話`);
    
  }, [chatHistories, activeChatCharacterId, activeChatId, currentUserProfile, currentCharacter]);

  // ==================== 全新！從 SillyTavern 格式匯入聊天紀錄的函式 ====================
    const handleImportFromSillyTavern = useCallback((event) => {
      const file = event.target.files[0];
      if (!file || !activeChatCharacterId || !activeChatId) {
        if (!activeChatCharacterId || !activeChatId) {
          alert('請先選擇一個聊天室，才能匯入紀錄！');
        }
        if (event.target) event.target.value = '';
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split('\n').filter(line => line.trim() !== '');

          // ✨ 步驟 1: 建立一個【暫時】的陣列，用來存放所有新訊息
          const importedMessages = [];

          for (let i = 1; i < lines.length; i++) {
            const lineData = JSON.parse(lines[i]);
            if (typeof lineData.is_user === 'undefined' || !lineData.mes) continue;

            const ourMessage = {
              id: generateUniqueId(), // ✨ 為每一條訊息產生一個保證唯一的 ID
              sender: lineData.is_user ? 'user' : 'ai',
              contents: lineData.swipes || [lineData.mes],
              activeContentIndex: (lineData.swipes || [lineData.mes]).indexOf(lineData.mes),
              timestamp: getFormattedTimestamp(),
            };
            if (ourMessage.activeContentIndex === -1) ourMessage.activeContentIndex = 0;
            
            // ✨ 步驟 2: 將處理好的新訊息，放進我們的暫存陣列
            importedMessages.push(ourMessage);
          }

          if (importedMessages.length > 0) {
            const shouldAppend = window.confirm(`✅ 成功解析到 ${importedMessages.length} 則對話。\n\n請問您要如何處理？\n\n- 按下「確定」= 將這些訊息【附加】到目前對話的後面。\n- 按下「取消」= 用這些訊息【覆蓋】掉目前的對話。`);
            
            // ✨ 步驟 3: 在所有資料都處理完畢後，只執行【一次】狀態更新
            setChatHistories(prev => {
              const newHistories = JSON.parse(JSON.stringify(prev)); // 深度複製以避免副作用
              const currentChat = newHistories[activeChatCharacterId]?.[activeChatId] || [];
              
              newHistories[activeChatCharacterId][activeChatId] = shouldAppend 
                ? [...currentChat, ...importedMessages] 
                : importedMessages; // 使用我們一次性處理好的 importedMessages 陣列
                
              return newHistories;
            });

            alert(`✅ 操作完成！已成功${shouldAppend ? '附加' : '覆蓋'} ${importedMessages.length} 則對話！`);
          } else {
            alert('❌ 檔案中沒有找到可以匯入的對話內容。');
          }

        } catch (error) {
          alert('❌ 匯入失敗，檔案格式可能不正確。\n錯誤訊息：' + error.message);
        } finally {
          if (event.target) event.target.value = '';
        }
      };

      reader.readAsText(file);
    }, [activeChatCharacterId, activeChatId, getFormattedTimestamp]);

  // 🔥🔥🔥 核心修正點 #1 🔥🔥🔥
  const exportChatHistory = useCallback(() => {
    const currentMessages = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    if (currentMessages.length === 0) {
        alert('📝 目前沒有聊天紀錄可以匯出');
        return;
    }

    const currentChar = currentCharacter ? currentCharacter.name : '未指定角色';
    const currentPromptName = currentPrompt ? currentPrompt.name : '預設提示詞';
    
    let content = `=== CHAT_EXPORT_V1 ===\n`;
    content += `匯出時間: ${new Date().toLocaleString('zh-TW')}\n`;
    content += `角色: ${currentChar}\n`;
    content += `提示詞: ${currentPromptName}\n`;
    content += `對話數量: ${currentMessages.length} 則\n`;
    content += `===============================\n\n`;
    content += `📱 ${currentUserProfile?.name || '用戶'} 與 ${currentChar} 的對話\n`;
    content += `時間：${new Date().toLocaleDateString('zh-TW')}\n\n`;
    
    currentMessages.forEach(message => {
        const time = message.timestamp || new Date().toLocaleTimeString('zh-TW', { hour12: false });
        const sender = message.sender === 'user' ? (currentUserProfile?.name || '用戶') : currentChar;
        // 使用當前活動的內容進行匯出
        const text = message.contents[message.activeContentIndex];
        content += `[${time}] ${sender}: ${text}\n`;
    });
    
    content += `\n===============================\n`;
    content += `總計 ${currentMessages.length} 則對話\n`;
    content += `匯出自：GENIU5 App\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `聊天紀錄_${currentChar}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert(`✅ 聊天紀錄已匯出！包含 ${currentMessages.length} 則對話`);
  }, [currentCharacter, currentPrompt, currentUserProfile, chatHistories, activeChatCharacterId, activeChatId]);

  // 🔥🔥🔥 核心修正點 #2 🔥🔥🔥
  const handleImportChat = useCallback((event) => {
    const file = event.target.files[0];
    if (!file || !activeChatCharacterId || !activeChatId) {
      if (!activeChatCharacterId || !activeChatId) {
        alert('請先選擇一個聊天室，才能匯入紀錄！');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        if (!content.includes('=== CHAT_EXPORT_V1 ===')) {
          alert('❌ 不支援的檔案格式，請使用本應用匯出的 TXT 檔案');
          return;
        }
        
        const lines = content.split('\n');
        // ✨ 步驟 1: 建立一個【暫時】的陣列
        const importedMessages = [];
        
        lines.forEach(line => {
          const messageMatch = line.match(/\[(.*?)\] (.*?): (.*)/);
          if (messageMatch) {
            const [, timestamp, sender, text] = messageMatch;
            // ✨ 步驟 2: 將處理好的訊息放進暫存陣列
            importedMessages.push({
              id: generateUniqueId(), // ✨ 使用唯一的 ID 生成器
              timestamp: timestamp || getFormattedTimestamp(),
              sender: sender === (currentUserProfile?.name || '用戶') ? 'user' : 'ai',
              contents: [text],
              activeContentIndex: 0
            });
          }
        });
        
        if (importedMessages.length > 0) {
          const shouldAppend = window.confirm(`找到 ${importedMessages.length} 則對話記錄。\n\n點擊「確定」= 添加到現有對話\n點擊「取消」= 替換所有對話`);
          
          // ✨ 步驟 3: 只執行【一次】狀態更新
          setChatHistories(prev => {
            const newHistories = JSON.parse(JSON.stringify(prev));
            const currentChat = newHistories[activeChatCharacterId]?.[activeChatId] || [];
            
            newHistories[activeChatCharacterId][activeChatId] = shouldAppend 
              ? [...currentChat, ...importedMessages] 
              : importedMessages;
              
            return newHistories;
          });
          alert(`✅ 成功${shouldAppend ? '添加' : '匯入'} ${importedMessages.length} 則對話！`);
        } else {
          alert('❌ 檔案格式正確但沒有找到對話內容');
        }
      } catch (error) {
        alert('❌ 匯入失敗：' + error.message);
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }, [currentUserProfile, activeChatCharacterId, activeChatId, getFormattedTimestamp]);

      
// ==================== 全新！可回傳資料的全站資料匯出函式 ====================
const handleExportAllData = useCallback(async (isForCloud = false) => {
    if (!isForCloud && !window.confirm('您確定要匯出所有應用程式資料嗎？\n\n這將會產生一個包含您所有角色、對話和設定的 JSON 檔案。')) {
        return null; // 如果是手動匯出且使用者取消，回傳 null
    }

    try {
        console.log("正在準備匯出所有資料... - App.js:5096");
        const dataToExport = await db.transaction('r', db.characters, db.prompts, db.apiConfigs, db.kvStore, async () => {
            const characters = await db.characters.toArray();
            const prompts = await db.prompts.toArray();
            const apiConfigs = await db.apiConfigs.toArray();
            const chatHistories = (await db.kvStore.get('chatHistories'))?.value || {};
            const chatMetadatas = (await db.kvStore.get('chatMetadatas'))?.value || {};
            const longTermMemories = (await db.kvStore.get('longTermMemories'))?.value || {};
            const userProfiles = (await db.kvStore.get('userProfiles'))?.value || [];
            const oocCommands = (await db.kvStore.get('oocCommands'))?.value || [];
            const regexRules = (await db.kvStore.get('regexRules'))?.value || [];
            const worldBooks = (await db.kvStore.get('worldBooks'))?.value || [];
            
            return { characters, prompts, apiConfigs, chatHistories, chatMetadatas, longTermMemories, userProfiles, oocCommands, regexRules, worldBooks };
        });

        const backupData = {
            version: 'geniu5-backup-v1',
            timestamp: new Date().toISOString(),
            data: dataToExport
        };
        
        const jsonString = JSON.stringify(backupData, null, 2);

        if (isForCloud) {
            return jsonString; // ✨ 如果是為了雲端同步，直接回傳字串
        }

        // 如果是手動下載
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `geniu5_backup_${timestamp}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('✅ 所有資料已成功匯出！');
        return null; // 手動下載完成後回傳 null

    } catch (error) {
        console.error("全站資料匯出失敗: - App.js:5139", error);
        alert(`❌ 匯出失敗：${error.message}`);
        return null; // 發生錯誤時回傳 null
    }
}, []); // 依賴項為空，因為所有資料都從 DB 讀取

  // ==================== 全新！能接收資料物件的全站資料匯入函式 ====================
const handleImportAllData = useCallback(async (dataSource) => {
    const processData = async (data) => {
        if (!data) throw new Error("無效的資料來源。");

        if (data.version !== 'geniu5-backup-v1' || !data.data) {
            throw new Error('檔案格式不正確或不受支援。');
        }
        
        await db.transaction('rw', db.characters, db.prompts, db.kvStore, async () => {
            await db.characters.clear();
            await db.prompts.clear();
            await db.kvStore.clear();

            await db.characters.bulkPut(data.data.characters || []);
            await db.prompts.bulkPut(data.data.prompts || []);
            await db.kvStore.put({ key: 'chatHistories', value: data.data.chatHistories || {} });
            await db.kvStore.put({ key: 'chatMetadatas', value: data.data.chatMetadatas || {} });
            await db.kvStore.put({ key: 'longTermMemories', value: data.data.longTermMemories || {} });
            await db.kvStore.put({ key: 'userProfiles', value: data.data.userProfiles || [] });
            await db.kvStore.put({ key: 'oocCommands', value: data.data.oocCommands || [] });
            await db.kvStore.put({ key: 'regexRules', value: data.data.regexRules || [] });
            await db.kvStore.put({ key: 'worldBooks', value: data.data.worldBooks || [] });
        });

        alert('✅ 資料已成功匯入！應用程式即將重新載入...');
        setTimeout(() => window.location.reload(), 500);
    };
    
    try {
        if (dataSource?.target?.files?.[0]) { // 判斷是否為檔案上傳事件
            if (!window.confirm('🚨 警告！此操作將會【完全覆蓋】您目前所有的資料！確定要繼續嗎？')) {
                dataSource.target.value = '';
                return;
            }
            const file = dataSource.target.files[0];
            const content = await file.text();
            const backupData = JSON.parse(content);
            await processData(backupData);
        } else if (typeof dataSource === 'object') { // 判斷是否為直接傳入的資料物件 (來自雲端)
            await processData(dataSource);
        } else {
            throw new Error("未知的資料來源。");
        }
    } catch (error) {
        console.error("全站資料匯入失敗: - App.js:5190", error);
        alert(`❌ 匯入失敗：${error.message}`);
        if (dataSource?.target?.value) dataSource.target.value = '';
    }
}, []);

  const clearAllData = useCallback(async () => { // ✨ 1. 將函式改為 async
    // ✨ 2. 使用更嚴厲的警告文字
    if (window.confirm(
        '🚨🚨🚨【最終警告】🚨🚨🚨\n\n' +
        '您確定要永久刪除此應用程式的所有資料嗎？\n\n' +
        '此操作將會清除【所有】角色、聊天紀錄、世界書、使用者個人檔案和 API 設定。\n\n' +
        '這個動作【無法復原】！'
    )) {
      try {
        console.log("正在清除所有 IndexedDB 資料... - App.js:5205");

        // ✨ 3. 核心修正：使用資料庫交易來清空所有資料表
        await db.transaction('rw', db.characters, db.prompts, db.apiConfigs, db.kvStore, async () => {
            await db.characters.clear();      // 清空角色表
            await db.prompts.clear();         // 清空提示詞表
            await db.apiConfigs.clear();      // 清空 API 配置表
            await db.kvStore.clear();         // 清空包含聊天、世界書、使用者等的核心儲存區
        });

        // ✨ 4. 我們也把 localStorage 清理掉，確保萬無一失
        localStorage.clear();

        alert('✅ 所有資料已成功清除。應用程式即將重新啟動。');

        // ✨ 5. 在所有操作成功後，才重新載入頁面
        window.location.reload();

      } catch (error) {
        console.error("清除所有資料失敗: - App.js:5224", error);
        alert(`❌ 清除資料時發生錯誤：${error.message}`);
      }
    }
}, []);

  return (
    // 我們用一個 Fragment (<>) 作為最外層的容器
    <>
      {/* ==================== 主要應用程式介面 ==================== */}
      <div className="app-container">
        <TopNavigation currentPage={currentPage} navigateToPage={navigateToPage} />
        <div className="app-content">
          {currentPage === 'characters' && (
            <CharactersPage
              characters={characters}
              onAdd={openEditorForNew}
              onEdit={openEditorForEdit}
              onImport={handleImportCharacter}
              onPreview={openPreview}
              onToggleFavorite={handleToggleFavoriteCharacter}
            />
          )}
          {currentPage === 'chat' && (
            activeChatCharacterId === null ? (
              <ChatLobby
                characters={characters}
                chatHistories={chatHistories}
                chatMetadatas={chatMetadatas}
                onSelectChat={(characterId, chatId) => {
                  const selectedChar = characters.find(c => c.id === characterId);
                  setCurrentCharacter(selectedChar);
                  setActiveChatCharacterId(characterId);
                  setActiveChatId(chatId);
                }}
                onTogglePin={handleTogglePinChat}
                swipedChatId={swipedChatId}
                setSwipedChatId={setSwipedChatId}
                onDeleteChat={handleDeleteChat}
                onEditMetadata={handleOpenMetadataEditor}
              />
            ) : (
              <ChatPage
                key={activeChatId}
                worldBooks={worldBooks}
                chatMetadatas={chatMetadatas}
                onOpenAuxLorebookSelector={() => setIsAuxLorebookSelectorOpen(true)}
                oocCommands={oocCommands}
                onOpenOocSelector={() => setIsOocCommandSelectorOpen(true)}
                onSelectOocCommand={handleSelectOocCommand}
                regexRules={regexRules}
                messages={chatHistories[activeChatCharacterId]?.[activeChatId] || []}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                isLoading={isLoading}
                sendMessage={sendMessage}
                continueGeneration={continueGeneration}
                currentUserProfile={currentUserProfile}
                currentCharacter={currentCharacter}
                activeChatId={activeChatId}
                showActionsMessageId={showActionsMessageId}
                setShowActionsMessageId={setShowActionsMessageId}
                editingMessage={editingMessage}
                setEditingMessage={setEditingMessage}
                handleUpdateMessage={handleUpdateMessage}
                handleDeleteMessage={handleDeleteMessage}
                currentPrompt={currentPrompt}
                isApiConnected={isApiConnected}
                apiProviders={apiProviders}
                apiProvider={apiProvider}
                messagesEndRef={messagesEndRef}
                handleRegenerate={handleRegenerate}
                onChangeVersion={handleChangeVersion}
                isInputMenuOpen={isInputMenuOpen}
                setIsInputMenuOpen={setIsInputMenuOpen}
                setIsMemoryModalOpen={setIsMemoryModalOpen}
                // ✨ 我們要把 isAuthorsNoteModalOpen 的開關也傳給 ChatPage ✨
                setIsAuthorsNoteModalOpen={setIsAuthorsNoteModalOpen} 
                loadedConfigName={loadedConfigName}
                apiModel={apiModel}
                exportChat={exportChatToSillyTavernFormat}
                isScreenshotMode={isScreenshotMode}
                selectedMessageIds={selectedMessageIds}
                handleToggleScreenshotMode={handleToggleScreenshotMode}
                handleSelectMessage={handleSelectMessage}
                handleGenerateScreenshot={handleGenerateScreenshot}
                handleImport={handleImportFromSillyTavern}
                onSwitchProfile={() => setIsProfileSwitcherOpen(true)}
                onBranch={handleCreateBranch}
              />
            )
          )}
          {currentPage === 'worldbooks' && (
            <WorldBookPage
              worldBooks={worldBooks}
              onSave={handleSaveWorldBook}
              onDelete={handleDeleteWorldBook}
              onAdd={handleAddWorldBook}
              onImport={handleImportWorldBook} // ✨ <--- 新增
              onExport={handleExportWorldBook}   // ✨ <--- 新增
            />
          )}
          {currentPage === 'prompts' && (
            <PromptsPage
              prompts={prompts}
              currentPrompt={currentPrompt}
              setCurrentPrompt={setCurrentPrompt}
              savePrompt={savePrompt}
              deletePrompt={deletePrompt}
              restoreDefaultPrompts={restoreDefaultPrompts}
              onOpenSwitcher={() => setIsPromptSwitcherOpen(true)}
              onAddModule={handleAddPromptModule}
              onDeleteModule={handleDeletePromptModule}
              onModuleOrderChange={handleModuleOrderChange}
            />
          )}
          {currentPage === 'settings' && (
            <SettingsPage
              oocCommands={oocCommands}
              onNewOocCommand={handleOpenOocCommandEditorForNew}
              onEditOocCommand={handleOpenOocCommandEditorForEdit}
              onDeleteOocCommand={handleDeleteOocCommand}
              regexRules={regexRules}
              onNewRegexRule={handleOpenRegexEditorForNew}
              onEditRegexRule={handleOpenRegexEditorForEdit}
              onDeleteRegexRule={handleDeleteRegexRule}
              onToggleRegexRule={handleToggleRegexRule}
              onExportRegex={handleExportGlobalRegex} // ✨ 新增
              onImportRegex={handleImportGlobalRegex} // ✨ 新增
              userProfiles={userProfiles}
              onNewUserProfile={openNewUserProfileEditor}
              onEditUserProfile={openEditUserProfileEditor}
              onDeleteUserProfile={handleDeleteUserProfile}
              apiProvider={apiProvider}
              apiKey={apiKey}
              apiModel={apiModel}
              setApiModel={setApiModel}
              apiProviders={apiProviders}
              handleProviderChange={handleProviderChange}
              handleApiKeyChange={handleApiKeyChange}
              testApiConnection={testApiConnection}
              apiTestLoading={apiTestLoading}
              theme={theme}
              onOpenThemeSwitcher={() => setIsThemeSwitcherOpen(true)}
              fontSize={fontSize}
              setFontSize={setFontSize}
              availableModels={availableModels} // ✨ 傳入列表
              onFetchModels={fetchModels}       // ✨ 傳入函式
              getBackupData={() => handleExportAllData(true)} // 傳入一個呼叫匯出函式並要求回傳資料的版本
              restoreFromBackupData={handleImportAllData}     // 直接傳入可以接收資料物件的匯入函式
              exportChatHistory={() => handleExportAllData(false)} // 手動匯出的按鈕，呼叫不回傳資料的版本
              handleImportChat={handleImportAllData}  // ✨ 將舊的 prop 替換為新的匯入函式
              clearAllData={clearAllData}
              apiConfigs={apiConfigs}
              configName={configName}
              setConfigName={setConfigName}
              // 🔥🔥🔥 核心修改：傳入新的函式和 state 🔥🔥🔥
              loadedConfigId={loadedConfigId} // 傳入當前載入的 ID
              onUpdateConfiguration={handleUpdateConfiguration} // 傳入 "更新" 函式
              onSaveAsNewConfiguration={handleSaveAsNewConfiguration} // 傳入 "另存為" 函式
              // ❌ 不再需要 saveApiConfiguration 這個 prop 了
              loadApiConfiguration={loadApiConfiguration}
              deleteApiConfiguration={deleteApiConfiguration}
              onOpenDisclaimer={() => setIsDisclaimerModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* ==================== 所有的彈出式視窗 (Modals) ==================== */}
      {/* 把它們放在 app-container 的外面，確保它們能浮在最上層 */}

      {isEditorOpen && (
        <CharacterEditor
          character={editingCharacter}
          onSave={saveCharacter}
          onClose={closeEditor}
          onDelete={deleteCharacter}
          worldBooks={worldBooks}
          onOpenLocalRegexEditor={handleOpenLocalRegexEditor}
        />
      )}

      {isPreviewOpen && (
        <CharacterPreview
          character={previewingCharacter}
          onClose={closePreview}
          onStartChat={handleStartChat}
          userProfiles={userProfiles}
        />
      )}
      
      {editingMessage && (
        <MessageEditorModal
          editingMessage={editingMessage}
          onSave={handleUpdateMessage}
          onClose={() => setEditingMessage(null)}
        />
      )}

      {isMemoryModalOpen && (
        <LongTermMemoryModal
          memory={longTermMemories[activeChatCharacterId]?.[activeChatId] || ''}
          onSave={handleSaveMemory}
          onUpdate={handleUpdateMemory}
          onClose={() => setIsMemoryModalOpen(false)}
          isLoading={isLoading}
        />
      )}
      
      {/* ✨ 您新增的 Modal 會放在這裡，和大家並排 ✨ */}
      {isAuthorsNoteModalOpen && (
        <AuthorsNoteModal
          initialNote={chatMetadatas[activeChatCharacterId]?.[activeChatId]?.authorsNote}
          onSave={handleSaveAuthorsNote}
          onClose={() => setIsAuthorsNoteModalOpen(false)}
        />
      )}
      {/* ✨ 3. 新增一個地方來「蓋」我們的聊天備註編輯器 ✨ */}
      {editingMetadata && (
        <ChatMetadataEditorModal
          metadata={editingMetadata}
          onSave={handleSaveChatMetadata}
          onClose={() => setEditingMetadata(null)}
        />
      )}
       {isUserProfileEditorOpen && (
        <UserProfileEditor
          // 從列表中找出正在編輯的 profile 資料傳進去
          profile={userProfiles.find(p => p.id === editingUserProfileId)}
          onSave={handleSaveUserProfile}
          onClose={closeUserProfileEditor}   
        />
       )}
        {/* ✨ 4.2 在這裡渲染我們的新 Modal ✨ */}
      {isProfileSwitcherOpen && (
        <UserProfileSwitcherModal
          profiles={userProfiles}
          // 把當前聊天室綁定的 ID，或備用的第一個 ID 傳進去，讓 Modal 知道哪個是當前選項
          currentProfileId={chatMetadatas[activeChatCharacterId]?.[activeChatId]?.userProfileId || userProfiles[0]?.id}
          onSelect={handleSwitchUserProfile}
          onClose={() => setIsProfileSwitcherOpen(false)}
        />
      )}
        {isThemeSwitcherOpen && (
      <ThemeSwitcherModal
        currentTheme={theme}
        onSelect={setTheme}
        onClose={() => setIsThemeSwitcherOpen(false)}
      />
    )}
      {isPromptSwitcherOpen && (
        <PromptSwitcherModal
          prompts={prompts}
          currentPromptId={currentPrompt?.id}
          onSelect={setCurrentPrompt}
          onClose={() => setIsPromptSwitcherOpen(false)}
          onAddNew={() => {
            const newPreset = {
              id: `preset_${Date.now()}`,
              name: '新的提示詞預設集',
              modules: [],
              temperature: 1.0,
              maxTokens: 1024,
              contextLength: 24000,
            };
            savePrompt(newPreset);
            setCurrentPrompt(newPreset);
            setIsPromptSwitcherOpen(false);
          }}
          onDelete={deletePrompt}
        />
      )}
      {/* ✨✨✨ 在這裡渲染我們全新的 Modal ✨✨✨ */}
      <AuxiliaryLorebookSelectorModal
        show={isAuxLorebookSelectorOpen}
        worldBooks={worldBooks}
        // 從 metadata 中讀取當前聊天已選擇的 ID 列表
        selectedIds={chatMetadatas[activeChatCharacterId]?.[activeChatId]?.auxiliaryBookIds || []}
        onSave={handleSaveAuxiliaryLorebooks}
        onClose={() => setIsAuxLorebookSelectorOpen(false)}
      />
      {/* ✨ 全新！OOC 指令編輯器 Modal ✨ */}
      {isOocCommandEditorOpen && (
        <OocCommandEditorModal
          command={editingOocCommand?.isNew ? null : editingOocCommand}
          onSave={handleSaveOocCommand}
          onClose={() => setIsOocCommandEditorOpen(false)}
        />
      )}
      {/* ✨ 全新！OOC 指令選擇器 Modal ✨ */}
      {isOocCommandSelectorOpen && (
        <OocCommandSelectorModal
          commands={oocCommands}
          onSelect={handleSelectOocCommand}
          onClose={() => setIsOocCommandSelectorOpen(false)}
        />
      )}
      {/* ✨ 在這裡新增 RegexEditorModal 的渲染邏輯 ✨ */}
      {isRegexEditorOpen && (
        <RegexEditorModal
          // 根據我們是從哪裡打開的，決定傳入全域規則還是區域規則
          rule={editingLocalRegex.charId ? editingRegexRule : editingRegexRule}
          // 根據來源，決定儲存到哪裡
          onSave={editingLocalRegex.charId ? handleSaveLocalRegexRule : handleSaveRegexRule}
          onClose={() => {
            setIsRegexEditorOpen(false);
            setEditingLocalRegex({charId: null, ruleIndex: null}); // 清理狀態
          }}
          isGlobal={!editingLocalRegex.charId} // 告訴編輯器是不是全域模式
        />
      )}
      {/* ✨ 在這裡渲染我們全新的免責聲明 Modal ✨ */}
      {isDisclaimerModalOpen && (
        <DisclaimerModal
          show={isDisclaimerModalOpen}
          onClose={() => setIsDisclaimerModalOpen(false)}
        />
      )}
    </>
  );
};

const compressImage = (base64Str, options = {}) => {
  const { maxSizeKB = 150, maxWidthOrHeight = 512 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidthOrHeight) {
          height = Math.round((height * maxWidthOrHeight) / width);
          width = maxWidthOrHeight;
        }
      } else {
        if (height > maxWidthOrHeight) {
          width = Math.round((width * maxWidthOrHeight) / height);
          height = maxWidthOrHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.9;
      let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

      while (compressedBase64.length * 0.75 / 1024 > maxSizeKB && quality > 0.1) {
        quality -= 0.1;
        compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(compressedBase64);
    };

    img.onerror = (error) => {
      console.error("圖片載入失敗，無法壓縮: - App.js:5585", error);
      resolve(base64Str); 
    };
  });
};

const applyPlaceholders = (text, character, user) => {
  if (!text) return '';

  // ✨ 1. 我們把之前修正過的「去掉空白」和「預設名字」的聰明邏輯加回來，確保功能最完整！
  const trimmedUserName = user?.name?.trim();
  const userName = trimmedUserName || '你';
  
  const charName = character?.name || '角色';

  let newText = text;

  // ✨ 2. 核心修改：我們使用「特殊搜尋指令 (Regex)」來進行替換
  // 寫法是 /要找的文字/gi
  // "g" 代表 "global" (找全部，跟 replaceAll 的意思一樣)
  // "i" 代表 "insensitive" (對大小寫不敏感，也就是忽略大小寫！)
  
  // --- 替換角色名稱 (忽略大小寫) ---
  newText = newText.replaceAll(/\{\{char\}\}/gi, charName);
  newText = newText.replaceAll(/<char>/gi, charName);

  // --- 替換使用者名稱 (忽略大小寫) ---
  newText = newText.replaceAll(/\{\{user\}\}/gi, userName);
  newText = newText.replaceAll(/<user>/gi, userName);
  
  return newText;
};

// ==================== 全新！解析並過濾 AI 思考過程的函式 ====================
const filterCoT = (rawText) => {
  if (!rawText) return { cleanedText: '', thought: null };

  // 這個正規表示式會尋找 <thinking>...</thinking> 或 <Thoughts>...</Thoughts> 標籤
  // 使用 's' 旗標讓 . 可以匹配換行符
  const cotRegex = /<(thinking|Thoughts)>(.*?)<\/(thinking|Thoughts)>/is;
  
  const match = rawText.match(cotRegex);

  if (match) {
    // match[2] 就是標籤中間的內容
    const thought = match[2].trim(); 
    // 將整個匹配到的區塊 (包含標籤本身) 替換成空字串
    const cleanedText = rawText.replace(cotRegex, '').trim();
    
    // 回傳一個物件，包含乾淨的文字和提取出的思考過程
    return { cleanedText, thought };
  }

  // 如果沒有找到任何匹配，就直接回傳原始文字
  return { cleanedText: rawText, thought: null };
};

// ==================== ✨ 全新升級版！引號高亮函式 ✨ ====================
const highlightQuotedText = (text) => {
  if (!text) return '';
  
  // 定義引號配對
  const quotePairs = {
    '「': '」',
    '『': '』',
    '"': '"',
    '【': '】',
    '“':'”',
    '＂':'＂',
  };
  
  const processText = (str) => {
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const char = str[i];
      
      // 檢查是否為開始引號
      if (quotePairs[char]) {
        const closeQuote = quotePairs[char];
        let j = i + 1;
        let depth = 1;
        
        // 找到對應的結束引號
        while (j < str.length && depth > 0) {
          if (str[j] === char && char !== closeQuote) {
            depth++;
          } else if (str[j] === closeQuote) {
            depth--;
          }
          j++;
        }
        
        if (depth === 0) {
          // 找到完整的引號對
          const content = str.substring(i + 1, j - 1);
          const processedContent = processText(content); // 遞歸處理內容
          
          result += `<span class="quoted-text"><span class="quote-char open-quote">${char}</span>${processedContent}<span class="quote-char close-quote">${closeQuote}</span></span>`;
          i = j;
        } else {
          // 沒有找到配對，當作普通字符
          result += char;
          i++;
        }
      } else {
        result += char;
        i++;
      }
    }
    
    return result;
  };
  
  return processText(text);
};

// ==================== 全新！移除隱藏文字註解的函式 ====================
const removeHiddenText = (text) => {
  if (!text) return '';
  // 這個正規表示式會尋找所有 {{! 開頭、}} 結尾的區塊
  // ? 讓比對變成「非貪婪模式」，避免從第一個 {{! 比對到最後一個 }}
  // s 旗標讓 . 可以匹配換行符，支援多行註解
  const regex = /\{\{!(.*?)\}\}/gs;
  return text.replace(regex, '');
};

// ==================== 全新！可靠的 UTF-8 <=> Base64 轉換輔助函式 ====================
// 將包含 UTF-8 字元 (例如中文) 的字串安全地轉換為 Base64
const utf8ToBase64 = (str) => {
  try {
    const bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (error) {
    console.error("UTF8 to Base64 conversion failed: - App.js:5720", error);
    // 提供一個備用方案，雖然在現代瀏覽器中很少需要
    return btoa(unescape(encodeURIComponent(str)));
  }
};

// 將 Base64 字串解碼回原始的 UTF-8 字串
const base64ToUtf8 = (base64) => {
  try {
    const binaryString = atob(base64);
    const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error("Base64 to UTF8 conversion failed: - App.js:5733", error);
    // 提供一個備用方案
    return decodeURIComponent(escape(atob(base64)));
  }
};

// ==================== 全新！PNG 角色卡生成輔助函式 (最終修正版) ====================
async function createPngWithCharaChunk(imageDataSource, characterData) {
  // ✨ 核心修正：使用我們新的、可靠的 utf8ToBase64 函式 ✨
  const characterJsonString = JSON.stringify(characterData, null, 2);
  const characterBase64 = utf8ToBase64(characterJsonString);

  // 創建 tEXt chunk
  const keyword = 'chara';
  const textChunkContent = keyword + '\0' + characterBase64;
  const textChunkBytes = new Uint8Array(textChunkContent.length);
  for (let i = 0; i < textChunkContent.length; i++) {
    textChunkBytes[i] = textChunkContent.charCodeAt(i);
  }

  // 創建 CRC32 校驗碼的函式 (這個函式保持不變)
  const crc32 = (function() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[i] = c;
    }
    return function(bytes) {
      let crc = -1;
      for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
      }
      return (crc ^ -1) >>> 0;
    };
  })();

  const chunkTypeBytes = new TextEncoder().encode('tEXt'); // 'tEXt' 區塊類型
  // 計算 tEXt 區塊的總數據 (類型 + 內容)
  const chunkDataForCrc = new Uint8Array(chunkTypeBytes.length + textChunkBytes.length);
  chunkDataForCrc.set(chunkTypeBytes);
  chunkDataForCrc.set(textChunkBytes, chunkTypeBytes.length);

  const crc = crc32(chunkDataForCrc); // 計算 CRC
  const chunkLengthBuffer = new ArrayBuffer(4);
  new DataView(chunkLengthBuffer).setUint32(0, textChunkBytes.length, false); // 區塊長度

  const chunkCrcBuffer = new ArrayBuffer(4);
  new DataView(chunkCrcBuffer).setUint32(0, crc, false); // 區塊 CRC

  // ✨ 重點修改：步驟 3 - 無論來源如何，先將圖片繪製並轉為 PNG 位元組 ✨
  let originalPngBytes;
  try {
    const img = new Image();
    // 設置 crossOrigin 以處理可能存在的 CORS 問題，雖然對於 data URI 通常不是問題
    img.crossOrigin = "anonymous"; 
    img.src = imageDataSource; 
    
    // 等待圖片載入完成
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // 將 Canvas 內容輸出為 PNG 格式的 Data URL
    const pngDataUrl = canvas.toDataURL('image/png'); 
    
    // 從 Data URL 中提取 Base64 字串
    const base64Png = pngDataUrl.split(',')[1];
    if (!base64Png) {
      throw new Error('無法從 Data URL 中提取有效的 Base64 PNG 資料。');
    }
    
    // 將 Base64 字串轉換為 Uint8Array
    const binaryString = atob(base64Png);
    originalPngBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      originalPngBytes[i] = binaryString.charCodeAt(i);
    }

  } catch (error) {
    console.error("在生成角色卡前處理圖片時發生錯誤: - App.js:5822", error);
    throw new Error(`無法準備圖片以生成角色卡。請確認圖片有效。錯誤: ${error.message}`);
  }

  // 找到 IEND (Image END) 區塊的偏移量，這是 PNG 檔案的標準結束標記
  const iendOffset = originalPngBytes.byteLength - 12; // 12 = IEND 區塊類型(4) + 長度(4) + CRC(4)

  // 步驟 4: 合併成新的 PNG 檔案
  // 新檔案大小 = 原始 PNG 大小 + 新區塊的長度欄位(4) + 類型欄位(4) + 資料長度 + CRC 欄位(4)
  const newPngBytes = new Uint8Array(
    originalPngBytes.byteLength + 4 + 4 + textChunkBytes.length + 4
  );

  // 複製原始 PNG 檔案中 IEND 區塊之前的內容
  newPngBytes.set(originalPngBytes.subarray(0, iendOffset));
  
  // 插入新的 tEXt 區塊
  let currentOffset = iendOffset;
  newPngBytes.set(new Uint8Array(chunkLengthBuffer), currentOffset); // 區塊長度
  currentOffset += 4;
  newPngBytes.set(chunkDataForCrc, currentOffset); // 區塊類型和資料
  currentOffset += chunkDataForCrc.length;
  newPngBytes.set(new Uint8Array(chunkCrcBuffer), currentOffset); // 區塊 CRC
  currentOffset += 4;
  
  // 複製原始 PNG 檔案中 IEND 區塊的內容
  newPngBytes.set(originalPngBytes.subarray(iendOffset), currentOffset);
  
  // 返回 Blob 物件，以便下載
  return new Blob([newPngBytes], { type: 'image/png' });
}

// ==================== 全新！唯一 ID 生成器 ====================
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export default ChatApp;