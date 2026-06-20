const rules = {
  uber: 'Travel',
  ola: 'Travel',
  pizza: 'Food',
  restaurant: 'Food',
  netflix: 'Entertainment',
  hotstar: 'Entertainment',
  amazon: 'Shopping',
  flipkart: 'Shopping'
};

export const predictCategory = (title) => {
  if (!title) return 'Others';
  const lowerTitle = title.toLowerCase();
  for (const [keyword, category] of Object.entries(rules)) {
    if (lowerTitle.includes(keyword)) {
      return category;
    }
  }
  return 'Others';
};
