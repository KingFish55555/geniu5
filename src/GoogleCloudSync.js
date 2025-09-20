/**
 * 鎖定 UI 元素並顯示載入動畫的輔助類別。
 */
class ButtonLocker {
    static lockedElements = new Map();

    static loadingSpinner = `
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite; margin-right: 8px; fill: currentColor;">
            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25"/>
            <path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" class="spinner-path"/>
        </svg>
        <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
    `;

    static lock(element, text = '處理中...') {
        if (!element || this.lockedElements.has(element)) return;

        const originalContent = element.innerHTML;
        const originalWidth = element.offsetWidth;
        this.lockedElements.set(element, originalContent);

        if (element.tagName === 'BUTTON') element.disabled = true;
        element.style.pointerEvents = 'none';
        element.style.opacity = '0.7';
        element.style.width = `${originalWidth}px`; // 保持寬度

        element.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%;">${this.loadingSpinner} ${text}</div>`;
    }

    static unlock(element) {
        if (!element || !this.lockedElements.has(element)) return;

        element.innerHTML = this.lockedElements.get(element);
        if (element.tagName === 'BUTTON') element.disabled = false;
        element.style.pointerEvents = 'auto';
        element.style.opacity = '1';
        element.style.width = ''; // 恢復寬度

        this.lockedElements.delete(element);
    }
}

/**
 * 管理與 Google Drive 互動的核心類別。
 */
class GoogleCloudSync {
    // ✨ 新增一個旗標，確保 GSI Client 只被初始化一次
    isClientInitialized = false; 
    constructor(getBackupData, restoreFromBackupData) {
        this.isSignedIn = false;
        this.currentUser = null;
        this.accessToken = null;
        
        // ▼▼▼ ✨✨✨ 請在這裡貼上您自己的用戶端 ID ✨✨✨ ▼▼▼
        this.CLIENT_ID = '100300519736-qpgjklh9v3u7062rlmmkc43cccf6rm3d.apps.googleusercontent.com'; 
        // ▲▲▲ ✨✨✨ 請在這裡貼上您自己的用戶端 ID ✨✨✨ ▲▲▲

        this.SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
        this.FOLDER_NAME = 'Geniu5_Backups'; // 為您的應用程式取一個專屬的資料夾名稱
        this.folderId = null;
        this.maxBackups = 5;
        this.tokenClient = null;

        // ✨ 依賴注入：從外部傳入匯出和匯入的函式
        this.getBackupData = getBackupData;
        this.restoreFromBackupData = restoreFromBackupData;

        // 綁定 this，確保在回呼函式中 this 指向正確
        this.updateAuthStatus = () => {}; // 預設為空函式，由 React 元件注入
    }

    // ✨ 核心修改：我們將 `init` 拆分成兩個職責
    // 1. setUpdateCallback: 讓 React 元件可以隨時更新它的狀態設定器
    setUpdateCallback(callback) {
        this.updateAuthStatus = callback;
    }

    // 2. init: 負責所有的一次性初始化邏輯
    async init() {
        // ✨ 使用旗標，如果已經初始化過，就直接返回，防止重複設定
        if (this.isClientInitialized) {
            return;
        }

        try {
            await this.loadGoogleIdentityServices();
            
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: async (tokenResponse) => {
                    // 這個 callback 是在 GSI 內部設定的，只設定一次
                    // 它會呼叫我們 class 內部的方法來處理後續邏輯
                    this.handleTokenResponse(tokenResponse);
                },
            });

            // ✨ 標記為已初始化
            this.isClientInitialized = true;

