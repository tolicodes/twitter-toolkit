module.exports = async (tt, username) => {
    const {
        statuses,
    } = await tt.get('/search/tweets', {
        q: `${username}`,
        count: 100,
    });

    return statuses.map(t => `@${t.user.screen_name}`);
};