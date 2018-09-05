const Twit = require('twit');

const createProgressBar = require('api-toolkit/bar');
const Queue = require('api-toolkit/queue');

// Allows us to check 180/ 15 minutes. Let's check at half that rate just in cases
const RATE_LIMIT_AUTO_FETCH_INTERVAL = 15 * 60 * 1000 / 180 * 2;

// how many pending requests can we have per endpoint
const MAX_CONCURRENT_FETCH = 2;

module.exports = class TwiterToolkit {
    queues = {}

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
            accessTokenSecret
        }
    }) {
        this.client = new Twit({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            access_token: accessToken,
            access_token_secret: accessTokenSecret,
          });


        if (autoFetchRateLimits) {
            this.initRateLimitsAutoFetch();
        }

        await this.fetchRateLimits();

        if (showProgressBar) {
            this.progressBar = createProgressBar();
        }
    }

    createQueue(url) {
        this.queues[url] = new Queue({
            maxConcurrent: MAX_CONCURRENT_FETCH,
            retry: true,
            maxRetries: 3
        });
    }

    get(url, params) {
        return this.request('get', url, params);
    }

    post(url, params) {
        return this.request('post', url, params);
    }

    delete(url, params) {
        return this.request('delete', url, params);
    }

    update(url, params) {
        return this.request('update', url, params);
    }

    request(method, url, params) {
        if (!queues[url]) {
            this.createQueue(url);
        }

        return queues[url].add(() => {
            try {
                const res = await client[method](url, params);
            } catch (e) {
                // not found
                if (e.code === 34) return [];

                // rate limited
                if (e.code === 88) {}

                throw e;
            };

        }, {
            fetchingMessage: `${method.toUpperCase()} ${(url + (params ? ` ${JSON.stringify(params)}` : '')).substring(0, 100)}... }`
        });
    }

    initRateLimitsAutoFetch() {
        this.rateFetchTimeeout = setInterval(this.fetchRateLimits, RATE_LIMIT_AUTO_FETCH_INTERVAL);
    }

    close() {
        clearInterval(this.rateFetchTimeeout);
    }
};