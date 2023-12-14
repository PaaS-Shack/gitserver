const DbService = require("db-mixin");
const Membership = require("membership-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;

const URL = require('url');


/**
 * this is the email account service
 */

module.exports = {
    // name of service
    name: "git.repositories",
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
            permissions: 'git.repositories'
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
            // repository name
            name: {
                type: "string",
                min: 3,
                max: 64,
                pattern: /^[a-zA-Z0-9-_]+$/,
                required: true,
                unique: true,
            },

            // repository namespace
            namespace: {
                type: "string",
                min: 3,
                max: 64,
                pattern: /^[a-zA-Z0-9-_]+$/,
                required: true,
                default: "default",
            },

            // repository description
            description: {
                type: "string",
                required: false,
                default: "",
            },

            // repository visibility
            visibility: {
                type: "string",
                enum: ["public", "private"],
                required: true,
                default: "private",
            },

            // repository type
            type: {
                type: "string",
                enum: ["git"],
                required: true,
                default: "git",
            },

            // repository url
            url: {
                type: "string",
                required: false,
                readonly: true,
                onCreate: function ({ ctx }) {
                    const gitURL = this.config['git.url'];
                    const repository = ctx.params;
                    return `${gitURL}/${repository.namespace}/${repository.name}.git`;
                }
            },

            // repository path
            path: {
                type: "string",
                required: false,
                default: "",
            },

            // repository owner
            owner: {
                type: "string",
                required: true,
                populate: {
                    action: "v1.accounts.get",
                }
            },

            // repository access token for internal use
            accessToken: {
                type: "string",
                required: false,
                readonly: true,
                onCreate: function ({ ctx }) {
                    const repository = ctx.params;
                    return ctx.call('v1.tokens.generate', {
                        type: 'api-key',
                        owner: repository.owner,
                    }).then(token => token.token);
                }
            },

            access: {
                type: "array",

                onCreate: function ({ ctx }) {
                    const repository = ctx.params;
                    repository.access = [{
                        user: repository.owner,
                        permissions: ["admin"],
                    }];
                    return repository.access;
                },
                items: {
                    type: "object",
                    props: {
                        user: {
                            type: "string",
                            required: true,
                            populate: {
                                action: "v1.accounts.get",
                            }
                        },
                        permissions: {
                            type: "array",
                            items: {
                                type: "string",
                                enum: [
                                    "read",
                                    "write",
                                    "admin",
                                ],
                            },
                            required: false,
                            default: [],
                        },
                    },
                    required: false,
                },
            },


            // repository tags
            tags: {
                type: "array",
                items: "string",
                required: false,
                default: [],
            },

            // repository branches
            branches: {
                type: "array",
                items: "string",
                required: false,
                default: [],
            },

            // repository commits
            commits: {
                type: "array",
                items: "string",
                required: false,
                default: [],
                populate: {
                    action: "v1.git.commits.get",
                }
            },

            // repository is bare
            bare: {
                type: "boolean",
                required: false,
                default: true,
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
            'git.repositories.path': '/var/lib/git/repositories',

        }
    },

    /**
     * service actions
     */
    actions: {
        /**
         * lookup repository by name and namespace
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * 
         * @returns {Object} - repository object
         */
        lookup: {
            rest: {
                method: "GET",
                path: "/:namespace/:name",
            },
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                return this.lookup(ctx, params.name, params.namespace);
            }
        },

        /**
         * has access to repository
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * @param {String} user - user id
         * @param {Array<String>} permissions - permissions to check
         * 
         * @returns {Boolean} - true if user has access to repository
         */
        hasAccess: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                user: {
                    type: "string",
                    required: true,
                },
                permissions: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: [
                            "read",
                            "write",
                            "admin",
                        ],
                    },
                    required: false,
                    default: [],
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                const repository = await this.lookup(ctx, params.name, params.namespace);

                // check if user has access to repository
                return this.hasAccess(ctx, repository, params.user, params.permissions);
            }
        },

        /**
         * add user access to repository
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * @param {String} user - user id
         * @param {Array<String>} permissions - permissions to add
         * 
         * @returns {Object} - repository object
         */
        addUserAccess: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                user: {
                    type: "string",
                    required: true,
                },
                permissions: {
                    type: "array",
                    items: {
                        type: "string",
                        enum: [
                            "read",
                            "write",
                            "admin",
                        ],
                    },
                    required: false,
                    default: [],
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                const repository = await this.lookup(ctx, params.name, params.namespace);

                // remove params
                return this.addUserAccess(ctx, repository, params.user, params.permissions);
            }
        },

        /**
         * remove user access from repository
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * @param {String} user - user id
         * 
         * @returns {Object} - repository object
         */
        removeUserAccess: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                user: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                const repository = await this.lookup(ctx, params.name, params.namespace);

                // remove params
                return this.removeUserAccess(ctx, repository, params.user);
            }
        },

        /**
         * get repository path
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * 
         * @returns {String} - repository path
         */
        getPath: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // remove params
                return this.getPath(ctx, {
                    name: params.name,
                    namespace: params.namespace,
                });
            }
        },

        /**
         * append commit to repository
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * @param {String} commit - commit id
         * 
         * @returns {Object} - repository object
         */
        appendCommit: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                commit: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                const repository = await this.lookup(ctx, params.name, params.namespace);

                // append commit to repository
                await this.updateEntity(ctx, {
                    id: repository.id,
                    commits: [...repository.commits, params.commit]
                });

                // return repository
                return this.lookup(ctx, params.name, params.namespace);
            }
        },

        /**
         * track branch in repository
         * 
         * @actions
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * @param {String} branch - branch name
         * 
         * @returns {Object} - repository object
         */
        trackBranch: {
            params: {
                name: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                namespace: {
                    type: "string",
                    min: 3,
                    max: 64,
                    pattern: /^[a-zA-Z0-9-_]+$/,
                    required: true,
                },
                branch: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // lookup repository
                const repository = await this.lookup(ctx, params.name, params.namespace);

                // check if repository has branch
                if (repository.branches.includes(params.branch)) {
                    //throw new MoleculerClientError("branch already tracked", 400);
                    return repository;
                }

                // append commit to repository
                await this.updateEntity(ctx, {
                    id: repository.id,
                    branches: [...repository.branches, params.branch]
                });

                // return repository
                return this.lookup(ctx, params.name, params.namespace);
            }
        },

        /**
         * provide a clone path for repository 
         * 
         * @example 
         * 
         * github.com/namespace/name.git#branch
         * 
         * @actions
         * @param {String} id - id of repository
         * @param {String} branch - branch name
         * @param {String} hash - commit hash
         * 
         * @returns {String} - repository clone path
         */
        clone: {
            params: {
                id: {
                    type: "string",
                    optional: false,
                },
                branch: {
                    type: "string",
                    optional: true,
                    default: "main",
                },
                hash: {
                    type: "string",
                    optional: true
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // get repository
                const repository = await this.getById(ctx, params.id);

                // check repository exists
                if (!repository) {
                    throw new MoleculerClientError("repository not found", 404);
                }

                // 
                const url = URL.parse(repository.url);
                let cloneURL = `git://token:${repository.accessToken}@${url.host}/${repository.namespace}/${repository.name}.git`;

                // check if branch is provided
                if (params.branch) {
                    cloneURL += `#refs/heads/${params.branch}`;
                    if(params.hash){
                        cloneURL += `#${params.hash}`;
                    }
                }

                // return clone url
                return cloneURL;
            }
        },

        /**
         * generate auth token for repository
         * 
         * @actions
         * @param {String} id - id of repository
         * 
         * @returns {String} - repository auth token
         */
        generateAuthToken: {
            rest: {
                method: "GET",
                path: "/:id/token",
            },
            params: {
                id: {
                    type: "string",
                    optional: false,
                },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // get repository
                const repository = await this.getById(ctx, params.id);

                // check repository exists
                if (!repository) {
                    throw new MoleculerClientError("repository not found", 404);
                }

                // generate auth token
                const authToken = await this.generateAuthToken(ctx, repository);

                // return auth token
                return authToken;
            }
        },

        // clean db
        clean: {
            async handler(ctx) {

                const entities = await this.findEntities(null, {});
                this.logger.info(`cleaning ${entities.length} entities`);
                // loop entities
                for (let index = 0; index < entities.length; index++) {
                    const entity = entities[index];

                    await this.removeEntity(ctx, {
                        id: entity.id
                    });
                }

            },
        },
    },

    /**
     * service events
     */
    events: {

    },

    /**
     * service methods
     */
    methods: {
        /**
         * get by id
         * 
         * @param {Context} ctx - context of request
         * @param {String} id - id of repository
         * 
         * @returns {Promise<Object>} - repository object
         */
        async getById(ctx, id) {
            // get repository
            return this.resolveEntities(null, {
                id,
            });
        },
        /**
         * lookup repository by name and namespace
         * 
         * @param {Context} ctx - context of request
         * @param {String} name - name of repository
         * @param {String} namespace - namespace of repository
         * 
         * @returns {Promise<Object>} - repository object
         */
        async lookup(ctx, name, namespace) {
            // get repository
            const repository = await this.findEntity(null, {
                query: {
                    name: name,
                    namespace: namespace,
                }
            });

            // check repository exists
            if (!repository) {
                throw new MoleculerClientError("repository not found", 404);
            }

            // return repository
            return repository;
        },

        /**
         * hasAccess - check if user has access to repository
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * @param {String} user - user id
         * @param {Array<String>} permissions - permissions to check
         * 
         * @returns {Promise<Boolean>} - true if user has access to repository
         */
        async hasAccess(ctx, repository, user, permissions) {
            // check if user has access to repository
            for (const access of repository.access) {
                // check if user has access
                if (access.user === user) {
                    // check permissions
                    if (permissions.length > 0) {
                        // check if user has permissions
                        for (const permission of permissions) {
                            // check if user has permission
                            if (access.permissions.includes(permission)) {
                                // return true
                                return true;
                            }
                        }
                    } else {
                        // return true
                        return true;
                    }
                }
            }

            // return false
            return false;
        },

        /**
         * add user access to repository
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * @param {String} user - user id
         * @param {Array<String>} permissions - permissions to add
         * 
         * @returns {Promise<Object>} - repository object
         */
        async addUserAccess(ctx, repository, user, permissions) {

            // check if user has access to repository
            const hasAccess = await this.hasAccess(ctx, repository.name, repository.namespace, user);

            // check if user has access to repository
            if (!hasAccess) {
                // add user access to repository
                await this.updateEntity(ctx, {
                    id,
                    access: [...repository.access, {
                        user,
                        permissions
                    }]
                });
            }
        },

        /**
         * remove user access from repository
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * @param {String} user - user id
         * 
         * @returns {Promise<Object>} - repository object
         */
        async removeUserAccess(ctx, repository, user) {

            // check if user has access to repository
            const hasAccess = await this.hasAccess(ctx, repository.name, repository.namespace, user);

            // check if user has access to repository
            if (hasAccess) {
                // remove user access from repository
                await this.updateEntity(ctx, {
                    id,
                    access: repository.access.filter(access => access.user !== user)
                });
            }
        },

        /**
         * getPath - get repository path
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * 
         * @returns {Promise<String>} - repository path
         */
        async getPath(ctx, repository) {

            // get repos folder
            const reposFolder = this.config['git.repositories.path'];

            // generate repository path
            const repositoryPath = `${reposFolder}/${repository.namespace}/${repository.name}`;

            // return repository path
            return repositoryPath;
        },

        /**
         * generate auth token for repository
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * 
         * @returns {Promise<String>} - repository auth token
         */
        async generateAuthToken(ctx, repository) {
            // generate auth token
            const authToken = await ctx.call('v1.tokens.generate', {
                type: 'api-key',
                owner: repository.owner,
            });

            // return auth token
            return authToken;
        },

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

