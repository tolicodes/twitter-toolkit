module.exports = async (tt, username) => (await tt.get('/search/tweets', {
  q: `${username}`,
  count: 100,
})).statuses.map(t => `@${t.user.screen_name}`);
