// const XENStake = artifacts.require("XENStake");
// const XENCrypto = artifacts.require("XENCrypto");
// const MagicNumbers = artifacts.require("MagicNumbers");

// const DateTime = artifacts.require("DateTime");
// const StringData = artifacts.require("StringData");
// const StakeInfo = artifacts.require("StakeInfo");
// const StakeMetadata = artifacts.require("StakeMetadata");

require("dotenv").config();

module.exports = async function (deployer, network) {
/*
    const xenContractAddress = process.env[`${network.toUpperCase()}_CONTRACT_ADDRESS`];
    const xenStakerAddress = process.env[`${network.toUpperCase()}_STAKER_ADDRESS`];

    if (xenStakerAddress) {
        console.log('    using existing XEN Stake contract at', xenStakerAddress)
        await deployer.deploy(StakeInfo);
    } else {
        await deployer.deploy(DateTime);
        await deployer.link(DateTime, StakeMetadata);

        await deployer.deploy(StakeInfo);
        await deployer.link(StakeInfo, StakeMetadata);
        await deployer.link(StakeInfo, XENStake);

        await deployer.deploy(StakeMetadata);
        await deployer.link(StakeMetadata, XENStake);

        await deployer.deploy(MagicNumbers);
        await deployer.link(MagicNumbers, XENStake);

        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
        // const startBlock = process.env[`${network.toUpperCase()}_START_BLOCK`] || 0;
        const forwarder = process.env[`${network.toUpperCase()}_FORWARDER`] || ZERO_ADDRESS;
        const royaltyReceiver = process.env[`${network.toUpperCase()}_ROYALTY_RECEIVER`] || ZERO_ADDRESS;

        console.log('    forwarder:', forwarder);
        console.log('    royalty receiver:', royaltyReceiver);

        if (xenContractAddress) {}
        const xenContractAddress = xenContractAddress || await XENCrypto.deployed().then(_ => _.address);
        // console.log(network, xenContract?.address)
        await deployer.deploy(
            XENStake,
            xenContractAddress,
            forwarder,
            royaltyReceiver
        );
    }
    if (network === 'test') {
    }

 */
};
