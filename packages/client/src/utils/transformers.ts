/**
 * OpenAlex Data Transformers
 * Utilities for transforming OpenAlex data formats into more usable forms
 */

/**
 * Convert OpenAlex abstract_inverted_index to readable text
 *
 * @param invertedIndex - The abstract_inverted_index object from OpenAlex
 * @returns Reconstructed abstract text, or null if no index provided
 *
 * @example
 * ```typescript
 * const work = await openAlex.works.getWork('W2741809807');
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * logger.debug("general", abstract); // "Machine learning algorithms have shown..."
 * ```
 */
export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
): string | null {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  // Create an array to hold words at their positions
  const words: (string | undefined)[] = [];
  let maxPosition = 0;

  // First pass: determine the maximum position to size the array
  Object.entries(invertedIndex).forEach(([, positions]) => {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        if (typeof pos === "number" && pos >= 0) {
          maxPosition = Math.max(maxPosition, pos);
        }
      });
    }
  });

  // Initialize array with undefined values
  for (let i = 0; i <= maxPosition; i++) {
    words[i] = undefined;
  }

  // Second pass: place words at their correct positions
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        if (typeof pos === "number" && pos >= 0 && pos <= maxPosition) {
          words[pos] = word;
        }
      });
    }
  });

  // Filter out undefined positions and join into text
  const reconstructedText = words
    .filter((word): word is string => word !== undefined)
    .join(" ");

  return reconstructedText.trim() || null;
}

/**
 * Get abstract length statistics from inverted index
 *
 * @param invertedIndex - The abstract_inverted_index object from OpenAlex
 * @returns Statistics about the abstract
 *
 * @example
 * ```typescript
 * const stats = getAbstractStats(work.abstract_inverted_index);
 * logger.debug("general", `Abstract has ${stats.wordCount} words and ${stats.uniqueWords} unique words`);
 * ```
 */
export function getAbstractStats(
  invertedIndex: Record<string, number[]> | null | undefined,
): {
  wordCount: number;
  uniqueWords: number;
  avgWordLength: number;
  longestWord: string;
  shortestWord: string;
} | null {
  if (!invertedIndex || typeof invertedIndex !== "object") {
    return null;
  }

  const words = Object.keys(invertedIndex);
  const uniqueWords = words.length;

  if (uniqueWords === 0) {
    return null;
  }

  // Calculate total word count (sum of all position arrays)
  let totalWordCount = 0;
  let totalCharCount = 0;
  let longestWord = "";
  let shortestWord = words[0] || "";

  words.forEach((word) => {
    const positions = invertedIndex[word];
    if (Array.isArray(positions)) {
      totalWordCount += positions.length;
      totalCharCount += word.length * positions.length;

      if (word.length > longestWord.length) {
        longestWord = word;
      }
      if (word.length < shortestWord.length) {
        shortestWord = word;
      }
    }
  });

  return {
    wordCount: totalWordCount,
    uniqueWords,
    avgWordLength: totalCharCount / totalWordCount,
    longestWord,
    shortestWord,
  };
}

/**
 * Check if a work has an abstract available
 *
 * @param work - The work object from OpenAlex
 * @returns True if abstract is available and reconstructable
 *
 * @example
 * ```typescript
 * const works = await openAlex.works.getWorks({ filter: { has_abstract: true } });
 * const worksWithAbstracts = works.results.filter(hasAbstract);
 * ```
 */
export function hasAbstract(work: {
  abstract_inverted_index?: Record<string, number[]> | null;
}): boolean {
  return !!(
    work.abstract_inverted_index &&
    typeof work.abstract_inverted_index === "object" &&
    Object.keys(work.abstract_inverted_index).length > 0
  );
}

