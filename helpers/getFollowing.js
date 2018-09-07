const paginate = require('../utils/paginate');

module.exports = async (tt, username) => {
    const users = await paginate({
        cursor: -1,
        func: async ({
                cursor,
                params: {
                    username
                }
            }) => {
                const {
                    ids,
                    next_cursor: nextCursor,
                } = await tt.get('/friends/ids', {
                    cursor,
                    screen_name: username,
                });

                return {
                    data: await convertUserIdsToUserNames(ids),
                        nextCursor,
                };
            },
            params: {
                username,
            },
    });

    bar.update();
    tickBar();

    return users;
};