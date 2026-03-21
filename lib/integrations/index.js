// Integration registry — maps platform names to adapter classes

const WebhookAdapter = require('./webhook');
const VagaroAdapter = require('./vagaro');
const BoulevardAdapter = require('./boulevard');
const MangomintAdapter = require('./mangomint');
const AestheticsProAdapter = require('./aestheticspro');
const ZenotiAdapter = require('./zenoti');
const GoogleCalendarAdapter = require('./google-calendar');
const AcuityAdapter = require('./acuity');
const SquareAdapter = require('./square');

const adapters = {
  webhook: WebhookAdapter,
  vagaro: VagaroAdapter,
  boulevard: BoulevardAdapter,
  mangomint: MangomintAdapter,
  aestheticspro: AestheticsProAdapter,
  zenoti: ZenotiAdapter,
  google_calendar: GoogleCalendarAdapter,
  acuity: AcuityAdapter,
  square: SquareAdapter
};

function getAdapter(platformName, integrationRow) {
  const AdapterClass = adapters[platformName];
  if (!AdapterClass) throw new Error(`Unknown platform: ${platformName}`);
  return new AdapterClass(integrationRow);
}

function listPlatforms() {
  return Object.values(adapters).map(A => ({
    platformName: A.platformName,
    displayName: A.displayName,
    authType: A.authType,
    capabilities: A.capabilities,
    credentialFields: A.credentialFields,
    configFields: A.configFields,
    oauthConfig: A.oauthConfig ? {
      authorizeUrl: A.oauthConfig.authorizeUrl,
      scopes: A.oauthConfig.scopes
    } : null
  }));
}

module.exports = { getAdapter, listPlatforms };
