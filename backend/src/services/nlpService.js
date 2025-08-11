import natural from 'natural';
import compromise from 'compromise';
import Sentiment from 'sentiment';
import { logger } from '../config/logger.js';
import { config } from '../config/config.js';

export class NLPService {
  constructor() {
    this.sentiment = new Sentiment();
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    
    // Initialize language detection
    this.languageDetector = new natural.LogisticRegressionClassifier();
    this.initializeLanguageDetection();
  }

  initializeLanguageDetection() {
    // Basic language detection setup
    // In a production environment, you'd train this with proper datasets
    try {
      // Add some basic language patterns
      this.languageDetector.addDocument('hello world how are you', 'en');
      this.languageDetector.addDocument('bonjour monde comment allez vous', 'fr');
      this.languageDetector.addDocument('hola mundo como estas', 'es');
      this.languageDetector.addDocument('hallo welt wie geht es dir', 'de');
      
      this.languageDetector.train();
      logger.debug('Language detection initialized');
    } catch (error) {
      logger.warn('Language detection initialization failed', { error: error.message });
    }
  }

  async analyzeTranscript(text) {
    try {
      logger.info('Starting NLP analysis', { textLength: text.length });

      const analysis = {
        language: await this.detectLanguage(text),
        sentiment: this.analyzeSentiment(text),
        entities: this.extractEntities(text),
        keywords: this.extractKeywords(text),
        topics: this.extractTopics(text),
        readability: this.calculateReadability(text),
        statistics: this.getTextStatistics(text),
        speakerSegments: this.detectSpeakerChanges(text),
        confidence: this.calculateConfidence(text)
      };

      logger.info('NLP analysis completed', { 
        language: analysis.language,
        sentiment: analysis.sentiment.score,
        entities: analysis.entities.length,
        keywords: analysis.keywords.length
      });

      return analysis;
    } catch (error) {
      logger.error('NLP analysis failed', { error: error.message });
      throw error;
    }
  }

  async detectLanguage(text) {
    try {
      // Simple language detection
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      const sample = tokens.slice(0, 50).join(' '); // Use first 50 words
      
      const detected = this.languageDetector.classify(sample);
      const confidence = Math.max(...this.languageDetector.getClassifications(sample).map(c => c.value));
      
      return {
        language: detected || 'en',
        confidence: confidence || 0.5,
        method: 'classification'
      };
    } catch (error) {
      logger.warn('Language detection failed, defaulting to English', { error: error.message });
      return {
        language: 'en',
        confidence: 0.5,
        method: 'default'
      };
    }
  }

  analyzeSentiment(text) {
    try {
      const result = this.sentiment.analyze(text);
      
      // Normalize score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / Math.max(1, Math.abs(result.score))));
      
      let category = 'neutral';
      if (normalizedScore > 0.1) category = 'positive';
      else if (normalizedScore < -0.1) category = 'negative';
      
      return {
        score: normalizedScore,
        category,
        magnitude: Math.abs(normalizedScore),
        positive: result.positive,
        negative: result.negative,
        comparative: result.comparative
      };
    } catch (error) {
      logger.warn('Sentiment analysis failed', { error: error.message });
      return {
        score: 0,
        category: 'neutral',
        magnitude: 0,
        positive: [],
        negative: [],
        comparative: 0
      };
    }
  }

  extractEntities(text) {
    try {
      const doc = compromise(text);
      
      const entities = {
        people: doc.people().out('array'),
        places: doc.places().out('array'),
        organizations: doc.organizations().out('array'),
        dates: doc.dates().out('array'),
        money: doc.money().out('array'),
        phoneNumbers: this.extractPhoneNumbers(text),
        emails: this.extractEmails(text),
        urls: this.extractUrls(text)
      };

      // Flatten and deduplicate
      const allEntities = [];
      Object.entries(entities).forEach(([type, items]) => {
        items.forEach(item => {
          if (item && item.trim().length > 1) {
            allEntities.push({
              text: item.trim(),
              type,
              confidence: 0.8
            });
          }
        });
      });

      return allEntities;
    } catch (error) {
      logger.warn('Entity extraction failed', { error: error.message });
      return [];
    }
  }

