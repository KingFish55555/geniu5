import ReactMarkdown from 'react-markdown';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Settings, ArrowLeft, Key, Globe, Check, X,
  User, Palette, FileText, Save, Trash2,
  Download, Upload, Users, MessageCircle, Moon, Sun,
  Bot, Database, Info, Camera, UserCircle, Plus, BookOpen,
  MoveRightIcon, Pin, Star, ChevronDown, ChevronUp, Coffee, Grape, Sparkles, CloudMoon, Edit2, MessageSquarePlus
} from 'lucide-react';
import CaterpillarIcon from './CaterpillarIcon';
import rehypeRaw from 'rehype-raw';
import { db } from './db';
import html2canvas from 'html2canvas';
import PromptsPage from './PromptsPage';
import ModuleEditorModal from './ModuleEditorModal';
import OocCommandEditorModal from './OocCommandEditorModal.js';
import OocCommandSelectorModal from './OocCommandSelectorModal.js';

// ==================== 長期記憶數量觸發數 ====================

const MEMORY_UPDATE_INTERVAL = 5;

// 頂部導航組件
const TopNavigation = ({ currentPage, navigateToPage }) => (
  <div className="top-navigation">
    <button onClick={() => navigateToPage('characters')} className={`nav-icon ${currentPage === 'characters' ? 'active' : ''}`}>
      <Users size={20} />
    </button>
    <button onClick={() => navigateToPage('chat')} className={`nav-icon ${currentPage === 'chat' ? 'active' : ''}`}>
      <MessageCircle size={20} />
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
const CharacterEditor = ({ character, onSave, onClose, onDelete }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [alternateGreetings, setAlternateGreetings] = useState([]);
  const [avatar, setAvatar] = useState({ type: 'icon', data: 'UserCircle' });
  const [characterBook, setCharacterBook] = useState(null);
  const [creatorNotes, setCreatorNotes] = useState('');//新增一行state管理創作者備註

  useEffect(() => {
    if (character) {
      setName(character.name || '');
      setDescription(character.description || '');
      setFirstMessage(character.firstMessage || '');
      setAlternateGreetings(character.alternateGreetings || []);
      setAvatar(character.avatar || { type: 'icon', data: 'UserCircle' });
      setCharacterBook(character.characterBook ? structuredClone(character.characterBook) : null);
      setCreatorNotes(character.creatorNotes || ''); //讓編輯器讀取角色的備註
    } else {
      setName('');
      setDescription('');
      setFirstMessage('');
      setAlternateGreetings([]);
      setAvatar({ type: 'icon', data: 'UserCircle' });
      setCharacterBook(null);
      setCreatorNotes('');//創建新角色時，輕空備註
    }
  }, [character]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('請為您的角色命名！');
      return;
    }
    const characterData = {
      id: character ? character.id : Date.now(),
      name,
      description,
      firstMessage,
      alternateGreetings: alternateGreetings.filter(g => g.trim() !== ''),
      avatar,
      characterBook,
      creatorNotes, //儲存時把備註也儲存進去
    };
    onSave(characterData);
  };

  const handleToggleWorldBookEntry = (index) => {
    if (!characterBook || !characterBook.entries) return;
    const newEntries = [...characterBook.entries];
    newEntries[index] = { ...newEntries[index], enabled: !newEntries[index].enabled };
    setCharacterBook({ ...characterBook, entries: newEntries });
  };

  const handleDelete = () => {
    if (character &&
      // 這是第一次的警告視窗
      window.confirm(
        `⚠️ 確定要刪除角色「${character.name}」嗎？\n\n` +
        `🥺確定嗎？\n\n` +
        `(${character.name}正在看著你的手)\n\n`
      ) &&
      // 只有當使用者按下第一次的「確定」後，才會跳出第二次的警告
      window.confirm(
        `🚨最後一次確認🚨\n\n` +
        `按下「確定」後，角色「${character.name}」和所有對話將被永久銷毀。\n\n` +
        `此操作將會連同【所有相關的聊天記錄】一併永久刪除！\n\n`+
        `確定要這麼做嗎？\n\n` +
        `真的不後悔嗎？\n\n` +
        `(這是最後一次機會......)`
      )
    ) {
      // 只有兩次都按下「確定」，才會執行真正的刪除動作
      onDelete(character.id);
    }
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
        console.error("角色頭像壓縮失敗:", error);
        setAvatar({ type: 'image', data: originalBase64 });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAddGreeting = () => {
    setAlternateGreetings([...alternateGreetings, '']);
  };

  const handleGreetingChange = (index, value) => {
    const updatedGreetings = [...alternateGreetings];
    updatedGreetings[index] = value;
    setAlternateGreetings(updatedGreetings);
  };

  const handleRemoveGreeting = (index) => {
    const updatedGreetings = alternateGreetings.filter((_, i) => i !== index);
    setAlternateGreetings(updatedGreetings);
  };

  // 處理世界書條目的變更 (修改關鍵字或內容)
  const handleWorldBookEntryChange = (index, field, value) => {
    if (!characterBook) return;
    const newEntries = [...characterBook.entries];
    const entryToUpdate = { ...newEntries[index] };

    if (field === 'keys') {
      // 將逗號分隔的字串轉回陣列
      entryToUpdate.keys = value.split(',').map(k => k.trim());
    } else {
      entryToUpdate[field] = value;
    }
    
    newEntries[index] = entryToUpdate;
    setCharacterBook({ ...characterBook, entries: newEntries });
  };

  // 新增一個空白的世界書條目
  const handleAddWorldBookEntry = () => {
    const newEntry = { keys: [], content: '', enabled: true };
    const newEntries = characterBook?.entries ? [...characterBook.entries, newEntry] : [newEntry];
    setCharacterBook({
      ...characterBook,
      name: characterBook?.name || 'Default World',
      entries: newEntries,
    });
  };
  
  // 刪除指定的世界書條目
  const handleDeleteWorldBookEntry = (index) => {
    if (!characterBook) return;
    const newEntries = characterBook.entries.filter((_, i) => i !== index);
    setCharacterBook({ ...characterBook, entries: newEntries });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{character ? '編輯角色' : '創建新角色'}</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group avatar-form-group">
            <label>角色頭像</label>
            <div className="avatar-editor">
              <div className="avatar-preview-large">
                {avatar.type === 'image' ? (
                  <img src={avatar.data} alt="頭像" className="avatar-image" />
                ) : (
                  <UserCircle size={48} />
                )}
              </div>
              {/* ✨ 將按鈕群組用一個 div 包起來，方便排版 ✨ */}
              <div className="avatar-actions">
                <label htmlFor="char-avatar-upload" className="action-button-base">
                  <Upload size={16} /> 上傳圖片
                </label>
                
                {/* ✨✨✨ 全新的「匯出 PNG」按鈕 ✨✨✨ */}
                {character && ( // 只有在編輯現有角色時才顯示
                  /* ✨✨✨ 核心修改：將 button 改為 label ✨✨✨ */
                  <label onClick={() => onSave(null, true)} className="action-button-base">
                    <Download size={16} /> 匯出.png卡
                  </label>
                )}
              </div>
              
              {character && (
                <button onClick={handleDelete} className="delete-character-icon-btn">
                  <Trash2 size={16} />
                </button>
              )}
               <input
                type="file"
                id="char-avatar-upload"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>角色名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：夏洛克．福爾摩斯"
            />
          </div>

          {/* ✨✨✨ 在這裡插入新的輸入框 ✨✨✨ */}
          <div className="form-group">
            <label>創作者備註 (會顯示在角色列表上)</label>
            <textarea
              value={creatorNotes}
              onChange={(e) => setCreatorNotes(e.target.value)}
              rows="2"
              // placeholder="輸入角色的備註。例如：男性，偵探，古怪而博學的人。"
            />
          </div>
          {/* ✨✨✨ 新增結束 ✨✨✨ */}

          <div className="form-group">
            <label>角色描述 (個性、背景、說話風格等)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="6"
              placeholder="在這裡輸入角色的所有設定..."
            />
          </div>
          
          {/* ✨✨✨ 全新可編輯的世界書區塊 ✨✨✨ */}
          {characterBook && characterBook.entries && characterBook.entries.length > 0 && (
            <div className="form-group world-book-section">
              <div className="form-label-group">
                <label className="world-book-label" style={{ marginBottom: '0' }}>
                  <BookOpen size={16} />
                  <span>世界書 ({characterBook.entries.length} 條)</span>
                </label>
                <button onClick={handleAddWorldBookEntry} className="add-greeting-btn">
                  <Plus size={14} /> 新增條目
                </button>
              </div>
              <div className="world-book-entries">
                {characterBook.entries.map((entry, index) => (
                  <div key={index} className="world-book-entry wb-entry-editor">
                    <div className="wb-entry-actions">
                      <label className="wb-entry-toggle">
                        <input
                          type="checkbox"
                          checked={entry.enabled}
                          onChange={() => handleToggleWorldBookEntry(index)}
                        />
                        <span className="slider"></span>
                      </label>
                      <button onClick={() => handleDeleteWorldBookEntry(index)} className="wb-delete-btn">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="wb-entry-inputs">
                      <input
                        type="text"
                        placeholder="關鍵字 (用逗號,分隔)"
                        value={entry.keys.join(', ')}
                        onChange={(e) => handleWorldBookEntryChange(index, 'keys', e.target.value)}
                      />
                      <textarea
                        placeholder="內容"
                        rows="3"
                        value={entry.content}
                        onChange={(e) => handleWorldBookEntryChange(index, 'content', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>主要開場白</label>
            <textarea
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              rows="4"
              placeholder="輸入角色的第一句話..."
            />
          </div>

          <div className="form-group alternate-greetings-group">
            <div className="form-label-group">
              <label>備用開場白 (可選)</label>
              <button onClick={handleAddGreeting} className="add-greeting-btn">
                <Plus size={14} /> 新增
              </button>
            </div>
            {alternateGreetings.map((greeting, index) => (
              <div key={index} className="greeting-input-group">
                <textarea
                  value={greeting}
                  onChange={(e) => handleGreetingChange(index, e.target.value)}
                  rows="2"
                  placeholder={`備用開場白 #${index + 1}`}
                />
                <button onClick={() => handleRemoveGreeting(index)} className="remove-greeting-btn">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={handleSave} className="footer-btn save-btn">
            <Save size={16} /> {character ? '儲存變更' : '儲存新角色'}
          </button>
        </div>
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
              <Upload size={16} /> 匯入角色 (.png / .json)
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
                  <Upload size={24} />
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

  const allChats = [];
  for (const char of characters) {
    const charId = char.id;
    const sessions = chatHistories[charId] || {};
    const metas = chatMetadatas[charId] || {};
    for (const chatId in sessions) {
      const history = sessions[chatId];
      
      // ✨✨✨ 核心修正 1：只要聊天存在 (history 不是 undefined)，就顯示！✨✨✨
      if (history) {
        let lastMessage, lastMessageText, sortKey;

        if (history.length > 0) {
          // 如果聊天有內容，正常處理
          lastMessage = history[history.length - 1];
          lastMessageText = lastMessage.contents 
            ? lastMessage.contents[lastMessage.activeContentIndex] 
            : lastMessage.text; // 向下相容舊格式
          sortKey = lastMessage.id || 0;
        } else {
          // 如果聊天是空的，提供預設值
          lastMessage = { sender: 'system' }; // 創建一個假的 lastMessage 以免程式出錯
          lastMessageText = "點此開始對話...";
          // 使用聊天室 ID 中的時間戳來排序，確保新建立的空聊天室在最上面
          sortKey = parseInt(chatId.split('_')[1] || Date.now());
        }

        const metadata = metas[chatId] || { name: '', notes: '', pinned: false };
        
        allChats.push({
          char,
          chatId,
          lastMessage, // 雖然可能用不到，但保持結構完整
          isPinned: metadata.pinned,
          sortKey,
          // ✨ 直接把處理好的文字和 metadata 傳下去
          lastMessageText,
          metadata
        });
      }
    }
  }

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
                  <div className="character-select-area">
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
                      <h4>{metadata.name || char.name}</h4>
                      {/* ✨ 使用處理好的 lastMessageText，並優先顯示備註 ✨ */}
                      <p>{metadata.notes || (lastMessage.sender === 'user' ? '你: ' : '') + lastMessageText}</p>
                    </div>
                  </div>

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

                  <button className="more-actions-btn" onClick={(e) => handleSwipeToggle(chatId, e)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ================== ✨ 最終版！完美支援 Markdown 和引號變色 ✨ ==================
const ChatMessage = ({ msg, currentUserProfile, character, setEditingMessage, activeChatId, handleDeleteMessage, showActionsMessageId, setShowActionsMessageId, handleRegenerate, isLastMessage, onChangeVersion, isScreenshotMode, isSelected, onSelectMessage }) => {
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

  const currentText = msg.contents[msg.activeContentIndex];

  // ==========================================================
  // ✨✨✨ 在這裡進行冒號的處理 ✨✨✨
  // ==========================================================
  
  // 步驟 1: 先複製一份原始訊息
  let textToProcess = currentText;

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
  const processedText = highlightQuotedText(textToProcess);

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
        <div className="bubble-wrapper" onClick={isScreenshotMode ? (e) => e.stopPropagation() : handleBubbleClick}>

          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
            {processedText}
          </ReactMarkdown>

          {/* 我們不希望截圖中出現時間戳，所以在截圖模式下隱藏它 */}
          {!isScreenshotMode && <span className="timestamp">{msg.timestamp}</span>}

          {/* 下面的編輯、刪除、版本切換等按鈕，在截圖模式下也都不顯示 */}
          {!isScreenshotMode && (
            <>
              <button
                onClick={onDelete}
                className={`delete-message-btn ${showActions ? 'visible' : ''}`}
                title={msg.sender === 'system' ? '刪除系統訊息' : '刪除訊息'}
              >
                <Trash2 size={14} />
              </button>

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

// ==================== 全新！聊天室備註編輯 Modal 元件 ====================
const ChatMetadataEditorModal = ({ metadata, onSave, onClose }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (metadata) {
      setNotes(metadata.notes || '');
    }
  }, [metadata]);

  if (!metadata) {
    return null;
  }
  
  const handleSave = () => {
    onSave(notes);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>編輯聊天室備註</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="setting-label" style={{ marginBottom: '12px' }}>
            是不是聊天室太多記不過來了啊～😉
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="edit-textarea"
            style={{ minHeight: '150px' }}
            placeholder="紀錄的文字會放在角色名下面，放心的寫吧，角色不會看到的"
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="edit-btn cancel">取消</button>
          <button onClick={handleSave} className="edit-btn save">儲存備註</button>
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
    { id: 'old-books', name: '懷舊書卷', Icon: BookOpen },
    { id: 'old-blue', name: '古典藍調', Icon: Palette },
    { id: 'hyacinth-mauve', name: '風信子紫', Icon: Grape },
    { id: 'dark-hyacinth', name: '暗夜風信子', Icon: Sparkles },
    { id: 'blue-moon', name: '藍月夜', Icon: CloudMoon }
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
  const [name, setName] = useState('');
  const [notes, setNotes] = useState(''); // +++ 新增一行 state 來管理備註 +++
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState({ type: 'icon', data: 'UserCircle' });

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setNotes(profile.notes || ''); // +++ 讀取個人檔案中的備註 +++
      setDescription(profile.description || '');
      setAvatar(profile.avatar || { type: 'icon', data: 'UserCircle' });
    } else {
      // 新增模式，清空欄位
      setName('');
      setNotes(''); // +++ 創建新檔案時，清空備註 +++
      setDescription('');
      setAvatar({ type: 'icon', data: 'UserCircle' });
    }
  }, [profile]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('請為您的個人檔案命名！');
      return;
    }
    // +++ 儲存時把備註 (notes) 也一起儲存進去 +++
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
        console.error("使用者頭像壓縮失敗:", error);
        setAvatar({ type: 'image', data: originalBase64 });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

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
                  <Upload size={16} /> 上傳圖片
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

          {/* +++ 在這裡插入新的輸入框 +++ */}
          <div className="form-group">
            <label>備註</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：醫生"
            />
          </div>
          {/* +++ 新增結束 +++ */}

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

const ChatPage = ({ oocCommands, onOpenOocSelector, onSelectOocCommand, messages, inputMessage, setInputMessage, isLoading, sendMessage, continueGeneration, currentUserProfile, currentCharacter, currentPrompt, isApiConnected, apiProviders, apiProvider, messagesEndRef, setEditingMessage, handleUpdateMessage, handleDeleteMessage, activeChatId, showActionsMessageId, setShowActionsMessageId, handleRegenerate, onChangeVersion, isInputMenuOpen, setIsInputMenuOpen, loadedConfigName, apiModel, setIsMemoryModalOpen, setIsAuthorsNoteModalOpen, exportChat, handleImport, isScreenshotMode, selectedMessageIds, handleToggleScreenshotMode, handleSelectMessage, handleGenerateScreenshot, onSwitchProfile }) => {
  
  const textareaRef = useRef(null);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      sendMessage();
    } else {
      continueGeneration();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isButtonDisabled = isLoading || (!inputMessage.trim() && messages.length === 0);

  return (
    <div className="page-content">
      <div className="chat-header-container">
        <button 
          className="info-panel-toggle-btn" 
          onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
        >
          {isInfoPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isInfoPanelOpen && (
          <div className="chat-header-panel">
            {/* ✨ 核心修改：顯示當前使用者資訊 ✨ */}
            <div className="chat-info current-user-display">
              <div className="message-avatar">
                <img src={currentUserProfile.avatar?.type === 'image' ? currentUserProfile.avatar.data : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZHRoPSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXVzZXItY2lyY2xlIj48cGF0aCBkPSJNMjAgMjFhOCAzIDAgMCAwLTE2IDBaIi8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMSIgcj0iNCIvPjwvc3ZnPg=='} alt="User Avatar" className="avatar-image" />
              </div>
              <div className="chat-info-details">
                <span className="current-character">與 {currentCharacter.name} 對話</span>
                <span className="current-prompt">
                  作為 {currentUserProfile.name || '(未命名身份)'}
                  {currentUserProfile.notes ? ` (${currentUserProfile.notes})` : ''}
                </span>
                {/* ✨✨✨ 在這裡新增下面這段程式碼 ✨✨✨ */}
                {currentPrompt && (
                  <span className="current-prompt" style={{ opacity: 0.7 }}>
                    使用: {currentPrompt.name}
                  </span>
                )}
              </div>
            </div>
            <div className={`connection-status ${isApiConnected ? 'connected' : 'disconnected'}`}>
              {isApiConnected ? (
                <span>
                  {loadedConfigName ? `${loadedConfigName} (${apiModel})` : apiProviders[apiProvider]?.name}
                </span>
              ) : (
                <span>未連接</span>
              )}
            </div>
          </div>
        )}
      </div>
  
      <div className="messages-area">
        {messages.length > 0 && messages.map((message, index) => (
            <ChatMessage 
              key={message.id}
              msg={message}
              currentUserProfile={currentUserProfile}
              character={currentCharacter}
              activeChatId={activeChatId}
              setEditingMessage={setEditingMessage}
              handleDeleteMessage={handleDeleteMessage}
              showActionsMessageId={showActionsMessageId}
              setShowActionsMessageId={setShowActionsMessageId}
              handleRegenerate={handleRegenerate}
              onChangeVersion={onChangeVersion}
              isScreenshotMode={isScreenshotMode}
              isSelected={selectedMessageIds.includes(message.id)}
              onSelectMessage={handleSelectMessage}
              isLastMessage={index === messages.length - 1}
            />
        ))}
        {isLoading && (
          <div className="loading-message">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>{currentCharacter.name} 正在輸入中...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
  
      <div className="input-area-wrapper">
        {isScreenshotMode ? (
          <div className="screenshot-toolbar">
            <button className="screenshot-btn cancel" onClick={handleToggleScreenshotMode}><X size={18} /><span>取消</span></button>
            <span className="screenshot-info">已選擇 {selectedMessageIds.length} 則訊息</span>
            <button className="screenshot-btn confirm" onClick={handleGenerateScreenshot} disabled={selectedMessageIds.length === 0}><Check size={18} /><span>生成圖片</span></button>
          </div>
        ) : (
          <>
            {isInputMenuOpen && (
              <div className="input-menu">
                {/* ✨ 核心修改：新增「切換身份」按鈕 ✨ */}
                <button className="input-menu-item" onClick={() => { onSwitchProfile(); setIsInputMenuOpen(false); }}>
                  <Users size={20} />
                  <span>切換身份</span>
                </button>
                <button className="input-menu-item" onClick={() => { onOpenOocSelector(); setIsInputMenuOpen(false); }}>
                  <MessageSquarePlus size={20} />
                  <span>OOC 指令</span>
                </button>
                <button className="input-menu-item" onClick={() => { setIsMemoryModalOpen(true); setIsInputMenuOpen(false); }}>
                  <BookOpen size={20} />
                  <span>長期記憶</span>
                </button>
                <button className="input-menu-item" onClick={() => { setIsAuthorsNoteModalOpen(true); setIsInputMenuOpen(false); }}>
                  <Settings size={20} />
                  <span>Author's Note</span>
                </button>
                <button className="input-menu-item" onClick={() => { exportChat(); setIsInputMenuOpen(false); }}>
                  <Download size={20} />
                  <span>匯出聊天 (.jsonl)</span>
                </button>
                <button className="input-menu-item" onClick={() => { document.getElementById('st-import-input').click(); setIsInputMenuOpen(false); }}>
                  <Upload size={20} />
                  <span>匯入聊天 (.jsonl)</span>
                </button>
                <button className="input-menu-item" onClick={handleToggleScreenshotMode}>
                  <Camera size={20} />
                  <span>訊息截圖</span>
                </button>
              </div>
            )}

            <input 
              type="file" 
              id="st-import-input" 
              accept=".jsonl" 
              style={{ display: 'none' }} 
              onChange={handleImport} 
            />

            <div className="input-area">
              <button 
                className={`input-menu-btn ${isInputMenuOpen ? 'open' : ''}`}
                onClick={() => setIsInputMenuOpen(!isInputMenuOpen)}
              >
                <Plus size={22} />
              </button>
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={currentCharacter ? `向 ${currentCharacter.name} 說話` : "輸入訊息..."}
                className="message-input"
                disabled={isLoading}
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={isButtonDisabled}
                className="send-button"
              >
                {inputMessage.trim() ? <Send size={18} /> : <MoveRightIcon size={20} />}
              </button>
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
    { id: 'old-books', name: '懷舊書卷', Icon: BookOpen },
    { id: 'old-blue', name: '古典藍調', Icon: Palette },
    { id: 'hyacinth-mauve', name: '風信子紫', Icon: Grape } // ✨ 在這裡加入新主題
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
                  請一定不要隨意的分享您的 API 金鑰，尤其是在公開場合或是開源專案中！
                  截圖的時候也請注意不要讓金鑰入鏡，謝謝您！
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
                  <label className="setting-label">AI 模型</label>
                  <select
                    value={apiModel}
                    onChange={(e) => setApiModel(e.target.value)}
                    className="setting-select"
                  >
                    {apiProviders[apiProvider]?.models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
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
                      { id: 'old-books', name: '懷舊書卷' },
                      { id: 'old-blue', name: '古典藍調' },
                      { id: 'hyacinth-mauve', name: '風信子紫' },
                      { id: 'dark-hyacinth', name: '暗夜風信子' },
                      { id: 'blue-moon', name: '藍月夜' }
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
          <div className="setting-card">
            <button
              className={`card-header ${expandedSection === 'data' ? 'expanded' : ''}`}
              onClick={() => toggleSection('data')}
            >
              <div className="card-title">
                <Database size={20} />
                <span>資料管理 (功能開發中)</span>
              </div>
              <span className="expand-arrow">{expandedSection === 'data' ? '▲' : '▼'}</span>
            </button>
            
            {expandedSection === 'data' && (
              <div className="card-content">
                <div className="setting-group">
                  <label className="setting-label">匯出資料</label>
                  <div className="data-buttons">
                    <button onClick={exportChatHistory} className="data-btn export">
                      <Download size={16} />
                      匯出聊天紀錄 (TXT)
                    </button>
                  </div>
                </div>
                <div className="setting-group">
                  <label className="setting-label">匯入資料</label>
                  <div className="data-buttons">
                    <input
                      type="file"
                      id="import-chat"
                      accept=".txt"
                      onChange={handleImportChat}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="import-chat" className="data-btn import">
                      <Upload size={16} />
                      匯入聊天紀錄 (TXT)
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
                  <p>版本：0.5.2</p>
                  <p>為了想要在手機上玩AI的小東西</p>
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
};
  
// =================================================================================
// ✨✨✨ 全新！基於 SillyTavern 佔位符的內建提示詞 ✨✨✨
// =================================================================================
const BUILT_IN_PROMPTS = [
  {
    id: 'st-default-preset-v1',
    name: '預設提示詞 (SillyTavern 風格)',
    temperature: 1,
    maxTokens: 800,
    contextLength: 32000,
    modules: [
      {
        id: 'main',
        name: 'Main Prompt',
        // ✨ 修改：移除 {{char}} 和 {{user}}，它們會由下面的專門模組處理
        content: "Write the next reply in a fictional chat.",
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
        // ✨ 修改：使用 {{user}} 佔位符
        content: '{{user}}', 
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'charDescription',
        name: 'Char Description',
        // ✨ 修改：使用 {{char}} 佔位符來載入角色描述
        content: '{{char}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'charPersonality',
        name: 'Char Personality',
        // ✨ 修改：使用 {{personality}} 佔位符來載入個性
        content: '{{personality}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'scenario',
        name: 'Scenario',
        // ✨ 修改：使用 {{scenario}} 佔位符來載入場景
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
        // ✨ 修改：使用 {{example_dialogue}} 佔位符來載入對話範例
        content: '{{example_dialogue}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'chatHistory',
        name: 'Chat History',
        // ✨ 修改：使用 {{chat_history}} 佔位符
        content: '{{chat_history}}',
        enabled: true,
        locked: false, readOnly: true, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      },
      {
        id: 'jailbreak',
        name: 'Post-History Instructions',
        // ✨ 修改：使用對應的佔位符
        content: '{{post_history_instructions}}',
        enabled: true,
        locked: false, readOnly: false, role: 'system',
        triggers: { enabled: false, text: '' }, position: { type: 'relative', depth: 4 }
      }
    ]
  }
];

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
  const [isOocCommandEditorOpen, setIsOocCommandEditorOpen] = useState(false); // ✨ 2. 設定頁的編輯器開關
  const [editingOocCommand, setEditingOocCommand] = useState(null); // ✨ 3. 正在編輯的指令
  const [isOocCommandSelectorOpen, setIsOocCommandSelectorOpen] = useState(false); // ✨ 4. 聊天室的選擇器開關

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

  // ==================== UI 彈出視窗與選單狀態 ====================
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
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

  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  // ✨✨✨ 全新！使用者個人檔案編輯器 Modal 的 State ✨✨✨
  const [isUserProfileEditorOpen, setIsUserProfileEditorOpen] = useState(false);
  const [editingUserProfileId, setEditingUserProfileId] = useState(null);
  const [isThemeSwitcherOpen, setIsThemeSwitcherOpen] = useState(false);
  // ✨ 1. 在這裡新增一行 state，用來控制身份切換器的開關 ✨
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [isPromptSwitcherOpen, setIsPromptSwitcherOpen] = useState(false);
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
      models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-pro-preview-06-05', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro-preview-03-25', 'gemini-2.5-pro-exp-03-25', 'gemini-2.5-flash-preview-05-20', 'gemini-2.5-flash-preview-04-17',],
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
      console.log("正在從 IndexedDB 載入資料...");

      // 1. 先嘗試從 IndexedDB 讀取所有資料
      const [
        savedCharacters, savedPrompts, savedApiConfigs,
        savedHistories, savedMetadatas, savedMemories,
        savedUserProfiles, // ✨ 新增讀取使用者個人檔案
        savedOocCommands
      ] = await db.transaction('r', db.characters, db.prompts, db.apiConfigs, db.kvStore, async () => {
        const chars = await db.characters.toArray();
        const proms = await db.prompts.toArray();
        const configs = await db.apiConfigs.toArray();
        const hist = (await db.kvStore.get('chatHistories'))?.value; 
        const meta = (await db.kvStore.get('chatMetadatas'))?.value; 
        const mem = (await db.kvStore.get('longTermMemories'))?.value;
        const profiles = (await db.kvStore.get('userProfiles'))?.value; 
        const ooc = (await db.kvStore.get('oocCommands'))?.value; // ✨ 加入這行
        const activeId = (await db.kvStore.get('activeUserProfileId'))?.value; // ✨ 讀取預設 ID
        return [chars, proms, configs, hist, meta, mem, profiles, activeId, ooc];
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
      setChatHistories(savedHistories || {});
      setChatMetadatas(savedMetadatas || {});
      setLongTermMemories(savedMemories || {});
      setOocCommands(savedOocCommands || []);
      setOocCommands(Array.isArray(savedOocCommands) ? savedOocCommands : []);

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
      
      const lastUsedApi = JSON.parse(localStorage.getItem('app_last_used_api'));
      const savedKeysByProvider = JSON.parse(localStorage.getItem('app_api_keys_by_provider'));
      if (savedKeysByProvider) {
        setApiKeysByProvider(savedKeysByProvider);
      }
      if (lastUsedApi) {
        setApiProvider(lastUsedApi.provider || 'openai');
        setApiKey(savedKeysByProvider?.[lastUsedApi.provider] || '');
        setApiModel(lastUsedApi.model || (apiProviders[lastUsedApi.provider]?.models[0] || 'gpt-3.5-turbo'));
        if (lastUsedApi.apiKey) setIsApiConnected(true); // 這裡的 apiKey 只是為了判斷上次是否連接過
      }
      setIsDataLoaded(true);
    } catch (error) {
      console.error('從 IndexedDB 載入資料失敗:', error);
    }
  };

  loadData();
}, []); // 這個 effect 只在啟動時執行一次，所以依賴項是空的

  // ✨✨✨ 全新！聊天記錄的專屬存檔管家 ✨✨✨  <--- 就是這一段！
  useEffect(() => {
      // 加上這個判斷，是為了避免在程式剛啟動、資料還沒載入時就存入一筆空資料
      if (Object.keys(chatHistories).length > 0) {
          console.log("偵測到聊天記錄變更，正在存入 IndexedDB...");
          db.kvStore.put({ key: 'chatHistories', value: chatHistories });
      }
  }, [chatHistories]); // 這個管家只監控 chatHistories

  // ✨✨✨ 全新！聊天室元數據 (備註/作者備註) 的存檔管家 ✨✨✨
  useEffect(() => {
      if (Object.keys(chatMetadatas).length > 0) {
          console.log("偵測到聊天室元數據變更，正在存入 IndexedDB...");
          db.kvStore.put({ key: 'chatMetadatas', value: chatMetadatas });
      }
  }, [chatMetadatas]); // 這個管家只監控 chatMetadatas

  // ✨✨✨ 全新！長期記憶的存檔管家 ✨✨✨
  useEffect(() => {
      if (Object.keys(longTermMemories).length > 0) {
          console.log("偵測到長期記憶變更，正在存入 IndexedDB...");
          db.kvStore.put({ key: 'longTermMemories', value: longTermMemories });
      }
  }, [longTermMemories]); // 這個管家只監控 longTermMemories

  // ✨ 全新！OOC 指令的存檔管家 (修正版) ✨
  useEffect(() => {
    // 避免在程式剛啟動、資料還沒載入完成時，就用一個空陣列覆蓋掉資料庫
    if (!isDataLoaded) return; 

    console.log("偵測到 OOC 指令變更，正在存入 IndexedDB...");
    db.kvStore.put({ key: 'oocCommands', value: oocCommands });
  }, [oocCommands, isDataLoaded]);

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
      // 檢查這個 messageId 是不是已經在陣列裡了
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
// ✨✨✨ 核心！負責生成圖片的函式 (最終整合修正版) ✨✨✨
// =================================================================================
  const handleGenerateScreenshot = useCallback(async () => {
    // 步驟 1: 基本檢查
    if (selectedMessageIds.length === 0) {
      alert('請先選擇至少一則訊息！');
      return;
    }
    alert(`正在生成 ${selectedMessageIds.length} 則訊息的截圖，按下確定後請稍候...`);

    // 步驟 2: 建立一個隱形的「截圖專用容器」
    const screenshotContainer = document.createElement('div');
    screenshotContainer.style.backgroundColor = theme === 'dark' ? '#222222' : '#f9fafb';
    screenshotContainer.style.padding = '25px';
    screenshotContainer.style.width = '600px';
    screenshotContainer.style.display = 'flex';
    screenshotContainer.style.flexDirection = 'column';
    screenshotContainer.style.gap = '15px';
    screenshotContainer.style.position = 'absolute';
    screenshotContainer.style.left = '-9999px';
    screenshotContainer.style.top = '0px';

    // 步驟 3: 排序並複製訊息到新容器中
    const currentHistory = chatHistories[activeChatCharacterId]?.[activeChatId] || [];
    const sortedSelectedIds = currentHistory
      .map(msg => msg.id)
      .filter(id => selectedMessageIds.includes(id));

    const allMessagesInDom = Array.from(document.querySelectorAll('.messages-area .message'));
    
    sortedSelectedIds.forEach(msgId => {
      const originalMessageNode = allMessagesInDom.find(node => node.dataset.messageId == msgId);
      if (originalMessageNode) {
        const clonedMessageNode = originalMessageNode.cloneNode(true);
        
        clonedMessageNode.classList.remove('screenshot-mode', 'selected');
        const bubbleWrapper = clonedMessageNode.querySelector('.bubble-wrapper');
        if (bubbleWrapper) {
          bubbleWrapper.onclick = null;
        }
        
        // ✨ 這裡使用我們在步驟 2 中建立的 screenshotContainer
        screenshotContainer.appendChild(clonedMessageNode);
      }
    });

    // 步驟 4: 將準備好的容器暫時加入到網頁中
    document.body.appendChild(screenshotContainer);

    try {
      // 步驟 5: 呼叫 html2canvas 進行「拍攝」
      const canvas = await html2canvas(screenshotContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      // 步驟 6: 將畫布轉換成圖片並觸發下載
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      link.download = `chat-screenshot-${timestamp}.png`;
      link.href = image;
      link.click();

    } catch (error) {
      console.error('截圖生成失敗:', error);
      alert('抱歉，生成截圖時發生錯誤，請查看主控台以獲取詳細資訊。');
    } finally {
      // 步驟 7: 清理戰場！
      document.body.removeChild(screenshotContainer);
      
      // 步驟 8: 退出截圖模式
      handleToggleScreenshotMode();
    }
    
  }, [selectedMessageIds, theme, handleToggleScreenshotMode, chatHistories, activeChatCharacterId, activeChatId]); // 確保依賴項包含所有用到的 state

  const handleProviderChange = useCallback((provider) => {
    setApiProvider(provider);
    setApiModel(apiProviders[provider].models[0]);
    // ✨✨✨ 核心邏輯：從 "通訊錄" 中讀取新供應商的金鑰，並更新到 "顯示器" ✨✨✨
  setApiKey(apiKeysByProvider[provider] || '');

  // 切換後，重置連線狀態
  setIsApiConnected(false);
  setLoadedConfigName('');
  setCurrentApiKeyIndex(0); // 重置金鑰索引
}, [apiProviders, apiKeysByProvider]); // ✨ 加入 apiKeysByProvider 作為依賴項

  const handleApiKeyChange = useCallback((value) => {
    setApiKey(value);
    setApiKeysByProvider(prev => ({
    ...prev,
    [apiProvider]: value // 使用 [apiProvider] 作為動態的 object key
  }));
  
  // 3. 任何修改都應該重置連線狀態
  setIsApiConnected(false);
  setLoadedConfigName('');
}, [apiProvider]); // ✨ 依賴項現在是 apiProvider

// =====================================================================
// ✨✨✨ 全新！「更新」函式 ✨✨✨
// =====================================================================
const handleUpdateConfiguration = useCallback(async () => {
  // 安全檢查：如果沒有載入任何配置，這個函式不應該被執行
  if (!loadedConfigId) {
    alert('錯誤：沒有載入任何配置可供更新。');
    return;
  }

  console.log(`正在更新現有配置 ID: ${loadedConfigId}`);
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
    alert(`✅ 已更新配置：「${configName}」`);
  } catch (error) {
    console.error("更新 API 配置失敗:", error);
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
  
  console.log("正在另存為新配置...");
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
    
    alert(`✅ 已另存為新配置：「${configName}」`);
  } catch (error) {
    console.error("另存新配置失敗:", error);
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
        console.error("刪除 API 配置失敗:", error);
        alert('❌ 刪除 API 配置失敗！');
      }
    }
  }, [apiConfigs]);

  const savePrompt = useCallback(async (promptData) => {
    try {
      await db.prompts.put(promptData);
      const existingIndex = prompts.findIndex(p => p.id === promptData.id);
      let updatedPrompts = existingIndex > -1
        ? prompts.map(p => p.id === promptData.id ? promptData : p)
        : [...prompts, promptData];
      setPrompts(updatedPrompts);
      alert(existingIndex > -1 ? `✅ 已更新提示詞：「${promptData.name}」` : `✅ 已儲存新提示詞：「${promptData.name}」`);
    } catch (error) {
      console.error("儲存提示詞失敗:", error);
      alert('❌ 儲存提示詞失敗！');
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
      console.error("刪除提示詞失敗:", error);
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
        console.error("還原提示詞失敗:", error);
        alert('❌ 還原提示詞失敗！');
      }
    }
  }, [prompts]);

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
        console.error("生成角色卡失敗:", error);
        alert('❌ 生成 PNG 角色卡失敗，請檢查主控台中的錯誤訊息。');
      }
      return; // 匯出後，結束函式，不做儲存操作
    }

    // ✨ 如果是正常的儲存請求 (舊有邏輯保持不變) ✨
    if (characterData) {
      try {
        await db.characters.put(characterData); // 告訴資料庫儲存這本書
        
        const existingIndex = characters.findIndex(c => c.id === characterData.id);
        let updatedCharacters = existingIndex > -1
          ? characters.map(c => c.id === characterData.id ? characterData : c)
          : [...characters, characterData];
        setCharacters(updatedCharacters);
        closeEditor();
        alert(existingIndex > -1 ? `✅ 已更新角色：「${characterData.name}」` : `✅ 已創建新角色：「${characterData.name}」`);
      
      } catch (error) {
        console.error("儲存角色失敗:", error);
        alert('❌ 儲存角色失敗！');
      }
    }
  }, [characters, editingCharacter]); // ✨ 加入新的依賴項 editingCharacter

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
      alert('🗑️......角色已離開');
      closeEditor();
      closePreview();

    } catch (error) {
      console.error("刪除角色失敗:", error);
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
      console.error("更新角色收藏狀態失敗:", error);
      // 如果儲存失敗，可以選擇是否要還原畫面狀態
    }
  }, [characters]);  
  
// ==================== ✨ 全新！SillyTavern 風格的 V3 角色卡匯入函式 ✨ ====================
  const handleImportCharacter = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log(`準備匯入 ${files.length} 個檔案...`);
    let successCount = 0;
    let failureCount = 0;
    const newlyImported = [];

    for (const file of files) {
      try {
        let characterJsonData;
        let characterAvatar = { type: 'icon', data: 'UserCircle' };

        // (getCharacterDataFromPng 輔助函式保持不變，這裡省略)
        const getCharacterDataFromPng = (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const buffer = e.target.result;
                const view = new DataView(buffer);
                if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
                  reject(new Error('不是有效的 PNG 檔案。'));
                  return;
                }
                let offset = 8;
                const textDecoder = new TextDecoder('utf-8');
                while (offset < view.byteLength) {
                  const length = view.getUint32(offset);
                  const type = textDecoder.decode(buffer.slice(offset + 4, offset + 8));
                  if (type === 'tEXt') {
                    const chunkData = buffer.slice(offset + 8, offset + 8 + length);
                    let keyword = '';
                    let i = 0;
                    while (i < length) {
                      const charCode = new DataView(chunkData).getUint8(i);
                      if (charCode === 0) { break; }
                      keyword += String.fromCharCode(charCode);
                      i++;
                    }
                    if (keyword === 'chara') {
                      const base64Data = textDecoder.decode(chunkData.slice(i + 1));
                      const decodedJsonString = base64ToUtf8(base64Data);
                      resolve(JSON.parse(decodedJsonString));
                      return;
                    }
                  }
                  offset += 12 + length;
                }
                reject(new Error('在 PNG 檔案中找不到角色資料 (tEXt chunk)。'));
              } catch (err) {
                reject(new Error('解析 PNG 檔案失敗：' + err.message));
              }
            };
            reader.onerror = () => reject(new Error('讀取檔案失敗。'));
            reader.readAsArrayBuffer(file);
          });
        };


        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          characterJsonData = JSON.parse(await file.text());
        } else if (file.type === 'image/png') {
          characterJsonData = await getCharacterDataFromPng(file);
          const originalBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(file);
          });
          const compressedBase64 = await compressImage(originalBase64);
          characterAvatar = { type: 'image', data: compressedBase64 };
        } else {
          console.warn(`不支援的檔案格式，已略過: ${file.name}`);
          failureCount++;
          continue;
        }
        
        const isV2OrV3Card = characterJsonData.spec?.startsWith('chara_card_v');
        const cardData = isV2OrV3Card ? characterJsonData.data : characterJsonData;
        if (!cardData.name && !cardData.char_name) {
          console.warn(`檔案格式錯誤，找不到角色名稱，已略過: ${file.name}`);
          failureCount++;
          continue;
        }

        // ✨ 核心修改：不再合併，而是分開儲存 ✨
        const newCharacter = {
          id: Date.now() + successCount,
          name: cardData.name || cardData.char_name,
          
          // --- 直接對應欄位 ---
          description: cardData.description || '',
          personality: cardData.personality || '',
          scenario: cardData.scenario || '',
          mes_example: cardData.mes_example || '',
          
          firstMessage: cardData.first_mes || '',
          alternateGreetings: cardData.alternate_greetings || [],
          creatorNotes: cardData.creator_notes || characterJsonData.creatorcomment || '',
          avatar: characterAvatar,
          characterBook: cardData.character_book || null,
          fav: cardData.fav || false,
          
          // --- 將額外資訊也存進來，以便未來使用 ---
          system_prompt: cardData.system_prompt || '',
          post_history_instructions: cardData.post_history_instructions || '',
          depth_prompt: cardData.extensions?.depth_prompt?.prompt || '',
        };
        
        newlyImported.push(newCharacter);
        successCount++;

      } catch (error) {
        console.error(`匯入檔案 ${file.name} 失敗:`, error);
        failureCount++;
      }
    }

    if (newlyImported.length > 0) {
      await db.characters.bulkPut(newlyImported);
      setCharacters(prev => [...prev, ...newlyImported]);
    }

    let summaryMessage = `✅ 批次匯入完成！\n\n`;
    if (successCount > 0) summaryMessage += `成功匯入 ${successCount} 個角色。\n`;
    if (failureCount > 0) summaryMessage += `有 ${failureCount} 個檔案匯入失敗，詳情請查看主控台。`;
    alert(summaryMessage);

    if (event && event.target) {
      event.target.value = '';
    }
  }, [characters]); // 依賴項不變

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
    // 檢查是更新還是新增
    if (editingUserProfileId) {
      // 更新：用 map 找到對應 ID 的那一筆，然後替換掉
      updatedProfiles = userProfiles.map(p => 
        p.id === editingUserProfileId ? { ...p, ...profileData } : p
      );
    } else {
      // 新增：在列表後面加上新的一筆
      const newProfile = { id: `user_${Date.now()}`, ...profileData };
      updatedProfiles = [...userProfiles, newProfile];
    }
    
    // 更新畫面並存入資料庫
    setUserProfiles(updatedProfiles);
    await db.kvStore.put({ key: 'userProfiles', value: updatedProfiles });
    
    closeUserProfileEditor(); // 關閉編輯視窗
    alert('✅ 個人檔案已儲存！');
  }, [userProfiles, editingUserProfileId]);

  // 刪除個人檔案
  const handleDeleteUserProfile = useCallback(async (profileId) => {
    if (userProfiles.length <= 1) {
      alert('❌ 至少需要保留一個個人檔案。');
      return;
    }

    if (window.confirm('確定要刪除這個個人檔案嗎？')) {
      const updatedProfiles = userProfiles.filter(p => p.id !== profileId);
      setUserProfiles(updatedProfiles);
      await db.kvStore.put({ key: 'userProfiles', value: updatedProfiles });
    
      alert('🗑️ 個人檔案已刪除。');
    }
  }, [userProfiles]);

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

  // ✨✨✨ 升級版！建立聊天室時綁定使用者 ID ✨✨✨
  const handleStartChat = useCallback((character, greeting, selectedProfileId) => {
    setCurrentCharacter(character);
    
    // 找出要用哪個使用者來替換佔位符
    const startingProfile = userProfiles.find(p => p.id === selectedProfileId) || userProfiles[0];

    const allGreetings = [
      character.firstMessage,
      ...(character.alternateGreetings || [])
    ].filter(Boolean).map(g => applyPlaceholders(g, character, startingProfile));

    const newChatId = `chat_${Date.now()}`;
    
    let initialHistory = [];
    if (allGreetings.length > 0) {
      const selectedIndex = allGreetings.indexOf(applyPlaceholders(greeting, character, startingProfile));
      const firstMessage = {
        id: Date.now(),
        sender: 'ai',
        contents: allGreetings, 
        activeContentIndex: selectedIndex !== -1 ? selectedIndex : 0, 
        timestamp: getFormattedTimestamp(),
      };
      initialHistory = [firstMessage];
    }

    setChatHistories(prev => {
      const newHistories = { ...prev };
      if (!newHistories[character.id]) newHistories[character.id] = {};
      newHistories[character.id][newChatId] = initialHistory;
      return newHistories;
    });
    
    // ✨ 核心修改：在建立 metadata 時，把使用者 ID 存進去！
    setChatMetadatas(prev => {
      const newMetas = { ...prev };
      if (!newMetas[character.id]) newMetas[character.id] = {};
      newMetas[character.id][newChatId] = { 
        name: '', 
        notes: '', 
        pinned: false, 
        userProfileId: selectedProfileId // ✨ 在這裡綁定 ID
      };
      return newMetas;
    });
    
    setActiveChatCharacterId(character.id);
    setActiveChatId(newChatId);

    closePreview();
    navigateToPage('chat');
  }, [navigateToPage, getFormattedTimestamp, userProfiles]); // ✨ 新增 userProfiles 依賴項

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
    console.log(`正在測試金鑰 #${i + 1}...`);
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
         console.warn(`金鑰 #${i + 1} 失敗，狀態碼: ${response.status}`);
      }
    } catch (error) {
      console.error(`金鑰 #${i + 1} 發生錯誤:`, error);
    }
  }

  // 4. 如果所有金鑰都試完了還是失敗，才顯示最終的失敗訊息
  if (!isConnectionSuccessful) {
    setIsApiConnected(false);
    alert('❌ 所有 API 金鑰均無法連接。請檢查金鑰、網路連線或 API 服務狀態。');
  }

  setApiTestLoading(false);
}, [apiKey, apiProvider, apiModel, apiProviders]);

  // =================================================================================
  // ✨✨✨ 最終完美版！sendToAI (v5) - 加入 Gemini 安全設定 ✨✨✨
  // =================================================================================
  const sendToAI = useCallback(async (userInput, currentMessages) => {
    // --- 1. API 檢查 (保持不變) ---
    const provider = apiProviders[apiProvider];
    if (!provider) throw new Error(`API provider "${apiProvider}" not found.`);
    const allKeys = apiKey.split('\n').map(k => k.trim()).filter(Boolean);
    if (allKeys.length === 0) throw new Error('尚未設定 API 金鑰。');
    const currentKey = allKeys[currentApiKeyIndex];
    if (!currentKey) throw new Error(`金鑰 #${currentApiKeyIndex + 1} 無效或不存在。`);
    console.log(`正在使用金鑰 #${currentApiKeyIndex + 1} 進行請求...`);

    // --- 2. 準備所有「食材」(保持不變) ---
    const estimateTokens = (text = '') => text ? text.length : 0;
    const maxContextTokens = currentPrompt?.contextLength || 30000;
    const activeMemory = longTermMemories[activeChatCharacterId]?.[activeChatId] || null;
    const activeAuthorsNote = chatMetadatas[activeChatCharacterId]?.[activeChatId]?.authorsNote || null;
    const userDescription = (currentUserProfile?.name || currentUserProfile?.description)
      ? `[User Persona]\nName: ${currentUserProfile.name || 'Not Set'}\nDescription: ${currentUserProfile.description || 'Not Set'}`
      : null;

    // --- 3. 準備【格式化】的聊天紀錄 (關鍵修正！) ---
    // 我們先只準備純文字格式的，方便注入到模組裡
    let chatHistoryString = currentMessages
        .map(msg => {
            const senderName = msg.sender === 'user' ? (currentUserProfile?.name || 'User') : currentCharacter.name;
            return `${senderName}: ${msg.contents[msg.activeContentIndex]}`;
        })
        .join('\n');
        
    // --- 4. 準備【全功能】佔位符字典 (關鍵修正！) ---
    const placeholderMap = {
      '{{char}}': currentCharacter.description || '',
      '{{user}}': userDescription || '',
      // ✨ 核心改變：我們現在注入純文字的聊天歷史
      '{{chat_history}}': chatHistoryString,
      '{{description}}': currentCharacter.description || '',
      '{{persona}}': userDescription || '',
      '{{personality}}': currentCharacter.personality ? `[Personality]\n${currentCharacter.personality}` : '',
      '{{Personality}}': currentCharacter.personality ? `[Personality]\n${currentCharacter.personality}` : '',
      '{{scenario}}': currentCharacter.scenario ? `[Scenario]\n${currentCharacter.scenario}` : '',
      '{{mes_example}}': currentCharacter.mes_example ? `[Dialogue Example]\n${currentCharacter.mes_example}` : '',
      '{{example_dialogue}}': currentCharacter.mes_example ? `[Dialogue Example]\n${currentCharacter.mes_example}` : '',
      '{{memory}}': activeMemory ? `[Long-Term Memory]\n${activeMemory}` : '',
      '{{summary}}': activeMemory ? `[Long-Term Memory]\n${activeMemory}` : '', // 兼容
      '{{authors_note}}': activeAuthorsNote ? `[Author's Note]\n${activeAuthorsNote}` : '',
      '{{system_prompt}}': currentCharacter.system_prompt || '',
      '{{post_history_instructions}}': currentCharacter.post_history_instructions || '',
      '{{depth_prompt}}': currentCharacter.depth_prompt ? `[角色備註]\n${currentCharacter.depth_prompt}`: '',
      // ✨ 新增！處理 Mure 提示詞中的 {{group}} 佔位符
      '{{group}}': currentCharacter.name,
    };
    
    // --- 5. 【全新邏輯】組合系統指令和對話內容 ---
    let systemInstructionParts = [];
    let historyForAPI = [];
    
    // 遍歷所有啟用的模組
    const enabledModules = currentPrompt?.modules?.filter(m => m.enabled) || [];
    for (const module of enabledModules) {
        let moduleContent = module.content || '';

        // 進行佔位符替換 (trim 和其他特殊指令可以在此處理)
        if (moduleContent.includes('{{trim}}')) {
            moduleContent = moduleContent.replace(/\{\{\/\/\s*(.*?)\s*\}\}\{\{trim\}\}/g, '').trim();
        }

        for (const [placeholder, value] of Object.entries(placeholderMap)) {
            const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
            moduleContent = moduleContent.replace(regex, value || '');
        }

        if (moduleContent.trim() === '') continue;

        // 【核心判斷】根據模組的角色 (role) 分配到不同的地方
        if (module.role === 'system') {
            systemInstructionParts.push(moduleContent);
        } else if (module.role === 'user' || module.role === 'assistant') {
            historyForAPI.push({
                // 將 assistant 轉換為 Gemini 認識的 model
                role: module.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: moduleContent }]
            });
        }
    }
    
    // 將過去的真實對話歷史，按照 user/model 的格式加入
    currentMessages.forEach(msg => {
        historyForAPI.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.contents[msg.activeContentIndex] }]
        });
    });

    // 加入本次使用者輸入的訊息
    if (typeof userInput === 'string' && userInput.trim() !== '') {
        historyForAPI.push({
            role: 'user',
            parts: [{ text: userInput }]
        });
    }

    // --- 6. 發送最終請求 (保持不變的部分) ---
    try {
        let endpoint = provider.endpoint;
        const currentKey = apiKey.split('\n').map(k => k.trim()).filter(Boolean)[currentApiKeyIndex];
        const headers = provider.headers(currentKey);
        const maxOutputTokens = currentPrompt?.maxTokens || 6000;
        const temperature = currentPrompt?.temperature || 1.2;
        let requestBody;

        if (provider.isGemini) {
            endpoint = `${provider.endpoint}${apiModel}:generateContent?key=${currentKey}`;
            
            // 【關鍵修正！】組合最終的請求體
            requestBody = {
              contents: historyForAPI, // 這裡只放真正的對話
              systemInstruction: {
                parts: [{ text: systemInstructionParts.join('\n\n') }] // 這裡放所有的規則
              },
              generationConfig: { temperature, maxOutputTokens },
              safetySettings: [
                  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ]
            };
        } else {
          // 【✨ 修正 ✨】
          // 為了兼容 OpenAI/Claude 等格式，我們需要重新組合一個類似 finalMessages 的陣列
          
          const finalMessagesForOtherAPIs = [];

          // 1. 先將所有系統指令合併成一個大的 system message
          const systemContent = systemInstructionParts.join('\n\n');
          if (systemContent) {
              finalMessagesForOtherAPIs.push({ role: 'system', content: systemContent });
          }

          // 2. 接著，將 user/model (assistant) 的對話歷史加進來
          historyForAPI.forEach(msg => {
              finalMessagesForOtherAPIs.push({
                  // 將 Gemini 的 'model' 轉回通用的 'assistant'
                  role: msg.role === 'model' ? 'assistant' : 'user',
                  content: msg.parts[0].text 
              });
          });

          // 現在，我們可以使用這個 finalMessagesForOtherAPIs 來建立請求
          // (下面的邏輯是 Claude 的特殊處理，如果您的 App 不需要，可以直接使用 finalMessagesForOtherAPIs)

          if (apiProvider === 'claude') {
              // Claude 需要特別處理：將 system message 分離出來
              const claudeSystemPrompt = finalMessagesForOtherAPIs.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
              const claudeUserAssistantHistory = finalMessagesForOtherAPIs.filter(m => m.role !== 'system');
              requestBody = { model: apiModel, max_tokens: maxOutputTokens, temperature, messages: claudeUserAssistantHistory, system: claudeSystemPrompt };
          } else {
              // 對於標準 OpenAI 格式的 API
              requestBody = { model: apiModel, messages: finalMessagesForOtherAPIs, max_tokens: maxOutputTokens, temperature };
          }
      }

      // --- 7. 後續處理 (保持不變) ---
      console.log("最終發送給 API 的請求:", JSON.stringify(requestBody, null, 2));
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
      
      // ✨ Gemini 被攔截時，aiText 會是 null，但 data 裡面會有 blockReason
      if (data.promptFeedback && data.promptFeedback.blockReason) {
          throw new Error(`請求被 Gemini 安全系統攔截，原因：${data.promptFeedback.blockReason}`);
      }
      
      if (aiText && aiText.trim() !== '') {
        console.log(`金鑰 #${currentApiKeyIndex + 1} 請求成功！`);
        return aiText;
      } else {
        // 如果 aiText 是空的，但又沒有 blockReason，就回傳一個更通用的錯誤
        throw new Error('AI 回應為空或格式不正確');
      }
    } catch (error) {
      console.error(`金鑰 #${currentApiKeyIndex + 1} 失敗:`, error.message);
      throw error;
    }
  }, [
    apiKey, apiProvider, apiModel, currentCharacter, currentPrompt, apiProviders,
    currentUserProfile, longTermMemories, activeChatCharacterId, activeChatId,
    chatMetadatas, currentApiKeyIndex
  ]);

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
        const conversationText = history.map(m => `${m.sender === 'user' ? (currentUserProfile?.name || 'User') : currentCharacter.name}: ${m.contents[m.activeContentIndex]}`).join('\n');
        const summaryPrompt = `請將以下的對話創造一個簡潔的總結，應以第三人稱書寫。重點關注關鍵情節點、人物發展以及關鍵訊息交流。這份總結將作為角色的長期記憶，因此準確性和客觀性至關重要。請不要使用任何粗體格式（**文字**）來回應，保持純文字格式即可。\n\n對話內容：\n${conversationText}`;

        const summary = await sendToAI(summaryPrompt, []);

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
        console.error("記憶更新失敗:", error);
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

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        contents: [aiResponse],
        activeContentIndex: 0,
        timestamp: getFormattedTimestamp(),
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
        console.log(`對話達到 ${finalHistoryArray.length} 則，正在背景自動更新長期記憶...`);
        await triggerMemoryUpdate(true); 
        console.log("背景記憶更新完成！");
      }
    } catch (error) {
      console.error("訊息發送失敗:", error);
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
          console.log(`API 金鑰失敗，已準備切換至下一把金鑰 (索引 ${newIndex})`);
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
      
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        contents: [aiResponse],
        activeContentIndex: 0,
        timestamp: getFormattedTimestamp(),
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
    console.error("續寫失敗:", error);
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

      if (typeof aiResponse !== 'undefined') {
        
        // 關鍵修正：我們先複製一份當前的歷史紀錄，才能對它進行修改。
        const newHistoryArray = JSON.parse(JSON.stringify(currentHistory));
        
        const messageToUpdate = newHistoryArray[newHistoryArray.length - 1];
        messageToUpdate.contents.push(aiResponse);
        messageToUpdate.activeContentIndex = messageToUpdate.contents.length - 1;
        
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
  const handleSaveChatNotes = useCallback((newNotes) => {
    if (!editingMetadata) return;
    const { charId, chatId } = editingMetadata;
    
    setChatMetadatas(prev => {
      const newMetas = JSON.parse(JSON.stringify(prev));
      // 確保物件路徑存在
      if (!newMetas[charId]) newMetas[charId] = {};
      if (!newMetas[charId][chatId]) newMetas[charId][chatId] = { pinned: false };
      
      newMetas[charId][chatId].notes = newNotes;
      return newMetas;
    });

    setEditingMetadata(null); // 關閉編輯視窗
    alert('✅ 聊天備註已儲存！');
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

  const handleDeleteChat = useCallback((charId, chatId) => {
    // 步驟 1：彈出確認視窗，保持不變
    if (window.confirm('確定要永久刪除這段對話紀錄嗎？\n\n無法復原喔！\n\n確定喔？')) {
      
      // 步驟 2：從聊天歷史中刪除，保持不變
      setChatHistories(prev => {
        const newHistories = JSON.parse(JSON.stringify(prev));
        if (newHistories[charId]) {
          delete newHistories[charId][chatId];
        }
        return newHistories;
      });

      // 步驟 3：從 metadata (釘選狀態) 中刪除，保持不變
      setChatMetadatas(prev => {
        const newMetadatas = JSON.parse(JSON.stringify(prev));
        if (newMetadatas[charId]) {
          delete newMetadatas[charId][chatId];
        }
        return newMetadatas;
      });
      
      // ✨✨✨ 步驟 4 (全新！)：從長期記憶中刪除 ✨✨✨
      setLongTermMemories(prev => {
        const newMemories = JSON.parse(JSON.stringify(prev));
        // 同樣檢查該角色的記憶物件是否存在
        if (newMemories[charId]) {
          // 只刪除與這個被刪除的 chatId 對應的那一份記憶
          delete newMemories[charId][chatId];
        }
        return newMemories;
      });
      
      // 步驟 5：跳轉邏輯，保持不變
      if (activeChatId === chatId) {
          setActiveChatCharacterId(null);
          setActiveChatId(null);
          setCurrentCharacter(null);
      }
    }
  }, [activeChatId]);

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
    // 步驟 1: 取得使用者選擇的檔案
    const file = event.target.files[0];
    if (!file) {
      return; // 如果使用者取消選擇，就什麼都不做
    }
    if (!activeChatCharacterId || !activeChatId) {
      alert('請先選擇一個聊天室，才能匯入紀錄！');
      event.target.value = ''; // 清空選擇，以便下次還能選同個檔案
      return;
    }

    const reader = new FileReader();

    // 步驟 2: 當檔案讀取完成時，開始進行翻譯
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const lines = content.split('\n').filter(line => line.trim() !== ''); // 切割成一行一行，並過濾掉空行

        const importedMessages = [];
        // 我們從第二行開始讀取，因為第一行是標頭資訊
        for (let i = 1; i < lines.length; i++) {
          const lineData = JSON.parse(lines[i]);

          // 安全檢查，確保這是一個對話訊息
          if (typeof lineData.is_user === 'undefined' || !lineData.mes) {
            continue;
          }

          // 逆向翻譯回我們 App 的格式
          const ourMessage = {
            id: Date.now() + i, // 產生一個獨一無二的 ID
            sender: lineData.is_user ? 'user' : 'ai',
            contents: lineData.swipes || [lineData.mes],
            activeContentIndex: (lineData.swipes || [lineData.mes]).indexOf(lineData.mes),
            timestamp: getFormattedTimestamp(), // 我們自己產生一個新的時間戳
          };
          
          // 如果找不到 activeContentIndex，預設為 0
          if (ourMessage.activeContentIndex === -1) {
            ourMessage.activeContentIndex = 0;
          }

          importedMessages.push(ourMessage);
        }

        // 步驟 3: 詢問使用者要如何處理這些匯入的訊息
        if (importedMessages.length > 0) {
          const shouldAppend = window.confirm(`✅ 成功解析到 ${importedMessages.length} 則對話。\n\n請問您要如何處理？\n\n- 按下「確定」= 將這些訊息【附加】到目前對話的後面。\n- 按下「取消」= 用這些訊息【覆蓋】掉目前的對話。`);
          
          setChatHistories(prev => {
            const newHistories = {...prev};
            const currentChat = newHistories[activeChatCharacterId]?.[activeChatId] || [];
            newHistories[activeChatCharacterId][activeChatId] = shouldAppend 
              ? [...currentChat, ...importedMessages] 
              : importedMessages;
            return newHistories;
          });

          alert(`✅ 操作完成！已成功${shouldAppend ? '附加' : '覆蓋'} ${importedMessages.length} 則對話！`);
        } else {
          alert('❌ 檔案中沒有找到可以匯入的對話內容。');
        }

      } catch (error) {
        alert('❌ 匯入失敗，檔案格式可能不正確。\n錯誤訊息：' + error.message);
      } finally {
        // 清空檔案選擇器的值，這樣使用者下次才能再次選擇同一個檔案
        event.target.value = '';
      }
    };

    // 步驟 4: 開始讀取檔案
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
    if (!file) return;
    if (!activeChatCharacterId || !activeChatId) {
      alert('請先選擇一個聊天室，才能匯入紀錄！');
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
        const importedMessages = [];
        
        lines.forEach(line => {
          const messageMatch = line.match(/\[(.*?)\] (.*?): (.*)/);
          if (messageMatch) {
            const [, timestamp, sender, text] = messageMatch;
            importedMessages.push({
              id: Date.now() + Math.random(),
              timestamp: timestamp || getFormattedTimestamp(),
              sender: sender === (currentUserProfile?.name || '用戶') ? 'user' : 'ai',
              contents: [text],
              activeContentIndex: 0
            });
          }
        });
        
        if (importedMessages.length > 0) {
          const shouldAppend = window.confirm(`找到 ${importedMessages.length} 則對話記錄。\n\n點擊「確定」= 添加到現有對話\n點擊「取消」= 替換所有對話`);
          
          setChatHistories(prev => {
            const newHistories = {...prev};
            const currentChat = newHistories[activeChatCharacterId]?.[activeChatId] || [];
            newHistories[activeChatCharacterId][activeChatId] = shouldAppend ? [...currentChat, ...importedMessages] : importedMessages;
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
    event.target.value = '';
  }, [currentUserProfile, activeChatCharacterId, activeChatId, getFormattedTimestamp]);

  const clearAllData = useCallback(() => {
    if (window.confirm('⚠️ 確定要清除所有資料嗎？此操作無法復原！\n\n將會清除：\n• 所有聊天紀錄\n• 角色資料\n• 提示詞\n• 使用者設定\n• API 配置')) {
      localStorage.clear();
      window.location.reload();
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
                oocCommands={oocCommands}
                onOpenOocSelector={() => setIsOocCommandSelectorOpen(true)}
                onSelectOocCommand={handleSelectOocCommand}
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
              />
            )
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
            />
          )}
          {currentPage === 'settings' && (
            <SettingsPage
              oocCommands={oocCommands}
              onNewOocCommand={handleOpenOocCommandEditorForNew}
              onEditOocCommand={handleOpenOocCommandEditorForEdit}
              onDeleteOocCommand={handleDeleteOocCommand}
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
              exportChatHistory={exportChatHistory}
              handleImportChat={handleImportChat}
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
          onSave={handleSaveChatNotes}
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
      console.error("圖片載入失敗，無法壓縮:", error);
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

// ==================== ✨ 全新升級版！引號高亮函式 ✨ ====================
const highlightQuotedText = (text) => {
  if (!text) return '';

  // ✨ 核心修改：使用捕獲組 (括號) 將引號和內容分開
  const regex = /(「|“|"|『|【)(.*?)(」|”|"|』|】)/g;
  
  return text.replace(regex, (match, openQuote, content, closeQuote) => {
    // ✨ 我們將引號和內容分別用 span 包起來，並加上專屬的 class
    return `<span class="quoted-text"><span class="quote-char open-quote">${openQuote}</span>${content}<span class="quote-char close-quote">${closeQuote}</span></span>`;
  });
};

// ==================== 全新！可靠的 UTF-8 <=> Base64 轉換輔助函式 ====================
// 將包含 UTF-8 字元 (例如中文) 的字串安全地轉換為 Base64
const utf8ToBase64 = (str) => {
  try {
    const bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (error) {
    console.error("UTF-8 to Base64 conversion failed:", error);
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
    console.error("Base64 to UTF-8 conversion failed:", error);
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
    console.error("在生成角色卡前處理圖片時發生錯誤:", error);
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

export default ChatApp;