            // ✨ 檢查本地儲存的 token
            const storedToken = localStorage.getItem('google_auth_token');
            if (storedToken) {
                const tokenData = JSON.parse(storedToken);
                if (tokenData.expiresAt && Date.now() < tokenData.expiresAt) {
                    this.accessToken = tokenData.accessToken;
                    this.isSignedIn = true;
                    this.currentUser = tokenData.userProfile || null;
                } else {
                    localStorage.removeItem('google_auth_token');
                }
            }
            // ✨ 觸發一次初始狀態更新
            this.updateAuthStatus({ isSignedIn: this.isSignedIn, currentUser: this.currentUser });
            
        } catch (error) {
            console.error('Google Identity Services 初始化失敗:', error);
            alert('Google 服務初始化失敗，雲端同步功能可能無法使用。');
        }
    }

    // ✨ 全新！將 token 回應的處理邏輯獨立出來
    async handleTokenResponse(tokenResponse) {
        if (tokenResponse.error) {
            console.error('OAuth Error:', tokenResponse);
            alert('Google 授權失敗: ' + (tokenResponse.error_description || tokenResponse.error));
            this.signOut();
            return;
        }
        
        this.accessToken = tokenResponse.access_token;
        this.isSignedIn = true;
        await this.fetchUserProfile(); 
        
        const expiresAt = Date.now() + (parseInt(tokenResponse.expires_in, 10) * 1000);
        const tokenData = {
            accessToken: this.accessToken,
            expiresAt: expiresAt,
            userProfile: this.currentUser,
        };
        localStorage.setItem('google_auth_token', JSON.stringify(tokenData));
        
        // ✨ 在這裡呼叫最新的 updateAuthStatus，它永遠是 React 元件傳來的最新版本
        this.updateAuthStatus({ isSignedIn: this.isSignedIn, currentUser: this.currentUser });
        alert('✅ Google 雲端硬碟已成功連接！');
    }

    async fetchUserProfile() {
        if (!this.accessToken) return;
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            if (!response.ok) throw new Error(`獲取用戶資訊失敗: ${response.status}`);
            const profile = await response.json();
            this.currentUser = {
                name: profile.name,
                email: profile.email,
                picture: profile.picture
            };
        } catch (error) {
            console.error("獲取 Google 使用者資訊失敗:", error);
            this.currentUser = null;
        }
    }
    
    loadGoogleIdentityServices() {
        if (window.google?.accounts?.oauth2) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => window.google?.accounts?.oauth2 ? resolve() : reject(new Error('Google Identity Services object not found.'));
            script.onerror = () => reject(new Error('Google Identity Services script failed to load.'));
            document.head.appendChild(script);
        });
    }

    signIn() {
        if (!this.tokenClient) {
            console.error('Token client not initialized.');
            alert('Google 登入服務尚未準備就緒，請稍後再試。');
            return;
        }
        // 如果 token 已過期，強制顯示同意畫面
        const storedToken = localStorage.getItem('google_auth_token');
        let prompt = '';
        if (storedToken) {
            const tokenData = JSON.parse(storedToken);
            if (!tokenData.expiresAt || Date.now() >= tokenData.expiresAt) {
                prompt = 'consent';
            }
        }
        this.tokenClient.requestAccessToken({ prompt });
    }

    signOut() {
        if (this.accessToken) {
            window.google.accounts.oauth2.revoke(this.accessToken, () => {});
        }
        localStorage.removeItem('google_auth_token');
        localStorage.removeItem('google_drive_folder_id');
        this.currentUser = null;
        this.isSignedIn = false;
        this.accessToken = null;
        this.folderId = null;
        this.updateAuthStatus({ isSignedIn: false, currentUser: null });
        alert('已中斷與 Google 雲端硬碟的連接。');
    }

    async ensureValidToken() {
        if (!this.accessToken) throw new Error('尚未登入 Google 帳號。');
        return this.accessToken;
    }

    async uploadBackup(element) {
        ButtonLocker.lock(element, '備份中...');
        try {
            const token = await this.ensureValidToken();
            const backupData = await this.getBackupData(); // ✨ 使用外部傳入的函式
            if (!backupData) throw new Error("無法生成備份資料。");

            const fileName = `geniu5_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await this.ensureBackupFolder(token);
            await this.uploadFile(fileName, backupData, token);
            await this.cleanupOldBackups(token);
            alert('✅ 備份已成功上傳至您的 Google 雲端硬碟！');
        } catch (error) {
            console.error('上傳失敗:', error);
            alert('❌ 上傳失敗: ' + error.message);
        } finally {
            ButtonLocker.unlock(element);
        }
    }

    async downloadBackup(element) {
        ButtonLocker.lock(element, '讀取中...');
        try {
            const token = await this.ensureValidToken();
            await this.ensureBackupFolder(token);
            const files = await this.listBackupFiles(token);
            
            if (files.length === 0) {
                alert('☁️ 雲端硬碟中找不到任何備份檔案。');
                return;
            }
            this.showBackupSelector(files);
        } catch (error) {
            console.error('列出備份失敗:', error);
            alert('❌ 讀取雲端備份列表失敗: ' + error.message);
        } finally {
            ButtonLocker.unlock(element);
        }
    }

    async ensureBackupFolder(token) {
    // 1. 檢查記憶體中是否已有 ID
    if (this.folderId) return this.folderId;
    
    // 2. ✨ 全新：檢查 localStorage 中是否已儲存 ID
    const storedFolderId = localStorage.getItem('google_drive_folder_id');
    if (storedFolderId) {
        // ✨ 額外步驟：驗證這個 ID 是否還有效
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${storedFolderId}?fields=id`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                console.log("從 localStorage 成功恢復資料夾 ID:", storedFolderId);
                this.folderId = storedFolderId;
                return this.folderId;
            } else {
                // 如果 ID 失效（例如使用者手動刪除了資料夾），就清除它
                console.warn("儲存的資料夾 ID 已失效，將重新建立。");
                localStorage.removeItem('google_drive_folder_id');
            }
        } catch (error) {
             console.error("驗證資料夾 ID 時發生錯誤:", error);
             localStorage.removeItem('google_drive_folder_id');
        }
    }

    // 3. 如果以上都沒有，才執行搜尋（這是為了兼容舊的使用者）
    try {
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!searchResponse.ok) throw new Error(`搜尋資料夾失敗: ${searchResponse.status}`);
        
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
            this.folderId = searchResult.files[0].id;
            localStorage.setItem('google_drive_folder_id', this.folderId); // ✨ 找到後立刻儲存
            return this.folderId;
        }

        // 4. 如果還是找不到，就建立新的
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: this.FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
                // ✨ 確保資料夾建立在根目錄
                parents: ['root'] 
            })
        });
        if (!createResponse.ok) throw new Error(`建立資料夾失敗: ${createResponse.status}`);
        
        const folder = await createResponse.json();
        this.folderId = folder.id;
        localStorage.setItem('google_drive_folder_id', this.folderId); // ✨ 建立後立刻儲存
        return this.folderId;
        
    } catch (error) {
        console.error('確保備份資料夾時出錯:', error);
        throw error;
    }
}

    async uploadFile(fileName, content, token) {
        const metadata = { name: fileName, parents: [this.folderId] };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([content], { type: 'application/json' }));
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
        });
        if (!response.ok) throw new Error(`檔案上傳失敗: ${response.status}`);
        return response.json();
    }

    async listBackupFiles(token) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=parents in '${this.folderId}' and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`列出檔案失敗: ${response.status}`);
        const result = await response.json();
        return result.files || [];
    }

    async deleteFile(fileId, token) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async cleanupOldBackups(token) {
        const files = await this.listBackupFiles(token);
        if (files.length > this.maxBackups) {
            const filesToDelete = files.slice(this.maxBackups);
            await Promise.all(filesToDelete.map(file => this.deleteFile(file.id, token)));
        }
    }

    showBackupSelector(backupFiles) {
        // 移除舊的 modal
        const oldModal = document.getElementById('google-backup-modal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'google-backup-modal';
        modal.className = 'modal-overlay';
        
        const fileListHTML = backupFiles.map(file => {
            const date = new Date(file.createdTime);
            const sizeStr = file.size ? `${Math.round(file.size / 1024)} KB` : 'N/A';
            return `
                <div class="backup-file-item" data-file-id="${file.id}">
                    <div class="backup-file-info">
                        <strong>${file.name}</strong>
                        <span>${date.toLocaleString()} • ${sizeStr}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>選擇要還原的備份</h3>
                    <button class="close-btn" onclick="document.getElementById('google-backup-modal').remove()">×</button>
                </div>
                <div class="modal-body" id="backup-list-container">
                    ${fileListHTML || '<p>找不到備份檔案。</p>'}
                </div>
                <div class="modal-footer">
                     <button class="edit-btn cancel" onclick="document.getElementById('google-backup-modal').remove()">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);

        // 為每個項目加上點擊事件監聽器
        document.querySelectorAll('.backup-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const fileId = e.currentTarget.dataset.fileId;
                this.restoreBackup(fileId, e.currentTarget);
            });
        });
    }

    async restoreBackup(fileId, element) {
        if (!window.confirm("警告：還原備份將會覆蓋您目前所有的本地資料，此操作無法復原。確定要繼續嗎？")) {
            return;
        }

        ButtonLocker.lock(element, '還原中...');
        try {
            const token = await this.ensureValidToken();
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`檔案下載失敗: ${response.status}`);
            const backupContent = await response.text();
            
            const data = JSON.parse(backupContent);
            
            // 關閉 modal
            const modal = document.getElementById('google-backup-modal');
            if (modal) modal.remove();

            // ✨ 使用外部傳入的函式來執行匯入
            await this.restoreFromBackupData(data); 

        } catch (error) {
            console.error('恢復備份失敗:', error);
            alert('❌ 恢復備份失敗: ' + error.message);
            ButtonLocker.unlock(element);
        }
        // 成功後不需要 unlock，因為頁面會重載
    }
}

export default GoogleCloudSync;