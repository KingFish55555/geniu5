import React, { useState, useEffect } from 'react';
import { FileText, Plus, Save, Trash2, Upload, ChevronDown, Download, Settings, Edit2, FileInput, FileOutput } from 'lucide-react';
import ModuleEditorModal from './ModuleEditorModal';

const PromptsPage = ({ prompts, currentPrompt, setCurrentPrompt, savePrompt, deletePrompt, restoreDefaultPrompts, onOpenSwitcher }) => {
  
  const [editingModule, setEditingModule] = useState(null);
  const [tempParameters, setTempParameters] = useState(null);
  
  // ✨ 1. 新增一個專門用來管理「輸入框文字」的 State
  const [tempInputStrings, setTempInputStrings] = useState(null);

  useEffect(() => {
    if (currentPrompt) {
      const params = {
        temperature: currentPrompt.temperature ?? 1,
        maxTokens: currentPrompt.maxTokens ?? 1024,
        contextLength: currentPrompt.contextLength ?? 24000,
      };
      setTempParameters(params);
      // ✨ 當提示詞切換時，同時更新數字和文字
      setTempInputStrings({
        temperature: params.temperature.toFixed(2),
        maxTokens: String(params.maxTokens),
        contextLength: String(params.contextLength),
      });
    } else {
      setTempParameters(null);
      setTempInputStrings(null);
    }
  }, [currentPrompt]);

  const handleSaveParameters = (finalParams) => {
    if (!currentPrompt) return;
    const updatedPreset = { ...currentPrompt, ...finalParams };
    setCurrentPrompt(updatedPreset);
    savePrompt(updatedPreset);
    console.log("參數已儲存:", finalParams);
  };

  const handleSliderChange = (field, value) => {
    if (!tempParameters) return;
    const numericValue = parseFloat(value);
    setTempParameters(prev => ({ ...prev, [field]: numericValue }));
    // ✨ 拖動滑桿時，也更新文字輸入框
    setTempInputStrings(prev => ({
      ...prev,
      [field]: field === 'temperature' ? numericValue.toFixed(2) : String(numericValue)
    }));
  };

  // ✨ 2. 修改 onChange 邏輯：只更新文字，不做任何檢查
  const handleInputChange = (field, value) => {
    if (tempInputStrings === null) return;
    setTempInputStrings(prev => ({ ...prev, [field]: value }));
  };

  // ✨ 3. 新增 onBlur 邏輯：輸入完成後才檢查並儲存
  const handleInputBlur = (field, min, max) => {
    if (tempInputStrings === null) return;

    let numericValue = field === 'temperature' 
      ? parseFloat(tempInputStrings[field])
      : parseInt(tempInputStrings[field], 10);

    if (isNaN(numericValue)) numericValue = min;
    if (numericValue < min) numericValue = min;
    if (numericValue > max) numericValue = max;

    const finalParams = { ...tempParameters, [field]: numericValue };
    setTempParameters(finalParams);
    setTempInputStrings({
        temperature: finalParams.temperature.toFixed(2),
        maxTokens: String(finalParams.maxTokens),
        contextLength: String(finalParams.contextLength),
    });
    handleSaveParameters(finalParams);
  };

  const handleUpdateModule = (updatedModule) => {
    if (!currentPrompt) return;
    const modules = currentPrompt.modules || [];
    const newModules = modules.map(m => 
      m.id === updatedModule.id ? updatedModule : m
    );
    const updatedPreset = { ...currentPrompt, modules: newModules };
    savePrompt(updatedPreset);
    setEditingModule(null);
  };

  const handleExportPreset = () => {
    if (!currentPrompt) {
      alert("請先從列表中選擇一個已儲存的預設集來匯出。");
      return;
    }
    try {
      const jsonString = JSON.stringify(currentPrompt, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentPrompt.name || 'prompt_preset'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("匯出失敗:", error);
      alert("匯出失敗！詳情請見主控台。");
    }
  };

  const handleImportPreset = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        let presetToLoad;

        // 檢查是否是 SillyTavern 的提示詞檔案格式
        if (Array.isArray(importedData.prompts) && Array.isArray(importedData.prompt_order)) {
          const presetName = file.name.replace(/\.json$/i, '');
          const moduleMap = new Map(importedData.prompts.map(p => [p.identifier, p]));
          
          // ✨ 核心：找到針對一般角色的排序規則 (ID 100001)
          const orderGroup = importedData.prompt_order.find(group => group.character_id === 100001);
          const orderArray = orderGroup ? orderGroup.order : [];

          if (orderArray.length === 0) {
            throw new Error("在 SillyTavern 檔案中找不到有效的 'prompt_order' 順序列表。");
          }
          
          // 根據 order 重新組合模組列表
          const convertedModules = orderArray.map((orderItem, index) => {
            const moduleData = moduleMap.get(orderItem.identifier);
            if (!moduleData) return null;

            return {
              id: moduleData.identifier || `module_imported_${Date.now()}_${index}`,
              name: moduleData.name || `未命名模組 ${index + 1}`,
              content: moduleData.content || '',
              enabled: orderItem.enabled, // ✨ 使用 order 中的啟用狀態
              locked: moduleData.forbid_overrides || false,
              readOnly: ['chatHistory', 'worldInfoAfter', 'worldInfoBefore', 'dialogueExamples'].includes(moduleData.identifier),
              role: moduleData.role || 'system'
            };
          }).filter(Boolean); // 過濾掉找不到的模組

          presetToLoad = {
            id: 'imported_' + Date.now(),
            name: presetName,
            temperature: importedData.temperature || 1.0,
            maxTokens: importedData.openai_max_tokens || 1024,
            contextLength: importedData.openai_max_context || 24000,
            modules: convertedModules,
          };

        } else if (typeof importedData.name === 'string' && Array.isArray(importedData.modules)) {
          // 這是為了相容您應用程式自己匯出的格式
          presetToLoad = importedData;
        } else {
          throw new Error("無法識別的檔案格式。請確認是 SillyTavern 或本應用匯出的提示詞 JSON 檔案。");
        }
        
        savePrompt(presetToLoad);
        alert(`✅ 提示詞「${presetToLoad.name}」已成功匯入並儲存！`);

      } catch (error) {
        alert(`❌ 匯入失敗：${error.message}`);
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const handleToggleModule = (moduleId) => {
    if (!currentPrompt) return;

    let isLocked = false;
    const newModules = currentPrompt.modules.map(m => {
        if (m.id === moduleId) {
        if (m.locked) {
            isLocked = true;
            return m;
        }
        return { ...m, enabled: !m.enabled };
        }
        return m;
    });

    if (isLocked) return;

    const updatedPreset = { ...currentPrompt, modules: newModules };
    setCurrentPrompt(updatedPreset); 
    savePrompt(updatedPreset);
  };

  return (
    <>
      <div className="page-content prompts-page-container">
        <div className="content-area prompts-page-area">
          <div className="setting-card">
            <div className="card-header">
              <div className="card-title">
                <FileText size={20} />
                <span>提示詞設定</span>
              </div>
            </div>
            <div className="card-content">
              <button className="custom-select-trigger" onClick={onOpenSwitcher}>
                <span>{currentPrompt?.name || '選擇或新增提示詞...'}</span>
                <ChevronDown size={20} />
              </button>
                <div className="prompt-actions-grid">
                <button onClick={() => deletePrompt(currentPrompt?.id)} disabled={!currentPrompt}>
                    <Trash2 size={16} /> 刪除
                </button>
                <button onClick={restoreDefaultPrompts}>
                    <Settings size={16} /> 還原預設
                </button>
                <label htmlFor="import-prompt-json" className="action-button-base">
                    <FileInput size={16} /> 匯入
                </label>
                <button onClick={handleExportPreset} disabled={!currentPrompt}>
                    <FileOutput size={16} /> 匯出
                </button>
                </div>
                <input 
                type="file" 
                id="import-prompt-json" 
                accept=".json" 
                onChange={handleImportPreset} 
                style={{ display: 'none' }} 
                />
            </div>
          </div>

          {currentPrompt && tempParameters && tempInputStrings && (
            <div className="setting-card">
              <div className="card-content sliders-group">
                <div className="slider-container">
                  <label>
                    溫度
                    <input
                      type="number"
                      className="slider-value-input"
                      value={tempInputStrings.temperature}
                      onChange={(e) => handleInputChange('temperature', e.target.value)}
                      onBlur={() => handleInputBlur('temperature', 0, 2)}
                    />
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={tempParameters.temperature}
                    onChange={(e) => handleSliderChange('temperature', e.target.value)}
                    onMouseUp={() => handleSaveParameters(tempParameters)}
                    onTouchEnd={() => handleSaveParameters(tempParameters)}
                  />
                </div>
                <div className="slider-container">
                  <label>
                    最大回應長度
                     <input
                      type="number"
                      className="slider-value-input"
                      value={tempInputStrings.maxTokens}
                      onChange={(e) => handleInputChange('maxTokens', e.target.value)}
                      onBlur={() => handleInputBlur('maxTokens', 128, 8192)}
                    />
                  </label>
                  <input
                    type="range"
                    min="128"
                    max="8192"
                    step="1"
                    value={tempParameters.maxTokens}
                    onChange={(e) => handleSliderChange('maxTokens', e.target.value)}
                    onMouseUp={() => handleSaveParameters(tempParameters)}
                    onTouchEnd={() => handleSaveParameters(tempParameters)}
                  />
                </div>
                <div className="slider-container">
                  <label>
                    上下文長度
                    <input
                      type="number"
                      className="slider-value-input"
                      value={tempInputStrings.contextLength}
                      onChange={(e) => handleInputChange('contextLength', e.target.value)}
                      onBlur={() => handleInputBlur('contextLength', 1024, 100000)}
                    />
                  </label>
                  <input
                    type="range"
                    min="1024"
                    max="100000"
                    step="128"
                    value={tempParameters.contextLength}
                    onChange={(e) => handleSliderChange('contextLength', e.target.value)}
                    onMouseUp={() => handleSaveParameters(tempParameters)}
                    onTouchEnd={() => handleSaveParameters(tempParameters)}
                  />
                </div>
              </div>
            </div>
          )}
          
          {currentPrompt ? (
            <div className="setting-card">
              <div className="card-header">
                <div className="card-title">{currentPrompt.name}</div>
              </div>
              <div className="card-content module-list-simple">
                {(currentPrompt.modules || []).map(module => (
                  <div key={module.id} className="module-list-item">
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={!!module.enabled}
                        onChange={() => handleToggleModule(module.id)}
                        disabled={module.locked}
                      />
                      <span className="slider round"></span>
                    </label>
                    <span className="module-name">{module.name}</span>
                    <button 
                      className="edit-module-btn"
                      onClick={() => setEditingModule(module)}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><FileText size={48} /></div>
              <h3>沒有選擇任何提示詞</h3>
              <p>請點擊上方的按鈕來選擇一個已有的預設集，或新增一個。</p>
            </div>
          )}
        </div>
      </div>
      
      {editingModule && (
        <ModuleEditorModal
          module={editingModule}
          onSave={handleUpdateModule}
          onClose={() => setEditingModule(null)}
        />
      )}
    </>
  );
};

export default PromptsPage;