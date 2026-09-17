// Authored curriculum proxy, NOT labels supplied or validated by the owner/instructor.
// This function is used offline only. It is never a source of game orders or reward.
export const TEACHER_VERSION = 'guided-curriculum-proxy/1';
export function teachingScores(features, names, lessons, mask) {
  const x = Object.fromEntries(names.map((name, i) => [name, features[i]]));
  const scores = {
    mission: 1 + 7 * (1 - x.briefRead) + 1.2 * x.complete,
    sequence: 2.5 + 1.8 * (1 - x.round) + 1.8 * (1 - x.draftCount),
    preview: 5.3 + 1.2 * x.previewWarning,
    budget: 2 + 5 * x.spent + 1.2 * x.draftCount,
    delivery: 2.2 + 2.8 * x.deliveryAvailable + 2.4 * x.draftMoves + 1.8 * x.ownSupply + 1.5 * x.round - 1.5 * x.draftDeliveries,
    reports: 1.8 + 2 * x.unverified + 1.7 * x.verified + 3 * x.draftReports + 2 * x.verifiedThisRound,
    results: 4.7 + 2.5 * x.interrupted + 1.5 * x.deliveredThisRound + 1.3 * x.sharedThisRound,
    reflection: 2.4 + 4.2 * x.complete + 1.5 * x.round,
  };
  return lessons.map((id, i) => mask[i] ? scores[id] - 3.5 * x[`seen:${id}`] - 3 * x[`last:${id}`] : -100);
}
