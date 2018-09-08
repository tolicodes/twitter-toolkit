module.exports = async (tt, username) => {
    const users = await paginate({
        cursor: -1,
        func: async ({
                cursor,
                params: {
                    username
                }
            }) => {
                const res = (await tt.get('/followers/ids', {
                    cursor,
                    screen_name: username,
                }));

                const {
                    ids,
                    next_cursor: nextCursor,
                } = res;

                return {
                    data: await this.convertUserIdsToHandles(ids),
                        nextCursor,
                };
            },
            params: {
                username,
            },
    });

    return users;
};