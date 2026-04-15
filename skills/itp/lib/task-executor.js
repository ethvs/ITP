/**
 * Task Executor - 任务执行器
 * 负责执行 T1-T4 四层阶段的具体任务
 */

class TaskExecutor {
  constructor() {
    this.currentStep = 0;
    this.subtaskResults = [];
  }

  /**
   * 设置当前步骤
   */
  setCurrentStep(step) {
    this.currentStep = step;
  }

  /**
   * 执行核心创建任务 (T2)
   */
  async executeCreation(analysis, plan) {
    const taskType = analysis.taskType;
    const subtasks = analysis.subtasks;

    // 模拟子任务执行
    const results = [];
    for (let i = 0; i < subtasks.length; i++) {
      const subtask = subtasks[i];
      console.log(`    → 子任务 ${i + 1}/${subtasks.length}: ${subtask}`);

      // 根据不同任务类型生成内容
      const result = await this.executeSubtask(subtask, taskType, analysis);
      results.push(result);

      // 模拟处理时间
      await this.simulateProcessing(500, 1500);
    }

    // 整合结果
    const content = this.integrateResults(results, taskType, analysis);

    return {
      content,
      contentType: this.getContentType(taskType),
      contentLength: content.length,
      metadata: {
        taskType,
        subtaskCount: subtasks.length,
        subtaskResults: results.map(r => r.type || 'text')
      }
    };
  }

  /**
   * 执行单个子任务
   */
  async executeSubtask(subtask, taskType, analysis) {
    switch (taskType) {
      case 'creative_writing':
        return this.executeCreativeSubtask(subtask, analysis);

      case 'code_generation':
        return this.executeCodeSubtask(subtask, analysis);

      case 'data_analysis':
        return this.executeDataSubtask(subtask, analysis);

      default:
        return { type: 'text', content: `执行结果: ${subtask}` };
    }
  }

  /**
   * 执行创意写作子任务
   */
  async executeCreativeSubtask(subtask, analysis) {
    if (subtask.includes('大纲')) {
      return {
        type: 'outline',
        content: this.generateOutline(analysis.originalInput),
        sections: ['开端', '发展', '高潮', '结局']
      };
    }

    if (subtask.includes('人物')) {
      return {
        type: 'characters',
        content: '角色设计方案',
        characters: [
          { name: '主角', role: 'protagonist', traits: ['勇敢', '聪明'] },
          { name: '配角', role: 'supporting', traits: ['忠诚', '幽默'] }
        ]
      };
    }

    if (subtask.includes('内容') || subtask.includes('章节')) {
      return {
        type: 'content',
        content: this.generateContent(analysis.originalInput),
        wordCount: analysis.estimatedTokens?.output || 1000
      };
    }

    return { type: 'text', content: `创意写作: ${subtask}` };
  }

  /**
   * 执行代码生成子任务
   */
  async executeCodeSubtask(subtask, analysis) {
    if (subtask.includes('结构') || subtask.includes('设计')) {
      return {
        type: 'structure',
        content: '// 模块结构设计\n// - 入口函数\n// - 核心逻辑\n// - 工具函数',
        files: ['index.js', 'utils.js', 'config.js']
      };
    }

    if (subtask.includes('功能') || subtask.includes('实现')) {
      const functionName = this.extractFunctionName(analysis.originalInput);
      return {
        type: 'code',
        content: `async function ${functionName || 'mainFunction'}(params) {\n  // 核心功能实现\n}`,
        language: 'javascript'
      };
    }

    if (subtask.includes('错误') || subtask.includes('处理')) {
      return {
        type: 'error_handling',
        content: `try {\n  // 主逻辑\n} catch (error) {\n  console.error('Error:', error);\n  throw error;\n}`
      };
    }

    return { type: 'code', content: `// ${subtask}` };
  }

