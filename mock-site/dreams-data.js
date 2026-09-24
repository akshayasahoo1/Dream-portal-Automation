/* Shared data + logic for the mock site. */
window.DREAMS = [
  { name: 'Flying over mountains', daysAgo: 2, type: 'Good' },
  { name: 'Lost in maze', daysAgo: 3, type: 'Bad' },
  { name: 'Monster chase', daysAgo: 5, type: 'Bad' },
  { name: 'Beach party with friends', daysAgo: 6, type: 'Good' },
  { name: 'Flying over mountains', daysAgo: 8, type: 'Good' },
  { name: 'Falling from a skyscraper', daysAgo: 9, type: 'Bad' },
  { name: 'Magical garden', daysAgo: 11, type: 'Good' },
  { name: 'Lost in maze', daysAgo: 12, type: 'Bad' },
  { name: 'Treasure hunt', daysAgo: 14, type: 'Good' },
  { name: 'Dancing in the rain', daysAgo: 15, type: 'Good' },
];

/** A dream is "recurring" when the same name is logged more than once. */
window.recurringNames = function () {
  const counts = {};
  window.DREAMS.forEach((d) => (counts[d.name] = (counts[d.name] || 0) + 1));
  return Object.keys(counts).filter((n) => counts[n] > 1);
};
