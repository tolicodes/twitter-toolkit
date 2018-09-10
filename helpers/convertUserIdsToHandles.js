module.exports = async (tt, ids = []) => (await tt.get('/users/lookup', {
  user_id: ids.join(',').splice(0, 100),
})).map(({
  screen_name,
}) => screen_name);
