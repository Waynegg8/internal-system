/**
 * 修復 tasks.md 文件格式的工具
 * 將不正確的格式轉換為驗證腳本期望的格式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPECS_DIR = path.join(__dirname, '../specs');

// 讀取所有 spec 目錄
function getAllSpecs() {
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

  return specs;
}

// 檢查任務是否已經是正確格式
function isValidTaskFormat(content) {
  // 檢查是否包含正確的任務標記格式
  const taskPattern = /- \[([ x-])\]\s+(\d+(?:\.\d+)*)\s+/g;
  return taskPattern.test(content);
}

// 轉換舊格式為新格式
function convertTaskFormat(content, specName) {
  const lines = content.split('\n');
  const convertedLines = [];
  let taskCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 檢查是否已經是正確格式的任務行 (- [x] 或 - [ ])
    const existingTaskMatch = line.match(/^- \[[ x-]\]\s+(\d+(?:\.\d+)*)\s+(.+)$/);
    if (existingTaskMatch) {
      // 保留已存在的正確格式任務
      convertedLines.push(line);

      // 收集後續的描述行，直到下一個任務或結束
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];

        // 如果遇到下一個任務或標題，停止收集
        if (nextLine.match(/^- \[[ x-]\]\s+/) || nextLine.match(/^###\s+/) || nextLine.match(/^---/)) {
          break;
        }

        // 如果是描述行，收集它
        if (nextLine.trim().startsWith('- ') || nextLine.trim() === '' ||
            nextLine.includes('_Leverage:') || nextLine.includes('_Requirements:') ||
            nextLine.includes('_Prompt:') || nextLine.includes('_Note:') ||
            nextLine.includes('_Purpose:') || nextLine.includes('_Status:')) {
          convertedLines.push(nextLine);
        }

        j++;
      }

      // 跳過已處理的行
      i = j - 1;
      continue;
    }

    // 匹配舊格式的標題行
    const oldHeaderMatch = line.match(/^###\s+(\d+(?:\.\d+)*)\s+(.+?)\s*(✅|已實現|已完成)?\s*$/);
    if (oldHeaderMatch) {
      const taskId = oldHeaderMatch[1];
      const taskTitle = oldHeaderMatch[2];
      const status = oldHeaderMatch[3] ? '[x]' : '[ ]';

      // 添加任務行
      convertedLines.push(`- ${status} ${taskId} ${taskTitle}`);

      // 收集後續的描述行，直到下一個標題或結束
      let j = i + 1;
      const descriptionLines = [];

      while (j < lines.length) {
        const nextLine = lines[j];

        // 如果遇到下一個標題，停止收集
        if (nextLine.match(/^###\s+\d+(?:\.\d+)*\s+/) || nextLine.match(/^---/)) {
          break;
        }

        // 如果是描述行，收集它
        if (nextLine.trim().startsWith('- ') || nextLine.trim() === '' ||
            nextLine.includes('_Leverage:') || nextLine.includes('_Requirements:') ||
            nextLine.includes('_Prompt:') || nextLine.includes('_Note:') ||
            nextLine.includes('_Purpose:') || nextLine.includes('_Status:')) {
          descriptionLines.push(nextLine);
        }

        j++;
      }

      // 添加描述行
      convertedLines.push(...descriptionLines);

      // 跳過已處理的行
      i = j - 1;

      continue;
    }

    // 如果是分隔線或其他行，直接保留
    if (line.trim() === '' || line.startsWith('#') || line.startsWith('---') || line.startsWith('**') ||
        line.includes('總結') || line.includes('已完全實現的功能') || line.includes('實現狀態評估')) {
      convertedLines.push(line);
    }
  }

  return convertedLines.join('\n');
}

// 修復單個 spec 的 tasks.md
function fixSpecTasks(spec) {
  const content = fs.readFileSync(spec.tasks, 'utf-8');

  if (isValidTaskFormat(content)) {
    console.log(`✅ ${spec.name}: 格式已正確，跳過`);
    return false;
  }

  console.log(`🔧 ${spec.name}: 轉換格式中...`);

  const converted = convertTaskFormat(content, spec.name);

  // 備份原文件
  const backupPath = `${spec.tasks}.backup`;
  fs.writeFileSync(backupPath, content);

  // 寫入轉換後的內容
  fs.writeFileSync(spec.tasks, converted);

  console.log(`✅ ${spec.name}: 格式已轉換 (備份: ${path.basename(backupPath)})`);
  return true;
}

// 主函數
function main() {
  console.log('🔧 開始修復所有 spec 的 tasks.md 格式...\n');

  const specs = getAllSpecs();
  let fixedCount = 0;

  specs.forEach(spec => {
    try {
      if (fixSpecTasks(spec)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ ${spec.name}: 修復失敗 - ${error.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('📊 修復結果統計');
  console.log('='.repeat(60));
  console.log(`總 Spec 數: ${specs.length}`);
  console.log(`已修復: ${fixedCount}`);
  console.log(`已正確: ${specs.length - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n⚠️  所有原始文件已備份為 .backup 檔案');
    console.log('🔄 請重新運行驗證腳本檢查修復結果');
  } else {
    console.log('\n✅ 所有文件格式都已正確！');
  }
}

main();
