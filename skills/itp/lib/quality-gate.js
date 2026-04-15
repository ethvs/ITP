/**
 * Quality Gate - 质量门控
 * 六维质量评估和自动抛光
 */

class QualityGate {
  constructor() {
    // 默认阈值
    this.defaultThresholds = {
      completeness: 0.90,
      aiScore: 0.05,
      logicConsistency: 0.90,
      fluency: 0.90,
      formatCompliance: 0.95,
      boundaryCoverage: 0.80
    };

    // AI 特征关键词（用于检测AI痕迹）
    this.aiSignatures = [
      // 模板化表达
      '值得注意的是', '首先需要', '其次需要', '最后需要',
      '总的来说', '总而言之', '综上所述',
      '不仅可以', '还可以', '一方面', '另一方面',
      '这是一个', '这体现了', '这表明',
      '希望大家能够', '我们应该',
      // 过度正式
      '非常', '极其', '相当', '特别',
      // 列表化表达
      '第一', '第二', '第三', '第四', '第五',
      '首先', '其次', '然后', '最后',
      '一是', '二是', '三是',
      // 空洞过渡
      '从这个角度来看', '换句话说', '简单来说',
      '值得注意的是', '需要指出的是'
    ];

    // 流畅度指标
    this.fluencyMetrics = {
      avgSentenceLength: { min: 10, max: 50 },
      sentenceVariety: 0.7,  // 句子长度变化度
      transitionWords: 0.3   // 过渡词比例
    };
  }

  /**
   * 执行六维质量评估
   */
  async evaluate(result, options = {}) {
    const content = this.extractContent(result);
    const thresholds = { ...this.defaultThresholds, ...options.thresholds };

    // 执行六维评估
    const scores = {
      completeness: this.assessCompleteness(content, result),
      aiScore: this.assessAIScore(content),  // AI 痕迹分数，越低越好
      logicConsistency: this.assessLogic(content),
      fluency: this.assessFluency(content),
      formatCompliance: this.assessFormat(content, result),
      boundaryCoverage: this.assessBoundaries(content, result)
    };

    // 判断整体通过
    const passed = this.checkPassAll(scores, thresholds);

    return {
      passed,
      scores,
      thresholds,
      failedDimensions: this.getFailedDimensions(scores, thresholds),
      summary: this.generateSummary(scores, thresholds),
      recommendations: this.generateRecommendations(scores, thresholds)
    };
  }

  /**
   * 提取内容
   */
  extractContent(result) {
    if (typeof result === 'string') {
      return result;
    }
    if (result.content) {
      return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    }
    return JSON.stringify(result);
  }

