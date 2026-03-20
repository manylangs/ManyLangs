const fs = require('fs');
const path = require('path');

const a2Dir = __dirname;

// Find all grammar_XXX.json files
const files = fs.readdirSync(a2Dir);
const grammarFiles = files.filter(f => f.startsWith('grammar_') && f.endsWith('.json') && !f.includes('runtime'));

// Extract numbers from filenames
const numbers = grammarFiles.map(f => f.replace('grammar_', '').replace('.json', '')).sort();

console.log(`Found ${numbers.length} grammar files to process`);

for (const num of numbers) {
  const runtimeFile = path.join(a2Dir, `grammar_${num}.runtime.json`);
  
  // Skip if runtime file already exists
  if (fs.existsSync(runtimeFile)) {
    console.log(`Skipping ${num} - runtime file already exists`);
    continue;
  }
  
  // Helper to read JSON file and strip BOM
  const readJSON = (filepath) => {
    let content = fs.readFileSync(filepath, 'utf-8');
    // Remove UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return JSON.parse(content);
  };
  
  // Load base file
  const baseFile = path.join(a2Dir, `grammar_${num}.json`);
  const baseData = readJSON(baseFile);
  
  // Load translation files
  const translations = {
    en: null,
    es: null,
    fr: null,
    pt: null
  };
  
  const langFiles = {
    en: `kr_en_${num}.json`,
    es: `kr_es_${num}.json`,
    fr: `kr_fr_${num}.json`,
    pt: `kr_pt_${num}.json`
  };
  
  for (const [lang, filename] of Object.entries(langFiles)) {
    const filepath = path.join(a2Dir, filename);
    if (fs.existsSync(filepath)) {
      translations[lang] = readJSON(filepath);
    }
  }
  
  // Merge title
  const mergedTitle = { ...baseData.title };
  for (const [lang, transData] of Object.entries(translations)) {
    if (transData && transData.title && transData.title[lang]) {
      mergedTitle[lang] = transData.title[lang];
    } else {
      mergedTitle[lang] = mergedTitle[lang] || "";
    }
  }
  
  // Merge blocks - use baseData blocks order
  const mergedBlocks = baseData.blocks.map((baseBlock, blockIndex) => {
    const mergedBlock = { ...baseBlock };
    
    // Find corresponding block in translation files
    for (const [lang, transData] of Object.entries(translations)) {
      if (transData && transData.blocks && transData.blocks[blockIndex]) {
        const transBlock = transData.blocks[blockIndex];
        if (transBlock.sentences) {
          if (!mergedBlock.sentences) {
            mergedBlock.sentences = {};
          }
          // Merge sentence for this language
          if (transBlock.sentences[lang] !== undefined && transBlock.sentences[lang] !== null) {
            mergedBlock.sentences[lang] = transBlock.sentences[lang];
          } else {
            mergedBlock.sentences[lang] = mergedBlock.sentences[lang] || "";
          }
        }
      } else {
        // Block not found in translation, set empty string
        if (!mergedBlock.sentences) {
          mergedBlock.sentences = {};
        }
        mergedBlock.sentences[lang] = mergedBlock.sentences[lang] || "";
      }
    }
    
    return mergedBlock;
  });
  
  // Create merged result
  const mergedData = {
    meta: baseData.meta,
    title: mergedTitle,
    blocks: mergedBlocks
  };
  
  // Write runtime file
  fs.writeFileSync(runtimeFile, JSON.stringify(mergedData, null, 2), 'utf-8');
  console.log(`Generated grammar_${num}.runtime.json`);
}

console.log('Done!');

