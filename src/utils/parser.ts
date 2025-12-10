const phoneRegex =
  /\+?\d[\d\s\-\(\)]{7,}\d/g;

const instagramRegex = /https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi;

export const extractPhones = (html: string): string[] => {
  const matches = html.match(phoneRegex) || [];
  return Array.from(
    new Set(
      matches.map((m) =>
        m
          .replace(/[\s\-().]/g, '')
          .replace(/^00/, '+')
      )
    )
  );
};

export const extractSchemaPhone = (html: string): string[] => {
  const schemaRegex = /"telephone"\s*:\s*"([^"]+)"/gi;
  const results: string[] = [];
  let match = schemaRegex.exec(html);
  while (match) {
    results.push(match[1]);
    match = schemaRegex.exec(html);
  }
  return Array.from(new Set(results));
};

export const extractInstagramProfiles = (html: string): string[] => {
  const results: string[] = [];
  let match = instagramRegex.exec(html);
  while (match) {
    results.push(match[2]);
    match = instagramRegex.exec(html);
  }
  return Array.from(new Set(results));
};

