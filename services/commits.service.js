const DbService = require("db-mixin");
const Membership = require("membership-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


/**
 * this is the git.commits service for tracking commits
 */

module.exports = {
    // name of service
    name: "git.commits",
    // version of service
    version: 1,

    /**
     * Service Mixins
     * 
     * @type {Array}
     * @property {DbService} DbService - Database mixin
     * @property {ConfigLoader} ConfigLoader - Config loader mixin
     */
    mixins: [
        DbService({
            permissions: 'git.commits'
        }),
        ConfigLoader([
            'git.**'
        ]),
    ],

    /**
     * Service dependencies
     */
    dependencies: [],

    /**
     * Service settings
     * 
     * @type {Object}
     */
    settings: {
        rest: true,

        fields: {
            // commit repository
            repository: {
                type: "string",
                index: true,
                required: true,
            },

            // authed user id
            user: {
                type: "string",
                index: true,
                required: true,
            },

            // commit hash
            hash: {
                type: "string",
                index: true,
                required: true,
            },

            // branch
            branch: {
                type: "string",
                index: true,
                required: false,
            },

            // inject dbservice fields
            ...DbService.FIELDS,// inject dbservice fields
        },
        defaultPopulates: [],

        scopes: {
            ...DbService.SCOPE,
        },

        defaultScopes: [
            ...DbService.DSCOPE,
        ],

        // default init config settings
        config: {

        }
    },

    /**
     * service actions
     */
    actions: {

    },

    /**
     * service events
     */
    events: {
        /**
         * service event handler
         */
        async "git.repositories.removed"(ctx) {
            const repository = ctx.params.data.id;

            const entities = await this.findEntities(null, {
                query: {
                    repository
                }
            });

            // delete entities
            for (const entity of entities) {
                await this.removeEntity(ctx, {
                    id: entity.id
                });
            }

            this.logger.info(`Deleted ${entities.length} commits for ${repository}`);
        },
        async "git.repositories.push"(ctx) {
            const { repo, user, head, branch } = ctx.params;

            // create commit
            const commit = await this.createEntity(ctx, {
                repository: repo.id,
                user: user.id,
                hash: head,
                branch: branch,
            });

            // log
            this.logger.info(`Created commit ${commit.id} for ${repo.name} by ${user.username}`);

        },
    },

    /**
     * service methods
     */
    methods: {

    },


    /**
     * service created lifecycle event handler
     */
    created() {

    },

    /**
     * service started lifecycle event handler
     */
    async started() {

    },

    /**
     * service stopped lifecycle event handler
     */
    async stopped() {

    }
};

