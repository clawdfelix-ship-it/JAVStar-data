import CompareClient from './CompareClient';

// Compare Page SEO Metadata
export const metadata = {
  title: {
    default: '女優比較 | AV Intelligence',
    template: '%s | AV Intelligence',
  },
  description: '比較唔同 AV 女優嘅活動記錄、投票數、出道年份等資料，輕鬆搵到你心水嘅女神',
};

// 服務端頁面組件
export default async function ComparePage() {
  return <CompareClient />;
}