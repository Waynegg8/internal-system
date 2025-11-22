/**
 * 強制從備份文件恢復 tasks.md 的工具
 * 用於恢復所有被錯誤修改的任務文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECS_DIR = path.join(__dirname, '../specs');

// 檢查任務是否有效（有 _Prompt 字段且有實際任務）
function isValidBackupContent(content) {
  if (!content || content.trim().length < 50) return false;
  return content.includes('_Prompt:') && content.includes('- [');
}

// 強制恢復單個 spec 的 tasks.md
function forceRestoreSpecTasks(spec) {
  const tasksFile = spec.tasks;
  const backupFile = `${tasksFile}.backup`;

  if (!fs.existsSync(backupFile)) {
    console.log(`ℹ️  ${spec.name}: 沒有備份文件，跳過`);
    return false;
  }

  const backupContent = fs.readFileSync(backupFile, 'utf-8');

  if (!isValidBackupContent(backupContent)) {
    console.log(`ℹ️  ${spec.name}: 備份文件無效，跳過`);
    return false;
  }

  console.log(`🔄 ${spec.name}: 強制從備份恢復...`);

  // 三重備份當前文件
  const currentContent = fs.readFileSync(tasksFile, 'utf-8');
  const tripleBackup = `${tasksFile}.triple-backup`;
  fs.writeFileSync(tripleBackup, currentContent);

  // 從備份恢復
  fs.writeFileSync(tasksFile, backupContent);

  console.log(`✅ ${spec.name}: 已強制從備份恢復 (三重備份: ${path.basename(tripleBackup)})`);
  return true;
}

// 主函數
function main() {
  console.log('🔄 開始強制從備份恢復 tasks.md 文件...\n');

  const specs = [];
  const dirs = fs.readdirSync(SPECS_DIR, { withFileTypes: true });

  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const specPath = path.join(SPECS_DIR, dir.name);
      const tasksPath = path.join(specPath, 'tasks.md');

      if (fs.existsSync(tasksPath)) {
        specs.push({
          name: dir.name,
          path: specPath,
          tasks: tasksPath
        });
      }
    }
  }

  let restoredCount = 0;

  specs.forEach(spec => {
    try {
      if (forceRestoreSpecTasks(spec)) {
        restoredCount++;
      }
    } catch (error) {
      console.error(`❌ ${spec.name}: 強制恢復失敗 - ${error.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 強制恢復結果統計');
  console.log('='.repeat(60));
  console.log(`總 Spec 數: ${specs.length}`);
  console.log(`已強制恢復: ${restoredCount}`);
  console.log(`未恢復: ${specs.length - restoredCount}`);

  if (restoredCount > 0) {
    console.log('\n⚠️  已建立三重備份文件 (.triple-backup)');
    console.log('🔄 請重新運行驗證腳本檢查恢復結果');
  } else {
    console.log('\n✅ 沒有需要強制恢復的文件');
  }
}

main();


