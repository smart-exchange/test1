const {PublicClient,AuthenticatedClient} = require('@okfe/okex-node');
const config = require('./config');
const pClient = new PublicClient("https://www.okex.me", 30000);
const aClient = new AuthenticatedClient(config.httpkey, config.httpsecret, config.passphrase, config.urlHost);

module.exports.pClient = pClient;
module.exports.aClient = aClient;
