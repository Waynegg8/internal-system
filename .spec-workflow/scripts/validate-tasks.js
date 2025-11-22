/**
 * Tasks.md 驗證工具
 * 檢查 tasks.md 是否正確對應 requirements.md 和 design.md
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
      const requirementsPath = path.join(specPath, 'requirements.md');
      const designPath = path.join(specPath, 'design.md');
      const tasksPath = path.join(specPath, 'tasks.md');
      
      if (fs.existsSync(requirementsPath)) {
        specs.push({
          name: dir.name,
          path: specPath,
          requirements: requirementsPath,
          design: fs.existsSync(designPath) ? designPath : null,
          tasks: fs.existsSync(tasksPath) ? tasksPath : null
        });
      }
    }
  }
  
  return specs;
}

// 解析 requirements.md 提取需求編號
function extractRequirements(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const requirements = [];
  
  // 匹配 "### Requirement X" 或 "#### BRX.X.X" 格式
  const reqPattern = /(?:###\s+Requirement\s+(\d+)|####\s+(BR[\d.]+))/gi;
  let match;
  
  while ((match = reqPattern.exec(content)) !== null) {
    if (match[1]) {
      requirements.push(`Requirement ${match[1]}`);
    } else if (match[2]) {
      requirements.push(match[2]);
    }
  }
  
  return requirements;
}

// 解析 tasks.md 提取任務和需求引用
function extractTasks(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const tasks = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 匹配任務行 "- [ ] X. ..."
    const taskMatch = line.match(/^- \[([ x-])\]\s+(\d+(?:\.\d+)*)\s+(.+)$/);
    if (taskMatch) {
      const status = taskMatch[1];
      const taskId = taskMatch[2];
      const taskTitle = taskMatch[3];

      // 收集任務內容直到下一個任務或文件結尾
      let taskContent = '';
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        // 如果遇到下一個任務，停止收集
        if (nextLine.match(/^- \[[ x-]\]\s+\d/)) {
          break;
        }
        taskContent += nextLine + '\n';
        j++;
      }

      // 提取各個字段
      const reqMatch = taskContent.match(/_Requirements:\s*(.+?)(?:\n|$)/);
      const requirements = reqMatch
        ? reqMatch[1].split(',').map(r => r.trim())
        : [];

      const leverageMatch = taskContent.match(/_Leverage:\s*(.+?)(?:\n|$)/);
      const leverage = leverageMatch ? leverageMatch[1].trim() : null;

      const promptMatch = taskContent.match(/_Prompt:\s*(.+?)(?=\n- \[|$)/s);
      const prompt = promptMatch ? promptMatch[1].trim() : null;

      const fileMatch = taskContent.match(/- File:\s*(.+?)(?:\n|$)/);
      const file = fileMatch ? fileMatch[1].trim() : null;

      tasks.push({
        id: taskId,
        status,
        requirements,
        leverage,
        prompt: prompt ? prompt.substring(0, 100) + '...' : null,
        file,
        hasPrompt: !!prompt,
        hasLeverage: !!leverage,
        hasRequirements: requirements.length > 0
      });

      // 跳到下一個任務
      i = j - 1;
    }
  }

  return tasks;
}

// 驗證 tasks.md
function validateTasks(spec) {
  const issues = [];
  const warnings = [];
  
  // 檢查 tasks.md 是否存在
  if (!spec.tasks) {
    issues.push({
      type: 'missing',
      message: 'tasks.md 文件不存在'
    });
    return { issues, warnings, tasks: [], requirements: [] };
  }
  
  // 讀取 requirements
  const requirements = extractRequirements(spec.requirements);
  
  // 讀取 tasks
  const tasks = extractTasks(spec.tasks);
  
  // 檢查每個任務是否有必要的字段
  tasks.forEach((task, index) => {
    if (!task.hasRequirements) {
      warnings.push({
        type: 'missing_requirements',
        task: task.id,
        message: `任務 ${task.id} 缺少 _Requirements 字段`
      });
    }
    
    if (!task.hasLeverage) {
      warnings.push({
        type: 'missing_leverage',
        task: task.id,
        message: `任務 ${task.id} 缺少 _Leverage 字段`
      });
    }
    
    if (!task.hasPrompt) {
      issues.push({
        type: 'missing_prompt',
        task: task.id,
        message: `任務 ${task.id} 缺少 _Prompt 字段（必需）`
      });
    }
    
    if (!task.file) {
      warnings.push({
        type: 'missing_file',
        task: task.id,
        message: `任務 ${task.id} 缺少 File 字段`
      });
    }
  });
  
  // 檢查需求覆蓋率
  if (requirements.length > 0) {
    const taskRequirements = new Set();
    tasks.forEach(task => {
      task.requirements.forEach(req => taskRequirements.add(req));
    });
    
    requirements.forEach(req => {
      if (!taskRequirements.has(req)) {
        warnings.push({
          type: 'uncovered_requirement',
          requirement: req,
          message: `需求 ${req} 沒有被任何任務引用`
        });
      }
    });
  }
  
  return {
    issues,
    warnings,
    tasks,
    requirements,
    taskCount: tasks.length,
    requirementCount: requirements.length
  };
}

// 主函數
function main() {
  console.log('🔍 開始驗證所有 spec 的 tasks.md...\n');
  
  const specs = getAllSpecs();
  const results = [];
  
  specs.forEach(spec => {
    const validation = validateTasks(spec);
    results.push({
      spec: spec.name,
      ...validation
    });
  });
  
  // 輸出結果
  let totalIssues = 0;
  let totalWarnings = 0;
  
  results.forEach(result => {
    if (result.issues.length > 0 || result.warnings.length > 0) {
      console.log(`\n📋 ${result.spec}`);
      console.log(`   任務數: ${result.taskCount}, 需求數: ${result.requirementCount}`);
      
      if (result.issues.length > 0) {
        console.log(`   ❌ 問題 (${result.issues.length}):`);
        result.issues.forEach(issue => {
          console.log(`      - ${issue.message}`);
        });
        totalIssues += result.issues.length;
      }
      
      if (result.warnings.length > 0) {
        console.log(`   ⚠️  警告 (${result.warnings.length}):`);
        result.warnings.forEach(warning => {
          console.log(`      - ${warning.message}`);
        });
        totalWarnings += result.warnings.length;
      }
    }
  });
  
  // 統計
  const specsWithTasks = results.filter(r => r.taskCount > 0).length;
  const specsWithoutTasks = results.filter(r => r.taskCount === 0).length;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 驗證結果統計');
  console.log('='.repeat(60));
  console.log(`總 Spec 數: ${results.length}`);
  console.log(`有 tasks.md: ${specsWithTasks}`);
  console.log(`無 tasks.md: ${specsWithoutTasks}`);
  console.log(`總問題數: ${totalIssues}`);
  console.log(`總警告數: ${totalWarnings}`);
  
  if (totalIssues === 0 && totalWarnings === 0) {
    console.log('\n✅ 所有 tasks.md 驗證通過！');
  } else if (totalIssues === 0) {
    console.log('\n⚠️  有警告，但沒有嚴重問題');
  } else {
    console.log('\n❌ 發現問題，請修復後再執行任務');
  }
}

main();



