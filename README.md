# ![neutron](neutron.png)

[![Build Status](https://travis-ci.org/jubianchi/neutron.svg?branch=master)](https://travis-ci.org/jubianchi/neutron) [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/jubianchi/neutron/tree/master)

A simple [Squirrel](https://github.com/Squirrel) update server.

## Features

 * Provides Mac OS updates
 * Supports multiple applications
 * Supports multiple storage providers (Amazon, Azure, Github, Openstack)

## How to use

Neutron is a simple web server providing an API for Squirrel to find application updates. You can start it using:

### NPM

```
npm install
npm start
```

### Docker

```
docker build -t neutron .
docker run --rm --name=neutron -v $pwd/updates:/app/updates -p 8080:8080 neutron
```

## How to configure

Configuring neutron is done through environment variables only:

| Variable name       | Description                                                                                  | Default         |
|---------------------|----------------------------------------------------------------------------------------------|-----------------|
| NEUTRON_SCHEME      | Scheme used to reach neutron server (`http` or `https`)                                      | `http`          |
| NEUTRON_HOST        | Host used to reach neutron server                                                            | `localhost`     |
| NEUTRON_PORT        | Port used to reach neutron server                                                            | `8080`          |
| PORT                | Private port used to reach neutron server (useful when behind a load balancer for example)   | `$NEUTRON_PORT` |
| NEUTRON_PID_FILE    | Path to a file to store neutron server PID                                                   | `null`          |
| NEUTRON_ADMIN_TOKEN | Token to be used by Neutron Manager                                                          | `null`          |
| NEUTRON_STORAGE     | Storage provider used to store updates (`local`, `azure`, `amazon`, `openstack` or `github`) | `local`         |

### Local storage

| Variable name                   | Description                                                                       | Default         |
|---------------------------------|-----------------------------------------------------------------------------------|-----------------|
| NEUTRON_STORAGE_LOCAL_DIRECTORY | Path to the directory where updates are stored                                    | `./updates`     |

### Azure storage

| Variable name                 | Description                  | Default |
|-------------------------------|------------------------------|---------|
| NEUTRON_STORAGE_AZURE_ACCOUNT | Microsoft Azure account name | `null`  |
| NEUTRON_STORAGE_AZURE_KEY     | Microsoft Azure account key  | `null`  |

### Amazon (S3) storage

| Variable name                 | Description                  | Default     |
|-------------------------------|------------------------------|-------------|
| NEUTRON_STORAGE_AMAZON_KEY    | Microsoft Azure account name | `null`      |
| NEUTRON_STORAGE_AMAZON_SECRET | Microsoft Azure account key  | `null`      |
| NEUTRON_STORAGE_AMAZON_REGION | Microsoft Azure account key  | `us-west-2` |

### Github storage                                                                

| Variable name                 | Description                                                                                                    | Default |    
|-------------------------------|----------------------------------------------------------------------------------------------------------------|---------|    
| NEUTRON_STORAGE_GITHUB_TOKEN        | Github [personal token](https://help.github.com/articles/creating-an-access-token-for-command-line-use/) | `null`  |    
| NEUTRON_STORAGE_GITHUB_OWNER        | Github organization/owner                                                                                | `null`  |    
| NEUTRON_STORAGE_GITHUB_REPOSITORIES | Allowed Github repositories (a string representing a JSON array)                                         | `"[]"`  |    

### Openstack storage

| Variable name                      | Description                                         | Default     |
|------------------------------------|-----------------------------------------------------|-------------|
| NEUTRON_STORAGE_OPENSTACK_USERNAME | Openstack username                                  | `null`      |
| NEUTRON_STORAGE_OPENSTACK_PASSWORD | Openstack password                                  | `null`      |
| NEUTRON_STORAGE_OPENSTACK_AUTH_URL | Openstack authentication URL (without API version)  | `null`      |
| NEUTRON_STORAGE_OPENSTACK_REGION   | Openstack region                                    | `null`      |

## How to store updates

Given we have an `neutron-testapp` and an `foobar-app` application:

### Local storage

When using local storage, updates are stored as plain folders and file inside the update folder (`NEUTRON_STORAGE_LOCAL_DIRECTORY`).
Each application **must** have its own folder in which each version **must** have its own folder:

```
.
├── foobar-app/
│   ├── 1.0.0/
│   └── 2.0.0/
└── neutron-testapp/
    ├── 1.0.0/
    └── 1.1.0/
```

Folder names **must** be the same as the released version number and follow semver.

In each version folder there **must** be:

* a `notes` file containing the version changelog
* a `update.zip` file containing the zipped application distribution

```
.
└── foobar-app/
    ├── 1.0.0/
    │   ├── notes
    │   └── update.zip
    └── 2.0.0/
        ├── notes
        └── update.zip
```

### Azure storage

When using Microsoft Azure storage, updates are stored as plain folders and file inside containers of the account (`NEUTRON_STORAGE_AZURE_ACCOUNT`).
Each application **must** have its own container. With our two example applications, there **must** be two containers
(one for each application) using the application name.

Inside containers, each version **must** have its own folder. Folder names **must** be the same as the released version
number and follow semver.

In each version folder:

*  there **may** be a `notes` file containing the version changelog
*  there **must** be a `update.zip` file containing the zipped application distribution

### Amazon (S3) storage

When using Amazon storage, updates are stored as plain folders and file inside buckets in the given region (`NEUTRON_STORAGE_AMAZON_REGION`).
Each application **must** have its own bucket. With our two example applications, there **must** be two buckets
(one for each application) using the application name.

Inside buckets, each version **must** have its own folder. Folder names **must** be the same as the released version
number and follow semver.

In each version folder:

*  there **may** be a `notes` file containing the version changelog
*  there **must** be a `update.zip` file containing the zipped application distribution

## How to query the API

Neutron server API exposes some routes to query applications, releases and updates:

* `GET /v1/apps` to get the application list
* `GET /v1/apps/:app` (where `:app` is the application name) to get an application details
* `GET /v1/apps/:app/releases` (where `:app` is the application name) to get an application release list
* `GET /v1/apps/:app/releases/:version` (where `:app` is the application name and `:version` the release version) to get an application release details
* `GET /v1/apps/:app/releases/:version/download` (where `:app` is the application name and `:version` the release version) to download the release distribution
* `GET /v1/apps/:app/update/:version` (where `:app` is the application name and `:version` the current application version) to query the update server

_The API will respond with JSON contents. You can use `cURL` and `jq` to inspect responses._

Given we have an `foobar-app` application and we are running the `1.0.0` release and there is a `2.0.0` release online, the update
process looks like this:

* The applications queries neutron for update: `GET /v1/apps/foobar-app/update/1.0.0`,
* Neutron will answer with details about the available update:

```
{
    "version": "2.0.0",
    "notes": "#2.0.0\nbla bla bla",
    "pub_date": "2016-02-03",
    "url": "http://neutron.local:8080/v1/apps/foobar-app/releases/2.0.0/download"
}
```
* The application will the follow the `url` link, download the update and install it

### Admin API

THe admin API is mainly designer for [Neutron Manager](https://github.com/jubianchi/neutron-manager) to manage applications
and releases:

* `POST /v1/apps` to create a new application

```json
{
    "name": "new-app"
}
```

* `DELETE /v1/apps/:app` (where `:app` is the application name) to delete an application
* `POST /v1/apps/:app/releases` (where `:app` is the application name) to create an new release. This **must** be a multipart request with
  * a `file` part containing the release distribution ZIP file
  * a `data` part contaning a JSON string describing the release

```json
{
    "version": "1.0.0",
    "notes": "#1.0.0\nbla bla bla"
}
```
* `DELETE /v1/apps/:app/releases/:version` (where `:app` is the application name and `:version` the release version) to delete a release

### Enabling the auto-updater in Electron

[Electron](http://electron.atom.io/) provides an [auto-updater](http://electron.atom.io/docs/v0.36.8/api/auto-updater/) module
to ease the use of Squirrel.

You can enable it in your main process with the following code:

```js
import { app, autoUpdater } from "electron";

app.on('ready', () => {
    autoUpdater.setFeedURL(`http://neutron.local:8080/v1/apps/${app.getName()}/update/${app.getVersion()}`);
    autoUpdater.checkForUpdates();
});
```

This will check for updates each time your application starts. It's a really simple example but will work. You can the bind
the `checkForUpdates` to any event (a button click in a preference pane for example).