  extractKeywords(text) {
    try {
      // Add document to TF-IDF
      this.tfidf.addDocument(text);
      
      const keywords = [];
      const docIndex = this.tfidf.documents.length - 1;
      
      // Get all terms and their TF-IDF scores
      this.tfidf.listTerms(docIndex).forEach(item => {
        if (item.term.length > 2 && !this.isStopWord(item.term)) {
          keywords.push({
            word: item.term,
            score: item.tfidf,
            stemmed: this.stemmer.stem(item.term)
          });
        }
      });

      // Sort by TF-IDF score and return top keywords
      return keywords
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    } catch (error) {
      logger.warn('Keyword extraction failed', { error: error.message });
      return [];
    }
  }

  extractTopics(text) {
    try {
      const doc = compromise(text);
      
      // Extract noun phrases as potential topics
      const topics = doc.match('#Noun+ #Noun+').out('array')
        .concat(doc.match('#Adjective #Noun+').out('array'))
        .filter(topic => topic.length > 5) // Filter short phrases
        .map(topic => topic.toLowerCase())
        .filter((topic, index, array) => array.indexOf(topic) === index) // Deduplicate
        .slice(0, 10); // Top 10 topics

      return topics.map(topic => ({
        phrase: topic,
        confidence: 0.7,
        category: this.categorizePhrase(topic)
      }));
    } catch (error) {
      logger.warn('Topic extraction failed', { error: error.message });
      return [];
    }
  }

