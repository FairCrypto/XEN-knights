const XENCrypto = artifacts.require("XENCrypto");
const XENKnights = artifacts.require("XENKnights");

require("dotenv").config();

const { XK_DELAY = 100, XK_DURATION = 1} = process.env;

module.exports = async function (deployer, network) {

    const xenKnightsStartTs = process.env[`${network.toUpperCase()}_KNIGHTS_START_TS`] || Date.now();
    const xenKnightsDuration = process.env[`${network.toUpperCase()}_KNIGHTS_DURATION`];
    const xenCryptoAddress = process.env[`${network.toUpperCase()}_CONTRACT_ADDRESS`];
    const delay = network === 'test' ? XK_DELAY : 0;

    console.log('Using Start TS', xenKnightsStartTs);
    console.log('Using Duration', xenKnightsDuration);
    console.log('Using Delay', XK_DELAY);

    const xenCrypto = xenCryptoAddress || await XENCrypto.deployed().then(_ => _.address);
    console.log('Using XEN Crypto', xenCrypto);

    await deployer.deploy(
        XENKnights,
        xenCrypto,
        Math.floor(Number(xenKnightsStartTs) / 1000) + 1000 + delay * 3600 * 24,
        (Number(xenKnightsDuration) || 1)
    );
};
