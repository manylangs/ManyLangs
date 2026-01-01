export function validateJson(data: any) {
  if (!data || typeof data !== "object") return "Invalid JSON";
  if (!data.type) return "Missing type";

  const valid = ["grammar", "conversation", "idiom", "voca", "real"];
  if (!valid.includes(data.type)) return "Unknown type";

  switch (data.type) {
    case "grammar":
      if (!Array.isArray(data.explanations)) return "Grammar: missing explanations";
      if (!Array.isArray(data.examples)) return "Grammar: missing examples";
      return null;

    case "conversation":
      if (!Array.isArray(data.dialogue)) return "Conversation: missing dialogue";
      return null;

    case "idiom":
      if (!Array.isArray(data.idioms)) return "Idiom: missing idioms";
      return null;

    case "voca":
      if (!Array.isArray(data.words)) return "Voca: missing words";
      return null;

    case "real":
      if (!Array.isArray(data.content)) return "Real: missing content array.";
      
      // 이미지 블록이 있는지 확인
      const hasImage = data.content.some(block => block.type === "image");
      if (!hasImage) return "Real: missing image block in content.";
      
      // description 블록이 있는지 확인
      const hasDescription = data.content.some(block => block.type === "description");
      if (!hasDescription) return "Real: missing description block in content.";
      
      // 각 description 블록의 sentences가 배열인지 확인
      for (const block of data.content) {
        if (block.type === "description") {
          if (!Array.isArray(block.sentences)) {
            return `Real: description block must have sentences array (lang: ${block.lang || "unknown"}).`;
          }
          if (!block.lang) {
            return "Real: description block must have lang property.";
          }
        }
        if (block.type === "image") {
          if (!block.src) {
            return "Real: image block must have src property.";
          }
        }
      }
      
      return null;
  }
}
