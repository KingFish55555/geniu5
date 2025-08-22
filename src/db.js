// src/db.js
import Dexie from 'dexie';

// 建立一個名為 'Geniu5Database' 的資料庫
export const db = new Dexie('Geniu5Database');

// 定義資料庫的 "表" (schema) 和索引
db.version(1).stores({
  // 'characters' 表：
  // 'id' 是主鍵
  characters: 'id', 
  
  // 'prompts' 表：
  // 'id' 是主鍵
  prompts: 'id', 
  
  // 'apiConfigs' 表：
  // '++id' 表示 id 會自動遞增，'name' 是一個索引，方便未來查詢
  apiConfigs: '++id, name', 
  
  // 'kvStore' (Key-Value Store) 表：
  // 這是一個萬用表，用來儲存那些只有單一一份的大型物件，例如聊天紀錄和使用者設定
  // 'key' 是主鍵
  kvStore: 'key',
});