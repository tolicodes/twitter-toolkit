module.exports = async (tt, username) => {
    const data = await tt.get('/statuses/user_timeline', {
      screen_name: username,
      count: 200,
    });

    console.log('yo')
  
    return data
      .map(t => t.text.match(/(@\w{1,15})/))
  
      // filter out empties
      .filter(t => t)
      .map(([match]) => match);
  };