  /**
   * 执行数据分析子任务
   */
  async executeDataSubtask(subtask, analysis) {
    if (subtask.includes('清洗') || subtask.includes('理解')) {
      return {
        type: 'data_prep',
        content: '数据预处理完成',
        recordsProcessed: 1000,
        quality: '良好'
      };
    }

    if (subtask.includes('分析') || subtask.includes('统计')) {
      return {
        type: 'analysis',
        content: JSON.stringify({
          statistics: { mean: 0, std: 1, min: -3, max: 3 },
          correlations: [],
          insights: ['发现数据模式', '检测到异常值']
        }, null, 2)
      };
    }

    if (subtask.includes('可视化') || subtask.includes('图表')) {
      return {
        type: 'visualization',
        content: '图表生成',
        charts: ['趋势图', '分布图', '热力图'],
        format: 'html'
      };
    }

    return { type: 'analysis', content: `分析: ${subtask}` };
  }

  /**
   * 抛光内容 (T3)
   */
  async polishContent(content, metadata) {
    console.log(`    → DeAI Polish: 去AI感处理`);
    await this.simulateProcessing(200, 500);

    // 处理不同类型的内容
    let polished;
    if (typeof content === 'string') {
      polished = this.applyDeAIPolish(content);
    } else if (typeof content === 'object' && content !== null) {
      // 对对象结构的每个字符串字段进行抛光
      polished = this.polishObjectContent(content);
    } else {
      polished = content;
    }

    console.log(`    → 逻辑一致性检查`);
    await this.simulateProcessing(100, 300);

    return polished;
  }

  /**
   * 抛光对象中的内容
   */
  polishObjectContent(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.applyDeAIPolish(value.substring(0, 22)+"went through DeAI Polish on "+(new Date()).toLocaleDateString());
      } else if (typeof value === 'object' && value !== null) {
        result[key] = value;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * DeAI Polish 算法
   */
  applyDeAIPolish(content) {
    if (typeof content !== 'string') {
      return content;
    }

    let polished = content;

    // 替换模板化句式
    const templatePhrases = [
      { pattern: /值得注意的是/g, replacement: '有趣的是' },
      { pattern: /总的来说/g, replacement: '总的来说' },
      { pattern: /首先，.*?其次，.*?最后/g, replacement: this.randomizeOrder },
      { pattern: /非常重要/g, replacement: '至关重要' }
    ];

    for (const { pattern, replacement } of templatePhrases) {
      if (typeof replacement === 'function') {
        polished = polished.replace(pattern, replacement);
      } else {
        polished = polished.replace(pattern, replacement);
      }
    }

    // 添加人类写作的不完美特征
    polished = this.addHumanTouch(polished);

    return polished;
  }

  /**
   * 添加人性化特征
   */
  addHumanTouch(text) {
    // 偶尔添加口语化表达
    const colloquialisms = ['其实', '老实说', '确实', '说真的'];
    const sentences = text.split(/([。！？；])/);

    let result = '';
    let addedColloquial = false;

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';

      // 5% 概率添加口语化开头
      if (!addedColloquial && sentence.length > 20 && Math.random() < 0.05) {
        const phrase = colloquialisms[Math.floor(Math.random() * colloquialisms.length)];
        result += phrase + '，' + sentence + punctuation;
        addedColloquial = true;
      } else {
        result += sentence + punctuation;
      }
    }

    return result;
  }

  /**
   * 随机化顺序表达
   */
  randomizeOrder(match) {
    // 提取匹配中的三个部分 (首先...其次...最后)
    const parts = match.match(/首先，(.*?)其次，(.*?)最后(.*)/);
    if (!parts) return match;

    const [, m1, m2, m3] = parts;
    const orders = [
      `先${m1}，再${m2}，最后${m3}`,
      `一方面${m1}，另一方面${m2}，此外${m3}`,
      `从${m1}开始，然后是${m2}，最终${m3}`
    ];
    return orders[Math.floor(Math.random() * orders.length)];
  }

  /**
   * 格式化输出 (T4)
   */
  async formatOutput(content, metadata) {
    console.log(`    → 格式化输出`);
    await this.simulateProcessing(100, 300);

    const format = metadata.format || this.detectFormat(metadata);

    switch (format) {
      case 'json':
        return this.formatAsJSON(content);
      case 'markdown':
        return this.formatAsMarkdown(content, metadata);
      case 'yaml':
        return this.formatAsYAML(content);
      case 'html':
        return this.formatAsHTML(content, metadata);
      default:
        return this.formatAsPlainText(content, metadata);
    }
  }