/**
 * Common stop words for keyword extraction
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "cannot",
  "this",
  "that",
  "these",
  "those",
  "we",
  "they",
  "it",
  "its",
  "our",
  "their",
  "his",
  "her",
  "him",
  "them",
  "us",
  "i",
  "you",
  "me",
  "my",
  "your",
  "here",
  "there",
  "where",
  "when",
  "why",
  "how",
  "what",
  "which",
  "who",
  "more",
  "most",
  "less",
  "much",
  "many",
  "some",
  "all",
  "any",
  "no",
  "not",
  "very",
  "too",
  "also",
  "just",
  "only",
  "even",
  "still",
  "yet",
  "however",
  "therefore",
  "thus",
  "hence",
  "moreover",
  "furthermore",
  "nevertheless",
  "over",
]);

/**
 * Extract and clean words from abstract text
 */
function extractWordsFromAbstract(
  abstract: string,
  minLength: number,
  excludeCommon: boolean,
): string[] {
  return abstract
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ") // Keep hyphens for compound terms
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= minLength && (!excludeCommon || !STOP_WORDS.has(word)),
    );
}

/**
 * Count word frequencies
 */
function countWordFrequencies(words: string[]): Map<string, number> {
  const wordCount = new Map<string, number>();
  words.forEach((word) => {
    wordCount.set(word, (wordCount.get(word) ?? 0) + 1);
  });
  return wordCount;
}

/**
 * Extract compound terms from word array
 */
function extractCompoundTerms(words: string[]): Map<string, number> {
  const compounds = new Map<string, number>();

  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];

    // Two-word compounds
    if (word1 && word2 && !STOP_WORDS.has(word1) && !STOP_WORDS.has(word2)) {
      const twoWord = `${word1} ${word2}`;
      compounds.set(twoWord, (compounds.get(twoWord) ?? 0) + 1);
    }

    // Three-word compounds
    if (i < words.length - 2) {
      const word3 = words[i + 2];
      if (
        word1 &&
        word2 &&
        word3 &&
        !STOP_WORDS.has(word1) &&
        !STOP_WORDS.has(word2) &&
        !STOP_WORDS.has(word3)
      ) {
        const threeWord = `${word1} ${word2} ${word3}`;
        compounds.set(threeWord, (compounds.get(threeWord) ?? 0) + 1);
      }
    }
  }

  return compounds;
}

/**
 * Extract keywords and key phrases from abstract text
 *
 * @param abstract - Reconstructed abstract text
 * @param options - Options for keyword extraction
 * @returns Array of potential keywords sorted by relevance
 *
 * @example
 * ```typescript
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * const keywords = extractKeywords(abstract, { minLength: 4, maxKeywords: 10 });
 * ```
 */
export function extractKeywords(
  abstract: string | null,
  options: {
    minLength?: number;
    maxKeywords?: number;
    excludeCommon?: boolean;
  } = {},
): string[] {
  if (!abstract || typeof abstract !== "string") {
    return [];
  }

  const { minLength = 3, maxKeywords = 20, excludeCommon = true } = options;

  const words = extractWordsFromAbstract(abstract, minLength, excludeCommon);
  const wordCount = countWordFrequencies(words);
  const compounds = extractCompoundTerms(words);

  // Combine and sort by frequency
  const allTerms = new Map([...wordCount, ...compounds]);

  return Array.from(allTerms.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, maxKeywords)
    .map(([term]) => term);
}

/**
 * Extract and prepare author names for citation
 */
function prepareAuthors(
  authorships: Array<{ author: { display_name?: string } }>,
): string[] {
  const authors = authorships
    .slice(0, 3) // Limit to first 3 authors
    .map((authorship) => authorship.author.display_name)
    .filter((name): name is string => !!name);

  if (authors.length === 0) {
    authors.push("Unknown Author");
  }

  return authors;
}

/**
 * Format APA style citation
 */
function formatAPACitation(
  authors: string[],
  display_name: string,
  year: string | undefined,
  journal: string | undefined,
  volume: string | undefined,
  issue: string | undefined,
  pages: string | undefined,
  doi: string | undefined,
  authorshipsLength: number,
): string {
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += authors[0];
  } else if (authors.length === 2) {
    citation += `${authors[0]} & ${authors[1]}`;
  } else {
    citation += `${authors[0]}, ${authors[1]}, & ${authors[2]}`;
    if (authorshipsLength > 3) citation += ", et al.";
  }

  // Year
  if (year) citation += ` (${year}).`;
  else citation += " (n.d.).";

  // Title
  citation += ` ${display_name}.`;

  // Journal info
  if (journal) {
    citation += ` *${journal}*`;
    if (volume && issue) citation += `, ${volume}(${issue})`;
    else if (volume) citation += `, ${volume}`;
    if (pages) citation += `, ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi) citation += ` https://doi.org/${doi}`;

  return citation;
}

