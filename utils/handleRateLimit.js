module.exports = (url, res) => {
    const {
      resp:
      {
        headers: {
          'x-rate-limit-remaining': remaining,
          'x-rate-limit-reset': reset,
        },
      },
    } = res;
  
    if (remaining < 1) {
      setResetTime(url, reset);
    }
  
    return true;
  };