  calculateReadability(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = this.tokenizer.tokenize(text);
      const syllables = words.reduce((total, word) => total + this.countSyllables(word), 0);
      
      // Flesch Reading Ease Score
      const avgSentenceLength = words.length / sentences.length;
      const avgSyllablesPerWord = syllables / words.length;
      
      const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
      
      let level = 'graduate';
      if (fleschScore >= 90) level = 'very easy';
      else if (fleschScore >= 80) level = 'easy';
      else if (fleschScore >= 70) level = 'fairly easy';
      else if (fleschScore >= 60) level = 'standard';
      else if (fleschScore >= 50) level = 'fairly difficult';
      else if (fleschScore >= 30) level = 'difficult';
      
      return {
        fleschScore: Math.round(fleschScore),
        level,
        avgSentenceLength: Math.round(avgSentenceLength),
        avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
      };
    } catch (error) {
      logger.warn('Readability calculation failed', { error: error.message });
      return {
        fleschScore: 50,
        level: 'standard',
        avgSentenceLength: 15,
        avgSyllablesPerWord: 1.5
      };
    }
  }

  getTextStatistics(text) {
    try {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = this.tokenizer.tokenize(text);
      const characters = text.length;
      const charactersNoSpaces = text.replace(/\s/g, '').length;
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      // Unique words
      const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
      
      return {
        characters,
        charactersNoSpaces,
        words: words.length,
        uniqueWords,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        averageWordsPerSentence: Math.round((words.length / sentences.length) * 100) / 100,
        lexicalDiversity: Math.round((uniqueWords / words.length) * 100) / 100
      };
    } catch (error) {
      logger.warn('Text statistics calculation failed', { error: error.message });
      return {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, '').length,
        words: 0,
        uniqueWords: 0,
        sentences: 0,
        paragraphs: 1,
        averageWordsPerSentence: 0,
        lexicalDiversity: 0
      };
    }
  }

  detectSpeakerChanges(text) {
    try {
      // Simple speaker change detection based on patterns
      const segments = [];
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      
      let currentSpeaker = 'Speaker 1';
      let segmentStart = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for speaker indicators
        const speakerMatch = line.match(/^(Speaker \d+|[A-Z][a-z]+):\s*/);
        if (speakerMatch) {
          // End previous segment
          if (i > segmentStart) {
            segments.push({
              speaker: currentSpeaker,
              start: segmentStart,
              end: i - 1,
              text: lines.slice(segmentStart, i).join(' ').trim()
            });
          }
          
          currentSpeaker = speakerMatch[1];
          segmentStart = i;
        }
        
        // Check for conversation patterns (questions, responses)
        else if (line.includes('?') && i < lines.length - 1) {
          // Potential speaker change after question
          const nextLine = lines[i + 1];
          if (!nextLine.includes('?')) {
            segments.push({
              speaker: currentSpeaker,
              start: segmentStart,
              end: i,
              text: lines.slice(segmentStart, i + 1).join(' ').trim()
            });
            
            currentSpeaker = currentSpeaker === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1';
            segmentStart = i + 1;
          }
        }
      }
      
      // Add final segment
      if (segmentStart < lines.length) {
        segments.push({
          speaker: currentSpeaker,
          start: segmentStart,
          end: lines.length - 1,
          text: lines.slice(segmentStart).join(' ').trim()
        });
      }
      
      return segments;
    } catch (error) {
      logger.warn('Speaker detection failed', { error: error.message });
      return [{
        speaker: 'Unknown',
        start: 0,
        end: 0,
        text: text
      }];
    }
  }

  calculateConfidence(text) {
    try {
      let confidence = 0.5; // Base confidence
      
      // Boost confidence for longer texts
      if (text.length > 500) confidence += 0.1;
      if (text.length > 1000) confidence += 0.1;
      
      // Boost confidence for proper sentence structure
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = this.tokenizer.tokenize(text);
      const avgSentenceLength = words.length / sentences.length;
      
      if (avgSentenceLength > 5 && avgSentenceLength < 30) {
        confidence += 0.1;
      }
      
      // Boost confidence for proper capitalization
      const capitalizedSentences = sentences.filter(s => /^[A-Z]/.test(s.trim())).length;
      if (capitalizedSentences / sentences.length > 0.8) {
        confidence += 0.1;
      }
      
      // Penalize for very short texts
      if (text.length < 100) confidence -= 0.2;
      
      return Math.max(0, Math.min(1, confidence));
    } catch (error) {
      return 0.5;
    }
  }

  // Helper methods
  extractPhoneNumbers(text) {
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    return [...text.matchAll(phoneRegex)].map(match => match[0]);
  }

  extractEmails(text) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return [...text.matchAll(emailRegex)].map(match => match[0]);
  }

  extractUrls(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return [...text.matchAll(urlRegex)].map(match => match[0]);
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  categorizePhrase(phrase) {
    const techWords = ['system', 'software', 'computer', 'data', 'algorithm'];
    const businessWords = ['company', 'market', 'customer', 'revenue', 'profit'];
    const personalWords = ['family', 'friend', 'home', 'life', 'personal'];
    
    if (techWords.some(word => phrase.includes(word))) return 'technology';
    if (businessWords.some(word => phrase.includes(word))) return 'business';
    if (personalWords.some(word => phrase.includes(word))) return 'personal';
    
    return 'general';
  }

  async processTranscriptSegments(segments) {
    try {
      const processedSegments = [];
      
      for (const segment of segments) {
        const analysis = await this.analyzeTranscript(segment.text);
        
        processedSegments.push({
          ...segment,
          nlpAnalysis: analysis,
          enhancedText: this.enhanceText(segment.text, analysis),
          confidence: analysis.confidence
        });
      }
      
      return processedSegments;
    } catch (error) {
      logger.error('Segment processing failed', { error: error.message });
      throw error;
    }
  }

  enhanceText(text, analysis) {
    try {
      let enhanced = text;
      
      // Add speaker labels if detected
      if (analysis.speakerSegments && analysis.speakerSegments.length > 1) {
        const segments = analysis.speakerSegments;
        const lines = text.split('\n');
        
        enhanced = segments.map(segment => 
          `${segment.speaker}: ${segment.text}`
        ).join('\n');
      }
      
      // Add punctuation if missing
      enhanced = this.improvePunctuation(enhanced);
      
      return enhanced;
    } catch (error) {
      logger.warn('Text enhancement failed', { error: error.message });
      return text;
    }
  }

  improvePunctuation(text) {
    try {
      const doc = compromise(text);
      
      // Add periods to sentences that end without punctuation
      let improved = text.replace(/([a-z])\s+([A-Z])/g, '$1. $2');
      
      // Add question marks to obvious questions
      improved = improved.replace(/\b(what|where|when|why|how|who|which|can|could|would|will|is|are|do|does|did)\s+[^?.!]*$/gim, '$&?');
      
      return improved;
    } catch (error) {
      return text;
    }
  }
}

// Create singleton instance
let nlpInstance = null;

export function getNLPService() {
  if (!nlpInstance) {
    nlpInstance = new NLPService();
  }
  return nlpInstance;
}

export default NLPService;
