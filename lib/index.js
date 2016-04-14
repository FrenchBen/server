import "babel-polyfill";
import Koa from "koa";
import logger from "koa-logger";
import json from "koa-json";
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import fs from "fs";
import boom from "boom";
import multipart from "co-multipart";
import config from "./config";
import AppFinder from "./finders/app";
import AppSerializer from "./serializers/app";
import ReleaseFinder from "./finders/release";
import ReleaseSerializer from "./serializers/release";
import UrlGenerator from "./utils/urlGenerator";
import AppController from "./controllers/app";
import ReleaseController from "./controllers/release";
import UpdateController from "./controllers/update";
import ReleaseDownloader from "./downloaders/release";
import AppUploader from "./uploaders/app";
import ReleaseUploader from "./uploaders/release";

const app = new Koa();
const router = new Router();
const apps = new Router();
const releases = new Router();
const urlGenerator = new UrlGenerator(`${config.scheme}://${config.host}:${config.public_port}`, router);
const appFinder = new AppFinder(config, new AppSerializer());
const releaseFinder = new ReleaseFinder(config, new ReleaseSerializer());
const downloader = new ReleaseDownloader(config);
const appUploader = new AppUploader(config);
const releaseUploader = new ReleaseUploader(config);
const appController = new AppController(appFinder, appUploader, urlGenerator);
const releaseController = new ReleaseController(appFinder, releaseFinder, releaseUploader, urlGenerator);
const updateController = new UpdateController(appFinder, releaseFinder, urlGenerator, downloader);

releases
    .get("api-v1-releases", "/", function *() {
        yield releaseController.listAction(this, this.params.app);
    })
    .get("api-v1-release", "/:version", function *() {
        yield releaseController.showAction(this, this.params.app, this.params.version);
    })
    .get("api-v1-release-download", "/:version/download", function *() {
        yield updateController.downloadReleaseAction(this, this.params.app, this.params.version);
    })
;

apps
    .get("api-v1-apps", "/", function *() {
        yield appController.listAction(this);
    })
    .get("api-v1-app", "/:app", function *() {
        yield appController.showAction(this, this.params.app);
    })
    .get("api-v1-app-update", "/:app/update/:version", function *() {
        yield updateController.nextAction(this, this.params.app, this.params.version);
    })
    .use("/:app/releases", releases.routes(), releases.allowedMethods({ throw: true }))
;

router
    .get("api-v1", "/v1", function *() {
        this.body = { apps: "/apps" };
    })
    .use("/v1/apps", apps.routes(), apps.allowedMethods({ throw: true }))
;

if (config.admin_token) {
    const admin = new Router();
    const adminMiddleware = function *(next) {
        const headers = this.request.header;

        if (!headers.authorization) {
            throw boom.unauthorized();
        }

        if (headers.authorization !== `Token ${config.admin_token}`) {
            throw boom.forbidden();
        }

        yield next;
    };

    admin
        .post("api-v1-add-app", "/apps", adminMiddleware, function *() {
            yield appController.addAction(this, this.request.body);
        })
        .delete("api-v1-delete-app", "/apps/:app", adminMiddleware, function *() {
            yield appController.removeAction(this, this.params.app);
        })

        .post("api-v1-add-release", "/apps/:app/releases", adminMiddleware, function *() {
            const parts = yield multipart(this);

            yield releaseController.addAction(this, this.params.app, JSON.parse(parts.fields[0][1]), parts.files[0]);

            parts.dispose();
        })
        .delete("api-v1-delete-release", "/apps/:app/releases/:version", adminMiddleware, function *() {
            yield releaseController.removeAction(this, this.params.app, this.params.version);
        })
    ;

    router.use("/v1", admin.routes(), admin.allowedMethods({ throw: true }));
}

app
    .use(logger())
    .use(json())
    .use(bodyParser())
    .use(function *(next) {
        try {
            yield next;
        } catch (exception) {
            let error = exception;

            if (!error.isBoom) {
                error = boom.wrap(error, error.status, error.message);
            }

            this.status = error.output.statusCode;
            this.body = error.output.payload;
        }
    })
    .use(router.routes())
    .use(router.allowedMethods({ throw: true }))
    .listen(config.private_port)
;
console.log("Server listening on:", config.private_port);

if (config.pid) {
    fs.writeFile(config.pid, process.pid);
}

process.on("SIGTERM", () => process.exit(0));
