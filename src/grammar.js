export function filterByGrammar(allModules, prevMod, state) {
  if (!state.grammarEnabled || !prevMod) return allModules;
  const allowedIds = state.grammar[prevMod.id];
  if (!allowedIds || allowedIds.length === 0) {
    console.warn(`Grammar: no successors for ${prevMod.id}, using full pool`);
    return allModules;
  }
  const filtered = allModules.filter(m => allowedIds.includes(m.id));
  return filtered.length > 0 ? filtered : allModules;
}
