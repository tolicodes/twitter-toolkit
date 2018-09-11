const Twit = require('twit');
const moment = require('moment');

const {
  createProgressBar,
  createQueue,
} = require('api-toolkit');

const getMentions = require('./helpers/getMentions');
const getMentionedBy = require('./helpers/getMentionedBy');
const getFollowing = require('./helpers/getFollowing');
const getFollowers = require('./helpers/getFollowers');

const { getRateLimits, setRateLimitOnQueue } = require('./utils/rateLimits');
const paginate = require('./utils/paginate');

const convertUserIdsToHandles = require('./helpers/convertUserIdsToHandles');

// Allows us to check 180/ 15 minutes. Let's check at half that rate just in cases
const RATE_LIMIT_AUTO_FETCH_INTERVAL = 15 * 60 * 1000 / 180 * 2;

const ON_RATE_LIMIT_TIMEOUT = RATE_LIMIT_AUTO_FETCH_INTERVAL;

// how many pending requests can we have per endpoint
const MAX_CONCURRENT_FETCH = 2;

module.exports = class TwitterToolkit {
  constructor(opts) {
    // because constructor can't be async
    this.init(opts);
  }

  async init({
    autoFetchRateLimits = true,
    showProgressBar = true,
    auth: {
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret,
    },
  }) {
    let readyResolver;

    // listen to this for ready
    this.ready = new Promise((res) => {
      readyResolver = res;
    });
    this.queues = {};

    // holds rate limits
    this.rateLimits = {};

    this.client = new Twit({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
      access_token: accessToken,
      access_token_secret: accessTokenSecret,
    });

    this.paginate = paginate.bind(null, this);
    this.getRateLimits = getRateLimits.bind(null, this);
    this.setRateLimitOnQueue = setRateLimitOnQueue.bind(null, this);

    this.initHelpers();

    if (autoFetchRateLimits) {
      this.initRateLimitsAutoFetch();
    }

    if (showProgressBar) {
      this.progressBar = createProgressBar({
        queues: this.queues,
      });
    }

    this.rateLimits = await this.getRateLimits();

    readyResolver();
  }

  createQueue(url) {
    this.queues[url] = createQueue({
      maxConcurrent: MAX_CONCURRENT_FETCH,
      retry: true,
      maxRetries: 3,
    }).on('all', () => {
      this.progressBar.update();
    });

    const reset = this.rateLimits[url];

    if (reset) {
      this.setRateLimitOnQueue(url, reset);
    }
  }

  get(url, params, opts) {
    return this.request('get', url, params, opts);
  }

  post(url, params, opts) {
    return this.request('post', url, params, opts);
  }

  delete(url, params, opts) {
    return this.request('delete', url, params, opts);
  }

  update(url, params, opts) {
    return this.request('update', url, params, opts);
  }

  async request(method, url, params, { noWaitForReady, retry } = {}) {
    // ex: that first rate limits request
    if (!noWaitForReady) {
      // make sure we are ready
      await this.ready;
    }

    if (!this.queues[url]) {
      this.createQueue(url);
    }

    return this.queues[url].add(async () => {
      try {
        return (await this.client[method](url, params)).data;
      } catch (e) {
        // not found
        if (e.code === 34) return [];

        // rate limited
        if (e.code === 88) {
          // write this better
          // for now it just waits 20 seconds so that the rate limit
          // auto request can find something
          this.setRateLimitOnQueue(url, moment().add(ON_RATE_LIMIT_TIMEOUT, 'milliseconds').unix());
          return;
        }

        throw e;
      }
    }, {
      name: `${method.toUpperCase()} ${(url + (params ? ` ${JSON.stringify(params)}` : '')).substring(0, 100)}... }`,
      retry,
    });
  }

  initRateLimitsAutoFetch() {
    this.rateFetchTimeeout = setInterval(async () => {
      this.rateLimits = await this.getRateLimits();
    }, RATE_LIMIT_AUTO_FETCH_INTERVAL);
  }

  initHelpers() {
    this.helpers = {
      getMentions: getMentions.bind(null, this),
      getMentionedBy: getMentionedBy.bind(null, this),
      getFollowing: getFollowing.bind(null, this),
      getFollowers: getFollowers.bind(null, this),

      convertUserIdsToHandles: convertUserIdsToHandles.bind(null, this),
    };
  }

  close() {
    clearInterval(this.rateFetchTimeeout);
  }
};
