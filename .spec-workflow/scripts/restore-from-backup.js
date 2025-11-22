/**
 * 從備份文件恢復 tasks.md 的工具
 * 用於恢復被錯誤修改的任務文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECS_DIR = path.join(__dirname, '../specs');

// 檢查任務是否有效（有 _Prompt 字段）
function hasValidPrompt(content) {
  return content.includes('_Prompt:');
}

// 檢查任務數量
function countTasks(content) {
  const taskPattern = /- \[([ x-])\]\s+(\d+(?:\.\d+)*)\s+/g;
  const matches = content.match(taskPattern);
  return matches ? matches.length : 0;
}

// 恢復單個 spec 的 tasks.md
function restoreSpecTasks(spec) {
  const tasksFile = spec.tasks;
  const backupFile = `${tasksFile}.backup`;

  if (!fs.existsSync(backupFile)) {
    console.log(`ℹ️  ${spec.name}: 沒有備份文件，跳過`);
    return false;
  }

  const currentContent = fs.readFileSync(tasksFile, 'utf-8');
  const backupContent = fs.readFileSync(backupFile, 'utf-8');

  const currentTaskCount = countTasks(currentContent);
  const backupTaskCount = countTasks(backupContent);
  const currentHasPrompt = hasValidPrompt(currentContent);
  const backupHasPrompt = hasValidPrompt(backupContent);

  console.log(`📊 ${spec.name}: 當前任務數=${currentTaskCount}, 備份任務數=${backupTaskCount}`);
  console.log(`   當前有_Prompt=${currentHasPrompt}, 備份有_Prompt=${backupHasPrompt}`);

  // 如果備份文件有更多任務且有 _Prompt 字段，則恢復
  if (backupTaskCount > currentTaskCount && backupHasPrompt) {
    console.log(`🔄 ${spec.name}: 從備份恢復...`);

    // 再次備份當前文件（以防萬一）
    const doubleBackup = `${tasksFile}.double-backup`;
    fs.writeFileSync(doubleBackup, currentContent);

    // 從備份恢復
    fs.writeFileSync(tasksFile, backupContent);

    console.log(`✅ ${spec.name}: 已從備份恢復 (雙重備份: ${path.basename(doubleBackup)})`);
    return true;
  } else {
    console.log(`ℹ️  ${spec.name}: 當前版本更好或相等，保留當前版本`);
    return false;
  }
}

// 主函數
function main() {
  console.log('🔄 開始從備份恢復 tasks.md 文件...\n');

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
      if (restoreSpecTasks(spec)) {
        restoredCount++;
      }
    } catch (error) {
      console.error(`❌ ${spec.name}: 恢復失敗 - ${error.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 恢復結果統計');
  console.log('='.repeat(60));
  console.log(`總 Spec 數: ${specs.length}`);
  console.log(`已恢復: ${restoredCount}`);
  console.log(`未恢復: ${specs.length - restoredCount}`);

  if (restoredCount > 0) {
    console.log('\n⚠️  已建立雙重備份文件 (.double-backup)');
    console.log('🔄 請重新運行驗證腳本檢查恢復結果');
  } else {
    console.log('\n✅ 所有文件都已是最佳版本');
  }
}

main();


