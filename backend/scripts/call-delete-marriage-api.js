/**
 * 調用 API 刪除婚假記錄
 */

const API_URL = 'https://v2.horgoscpa.com/api/v2/admin/delete-marriage-leaves';

async function deleteMarriageLeaves() {
  try {
    console.log('正在調用 API 刪除婚假記錄...');
    
    const response = await fetch(API_URL, {
      method: 'DELETE',
      credentials: 'include', // 包含 cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ 刪除成功！');
      console.log('刪除的記錄數:', data.data?.deleted || 0);
      console.log('刪除的記錄詳情:', JSON.stringify(data.data?.records || [], null, 2));
    } else {
      console.error('✗ 刪除失敗:', data.message || data.error || '未知錯誤');
      console.error('響應:', JSON.stringify(data, null, 2));
    }
    
    return data;
  } catch (error) {
    console.error('請求錯誤:', error.message);
    throw error;
  }
}

// 如果在 Node.js 環境中運行，需要先設置 fetch
if (typeof fetch === 'undefined') {
  console.error('此腳本需要在瀏覽器環境中運行，或使用支持 fetch 的 Node.js 版本（18+）');
  console.log('\n請在瀏覽器控制台中執行以下代碼：');
  console.log(`
fetch('${API_URL}', {
  method: 'DELETE',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('結果:', data))
.catch(err => console.error('錯誤:', err));
  `);
  process.exit(1);
}

deleteMarriageLeaves()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });





