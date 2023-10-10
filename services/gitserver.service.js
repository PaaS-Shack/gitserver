const DbService = require("db-mixin");
const Membership = require("membership-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;

/**
 * git server over http
 * uses git-http-backend to process git requests
 */

const Backend = require('../lib/backend');
const { PassThrough } = require("stream");
const { spawn } = require("child_process");
const { Context } = require("moleculer");
const auth = require('basic-auth');
const fs = require('fs').promises;
const Git = require("nodegit");



module.exports = {
    // name of service
    name: "git.server",
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

        // default init config settings
        config: {

        }
    },

    /**
     * service actions
     */
    actions: {
        /**
         * handle git request
         * 
         * @actions
         * 
         * @returns {Promise}
         */
        handleRequest: {
            params: {
                req: {
                    type: 'object'
                },
                res: {
                    type: 'object'
                }
            },
            async handler(ctx) {
                // get request
                const req = ctx.params.req;
                // get response
                const res = ctx.params.res;

                //auth user with basic auth
                const credentials = auth(req);

                // check if credentials are valid
                if (!credentials) {
                    // send error
                    res.statusCode = 401;
                    res.setHeader('WWW-Authenticate', 'Basic realm="example"');
                    res.end('Access denied');

                    this.logger.info(`Request: ${req.url} - Access denied`);

                    return;
                }

                const { token } = await ctx.call('v1.accounts.login', {
                    username: credentials.name,
                    password: credentials.pass
                });

                const user = await ctx.call('v1.accounts.resolveToken', {
                    token
                });

                // check if user is valid
                if (!user) {
                    // send error
                    res.statusCode = 401;
                    res.setHeader('WWW-Authenticate', 'Basic realm="example"');
                    res.end('Access denied');

                    this.logger.info(`Request: ${req.url} - Access denied`);

                    return;
                }

                // set user
                ctx.meta.user = user;

                // handle request
                return this.handleRequest(ctx, req, res);
            }
        },

        /**
         * list local repositories
         * 
         * @actions
         * 
         * @returns {Promise} - list of repositories
         */
        listRepositories: {
            async handler(ctx) {
                // walk namespace folders for repositories names
                const tmp = await fs.readdir(this.config['git.repositories.path']);
                // filter folders
                const namespaces = tmp.filter((name) => !name.startsWith('.'));
                // get repositories

                const repositories = await Promise.all(namespaces.map(async (namespace) => {
                    // walk namespace folders for repositories names
                    const tmp = await fs.readdir(`${this.config['git.repositories.path']}/${namespace}`);
                    // filter folders
                    const repositories = tmp.filter((name) => !name.startsWith('.'));
                    // return repositories
                    return repositories.map((name) => ({
                        name,
                        namespace
                    }));
                }));

                return repositories;
            }
        },

        /**
         * connection count
         * 
         * @actions
         * 
         * @returns {Promise} - number of open connections
         */
        connectionCount: {
            async handler(ctx) {
                return this.openConnections.size;
            }
        },

        /**
         * create bare repository
         * 
         * @actions
         * @param {String} id - repository id
         * 
         * @returns {Promise} - created repository
         */
        createBareRepository: {
            params: {
                id: {
                    type: 'string'
                }
            },
            async handler(ctx) {
                // get repository
                const repository = await ctx.call('v1.git.repositories.get', {
                    id: ctx.params.id
                });

                // create bare repository
                await this.createBareRepository(ctx, repository);

                // return repository
                return repository;
            }
        },
    },

    /**
     * service events
     */
    events: {
        async "git.repositories.created"(ctx) {
            // get payload
            const payload = ctx.params.data;
            // create bare repository
            await this.createBareRepository(ctx, payload);
        },
        async "git.repositories.updated"(ctx) {
            // get payload
            const payload = ctx.params.data;
            // create bare repository
            await this.createBareRepository(ctx, payload);
        },
        async "git.repositories.removed"(ctx) {
            // get payload
            const payload = ctx.params.data;
            // get repository path
            const repositoryPath = await ctx.call('v1.git.repositories.getPath', {
                name: payload.name,
                namespace: payload.namespace
            });
            // remove repository path
            await fs.rmdir(repositoryPath, {
                recursive: true
            });
            this.logger.info(`Repository path removed: ${repositoryPath}`);

            // namespace path
            const namespacePath = repositoryPath.split('/').slice(0, -1).join('/');
            // check if namespace path is empty
            const namespacePathIsEmpty = await fs.readdir(namespacePath);
            if (namespacePathIsEmpty.length === 0) {
                // remove namespace path
                await fs.rmdir(namespacePath, {
                    recursive: true
                });
                this.logger.info(`Namespace path removed: ${namespacePath}`);
            }
        }
    },

    /**
     * service methods
     */
    methods: {
        /**
         * create http server for git server
         * 
         * @returns {Promise}
         */
        createHttpServer() {
            return new Promise((resolve, reject) => {
                // create http server
                const server = require('http').createServer(async (req, res) => {
                    // add open connection
                    this.openConnections.set(req.socket.remoteAddress + ':' + req.socket.remotePort, req.socket);

                    this.actions.handleRequest({
                        req,
                        res
                    }).then(() => {
                        this.logger.info(`Request: ${req.url} - ${res.statusCode}`);
                    }).catch((err) => {
                        this.logger.error(`Request: ${req.url} - ${err.message}`, err);
                    }).finally(() => {
                        // remove open connection
                        this.openConnections.delete(req.socket.remoteAddress + ':' + req.socket.remotePort);
                    });
                });

                const port = this.config['git.server.port'] || 7000;

                // listen on port
                server.listen(port, (err) => {
                    if (err) {
                        return reject(err);
                    }

                    // set server
                    this.server = server;

                    this.logger.info(`Server listening on port ${port}`)

                    // resolve
                    resolve();
                });
            });
        },

        /**
         * handle http request
         * 
         * @param {Context} ctx - context of request
         * @param {http.IncomingMessage} req - request object 
         * @param {http.ServerResponse} res - response object
         */
        async handleRequest(ctx, req, res) {

            const user = ctx.meta.user;
            const namespace = req.url.split('/')[1];
            const repository = req.url.split('/')[2];
            const name = repository.split('.')[0];

            // check if repository exists
            const repo = await ctx.call('v1.git.repositories.lookup', {
                namespace,
                name
            });

            // check if repository exists
            if (!repo) {
                // send error
                res.statusCode = 404;
                res.end('Not found');
                this.logger.info(`Request: ${req.url} - Not found`);
                return;
            }


            // check if user has access to repository
            const hasAccess = await ctx.call('v1.git.repositories.hasAccess', {
                name: repo.name,
                namespace: repo.namespace,
                user: user.id
            });

            // check if user has access to repository
            if (!hasAccess) {
                // send error
                res.statusCode = 403;
                res.end('Forbidden');
                this.logger.info(`Request: ${req.url} - Forbidden`);
                return;
            }

            // check if repository is bare
            if (!repo.bare) {
                // send error
                res.statusCode = 500;
                res.end('Repository is not bare');
                this.logger.info(`Request: ${req.url} - Repository is not bare`);
                return;
            }

            // get repository path
            const repositoryPath = await ctx.call('v1.git.repositories.getPath', {
                name: repo.name,
                namespace: repo.namespace
            });

            // check if repository path exists
            if (!repositoryPath) {
                // send error
                res.statusCode = 500;
                res.end('Repository path does not exist');
                this.logger.info(`Request: ${req.url} - Repository path does not exist`);
                return;
            }

            // check if repository path exists
            const repositoryExists = await fs.stat(repositoryPath).catch((err) => false);

            // check if repository path exists
            if (!repositoryExists) {
                // send error
                res.statusCode = 500;
                res.end('Repository path does not exist');
                this.logger.info(`Request: ${req.url} - Repository path does not exist`);
                return;
            }

            // check if repository path is directory
            if (!repositoryExists.isDirectory()) {
                // send error
                res.statusCode = 500;
                res.end('Repository path is not a directory');
                this.logger.info(`Request: ${req.url} - Repository path is not a directory`);
                return;
            }

            this.logger.info(`Request: ${req.url} - ${repositoryPath}`);

            const backend = Backend(req.url);

            backend.on('service', (service) => {
                this.handleService(ctx, repo, service).then(async () => {
                    if (service.action === 'push') {
                        await ctx.call('v1.git.repositories.trackBranch', {
                            name: repo.name,
                            namespace: repo.namespace,
                            branch: service.fields.branch
                        }).catch((err) => {
                            this.logger.info(`Branch not tracked: ${service.fields.branch}`);
                        });
                        return this.handleCommit(ctx, req, res, service, repositoryPath);
                    }
                }).catch((err) => {
                    backend.emit('error', err);
                });
            });

            req.pipe(backend).pipe(res);
        },

        /**
         * handle commit
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * @param {Object} service - service object
         * 
         * @returns {Promise}
         */
        async handleCommit(ctx, repo, service) {

            const { head, last, refname, branch } = service.fields;

            this.logger.info(`Commit: ${head} - ${last} - ${refname} - ${branch}`);

            // get repository path
            const repositoryPath = await ctx.call('v1.git.repositories.getPath', {
                name: repo.name,
                namespace: repo.namespace
            });

            // read commit message
            const commit = await this.getCommit(ctx, repositoryPath, head);

            // read commit message
            const commitMessage = await this.readCommitMessage(ctx, commit);
            // get commit author
            const author = commit.author();

            // create new commit
            const newCommit = {
                repository: repo.id,
                user: ctx.meta.user.id,
                message: commitMessage,
                author: {
                    name: author.name(),
                    email: author.email()
                },
                hash: commit.sha()
            };

            // create commit
            const createdCommit = await ctx.call('v1.git.commits.create', newCommit);

            this.logger.info(`Commit created: ${createdCommit.id}`);

            // append commit
            await ctx.call('v1.git.repositories.appendCommit', {
                name: repo.name,
                namespace: repo.namespace,
                commit: createdCommit.id
            });

            return createdCommit;
        },

        /**
         * get commit object
         * 
         * @param {Context} ctx - context of request
         * @param {String} repositoryPath - path to repository
         * @param {String} head - head of commit
         * 
         * @returns {Promise}
         */
        async getCommit(ctx, repositoryPath, head) {
            // open repository
            const repository = await Git.Repository.open(repositoryPath);

            // get commit
            const commit = await repository.getCommit(head);

            return commit;
        },

        /**
         * read commit message with nodegit
         * 
         * @param {Context} ctx - context of request
         * @param {Object} commit - commit object
         * 
         * @returns {Promise}
         */
        async readCommitMessage(ctx, commit) {
            // get commit message
            const commitMessage = commit.message();

            this.logger.info(`Commit message: ${commitMessage}`);

            return commitMessage;
        },

        /**
         * handle service request
         * 
         * @param {Context} ctx - context of request
         * @param {http.IncomingMessage} req - request object
         * @param {http.ServerResponse} res - response object
         * @param {Object} service - service object
         * @param {String} repositoryPath - path to repository
         * 
         * @returns {Promise}
         */
        handleService(ctx, req, res, service, repositoryPath) {
            return new Promise((resolve, reject) => {
                // set content type
                res.setHeader('content-type', service.type);

                // create process
                const ps = spawn(service.cmd, service.args.concat(repositoryPath));

                // pipe stdout to stream
                ps.stdout.pipe(service.createStream()).pipe(ps.stdin);

                // handle close
                ps.on('close', () => {
                    // resolve
                    resolve();
                });
            });
        },

        /**
         * close http server
         * 
         * @returns {Promise}
         */
        closeHttpServer() {
            return new Promise((resolve, reject) => {
                // check if server exists
                if (!this.server) {
                    // resolve
                    return resolve();
                }

                // close server
                this.server.close((err) => {
                    if (err) {
                        return reject(err);
                    }
                    this.logger.info(`Server closed`);
                    // resolve
                    resolve();
                });
            });
        },

        /**
         * create bare repository
         * 
         * @param {Context} ctx - context of request
         * @param {Object} repository - repository object
         * 
         * @returns {Promise}
         */
        async createBareRepository(ctx, repository) {
            // check if repository is bare
            if (!repository.bare) {
                // send error
                throw new MoleculerClientError('Repository is not bare', 500, 'REPOSITORY_NOT_BARE');
            }

            // get repository path
            const repositoryPath = await ctx.call('v1.git.repositories.getPath', {
                name: repository.name,
                namespace: repository.namespace
            });

            // check if repository path exists
            if (!repositoryPath) {
                // send error
                throw new MoleculerClientError('Repository path does not exist', 500, 'REPOSITORY_PATH_NOT_EXIST');
            }

            // check if repository path exists
            const repositoryExists = await fs.stat(repositoryPath)
                .catch((err) => false);

            // check if repository path exists
            if (!repositoryExists) {
                // create repository path
                await fs.mkdir(repositoryPath, {
                    recursive: true
                });

                this.logger.info(`Repository path created: ${repositoryPath}`);
            } else {

                // check if repository path is directory
                if (!repositoryExists.isDirectory()) {
                    // send error
                    throw new MoleculerClientError('Repository path is not a directory', 500, 'REPOSITORY_PATH_NOT_DIRECTORY');
                }

                // check if repository path is empty
                const repositoryPathIsEmpty = await fs.readdir(repositoryPath);

                // check if repository path is empty
                if (repositoryPathIsEmpty.length > 0) {
                    // look git repository
                    const repository = await Git.Repository.open(repositoryPath);
                    // check if repository is bare
                    if (!repository.isBare()) {
                        // send error
                        throw new MoleculerClientError('Repository is not bare', 500, 'REPOSITORY_NOT_BARE');
                    }

                    // check if repository is empty
                    const repositoryIsEmpty = await repository.isEmpty();
                    // check if repository is empty
                    if (!repositoryIsEmpty) {
                        // send error
                        throw new MoleculerClientError('Repository is not empty', 500, 'REPOSITORY_NOT_EMPTY');
                    }

                    // return repository
                    return repository;
                }
            }

            // create bare repository
            await this.createBare(repositoryPath);

            // return repository
            return repository;
        },

        /**
         * create bare repository
         * 
         * @param {String} repositoryPath - path to repository
         * 
         * @returns {Promise}
         */
        createBare(repositoryPath) {
            return new Promise((resolve, reject) => {
                // create bare repository
                const ps = spawn('git', ['init', '--bare', repositoryPath]);

                // handle error
                ps.on('error', (err) => {
                    // reject
                    reject(err);
                });

                // handle close
                ps.on('close', (code) => {
                    // resolve
                    this.logger.info(`Repository created: ${repositoryPath}`);
                    resolve();
                });
            });
        },
    },

    /**
     * service created lifecycle event handler
     */
    created() {
        this.openConnections = new Map();
    },

    /**
     * service started lifecycle event handler
     */
    async started() {
        // create http server
        await this.createHttpServer();
    },

    /**
     * service stopped lifecycle event handler
     */
    async stopped() {
        // close http server
        await this.closeHttpServer();

    }
};