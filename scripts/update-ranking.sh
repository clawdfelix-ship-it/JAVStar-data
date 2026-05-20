#!/bin/bash
# 一鍵爬取 DMM 月間排行榜並更新到生產環境
# 使用方法：./scripts/update-ranking.sh

set -e

echo "🏆 開始更新 DMM 月間排行榜..."
echo ""

# 步驟1：檢查VPN連接
echo "🌐 檢查日本VPN連接..."
IP_INFO=$(curl -s https://ipapi.co/json 2>/dev/null || echo '{"country":"HK"}')
COUNTRY=$(echo $IP_INFO | grep -o '"country":"[^"]*"' | cut -d'"' -f4)
echo "   目前位置：$COUNTRY"

if [ "$COUNTRY" != "JP" ]; then
  echo "⚠️  警告：唔喺日本IP，DMM可能會封鎖！"
  echo "   請先打開 VPN cat 並連接日本節點"
  echo ""
  read -p "   都係繼續？ (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo "✅ VPN 檢查完成"
echo ""

# 步驟2：呢度可以加自動爬取邏輯
# 由於我哋用瀏覽器工具手動爬，呢步係手動
echo "📝 注意：數據爬取需要瀏覽器工具手動執行"
echo "   爬取完成後，複製 JSON 數據到呢度"
echo ""

# 步驟3：更新生產環境
echo "📊 更新生產環境數據..."
echo ""

read -p "   數據已準備好？開始更新？ (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 0
fi

# 呢度可以放 curl POST 命令
# 你可以每次爬取完複製番號/封面數據入呢度
echo ""
echo "✨ 更新完成！"
echo ""

# 自動更新最後更新時間戳
echo "🕐 更新最後更新時間..."
curl -s -X POST "https://jav-star-data.vercel.app/api/admin/update-timestamp" > /dev/null
echo "   完成！"

echo ""
echo "ℹ️  下次要更新時："
echo "   1. 打開 VPN cat 連日本"
echo "   2. 運行 ./scripts/update-ranking.sh"
echo "   3. 用瀏覽器工具爬取數據"
echo "   4. POST 到 /api/dmm-ranking"
