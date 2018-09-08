const Twit = require('twit');

const {
    createProgressBar,
    createQueue
} = require('api-toolkit');

const getMentions = require('./helpers/getMentions');
const getMentionedBy = require('./helpers/getMentionedBy');
const getFollowing = require('./helpers/getFollowing');
const getFollowers = require('./helpers/getFollowers');

const getRateLimits = require('./utils/getRateLimits');
const paginate = require('./utils/paginate');

const convertUserIdsToHandles = require('./helpers/convertUserIdsToHandles');

// Allows us to check 180/ 15 minutes. Let's check at half that rate just in cases
const RATE_LIMIT_AUTO_FETCH_INTERVAL = 15 * 60 * 1000 / 180 * 2;

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
        }
    }) {
        let readyResolver;

        // listen to this for ready
        this.ready = new Promise((res) => {
            readyResolver = res
        });
        this.queues = {};

        this.client = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            access_token: accessToken,
            access_token_secret: accessTokenSecret,
        });

        this.paginate = paginate.bind(null, this);
        this.getRateLimits = getRateLimits.bind(null, this);

        this.initHelpers();

        if (autoFetchRateLimits) {
            this.initRateLimitsAutoFetch();
        }

        if (showProgressBar) {
            this.progressBar = createProgressBar({
                queues: this.queues
            });
        }

        this.rateLimits = await this.getRateLimits();

        console.log('rate limits', this.rateLimits);

        readyResolver();
    }

    createQueue(url) {
        this.queues[url] = createQueue({
            maxConcurrent: MAX_CONCURRENT_FETCH,
            retry: true,
            maxRetries: 3
        });
    }

    get(url, params, opts) {
        return this.request('get', url, params, opts);
    }

    post(url, params) {
        return this.request('post', url, params, opts);
    }

    delete(url, params) {
        return this.request('delete', url, params, opts);
    }

    update(url, params) {
        return this.request('update', url, params, opts);
    }

    async request(method, url, params, { noWaitForReady } = {}) {
        // ex: that first rate limits request
        if(!noWaitForReady) {
            // make sure we are ready
            await this.ready;
        }

        if (!this.queues[url]) {
            this.createQueue(url);
        }

        return this.queues[url].add(async () => {
            try {
                const result = await this.client[method](url, params);
                return result;
            } catch (e) {
                // not found
                if (e.code === 34) return [];

                // rate limited
                if (e.code === 88) {
                    
                }

                throw e;
            };
        }, {
            name: `${method.toUpperCase()} ${(url + (params ? ` ${JSON.stringify(params)}` : '')).substring(0, 100)}... }`
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