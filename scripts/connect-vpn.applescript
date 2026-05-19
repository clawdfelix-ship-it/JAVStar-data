#!/usr/bin/env osascript
# 自動連接 快喵VPN 日本節點
# 使用前：系統設定 → 隱私權與安全性 → 輔助取用 → 開啓終端機

on run
  log "🚀 啟動 快喵VPN..."
  
  # 打開 VPN cat（快喵）
  tell application "VPN cat" to activate
  delay 3
  
  tell application "System Events"
    tell process "VPN cat"
      set windowName to name of window 1
      log "✅ 已打開：" & windowName
      
      delay 1
      
      -- 點擊左下角連接按鈕（button 3）
      try
        click button 3 of window 1
        log "🔗 已點擊連接按鈕（左下角）"
      on error err
        log "⚠️  點擊失敗：" & err
        log "   試下按鈕 1..."
        try
          click button 1 of window 1
          log "🔗 已點擊按鈕 1"
        end try
      end try
      
    end tell
  end tell
  
  -- 等連接
  delay 5
  log "⏳ 正在連接日本..."
  delay 5
  
  -- 檢查連接狀態
  set ipCheck to do shell script "curl -s --max-time 10 https://ipapi.co/country 2>/dev/null || echo '未知'"
  if ipCheck is "JP" then
    log "✅ 成功連接日本！"
    return "VPN_CONNECTED_JP"
  else
    log "⚠️  目前國家：" & ipCheck
    log "   可能仲連接中，請稍等幾秒再試"
    return "VPN_CONNECTING"
  end if
  
end run
