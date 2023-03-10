const StakeInfo = artifacts.require("StakeInfo");
const XENStake = artifacts.require("XENStake");
const XENKnights = artifacts.require("XENKnights");

require("dotenv").config();

const { XK_DELAY = 10, XK_DURATION = 1} = process.env;

module.exports = async function (deployer, network) {

    const xenKnightsStartTs = process.env[`${network.toUpperCase()}_KNIGHTS_START_TS`] || Date.now();
    const xenKnightsDuration = process.env[`${network.toUpperCase()}_KNIGHTS_DURATION`];
    const xenStakeInfoAddress = process.env[`${network.toUpperCase()}_STAKEINFO_ADDRESS`];
    const xenStakerAddress = process.env[`${network.toUpperCase()}_STAKER_ADDRESS`];

    console.log('Using Start TS', xenKnightsStartTs);
    console.log('Using Duration', xenKnightsDuration);

    const xenStakeAddress = xenStakerAddress || await XENStake.deployed().then(_ => _.address);
    if (!xenStakeInfoAddress) {
        const stakeInfo = await StakeInfo.deployed();
        await deployer.link(stakeInfo, XENKnights);
    } else {
        await deployer.link(xenStakeInfoAddress, XENKnights);
    }

    await deployer.deploy(
        XENKnights,
        xenStakeAddress,
        Math.floor(Number(xenKnightsStartTs) / 1000) + 1000,
        (Number(xenKnightsDuration) || 1)
    );
};
