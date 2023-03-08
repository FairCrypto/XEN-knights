const StakeInfo = artifacts.require("StakeInfo");
const XENStake = artifacts.require("XENStake");
const XENKnights = artifacts.require("XENKnights");

require("dotenv").config();

const { XK_DELAY = 10, XK_DURATION = 1} = process.env;

module.exports = async function (deployer, network) {
    const stakeInfo = await StakeInfo.deployed();
    const xenStake = await XENStake.deployed();
    await deployer.link(stakeInfo, XENKnights);

    await deployer.deploy(
        XENKnights,
        xenStake.address,
        Math.floor(Date.now() / 1000) + (Number(XK_DELAY) || 10),
        (Number(XK_DURATION) || 10)
    );
};
