/**
 * 刪除資料庫中的婚假餘額記錄
 */

import { execSync } from 'child_process';

console.log('正在查詢婚假記錄...');

// 查詢婚假記錄
const queryCmd = `wrangler d1 execute DATABASE --remote --command "SELECT grant_id, user_id, event_type, leave_type, days_granted, days_used, days_remaining, status FROM LifeEventLeaveGrants WHERE event_type = 'marriage' OR leave_type = 'marriage'"`;

try {
  const queryResult = execSync(queryCmd, { encoding: 'utf-8', cwd: process.cwd() });
  console.log('查詢結果:');
  console.log(queryResult);
  
  // 刪除婚假記錄
  console.log('\n正在刪除婚假記錄...');
  const deleteCmd = `wrangler d1 execute DATABASE --remote --command "DELETE FROM LifeEventLeaveGrants WHERE event_type = 'marriage' OR leave_type = 'marriage'"`;
  
  const deleteResult = execSync(deleteCmd, { encoding: 'utf-8', cwd: process.cwd() });
  console.log('刪除結果:');
  console.log(deleteResult);
  
  // 再次查詢確認
  console.log('\n確認刪除結果...');
  const verifyResult = execSync(queryCmd, { encoding: 'utf-8', cwd: process.cwd() });
  console.log('確認結果:');
  console.log(verifyResult);
  
  console.log('\n✓ 婚假餘額記錄已刪除');
} catch (error) {
  console.error('錯誤:', error.message);
  process.exit(1);
}




