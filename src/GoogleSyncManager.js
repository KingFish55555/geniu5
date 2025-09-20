import React, { useState, useEffect, useRef } from 'react';
import { Cloud, LogIn, LogOut, Upload, Download } from 'lucide-react';
import GoogleCloudSync from './GoogleCloudSync';

const googleCloudSync = new GoogleCloudSync(
    async () => { console.warn("getBackupData function not provided yet."); return null; },
    async (data) => { console.warn("restoreFromBackupData function not provided yet."); }
);

const GoogleSyncManager = ({ getBackupData, restoreFromBackupData }) => {
    const [authStatus, setAuthStatus] = useState({
        isSignedIn: false,
        currentUser: null,
    });
    
    const syncManagerRef = useRef(googleCloudSync);

    // ✨ 核心修改：我們將 useEffect 拆成兩個
    
    // 這個 useEffect 只在元件第一次掛載時執行，負責一次性的初始化
    useEffect(() => {
        syncManagerRef.current.init();
    }, []); // 空依賴陣列確保只執行一次

    // 這個 useEffect 在每次元件渲染後都會執行，確保 Class 永遠擁有最新的 setState 函式
    useEffect(() => {
        // 更新注入的函式
        syncManagerRef.current.getBackupData = getBackupData;
        syncManagerRef.current.restoreFromBackupData = restoreFromBackupData;
        
        // ✨ 隨時更新回呼函式，解決「過時閉包」問題
        syncManagerRef.current.setUpdateCallback(setAuthStatus);

        // ✨ 額外：在元件載入時，主動向 class 詢問一次當前狀態
        const initialStatus = {
            isSignedIn: syncManagerRef.current.isSignedIn,
            currentUser: syncManagerRef.current.currentUser
        };
        setAuthStatus(initialStatus);

    }); // ✨ 沒有依賴陣列，代表每次渲染都會執行

    const handleAuthClick = (e) => {
        if (authStatus.isSignedIn) {
            syncManagerRef.current.signOut();
        } else {
            syncManagerRef.current.signIn();
        }
    };

    const handleUploadClick = (e) => {
        if (!authStatus.isSignedIn) {
            alert('請先登入 Google 帳號才能上傳備份。');
            return;
        }
        syncManagerRef.current.uploadBackup(e.currentTarget);
    };
    
    const handleDownloadClick = (e) => {
        if (!authStatus.isSignedIn) {
            alert('請先登入 Google 帳號才能還原備份。');
            return;
        }
        syncManagerRef.current.downloadBackup(e.currentTarget);
    };

    return (
        <div className="google-sync-container">
            <div className="google-sync-status">
                {authStatus.isSignedIn && authStatus.currentUser ? (
                    <div className="user-info">
                        <img src={authStatus.currentUser.picture} alt="avatar" className="user-avatar"/>
                        <div className="user-details">
                            <span className="user-name">{authStatus.currentUser.name}</span>
                            <span className="user-email">{authStatus.currentUser.email}</span>
                        </div>
                    </div>
                ) : (
                    <div className="not-connected">
                        <Cloud size={20} />
                        <span>尚未連接 Google 雲端硬碟</span>
                    </div>
                )}
            </div>
            
            <div className="google-sync-actions">
                <button onClick={handleAuthClick} className={`auth-btn ${authStatus.isSignedIn ? 'logout' : 'login'}`}>
                    {authStatus.isSignedIn ? <LogOut size={16} /> : <LogIn size={16} />}
                    {authStatus.isSignedIn ? '中斷連接' : '連接 Google 帳號'}
                </button>
                <button onClick={handleUploadClick} disabled={!authStatus.isSignedIn}>
                    <Upload size={16} /> 上傳備份
                </button>
                <button onClick={handleDownloadClick} disabled={!authStatus.isSignedIn}>
                    <Download size={16} /> 從雲端還原
                </button>
            </div>
        </div>
    );
};

export default GoogleSyncManager;