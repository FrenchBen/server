import LocalReleaseFinder from "./local/release";
import AmazonReleaseFinder from "./amazon/release";
import AzureReleaseFinder from "./azure/release";
import GithubReleaseFinder from "./github/release";
import OpenstackReleaseFinder from "./openstack/release";

export default class ReleaseFinder {
    constructor(config, serializer) {
        this.serializer = serializer;

        switch (config.storage) {
            case "local":
                this.finder = new LocalReleaseFinder(config.local.directory);
                break;

            case "amazon":
                this.finder = new AmazonReleaseFinder(config.amazon.key, config.amazon.secret, config.amazon.region);
                break;

            case "azure":
                this.finder = new AzureReleaseFinder(config.azure.account, config.azure.key);
                break;

            case "github":
                this.finder = new GithubReleaseFinder(config.github.token, config.github.owner, config.github.repositories);
                break;

            case "openstack":
                this.finder = new OpenstackReleaseFinder(config.openstack.username, config.openstack.password, config.openstack.auth_url, config.openstack.region);
                break;
        }
    }

    async release(app, name) {
        const release = await this.finder.release(app, name);

        if (release === null) {
            return null;
        }

        return this.serializer.unserialize(release);
    }

    async releases(app) {
        const releases = await this.finder.releases(app);

        return releases.map(release => this.serializer.unserialize(release));
    }
}