  /**
   * 1. 完整性检查 (Completeness)
   */
  assessCompleteness(content, result) {
    let score = 100;

    // 检查内容长度
    const length = content.length;
    if (length < 100) score -= 30;
    else if (length < 500) score -= 10;

    // 检查结构完整性
    const sections = content.split(/#{1,3}\s/).length - 1;
    if (result.metadata?.taskType === 'creative_writing' && sections < 3) {
      score -= 15;
    }

    // 检查是否包含关键元素
    const lacksConclusion = !content.match(/(总结|结论|end|conclusion)/i);
    const lacksIntroduction = !content.match(/(介绍|前言|introduction)/i);

    if (lacksConclusion) score -= 10;
    if (lacksIntroduction) score -= 10;

    // 最终结果类型完整性
    if (typeof result.content === 'object' && result.content !== null) {
      const requiredKeys = this.getRequiredKeys(result.metadata?.contentType);
      for (const key of requiredKeys) {
        if (!(key in result.content)) {
          score -= 5;
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 2. AI 痕迹检查 (AI Score) - 越低越好
   */
  assessAIScore(content) {
    let aiScore = 0;
    const contentLower = content.toLowerCase();

    // 检测模板化表达
    let templateCount = 0;
    for (const signature of this.aiSignatures) {
      const regex = new RegExp(signature, 'gi');
      const matches = content.match(regex);
      if (matches) {
        templateCount += matches.length;
      }
    }

    // 计算密度（每1000字的模板频率）
    const contentLength = content.length;
    const density = (templateCount / contentLength) * 1000;
    aiScore = Math.min(100, density * 5);  // 每200字一个模板词 = 5%

    // 检测过度列表化
    const numberedListPattern = /[\d一二三四五六七八九十]、[\s\S]{10,50}?(?=[\d一二三四五六七八九十]、|$)/g;
    const lists = content.match(numberedListPattern);
    if (lists && lists.length > 5) {
      aiScore += 10;
    }

    // 检测过度正式的表达
    const formalPatterns = [/具有重要意义/g, /不可或缺/g, /至关重要/g, /极其/g];
    for (const pattern of formalPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 3) {
        aiScore += matches.length * 2;
      }
    }

    return Math.max(0, Math.min(100, aiScore));
  }

  /**
   * 3. 逻辑一致性检查 (Logic Consistency)
   */
  assessLogic(content) {
    let score = 100;

    // 检查矛盾表述
    const contradictions = [
      { a: /总是/g, b: /有时/g },
      { a: /所有/g, b: /部分/g },
      { a: /完全/g, b: /稍微/g }
    ];

    for (const { a, b } of contradictions) {
      const hasA = a.test(content);
      const hasB = b.test(content);
      if (hasA && hasB) {
        score -= 10;
      }
    }

    // 检查逻辑连接词
    const logicWords = ['因此', '所以', '因为', '由于', '导致', '引起'];
    let logicCount = 0;
    for (const word of logicWords) {
      const regex = new RegExp(word, 'g');
      const matches = content.match(regex);
      if (matches) logicCount += matches.length;
    }

    // 逻辑词过少可能表示缺乏论证
    if (logicCount < 3 && content.length > 1000) {
      score -= 10;
    }

    // 检查因果关系合理性（简化检测）
    const causeEffectPattern = /因为.*?所以/g;
    const causeEffects = content.match(causeEffectPattern);
    if (causeEffects) {
      // 有因无果 or 有果无因
      const orphanedBecause = content.match(/因为(?![^，。]*所以)/g);
      const orphanedSo = content.match(/(?<!因为[^，。]{0,50})所以/g);
      if (orphanedBecause || orphanedSo) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 4. 流畅度检查 (Fluency)
   */
  assessFluency(content) {
    let score = 100;

    // 句子长度过于一致
    const sentences = content.split(/[。！？；]/).filter(s => s.trim().length > 0);
    if (sentences.length > 10) {
      const lengths = sentences.map(s => s.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      const variation = stdDev / avgLength;

      if (variation < 0.3) {
        score -= 20;  // 句子过度均匀
      }
    }

    // 检查重复用词
    const words = content.split(/\s+/);
    const wordFreq = {};
    for (const word of words) {
      if (word.length > 1) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    const repeats = Object.values(wordFreq).filter(freq => freq > words.length * 0.05);
    if (repeats.length > 5) {
      score -= 10;
    }

    // 段落长度检查
    const paragraphs = content.split(/\n{2,}/);
    const shortParagraphs = paragraphs.filter(p => p.length < 50).length;
    if (shortParagraphs > paragraphs.length * 0.5) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 5. 格式规范性检查 (Format Compliance)
   */
  assessFormat(content, result) {
    let score = 100;

    // 检查格式一致性
    if (content.includes('# ') && !content.includes('## ')) {
      // 有一级标题但没有二级标题
      if (content.length > 1000) {
        score -= 10;
      }
    }

    // 检查代码格式（如果是代码）
    if (result.metadata?.contentType === 'code') {
      if (!content.includes('/**') && content.length > 200) {
        score -= 20;  // 缺少文档注释
      }
      if (!content.includes('try') && content.includes('function')) {
        score -= 15;  // 缺少错误处理
      }
    }

    // 检查 Markdown/JSON 格式
    try {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        JSON.parse(content);
      }
    } catch (e) {
      score -= 30;  // JSON 格式错误
    }

    // 检查空白字符
    const trailingSpaces = content.match(/ +\n/g);
    if (trailingSpaces && trailingSpaces.length > 5) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 6. 边界覆盖检查 (Boundary Coverage) - 主要针对代码
   */
  assessBoundaries(content, result) {
    let score = 100;

    if (result.metadata?.contentType === 'code') {
      // 检查空值处理
      if (!content.match(/null|null|undefined|\"\"/g)) {
        score -= 20;
      }

      // 检查类型检查
      if (!content.match(/typeof|instanceof|\.constructor/g)) {
        score -= 15;
      }

      // 检查循环/递归终止
      if (content.match(/for|while|function.*\(.*\).*\{/g) &&
          !content.match(/break|return|:return|if.*length/g)) {
        score -= 20;
      }

      // 检查异常边界
      if (!content.match(/catch|error|Error|try.*catch/g)) {
        score -= 20;
      }
    } else {
      // 非代码任务，给个满分但需要检查极端情况
      if (content.match(/所有|一切|全部|没有例外/g) && content.length > 500) {
        score -= 10;  // 过于绝对的表述
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 检查逻辑
   */
  async checkLogic(content) {
    const score = this.assessLogic(content);
    return {
      consistent: score >= 90,
      score,
      issues: score < 90 ? this.identifyLogicIssues(content) : []
    };
  }

  /**
   * 识别逻辑问题
   */
  identifyLogicIssues(content) {
    const issues = [];

    // 检测未闭合的逻辑
    if (content.includes('因为') && !content.includes('所以')) {
      issues.push('存在未闭合的因果逻辑');
    }

    // 检测循环引用（代码）
    if (content.match(/function.*\{[\s\S]*?function/g)) {
      issues.push('可能存在函数定义重复');
    }

    return issues;
  }

  /**
   * 检查是否通过所有维度
   */
  checkPassAll(scores, thresholds) {
    return (
      scores.completeness >= thresholds.completeness * 100 &&
      scores.aiScore <= thresholds.aiScore * 100 &&
      scores.logicConsistency >= thresholds.logicConsistency * 100 &&
      scores.fluency >= thresholds.fluency * 100 &&
      scores.formatCompliance >= thresholds.formatCompliance * 100 &&
      scores.boundaryCoverage >= thresholds.boundaryCoverage * 100
    );
  }

  /**
   * 获取未通过的维度
   */
  getFailedDimensions(scores, thresholds) {
    const failed = [];

    if (scores.completeness < thresholds.completeness * 100) {
      failed.push('completeness');
    }
    if (scores.aiScore > thresholds.aiScore * 100) {
      failed.push('ai_score');
    }
    if (scores.logicConsistency < thresholds.logicConsistency * 100) {
      failed.push('logic_consistency');
    }
    if (scores.fluency < thresholds.fluency * 100) {
      failed.push('fluency');
    }
    if (scores.formatCompliance < thresholds.formatCompliance * 100) {
      failed.push('format_compliance');
    }
    if (scores.boundaryCoverage < thresholds.boundaryCoverage * 100) {
      failed.push('boundary_coverage');
    }

    return failed;
  }

  /**
   * 生成质量摘要
   */
  generateSummary(scores, thresholds) {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    const passedCount = 6 - this.getFailedDimensions(scores, thresholds).length;

    return {
      overall: avgScore.toFixed(1),
      dimensionsPassed: passedCount,
      totalDimensions: 6,
      grade: avgScore >= 95 ? 'A+' : avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : 'D'
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(scores, thresholds) {
    const recommendations = [];

    if (scores.completeness < thresholds.completeness * 100) {
      recommendations.push({
        type: 'completeness',
        issue: '内容完整性不足',
        suggestion: '补充必要的引言和结论，确保覆盖所有要点'
      });
    }

    if (scores.aiScore > thresholds.aiScore * 100) {
      recommendations.push({
        type: 'ai_score',
        issue: '存在较多AI痕迹',
        suggestion: '减少模板化表达，增加个性化语气，避免过度列表化'
      });
    }

    if (scores.logicConsistency < thresholds.logicConsistency * 100) {
      recommendations.push({
        type: 'logic',
        issue: '逻辑一致性需改进',
        suggestion: '检查因果关系是否闭合，避免矛盾表述'
      });
    }

    if (scores.fluency < thresholds.fluency * 100) {
      recommendations.push({
        type: 'fluency',
        issue: '流畅度有待提高',
        suggestion: '增加句子长度变化，减少重复用词'
      });
    }

    if (scores.formatCompliance < thresholds.formatCompliance * 100) {
      recommendations.push({
        type: 'format',
        issue: '格式规范性需改进',
        suggestion: '检查标题层级、代码注释和异常处理'
      });
    }

    if (scores.boundaryCoverage < thresholds.boundaryCoverage * 100) {
      recommendations.push({
        type: 'boundary',
        issue: '边界覆盖率不足',
        suggestion: '添加空值检查、类型验证和循环终止条件'
      });
    }

    return recommendations;
  }

  /**
   * 根据质量结果生成改进方案
   */
  generateImprovements(qualityResult) {
    return qualityResult.recommendations.map(rec => ({
      type: rec.type,
      priority: rec.type === 'ai_score' ? 'high' : 'medium',
      suggestion: rec.suggestion
    }));
  }

  /**
   * 获取必需字段
   */
  getRequiredKeys(contentType) {
    const requirements = {
      creative_content: ['title', 'content'],
      code: ['content'],
      data_report: ['analysis'],
      text: []
    };
    return requirements[contentType] || [];
  }
}

module.exports = QualityGate;
