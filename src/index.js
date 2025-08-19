import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // 【1. 匯入我們的啟動器】
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 【2. 呼叫 register() 來啟用 PWA 功能】
// 這樣您的 App 就可以離線使用，並且載入速度更快！
serviceWorkerRegistration.register({
  onUpdate: registration => {
    // 這一段會在瀏覽器發現有新版本可以用的時候執行

    // 找到那個已經準備好，在等待上工的新快遞員 (Service Worker)
    const waitingServiceWorker = registration.waiting;

    if (waitingServiceWorker) {
      // 跳出一個確認視窗，詢問使用者是否要更新
      if (window.confirm("網站有新版本囉，要立刻更新嗎？")) {
        // 如果使用者按下「確定」...

        // 我們就對那個新快遞員送出一個叫做 'SKIP_WAITING' 的秘密指令
        waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });

        // 然後我們監聽新快遞員的狀態，一旦他回報說「我上工了！」(activated)
        waitingServiceWorker.addEventListener('statechange', event => {
          if (event.target.state === 'activated') {
            // 我們就立刻重新整理整個網頁，讓使用者看到最新版本
            window.location.reload();
          }
        });
      }
    }
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();