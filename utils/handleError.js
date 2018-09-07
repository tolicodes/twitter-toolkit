module.exports = async (e, func, { retry = true } = {}) => {
    // not found
    if (e.code === 34) return [];
  
    // rate limited
    if (e.code === 88) {
      if (!retry) {
        return Promise.resolve();
      }
  
      const result = await func();
  
      if (!result) return handleError(e, func, { retry });
  
      return result;
    }
  
    return console.error(e);
  };