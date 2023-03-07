const { Contract, Wallet } = require("ethers")
const { JsonRpcProvider } = require('@ethersproject/providers')
const { NonceManager } = require('@ethersproject/experimental/lib/nonce-manager');

const data = require("../build/contracts/XENKnights.json");
require("dotenv").config()

module.exports = async function(callback) {
    try {
        const provider = new JsonRpcProvider(process.env.ETH_JSON_RPC_URL);
        const currentNet = process.env.ETH_NETWORK_ID || 222222222
        //const adminSigner = new Wallet(privateKeys[1], provider); // new Wallet(privateKeys[0], provider);
        const adminSigner = new Wallet(process.env.PK_X1, provider); // new Wallet(privateKeys[0], provider);
        const managedSigner = new NonceManager(adminSigner);
        const address = data.networks[currentNet]?.address
        console.log('using address', address);

        const xenKnights = new Contract(address, data.abi, managedSigner);

        // const gas = await xenKnights.estimateGas.leaderboard();
        // console.log(gas.toString())
        // const sortedNumbers = await xenKnights.leaderboard();
        const tokenId = await xenKnights.tokenIds(0);
        console.log(tokenId.toNumber());
        // console.log(sortedNumbers.map(_ => _.toNumber()));

    } catch (e) {
        console.log(e);
    } finally {
        callback();
    }
}