/**
 * Format author names for MLA style
 */
function formatMLAAuthors(authors: string[]): string {
  if (authors.length === 0) return "";

  // First author (Last, First)
  let citation = formatMLASingleAuthor(authors[0]);

  // Additional authors
  if (authors.length === 2) {
    citation += `, and ${authors[1]}`;
  } else if (authors.length > 2) {
    citation += ", et al.";
  }

  return citation;
}

/**
 * Format a single author name for MLA style (Last, First)
 */
function formatMLASingleAuthor(author: string): string {
  const nameParts = author.split(" ");
  if (nameParts.length > 1) {
    const lastName = nameParts[nameParts.length - 1];
    const firstNames = nameParts.slice(0, -1).join(" ");
    return `${lastName}, ${firstNames}`;
  }
  return author;
}

/**
 * Format journal information for MLA style
 */
function formatMLAJournalInfo(
  journal: string,
  volume?: string,
  issue?: string,
  year?: string,
  pages?: string,
): string {
  let journalInfo = ` *${journal}*`;
  if (volume) journalInfo += `, vol. ${volume}`;
  if (issue) journalInfo += `, no. ${issue}`;
  if (year) journalInfo += `, ${year}`;
  if (pages) journalInfo += `, pp. ${pages}`;
  journalInfo += ".";
  return journalInfo;
}

/**
 * Format MLA style citation
 */
function formatMLACitation(
  authors: string[],
  display_name: string,
  year: string | undefined,
  journal: string | undefined,
  volume: string | undefined,
  issue: string | undefined,
  pages: string | undefined,
): string {
  let citation = formatMLAAuthors(authors);
  citation += `. "${display_name}."`;

  if (journal) {
    citation += formatMLAJournalInfo(journal, volume, issue, year, pages);
  }

  return citation;
}

/**
 * Format Chicago style citation
 */
function formatChicagoCitation(
  authors: string[],
  display_name: string,
  year: string | undefined,
  journal: string | undefined,
  volume: string | undefined,
  issue: string | undefined,
  pages: string | undefined,
  doi: string | undefined,
): string {
  let citation = "";

  // Authors
  if (authors.length === 1) {
    citation += `${authors[0]}.`;
  } else if (authors.length <= 3) {
    citation += `${authors.join(", ")}.`;
  } else {
    citation += `${authors[0]} et al.`;
  }

  // Title
  citation += ` "${display_name}."`;

  // Journal info
  if (journal) {
    citation += ` *${journal}*`;
    if (volume && issue) citation += ` ${volume}, no. ${issue}`;
    else if (volume) citation += ` ${volume}`;
    if (year) citation += ` (${year})`;
    if (pages) citation += `: ${pages}`;
    citation += ".";
  }

  // DOI
  if (doi) citation += ` https://doi.org/${doi}.`;

  return citation;
}

/**
 * Extract citation parameters from work object
 */
function extractCitationParams(work: {
  display_name?: string;
  authorships?: Array<{
    author: {
      display_name?: string;
    };
  }>;
  publication_year?: number;
  primary_location?: {
    source?: {
      display_name?: string;
    };
  };
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  doi?: string;
}): {
  authors: string[];
  display_name: string;
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  authorshipsLength: number;
} {
  const {
    display_name = "Untitled",
    authorships = [],
    publication_year,
    primary_location,
    biblio,
    doi,
  } = work;

  const authors = prepareAuthors(authorships);
  const journal = primary_location?.source?.display_name;
  const year = publication_year?.toString();
  const volume = biblio?.volume;
  const issue = biblio?.issue;
  const pages =
    biblio?.first_page && biblio.last_page
      ? `${biblio.first_page}-${biblio.last_page}`
      : biblio?.first_page;

  return {
    authors,
    display_name,
    year,
    journal,
    volume,
    issue,
    pages,
    doi,
    authorshipsLength: authorships.length,
  };
}

