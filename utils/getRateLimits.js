module.exports = async (tt) => {
    const {
        resources,
    } = await tt.get('/application/rate_limit_status', null, {
        retry: false,
        noWaitForReady: true
    });

    if (!resources) return true;

    const limits = Object.values(resources).reduce(out, (group) => {
        return {
            ...out,
            ...group
        };
    });

    return Object.entries(limits).reduce((out, [ep, limit]) => {
        if (limit.reset && limit.remaining < 1) {
            out[ep] = limit.reset;
        }

        return out;
    }, {});
};