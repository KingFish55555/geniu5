// src/PromptsPage.js

import React, { useState } from 'react';
import { FileText, Plus, Save, Trash2, Upload, ChevronDown, Download, Settings, Edit2 } from 'lucide-react';
import ModuleEditorModal from './ModuleEditorModal'; // ✨ 引入我們的新元件！

const PromptsPage = ({ prompts, currentPrompt, setCurrentPrompt, savePrompt, deletePrompt, restoreDefaultPrompts, onOpenSwitcher }) => {
  
  // ✨ 新的 State：用來追蹤哪個模組正在被編輯 (null 代表沒有)
  const [editingModule, setEditingModule] = useState(null);

  // 處理更新單一模組的邏輯
  const handleUpdateModule = (updatedModule) => {
    if (!currentPrompt) return;

    // ▼▼▼ 在這裡加上一個保護措施 ▼▼▼
    const modules = currentPrompt.modules || [];

    // 將下面的 currentPrompt.modules.map 改成 modules.map
    const newModules = modules.map(m => 
      m.id === updatedModule.id ? updatedModule : m
    );
    
    // 建立一個更新後的預設集物件
    const updatedPreset = { ...currentPrompt, modules: newModules };
    
    // 呼叫 App.js 中的 savePrompt 來儲存整個預設集
    savePrompt(updatedPreset);
    
    // 關閉 Modal
    setEditingModule(null);
  };

  // ✨ 匯出當前預設集 (最安全版本)
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

  // ✨ 匯入預設集 (終極版，完美還原 ST 順序)
  const handleImportPreset = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        let presetToLoad;

        // 格式 1：檢查是不是我們自己的「預設集」格式 (有 name 和 modules)
        if (typeof importedData.name === 'string' && Array.isArray(importedData.modules)) {
          console.log("偵測到本應用格式，直接載入...");
          presetToLoad = importedData;

        // 格式 2：檢查是不是 SillyTavern 格式 (有 prompts 和 prompt_order)
        } else if (Array.isArray(importedData.prompts) && Array.isArray(importedData.prompt_order)) {
          console.log("偵測到 SillyTavern 格式，正在進行精準排序轉換...");

          const presetName = file.name.replace(/\.json$/i, '');
          
          // a. 建立一個方便查找的「模組字典」，用 identifier 作為 key
          const moduleMap = new Map(importedData.prompts.map(p => [p.identifier, p]));

          // b. 找到 ST 用的那個 order 列表 (通常是 character_id: 100001)
          const orderGroup = importedData.prompt_order.find(group => group.character_id === 100001);
          const orderArray = orderGroup ? orderGroup.order : [];

          if (orderArray.length === 0) {
            throw new Error("在 SillyTavern 檔案中找不到有效的 'prompt_order' 順序列表。");
          }
          
          // c. ✨ 核心：遍歷「順序列表」，從「模組字典」中按順序取出模組
          const convertedModules = orderArray.map((orderItem, index) => {
            const moduleData = moduleMap.get(orderItem.identifier);
            if (!moduleData) return null; // 如果找不到對應的模組，暫時返回 null

            // 轉換成我們自己的格式
            return {
              id: moduleData.identifier || `module_imported_${Date.now()}_${index}`,
              name: moduleData.name || `未命名模組 ${index + 1}`,
              content: moduleData.content || '',
              enabled: orderItem.enabled, // ✨ 直接使用 order 項目中的 enabled 狀態！
              locked: moduleData.name?.includes('🔒') || false,
              readOnly: ['chatHistory', 'worldInfoAfter', 'worldInfoBefore', 'dialogueExamples'].includes(moduleData.identifier), // 簡單的唯讀判斷
              role: moduleData.role || 'system',
              // 確保新屬性有預設值
              triggers: moduleData.triggers || { enabled: false, text: '' },
              position: moduleData.position || { type: 'relative', depth: 4 }
            };
          }).filter(Boolean); // 過濾掉所有為 null 的項目

          // d. 組裝成我們的「預設集」物件
          presetToLoad = {
            id: 'imported_' + Date.now(),
            name: presetName,
            temperature: importedData.temperature || 1.0,
            maxTokens: importedData.openai_max_tokens || 1024,
            contextLength: importedData.openai_max_context || 24000,
            modules: convertedModules,
          };

        } else {
          throw new Error("無法識別的檔案格式。請確認檔案是本應用的預設集，或是一個包含 'prompts' 和 'prompt_order' 的 SillyTavern 格式檔案。");
        }
        
        savePrompt(presetToLoad);
        alert(`✅ 預設集「${presetToLoad.name}」已成功匯入並儲存！`);

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
  
  // 處理開關切換 (這個需要立即儲存)
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
    
    // ✨✨✨ 核心修正：在這裡新增下面這兩行 ✨✨✨
    // 1. 立刻更新畫面上的 state，讓開關立即反應
    setCurrentPrompt(updatedPreset); 
    
    // 2. 然後再將更新後的資料儲存到資料庫
    savePrompt(updatedPreset);
};


  return (
    <> {/* 使用 Fragment 包裹，因為我們要渲染 Modal */}
      <div className="page-content prompts-page-container">
        <div className="content-area prompts-page-area">
          
          {/* 頂部控制列 */}
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
                {/* ✨ 功能按鈕 (完整版) ✨ */}
                <div className="prompt-actions-grid">
                {/* 第一行 */}
                <button onClick={() => deletePrompt(currentPrompt?.id)} disabled={!currentPrompt}>
                    <Trash2 size={16} /> 刪除
                </button>
                <button onClick={restoreDefaultPrompts}>
                    <Settings size={16} /> 還原預設
                </button>

                {/* ✨ 第二行：把匯入和匯出加回來！ ✨ */}
                <label htmlFor="import-prompt-json" className="action-button-base">
                    <Upload size={16} /> 匯入
                </label>
                <button onClick={handleExportPreset} disabled={!currentPrompt}>
                    <Download size={16} /> 匯出
                </button>
                </div>

                {/* ✨ 隱藏的檔案選擇器，它會被上面的 label 觸發 ✨ */}
                <input 
                type="file" 
                id="import-prompt-json" 
                accept=".json" 
                onChange={handleImportPreset} 
                style={{ display: 'none' }} 
                />
            </div>
          </div>
          
          {/* 模組列表 (新版 UI) */}
          {currentPrompt ? (
            <div className="setting-card">
              <div className="card-header">
                <div className="card-title">{currentPrompt.name}</div>
              </div>
              <div className="card-content module-list-simple">
                {currentPrompt.modules.map(module => (
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
                      onClick={() => setEditingModule(module)} // 點擊時，設定要編輯的模組
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
      
      {/* ✨ 核心：只有當 editingModule 不是 null 時，才渲染 Modal ✨ */}
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