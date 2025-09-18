import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Save, Trash2, Upload, ChevronDown, Download, Settings, Edit2, FileInput, FileOutput, GripVertical } from 'lucide-react';
import ModuleEditorModal from './ModuleEditorModal'; // 假設 ModuleEditorModal 在同級目錄

// ✨ 我們接收所有的新能力 props
const PromptsPage = ({ prompts, currentPrompt, setCurrentPrompt, savePrompt, deletePrompt, restoreDefaultPrompts, onOpenSwitcher, onAddModule, onDeleteModule, onModuleOrderChange }) => {
  
  const [editingModule, setEditingModule] = useState(null);
  const [tempParameters, setTempParameters] = useState(null);
  const [tempInputStrings, setTempInputStrings] = useState(null);
  
  // ✨ 新增：用於拖曳排序的 state
  const [draggedModuleId, setDraggedModuleId] = useState(null);

  useEffect(() => {
    if (currentPrompt) {
      const params = {
        temperature: currentPrompt.temperature ?? 1,
        maxTokens: currentPrompt.maxTokens ?? 1024,
        contextLength: currentPrompt.contextLength ?? 24000,
      };
      setTempParameters(params);
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
    savePrompt(updatedPreset, true); // ✨ 安靜儲存
  };

  const handleSliderChange = (field, value) => {
    if (!tempParameters) return;
    const numericValue = parseFloat(value);
    setTempParameters(prev => ({ ...prev, [field]: numericValue }));
    setTempInputStrings(prev => ({
      ...prev,
      [field]: field === 'temperature' ? numericValue.toFixed(2) : String(numericValue)
    }));
  };

  const handleInputChange = (field, value) => {
    if (tempInputStrings === null) return;
    setTempInputStrings(prev => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field, min, max) => {
    if (tempInputStrings === null) return;
    let numericValue = field === 'temperature' ? parseFloat(tempInputStrings[field]) : parseInt(tempInputStrings[field], 10);
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
    savePrompt(updatedPreset, true); // ✨ 安靜儲存
    setCurrentPrompt(updatedPreset); // ✨ 確保當前狀態也更新
    setEditingModule(null);
  };
  
  // ✨ 全新！處理新增模組並立即編輯
  const handleAddNewModule = () => {
      const newModule = onAddModule(); // 呼叫 app.txt 中的函式
      if (newModule) {
          setEditingModule(newModule); // 如果成功建立，就打開編輯器
      }
  };

  const handleToggleModule = (moduleId) => {
    if (!currentPrompt) return;
    let isLocked = false;
    const newModules = currentPrompt.modules.map(m => {
      if (m.id === moduleId) {
        if (m.locked) { isLocked = true; return m; }
        return { ...m, enabled: !m.enabled };
      }
      return m;
    });
    if (isLocked) return;
    const updatedPreset = { ...currentPrompt, modules: newModules };
    setCurrentPrompt(updatedPreset); 
    savePrompt(updatedPreset, true); // ✨ 安靜儲存
  };

  // ✨ --- 拖曳排序相關的函式 --- ✨
  const handleDragStart = (e, moduleId) => {
    setDraggedModuleId(moduleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetModuleId) => {
    e.preventDefault();
    if (draggedModuleId === targetModuleId) return;
    const modules = currentPrompt.modules || [];
    const draggedIndex = modules.findIndex(m => m.id === draggedModuleId);
    const targetIndex = modules.findIndex(m => m.id === targetModuleId);
    
    // 視覺化提示
    const listItems = e.currentTarget.parentElement.children;
    for (const item of listItems) {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
        e.currentTarget.classList.add('drag-over-top');
    } else {
        e.currentTarget.classList.add('drag-over-bottom');
    }
  };
  
  const handleDragLeave = (e) => {
      e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
  };

  const handleDrop = (e, targetModuleId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    if (draggedModuleId === targetModuleId) return;

    const modules = [...(currentPrompt.modules || [])];
    const draggedItem = modules.find(m => m.id === draggedModuleId);
    const fromIndex = modules.findIndex(m => m.id === draggedModuleId);
    let toIndex = modules.findIndex(m => m.id === targetModuleId);

    // 根據滑鼠位置決定是插在前面還是後面
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientY > rect.top + rect.height / 2) {
        toIndex += 1;
    }

    modules.splice(fromIndex, 1);
    modules.splice(toIndex, 0, draggedItem);

    onModuleOrderChange(modules); // 呼叫 app.txt 的函式來儲存新順序
    setDraggedModuleId(null);
  };
  
  // (匯入匯出函式保持不變)
  const handleExportPreset = () => { if (!currentPrompt) { alert("請先從列表中選擇一個已儲存的預設集來匯出。"); return; } try { const jsonString = JSON.stringify(currentPrompt, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${currentPrompt.name || 'prompt_preset'}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } catch (error) { console.error("匯出失敗:", error); alert("匯出失敗！詳情請見主控台。"); } };
  const handleImportPreset = (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const importedData = JSON.parse(e.target.result); let presetToLoad; if (Array.isArray(importedData.prompts) && Array.isArray(importedData.prompt_order)) { const presetName = file.name.replace(/\.json$/i, ''); const moduleMap = new Map(importedData.prompts.map(p => [p.identifier, p])); const orderGroup = importedData.prompt_order.find(group => group.character_id === 100001); const orderArray = orderGroup ? orderGroup.order : []; if (orderArray.length === 0) { throw new Error("在 SillyTavern 檔案中找不到有效的 'prompt_order' 順序列表。"); } const convertedModules = orderArray.map((orderItem, index) => { const moduleData = moduleMap.get(orderItem.identifier); if (!moduleData) return null; return { id: moduleData.identifier || `module_imported_${Date.now()}_${index}`, name: moduleData.name || `未命名模組 ${index + 1}`, content: moduleData.content || '', enabled: orderItem.enabled, locked: moduleData.forbid_overrides || false, readOnly: ['chatHistory', 'worldInfoAfter', 'worldInfoBefore', 'dialogueExamples'].includes(moduleData.identifier), role: moduleData.role || 'system', order: moduleData.insertion_order ?? 100, position: { type: 'relative', depth: 4 } }; }).filter(Boolean); presetToLoad = { id: 'imported_' + Date.now(), name: presetName, temperature: importedData.temperature || 1.0, maxTokens: importedData.openai_max_tokens || 1024, contextLength: importedData.openai_max_context || 24000, modules: convertedModules, }; } else if (typeof importedData.name === 'string' && Array.isArray(importedData.modules)) { presetToLoad = importedData; } else { throw new Error("無法識別的檔案格式。"); } savePrompt(presetToLoad); alert(`✅ 提示詞「${presetToLoad.name}」已成功匯入並儲存！`); } catch (error) { alert(`❌ 匯入失敗：${error.message}`); } finally { if (event.target) { event.target.value = ''; } } }; reader.readAsText(file); };

  return (
    <>
      <div className="page-content prompts-page-container">
        <div className="content-area prompts-page-area">
          {/* ... (頂部的卡片保持不變) ... */}
          <div className="setting-card"> <div className="card-header"> <div className="card-title"> <FileText size={20} /> <span>提示詞設定</span> </div> </div> <div className="card-content"> <button className="custom-select-trigger" onClick={onOpenSwitcher}> <span>{currentPrompt?.name || '選擇或新增提示詞...'}</span> <ChevronDown size={20} /> </button> <div className="prompt-actions-grid"> <button onClick={() => deletePrompt(currentPrompt?.id)} disabled={!currentPrompt}> <Trash2 size={16} /> 刪除 </button> <button onClick={restoreDefaultPrompts}> <Settings size={16} /> 還原預設 </button> <label htmlFor="import-prompt-json" className="action-button-base"> <FileInput size={16} /> 匯入 </label> <button onClick={handleExportPreset} disabled={!currentPrompt}> <FileOutput size={16} /> 匯出 </button> </div> <input type="file" id="import-prompt-json" accept=".json" onChange={handleImportPreset} style={{ display: 'none' }} /> </div> </div>
          {currentPrompt && tempParameters && tempInputStrings && ( <div className="setting-card"> <div className="card-content sliders-group"> <div className="slider-container"> <label> 溫度 <input type="number" className="slider-value-input" value={tempInputStrings.temperature} onChange={(e) => handleInputChange('temperature', e.target.value)} onBlur={() => handleInputBlur('temperature', 0, 2)} /> </label> <input type="range" min="0" max="2" step="0.01" value={tempParameters.temperature} onChange={(e) => handleSliderChange('temperature', e.target.value)} onMouseUp={() => handleSaveParameters(tempParameters)} onTouchEnd={() => handleSaveParameters(tempParameters)} /> </div> <div className="slider-container"> <label> 最大回應長度 <input type="number" className="slider-value-input" value={tempInputStrings.maxTokens} onChange={(e) => handleInputChange('maxTokens', e.target.value)} onBlur={() => handleInputBlur('maxTokens', 128, 8192)} /> </label> <input type="range" min="128" max="8192" step="1" value={tempParameters.maxTokens} onChange={(e) => handleSliderChange('maxTokens', e.target.value)} onMouseUp={() => handleSaveParameters(tempParameters)} onTouchEnd={() => handleSaveParameters(tempParameters)} /> </div> <div className="slider-container"> <label> 上下文長度 <input type="number" className="slider-value-input" value={tempInputStrings.contextLength} onChange={(e) => handleInputChange('contextLength', e.target.value)} onBlur={() => handleInputBlur('contextLength', 1024, 100000)} /> </label> <input type="range" min="1024" max="100000" step="128" value={tempParameters.contextLength} onChange={(e) => handleSliderChange('contextLength', e.target.value)} onMouseUp={() => handleSaveParameters(tempParameters)} onTouchEnd={() => handleSaveParameters(tempParameters)} /> </div> </div> </div> )}
          
          {currentPrompt ? (
            <div className="setting-card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div className="card-title">{currentPrompt.name}</div>
                <button onClick={handleAddNewModule} className="add-greeting-btn">
                  <Plus size={14} /> 新增模組
                </button>
              </div>
              <div className="card-content module-list-simple">
                {(currentPrompt.modules || []).map(module => (
                  <div 
                    key={module.id} 
                    className="module-list-item"
                    draggable="true" // ✨ 啟用拖曳
                    onDragStart={(e) => handleDragStart(e, module.id)}
                    onDragOver={(e) => handleDragOver(e, module.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, module.id)}
                  >
                    <div className="drag-handle">
                        <GripVertical size={16} />
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={!!module.enabled} onChange={() => handleToggleModule(module.id)} disabled={module.locked} />
                      <span className="slider round"></span>
                    </label>
                    <span className="module-name">{module.name}</span>
                    <div className="module-actions">
                      <button className="edit-module-btn" onClick={() => setEditingModule(module)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="edit-module-btn delete-icon-btn" onClick={() => onDeleteModule(module.id)} disabled={module.readOnly} title={module.readOnly ? "此為核心模組，不可刪除" : "刪除模組"}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : ( <div className="empty-state"> <div className="empty-icon"><FileText size={48} /></div> <h3>沒有選擇任何提示詞</h3> <p>請點擊上方的按鈕來選擇一個已有的預設集，或新增一個。</p> </div> )}
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