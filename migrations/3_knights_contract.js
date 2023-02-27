const StakeInfo = artifacts.require("StakeInfo");
const XENStake = artifacts.require("XENStake");
const XENKnights = artifacts.require("XENKnights");

require("dotenv").config();

module.exports = async function (deployer, network) {
    const stakeInfo = await StakeInfo.deployed();
    const xenStake = await XENStake.deployed();
    await deployer.link(stakeInfo, XENKnights);
    await deployer.deploy(XENKnights, xenStake.address, Math.floor(Date.now() / 1000) + 10, 1);
};
