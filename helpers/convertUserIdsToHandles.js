module.exports = async (tt, ids = []) => (await tt.get('/users/lookup', {
    user_id: ids.join(','),
})).map(({
    screen_name,
}) => screen_name);