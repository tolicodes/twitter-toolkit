const paginate = require('../utils/paginate');

module.exports = async (tt, username) => paginate({
  cursor: -1,
  func: async ({
    cursor,
    params: {
      username,
    },
  }) => {
    const res = await tt.get('/friends/ids', {
      cursor,
      screen_name: username,
    });

    const {
      ids,
      next_cursor: nextCursor,
    } = res || {};

    return {
      data: ids ? await tt.helpers.convertUserIdsToHandles(ids) : [],
      nextCursor,
    };
  },
  params: {
    username,
  },
});
