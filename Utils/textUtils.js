function extractIdFromText(text) {
  const idPattern = /(?:ID:?\s?)(\d{9,})/;
  const match = text.match(idPattern);
  return match ? match[1] : null;
}

function extractGovernorName(text) {
  const lines = text.split('\n');
  const civilizationIndex = lines.findIndex(line => line.includes('Civilization'));
  if (civilizationIndex !== -1 && civilizationIndex + 1 < lines.length) {
    return lines[civilizationIndex + 1].trim();
  }
  return null;
}

function extractAllianceName(text, allianceList) {
  const allianceNames = Object.values(allianceList)
    .flat()
    .map(entry => entry.alliance_name);
  
  const foundAlliance = allianceNames.find(name => text.includes(name));
  return foundAlliance ? { name: foundAlliance } : null;
}

module.exports = {
  extractIdFromText,
  extractGovernorName,
  extractAllianceName
};
