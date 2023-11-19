
# Git Service

HTTP git server. This service provides a HTTP git server for managing git repositories.
Push pull and clone are supported.

## Service Fields

| Field              | Type    | Description                                        |
|--------------------|---------|----------------------------------------------------|
| `name`             | string  | Name of the service.                               |
| `version`          | 1       | Version of the service.                            |

## Service Mixins

| Mixin              | Type        | Description                                   |
|--------------------|-------------|-----------------------------------------------|
| `ConfigLoader`     | ConfigLoader | Config loader mixin for loading configuration. |

## Service Settings

| Setting            | Type    | Description                           |
|--------------------|---------|---------------------------------------|
| `rest`             | true    | Enable REST endpoint.                 |
| `config`           |         | Default init config settings.         |

## Actions

### 1. `handleRequest`

| Parameter | Type   | Description                |
|-----------|--------|----------------------------|
| `req`     | object | HTTP request object.       |
| `res`     | object | HTTP response object.      |

### 2. `listRepositories`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 3. `connectionCount`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 4. `createBareRepository`

| Parameter | Type   | Description              |
|-----------|--------|--------------------------|
| `id`      | string | Repository ID.           |

## Events

### 1. `git.repositories.created`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `ctx`     | object | Context object.  |

### 2. `git.repositories.updated`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `ctx`     | object | Context object.  |

### 3. `git.repositories.removed`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `ctx`     | object | Context object.  |

## Methods

### 1. `createHttpServer`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 2. `handleRequest`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `req`              | http.IncomingMessage    | HTTP request object.          |
| `res`              | http.ServerResponse     | HTTP response object.         |
| `service`          | object                  | Service object.               |
| `repositoryPath`   | string                  | Path to the repository.       |

### 3. `handleCommit`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `req`              | http.IncomingMessage    | HTTP request object.          |
| `res`              | http.ServerResponse     | HTTP response object.         |
| `service`          | object                  | Service object.               |
| `repositoryPath`   | string                  | Path to the repository.       |

### 4. `getCommit`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `repositoryPath`   | string                  | Path to the repository.       |
| `head`             | string                  | Head of the commit.           |

### 5. `readCommitMessage`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `commit`           | object                  | Commit object.                |

### 6. `handleService`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `req`              | http.IncomingMessage    | HTTP request object.          |
| `res`              | http.ServerResponse     | HTTP response object.         |
| `service`          | object                  | Service object.               |
| `repositoryPath`   | string                  | Path to the repository.       |

### 7. `closeHttpServer`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| None               |                         | No parameters.                |

### 8. `createBareRepository`

| Parameter          | Type                    | Description                   |
|--------------------|-------------------------|-------------------------------|
| `ctx`              | Context                 | Context of the request.       |
| `repository`       | object                  | Repository object.            |

## Lifecycle

### 1. `created`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 2. `started`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 3. `stopped`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |





# Commit Service

Commit service. This service provides a commit service for managing commits.

## Service Fields

| Field              | Type    | Description                                        |
|--------------------|---------|----------------------------------------------------|
| `name`             | string  | Name of the service.                               |
| `version`          | 1       | Version of the service.                            |

## Service Mixins

| Mixin              | Type        | Description                                   |
|--------------------|-------------|-----------------------------------------------|
| `DbService`        | DbService    | Database mixin.                               |
| `ConfigLoader`     | ConfigLoader | Config loader mixin for loading configuration. |

## Service Settings

| Setting            | Type    | Description                           |
|--------------------|---------|---------------------------------------|
| `rest`             | true    | Enable REST endpoint.                 |
| `fields`           | object  | Service fields configuration.         |
| `defaultPopulates` | array   | Default populates array.              |
| `scopes`           | object  | Service scopes configuration.         |
| `defaultScopes`    | array   | Default scopes array.                 |
| `config`           |         | Default init config settings.         |

### Fields Configuration

| Field              | Type    | Index | Required |
|--------------------|---------|-------|----------|
| `repository`       | string  | true  | true     |
| `user`             | string  | true  | true     |
| `hash`             | string  | true  | true     |
| `branch`           | string  | true  | false    |

## Actions

| Action             | Parameters | Description                           |
|--------------------|------------|---------------------------------------|
| ... No actions defined yet.         |            |                                       |

## Events

### 1. `git.repositories.removed`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `ctx`     | object | Context object.  |

### 2. `git.repositories.push`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `ctx`     | object | Context object.  |

## Methods

| Method             | Parameters | Description                           |
|--------------------|------------|---------------------------------------|
| ... No methods defined yet.

## Lifecycle

### 1. `created`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 2. `started`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |

### 3. `stopped`

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| None      |        | No parameters.   |
