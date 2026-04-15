/**
 * Intent Analyzer - 意图分析器
 * 基于 mappings.json 配置进行分析
 */

const fs = require('fs');
const path = require('path');

class IntentAnalyzer {
  constructor() {
    this.mappings = this.loadMappings();
    this.categoryCache = new Map();
  }

  loadMappings() {
    const mappingPath = path.join(__dirname, 'mappings.json');
    if (fs.existsSync(mappingPath)) {
      return JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    }
    return { taskCategories: {}, defaultSkills: [], confidenceThreshold: 0.6 };
  }

  /**
   * 分析用户意图
   * @param {string} userInput - 用户输入
   * @returns {Object} 分析结果
   */
  async analyze(userInput) {
    const input = userInput.toLowerCase();
    const results = [];

    for (const [categoryKey, categoryData] of Object.entries(this.mappings.taskCategories || {})) {
      const score = this.calculateMatchScore(input, categoryData.keywords || []);

      if (score > 0) {
        results.push({
          category: categoryKey,
          confidence: score,
          description: categoryData.description,
          requiredSkills: categoryData.skills || [],
          requiredTools: categoryData.tools || []
        });
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = results[0];
    if (bestMatch && bestMatch.confidence >= (this.mappings.confidenceThreshold || 0.6)) {
      return {
        success: true,
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        description: bestMatch.description,
        requiredSkills: bestMatch.requiredSkills,
        requiredTools: bestMatch.requiredTools,
        allMatches: results
      };
    }

    return {
      success: true,
      category: 'general',
      confidence: 0.5,
      description: '通用任务',
      requiredSkills: [],
      requiredTools: [],
      allMatches: results
    };
  }

  calculateMatchScore(input, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    let matchCount = 0;
    let maxScore = 0;

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();

      if (input.includes(kw)) {
        matchCount++;
        const position = input.indexOf(kw);
        const positionWeight = 1 - (position / input.length);
        const lengthWeight = kw.length / Math.max(2, input.length);
        const score = positionWeight * (1 + lengthWeight);
        maxScore = Math.max(maxScore, score);
      }
    }

    if (matchCount > 1) {
      maxScore = Math.min(1.0, maxScore * (1 + (matchCount - 1) * 0.2));
    }

    return maxScore;
  }

  getStats() {
    const categories = Object.keys(this.mappings.taskCategories || {});
    let totalKeywords = 0;
    Object.values(this.mappings.taskCategories || {}).forEach(c => {
      totalKeywords += (c.keywords || []).length;
    });
    return { categories: categories.length, keywords: totalKeywords };
  }
}

module.exports = IntentAnalyzer;