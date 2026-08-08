import React, { useMemo } from 'react';
import WordCloudD3 from 'react-d3-cloud';
import { scaleOrdinal } from 'd3-scale';

const STOP_WORDS = new Set(['the', 'and', 'to', 'a', 'of', 'in', 'it', 'is', 'that', 'we', 'for', 'was', 'as', 'with', 'on', 'this', 'have', 'but', 'are', 'not', 'they', 'be', 'at', 'one', 'from', 'or', 'had', 'by', 'hot', 'word', 'what', 'some', 'you', 'he', 'his', 'i', 'all', 'were', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part', 'none', 'provided']);

interface WordCloudProps {
  texts: string[];
  customStopWords?: string[];
}

// A vibrant color palette based on D3's schemeCategory10 but customized for modern look
const schemeCategory10 = ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'];
const schemeDark2 = ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'];

const WordCloud: React.FC<WordCloudProps> = ({ texts, customStopWords = [] }) => {
  const wordsData = useMemo(() => {
    const customSet = new Set(customStopWords.map(w => w.toLowerCase()));
    const counts: Record<string, number> = {};
    
    texts.forEach(text => {
      if (!text) return;
      if (typeof text !== 'string') text = String(text); // Ensure it is a string
      const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      words.forEach(word => {
        if (word.length > 2 && !STOP_WORDS.has(word) && !customSet.has(word)) {
          counts[word] = (counts[word] || 0) + 1;
        }
      });
    });

    const sortedWords = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30); // Limit to top 30 words

    if (sortedWords.length === 0) return [];

    // Scale counts to a reasonable font size range
    const maxCount = sortedWords[0][1];
    
    return sortedWords.map(([text, count]) => {
      // Map max count to ~80px, others proportionally, min 15px
      const sizeScale = Math.max(15, (count / maxCount) * 80);
      return {
        text,
        value: sizeScale
      };
    });
  }, [texts, customStopWords]);

  if (wordsData.length === 0) {
    return (
      <div className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
        Not enough data for word cloud.
        <br/><br/>
        <small>Debug Info: {texts.length} responses processed. First response: {texts.length > 0 ? String(texts[0]) : 'None'}</small>
      </div>
    );
  }

  // Pure horizontal rotation
  const rotate = () => 0;

  // Use a nice color scale
  const fill = scaleOrdinal(schemeDark2);

  return (
    <div className="wordcloud-wrapper" style={{ 
      padding: '1rem', 
      background: 'var(--bg-color)', 
      borderRadius: 'var(--radius-md)',
      height: '400px', 
      width: '100%',
      textAlign: 'center'
    }}>
      <style>{`.wordcloud-wrapper svg { width: 100%; height: 100%; max-height: 100%; }`}</style>
      <WordCloudD3 
        data={wordsData} 
        font="Inter, sans-serif"
        fontSize={(word) => word.value}
        rotate={rotate}
        padding={3}
        fill={(_: any, i: number) => fill(i.toString())}
      />
    </div>
  );
};

export default WordCloud;
