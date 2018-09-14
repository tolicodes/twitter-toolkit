module.exports = async (tt, ids = []) => (await tt.get('/users/lookup', {
  user_id: ids
    .splice(0, 100)
    .join(','),
})).map(({
  screen_name,
}) => screen_name);
