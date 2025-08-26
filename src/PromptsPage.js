import React, { useState } from 'react'; // 引入 React 和 useState
import { FileText, Plus, Upload } from 'lucide-react'; // 引入您有用到的圖示

// 提示詞頁面組件 (全新佈局版本)
const PromptsPage = ({ prompts, currentPrompt, setCurrentPrompt, savePrompt, deletePrompt, restoreDefaultPrompts }) => {
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [promptName, setPromptName] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [contextLength, setContextLength] = useState(24000);
  
  // ✨ 新增 state 來控制列表是否展開 ✨
  const [isListExpanded, setIsListExpanded] = useState(true);

  // 當選擇一個已儲存的提示詞時
  const handleSelectPrompt = (prompt) => {
    setCurrentPrompt(prompt);
    setEditingPrompt(prompt);
    setPromptName(prompt.name);
    setPromptContent(prompt.content);
    setTemperature(prompt.temperature || 0.7);
    setMaxTokens(prompt.maxTokens || 800);
    setContextLength(prompt.contextLength || 24000);
    // ✨ 選好後自動收起列表，方便編輯 ✨
    setIsListExpanded(false); 
  };

  const handleSave = () => {
    if (!promptName.trim()) {
      alert('請為您的提示詞命名！');
      return;
    }
    const newPromptData = {
      id: editingPrompt ? editingPrompt.id : Date.now(), 
      name: promptName,
      content: promptContent,
      temperature: Number(temperature),
      maxTokens: Number(maxTokens),
      contextLength: Number(contextLength),
    };
    savePrompt(newPromptData);
    handleClearEditor();
  };
  
  const handleDelete = () => {
    if (editingPrompt) {
      if (window.confirm(`確定要刪除「${editingPrompt.name}」嗎？`)) {
        deletePrompt(editingPrompt.id);
        handleClearEditor();
      }
    } else {
      alert('請先選擇一個要刪除的提示詞。');
    }
  };

  const handleClearEditor = () => {
    setEditingPrompt(null);
    setPromptName('');
    setPromptContent('');
    setTemperature(0.7);
    setMaxTokens(800);
    setContextLength(4096);
    // ✨ 清空編輯器時，自動展開列表方便選擇 ✨
    setIsListExpanded(true);
  };

  const handleImportPrompt = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        let name, content, temp, max, context;
        if (importedData.content !== undefined) {
          name = importedData.name || '';
          content = importedData.content || '';
          temp = importedData.temperature || 0.7;
          max = importedData.maxTokens || 800;
          context = importedData.contextLength || 4096;
        } else if (importedData.description !== undefined) {
          name = importedData.char_name || '匯入的角色提示';
          let fullDesc = importedData.description || '';
          if(importedData.first_mes) {
            fullDesc += `\n\n[角色的第一句話是：${importedData.first_mes}]`;
          }
          content = fullDesc;
          temp = 0.7; max = 800; context = 4096;
        } else {
          alert('❌ 無法識別的檔案格式。');
          return;
        }
        setPromptName(name); setPromptContent(content);
        setTemperature(temp); setMaxTokens(max); setContextLength(context);
        setEditingPrompt(null);
        alert('✅ 提示詞已成功載入編輯器，請確認後儲存。');
      } catch (error) {
        alert('❌ 檔案格式錯誤，請確認是正確的 JSON 檔案。');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="page-content">
      {/* ✨ 全新的 JSX 結構：上下佈局 ✨ */}
      <div className="content-area">
        
        {/* 上半部：可收合的已儲存提示詞列表 */}
        <div className="setting-card">
          <button
            className={`card-header ${isListExpanded ? 'expanded' : ''}`}
            onClick={() => setIsListExpanded(!isListExpanded)}
          >
            <div className="card-title">
              <FileText size={20} />
              <span>已儲存的提示詞 ({prompts.length})</span>
            </div>
            <span className="expand-arrow">{isListExpanded ? '▲' : '▼'}</span>
          </button>
          
          {isListExpanded && (
            <div className="card-content">
              {prompts.length === 0 ? (
                <p className="empty-list-text">還沒有任何提示詞</p>
              ) : (
                <div className="prompts-list">
                  {prompts.map((prompt) => (
                    <div 
                      key={prompt.id} 
                      className={`prompt-card ${currentPrompt?.id === prompt.id ? 'active' : ''}`}
                      onClick={() => handleSelectPrompt(prompt)}
                    >
                      <div className="prompt-info">
                        <h4>{prompt.name}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <hr className="divider" />
              <button onClick={restoreDefaultPrompts} className="restore-btn" style={{width: '100%'}}>還原所有的提示詞</button>
            </div>
          )}
        </div>

        {/* 下半部：提示詞編輯器 */}
        <div className="setting-card">
           <div className="card-header" style={{cursor: 'default'}}>
             <div className="card-title">
                <Plus size={20} />
                <span>{editingPrompt ? '編輯提示詞' : '新增提示詞'}</span>
              </div>
           </div>
           <div className="card-content">
              <div className="editor-form">
                <div className="form-group">
                  <label>提示詞名稱</label>
                  <input type="text" value={promptName} onChange={(e) => setPromptName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>提示詞內容</label>
                  <textarea value={promptContent} onChange={(e) => setPromptContent(e.target.value)} rows="8" />
                </div>
                <div className="sliders-group">
                  <div className="slider-container">
                    <label>溫度: {temperature}</label>
                    <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                  </div>
                  <div className="slider-container">
                    <label>最大回應: {maxTokens} tokens</label>
                    <input type="range" min="50" max="4096" step="10" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
                  </div>
                  <div className="slider-container">
                    <label>記憶容量 (上下文): {contextLength} Tokens</label>
                    <input type="range" min="500" max="64000" step="100" value={contextLength} onChange={(e) => setContextLength(e.target.value)} />
                  </div>
                </div>
                <div className="editor-buttons">
                  <button onClick={handleSave} className="save-btn">{editingPrompt ? '儲存變更' : '儲存新提示詞'}</button>
                  <button onClick={handleDelete} className="delete-btn" disabled={!editingPrompt}>刪除</button>
                  <button onClick={handleClearEditor} className="clear-btn">清空編輯器</button>
                </div>
                <div className="import-section">
                   <input type="file" id="import-prompt-json" accept=".json" onChange={handleImportPrompt} style={{ display: 'none' }} />
                    <label htmlFor="import-prompt-json" className="import-btn">
                      <Upload size={16} /> 匯入提示詞 (JSON)
                    </label>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PromptsPage;