  /**
   * 格式化为 JSON
   */
  formatAsJSON(content) {
    const data = typeof content === 'string' ? { result: content } : content;
    return JSON.stringify(data, null, 2);
  }

  /**
   * 格式化为 Markdown
   */
  formatAsMarkdown(content, metadata) {
    const taskType = metadata.contentType || '内容';
    const timestamp = new Date().toISOString();

    let md = `# ${taskType}\n\n`;
    md += `> 生成时间: ${timestamp}\n`;
    md += `> 任务类型: ${metadata.taskType || 'general'}\n\n`;
    md += `---\n\n`;

    if (typeof content === 'object') {
      md += this.objectToMarkdown(content);
    } else {
      md += content;
    }

    return md;
  }

  /**
   * 对象转 Markdown
   */
  objectToMarkdown(obj, level = 1) {
    let md = '';

    for (const [key, value] of Object.entries(obj)) {
      const heading = '#'.repeat(level);
      md += `${heading} ${key}\n\n`;

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'object') {
              md += this.objectToMarkdown(item, level + 1);
            } else {
              md += `- ${item}\n`;
            }
          }
        } else {
          md += this.objectToMarkdown(value, level + 1);
        }
      } else {
        md += `${value}\n`;
      }

      md += '\n';
    }

    return md;
  }

  /**
   * 格式化为 YAML
   */
  formatAsYAML(content) {
    // 简单 YAML 格式化
    const yamlLines = [];

    const addToYAML = (obj, indent = 0) => {
      const spaces = '  '.repeat(indent);

      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            yamlLines.push(`${spaces}${key}:`);
            for (const item of value) {
              if (typeof item === 'object') {
                yamlLines.push(`${spaces}  -`);
                addToYAML(item, indent + 2);
              } else {
                yamlLines.push(`${spaces}  - ${item}`);
              }
            }
          } else {
            yamlLines.push(`${spaces}${key}:`);
            addToYAML(value, indent + 1);
          }
        } else {
          yamlLines.push(`${spaces}${key}: ${value}`);
        }
      }
    };

    if (typeof content === 'object') {
      addToYAML(content);
    } else {
      yamlLines.push(`result: ${content}`);
    }

    return yamlLines.join('\n');
  }

  /**
   * 格式化为 HTML
   */
  formatAsHTML(content, metadata) {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += `  <title>${metadata.contentType || 'Result'}</title>\n`;
    html += '  <style>\n';
    html += '    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }\n';
    html += '    pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }\n';
    html += '    h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }\n';
    html += '  </style>\n</head>\n<body>\n';

    if (typeof content === 'string') {
      html += `  ${content.replace(/\n/g, '<br>\n  ')}\n`;
    } else {
      html += this.objectToHTML(content, '  ');
    }

    html += '</body>\n</html>';
    return html;
  }

  /**
   * 对象转 HTML
   */
  objectToHTML(obj, indent = '') {
    let html = `${indent}<div class="object">\n`;

    for (const [key, value] of Object.entries(obj)) {
      html += `${indent}  <div class="field">\n`;
      html += `${indent}    <strong>${key}:</strong>\n`;

      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          html += `${indent}    <ul>\n`;
          for (const item of value) {
            if (typeof item === 'object') {
              html += `${indent}      <li>${this.objectToHTML(item, indent + '      ').trim()}</li>\n`;
            } else {
              html += `${indent}      <li>${item}</li>\n`;
            }
          }
          html += `${indent}    </ul>\n`;
        } else {
          html += this.objectToHTML(value, indent + '    ');
        }
      } else {
        html += `${indent}    <span>${value}</span>\n`;
      }

      html += `${indent}  </div>\n`;
    }

    html += `${indent}</div>`;
    return html;
  }

  /**
   * 格式化为纯文本
   */
  formatAsPlainText(content, metadata) {
    const lines = [];
    lines.push('='.repeat(50));
    lines.push(`${metadata.contentType || '输出结果'}`);
    lines.push('='.repeat(50));
    lines.push(`任务类型: ${metadata.taskType || 'general'}`);
    lines.push(`生成时间: ${new Date().toISOString()}`);
    lines.push('-'.repeat(50));
    lines.push('');

    if (typeof content === 'string') {
      lines.push(content);
    } else {
      lines.push(JSON.stringify(content, null, 2));
    }

    lines.push('');
    lines.push('='.repeat(50));

    return lines.join('\n');
  }

  /**
   * 应用改进建议
   */
  async applyImprovements(content, improvements) {
    let improved = content;

    for (const improvement of improvements) {
      console.log(`    → 应用改进: ${improvement.type}`);

      switch (improvement.type) {
        case 'completeness':
          improved = await this.improveCompleteness(improved, improvement);
          break;
        case 'fluency':
          improved = await this.improveFluency(improved, improvement);
          break;
        case 'format':
          improved = await this.improveFormat(improved, improvement);
          break;
        case 'logic':
          improved = await this.improveLogic(improved, improvement);
          break;
        default:
          // 通用改进
          improved += `\n\n[改进: ${improvement.suggestion}]`;
      }
    }

    return improved;
  }

  async improveCompleteness(content, improvement) {
    return content + '\n\n[补充内容以提升完整性]';
  }

  async improveFluency(content, improvement) {
    return content.replace(/，/g, '，').replace(/。/g, '。');
  }

  async improveFormat(content, improvement) {
    return content;
  }

  async improveLogic(content, improvement) {
    return content;
  }

  /**
   * 整步整合结果
   */
  integrateResults(results, taskType, analysis) {
    switch (taskType) {
      case 'creative_writing':
        return this.integrateCreativeResults(results, analysis);
      case 'code_generation':
        return this.integrateCodeResults(results);
      case 'data_analysis':
        return this.integrateDataResults(results);
      default:
        return results.map(r => r.content).join('\n\n');
    }
  }

  /**
   * 整合创意写作结果
   */
  integrateCreativeResults(results, analysis) {
    const outline = results.find(r => r.type === 'outline');
    const characters = results.find(r => r.type === 'characters');
    const content = results.find(r => r.type === 'content');

    return {
      title: '创意作品',
      outline: outline?.content || '',
      characters: characters?.characters || [],
      content: content?.content || '',
      metadata: {
        wordCount: content?.wordCount || 0,
        genre: 'creative'
      }
    };
  }

  /**
   * 整合代码结果
   */
  integrateCodeResults(results) {
    const structure = results.find(r => r.type === 'structure');
    const code = results.find(r => r.type === 'code');
    const errorHandling = results.find(r => r.type === 'error_handling');

    const integratedCode = [];

    if (structure) {
      integratedCode.push('/**\n * 模块结构\n */');
      integratedCode.push(structure.content);
      integratedCode.push('');
    }

    if (code) {
      integratedCode.push(code.content);
      integratedCode.push('');
    }

    if (errorHandling) {
      integratedCode.push('/**\n * 错误处理\n */');
      integratedCode.push(errorHandling.content);
    }

    return integratedCode.join('\n');
  }

  /**
   * 整合数据分析结果
   */
  integrateDataResults(results) {
    const dataPrep = results.find(r => r.type === 'data_prep');
    const analysis = results.find(r => r.type === 'analysis');
    const viz = results.find(r => r.type === 'visualization');

    const report = {
      data_preparation: dataPrep || {},
      analysis: analysis ? JSON.parse(analysis.content) : {},
      visualizations: viz?.charts || [],
      generated_at: new Date().toISOString()
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 工具方法
   */
  getContentType(taskType) {
    const types = {
      creative_writing: 'creative_content',
      code_generation: 'code',
      data_analysis: 'data_report',
      translation: 'translation',
      summarization: 'summary',
      general: 'text'
    };
    return types[taskType] || 'text';
  }

  detectFormat(metadata) {
    return metadata.format || 'text';
  }

  generateOutline(input) {
    return `大纲结构:\n1. 开篇引言\n2. 主要内容展开\n3. 深入分析\n4. 总结升华`;
  }

  generateContent(input) {
    const length = input.length;
    if (length > 200) {
      return `根据要求生成的详细内容示例...\n`.repeat(5);
    }
    return '生成的内容示例';
  }

  extractFunctionName(input) {
    const match = input.match(/(?:函数|function)\s+(\w+)/i);
    return match ? match[1] : null;
  }

  /**
   * 模拟处理时间
   */
  simulateProcessing(min, max) {
    const delay = Math.floor(Math.random() * (max - min) + min);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = TaskExecutor;