/**
 * Format citation text from OpenAlex work data
 *
 * @param work - Work object from OpenAlex
 * @param style - Citation style ('apa' | 'mla' | 'chicago')
 * @returns Formatted citation string
 *
 * @example
 * ```typescript
 * const work = await openAlex.works.getWork('W2741809807');
 * const citation = formatCitation(work, 'apa');
 * ```
 */
export function formatCitation(
  work: {
    display_name?: string;
    authorships?: Array<{
      author: {
        display_name?: string;
      };
    }>;
    publication_year?: number;
    primary_location?: {
      source?: {
        display_name?: string;
      };
    };
    biblio?: {
      volume?: string;
      issue?: string;
      first_page?: string;
      last_page?: string;
    };
    doi?: string;
  },
  style: "apa" | "mla" | "chicago" = "apa",
): string {
  const params = extractCitationParams(work);

  switch (style) {
    case "apa":
      return formatAPACitation(
        params.authors,
        params.display_name,
        params.year,
        params.journal,
        params.volume,
        params.issue,
        params.pages,
        params.doi,
        params.authorshipsLength,
      );
    case "mla":
      return formatMLACitation(
        params.authors,
        params.display_name,
        params.year,
        params.journal,
        params.volume,
        params.issue,
        params.pages,
      );
    case "chicago":
      return formatChicagoCitation(
        params.authors,
        params.display_name,
        params.year,
        params.journal,
        params.volume,
        params.issue,
        params.pages,
        params.doi,
      );
    default:
      return formatCitation(work, "apa");
  }
}

/**
 * Count syllables in a word (simple approximation)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  const vowels = word.match(/[aeiouy]+/g);
  let syllables = vowels ? vowels.length : 1;
  if (word.endsWith("e")) syllables--;
  return Math.max(1, syllables);
}

/**
 * Determine reading level from Flesch Reading Ease score
 */
function determineReadingLevel(fleschReadingEase: number): string {
  if (fleschReadingEase >= 90) return "Very Easy";
  if (fleschReadingEase >= 80) return "Easy";
  if (fleschReadingEase >= 70) return "Fairly Easy";
  if (fleschReadingEase >= 60) return "Standard";
  if (fleschReadingEase >= 50) return "Fairly Difficult";
  if (fleschReadingEase >= 30) return "Difficult";
  return "Very Difficult";
}

/**
 * Calculate Flesch Reading Ease and Grade Level scores
 */
function calculateFleschScores(
  avgWordsPerSentence: number,
  avgSyllablesPerWord: number,
): { fleschReadingEase: number; fleschKincaidGrade: number } {
  const fleschReadingEase =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  const fleschKincaidGrade =
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return { fleschReadingEase, fleschKincaidGrade };
}

/**
 * Analyze abstract readability using simple metrics
 *
 * @param abstract - Reconstructed abstract text
 * @returns Readability metrics
 *
 * @example
 * ```typescript
 * const abstract = reconstructAbstract(work.abstract_inverted_index);
 * const readability = analyzeReadability(abstract);
 * logger.debug("general", `Reading level: ${readability.fleschKincaidGrade}`);
 * ```
 */
export function analyzeReadability(abstract: string | null): {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  readingLevel: string;
} | null {
  if (!abstract || typeof abstract !== "string") {
    return null;
  }

  const words = abstract.trim().split(/\s+/);
  const sentences = abstract.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = sentences.length;

  if (wordCount === 0 || sentenceCount === 0) {
    return null;
  }

  const totalSyllables = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0,
  );

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = totalSyllables / wordCount;

  const { fleschReadingEase, fleschKincaidGrade } = calculateFleschScores(
    avgWordsPerSentence,
    avgSyllablesPerWord,
  );

  const readingLevel = determineReadingLevel(fleschReadingEase);

  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    fleschReadingEase: Math.round(fleschReadingEase * 100) / 100,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 100) / 100,
    readingLevel,
  };
}
