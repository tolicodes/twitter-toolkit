const paginate = async ({
  results = [],
  cursor,
  func,
  params,
  page = 0,
  maxPages = 1,
}) => {
  if (page < maxPages && cursor) {
    const {
      data,
      nextCursor,
    } = await func({
      params,
      cursor,
    });

    const newResults = await paginate({
      results: [
        ...results,
        ...data,
      ],
      cursor: nextCursor,
      func,
      params,
      page: page + 1,
    }) || [];

    return [
      ...results,
      ...newResults,
    ];
  }

  console.log('paginate', results);
  return results;
};

module.exports = paginate;
