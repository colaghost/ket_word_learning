#!/bin/bash
# 语法检查脚本 - 在 Edit/Write 工具执行后检查代码语法
# 使用 Node.js 解析 JSON（避免依赖 jq）

INPUT=$(cat)

# 使用 Node.js 提取文件路径并执行语法检查
node -e "
const input = $INPUT;

const filePath = input?.tool_input?.file_path || '';

// 跳过空路径
if (!filePath) {
    process.exit(0);
}

const fs = require('fs');
const vm = require('vm');

// 检查 TypeScript 文件
if (filePath.endsWith('.ts')) {
    const { execSync } = require('child_process');
    try {
        execSync('npx tsc --noEmit --skipLibCheck ' + filePath, {
            cwd: process.env.CLAUDE_PROJECT_DIR,
            stdio: 'pipe'
        });
    } catch (e) {
        console.log(JSON.stringify({
            decision: 'block',
            reason: 'TypeScript syntax error in ' + filePath + ': ' + (e.stderr?.toString() || e.message)
        }));
        process.exit(0);
    }
}

// 检查 HTML 文件中的 JavaScript
if (filePath.endsWith('.html')) {
    let html;
    try {
        html = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        // 文件可能不存在（新建文件时）
        process.exit(0);
    }

    // 状态机解析提取 script 内容
    let inScript = false;
    let scriptContent = '';
    let scriptCount = 0;
    let errors = [];

    const lines = html.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const scriptOpen = line.match(/<script[^>]*>/i);
        const scriptClose = line.match(/<\/script>/i);

        if (scriptOpen && !inScript) {
            inScript = true;
            scriptCount++;
            scriptContent = line.substring(scriptOpen.index + scriptOpen[0].length);
            // 检查是否在同一行关闭
            if (scriptClose) {
                scriptContent = scriptContent.substring(0, scriptClose.index);
                inScript = false;
                // 验证脚本
                if (scriptContent.trim()) {
                    try {
                        new vm.Script(scriptContent);
                    } catch (e) {
                        errors.push('Script block ' + scriptCount + ' (line ' + (i+1) + '): ' + e.message);
                    }
                }
                scriptContent = '';
            }
            continue;
        }

        if (inScript) {
            if (scriptClose) {
                scriptContent += '\n' + line.substring(0, scriptClose.index);
                inScript = false;
                if (scriptContent.trim()) {
                    try {
                        new vm.Script(scriptContent);
                    } catch (e) {
                        errors.push('Script block ' + scriptCount + ' (around line ' + (i+1) + '): ' + e.message);
                    }
                }
                scriptContent = '';
            } else {
                scriptContent += '\n' + line;
            }
        }
    }

    if (errors.length > 0) {
        console.log(JSON.stringify({
            decision: 'block',
            reason: 'JavaScript syntax error in ' + filePath + ': ' + errors.join('; ')
        }));
        process.exit(0);
    }
}

process.exit(0);
"
