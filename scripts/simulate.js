const { Contract, Wallet } = require("ethers")
const { JsonRpcProvider } = require('@ethersproject/providers')
const { NonceManager } = require('@ethersproject/experimental/lib/nonce-manager');

const {  privateKeys } = require("../accounts")
const data = require("../build/contracts/XENKnights.json");
const shuffle = require("../src/shuffle");
require("dotenv").config()

module.exports = async function(callback) {
    try {
        // const provider = new JsonRpcProvider('http://127.0.0.1:8545');
        const provider = new JsonRpcProvider(process.env.ETH_JSON_RPC_URL);
        const currentNet = process.env.ETH_NETWORK_ID || 222222222
        //const adminSigner = new Wallet(privateKeys[1], provider); // new Wallet(privateKeys[0], provider);
        const adminSigner = new Wallet(process.env.PK_X1, provider); // new Wallet(privateKeys[0], provider);
        const managedSigner = new NonceManager(adminSigner);
        const address = data.networks[currentNet]?.address
        console.log('using addreess', address);

        const xenKnights = new Contract(address, data.abi, managedSigner);
        // console.log('authors', await xenKnights.AUTHORS());

        const batch = 1_000;
        const count = 10;
        const unsortedIds = shuffle(Array(batch*count).fill(null)
            .map((_,i) => i));
        const unsortedAmounts = Array(batch*count).fill(null)
            .map((_, i) => unsortedIds[i] + 10);

        const ids = Array(batch*count).fill(null).map((_, i) => i + batch * 0);
        for await (const i of ids) {
            await xenKnights.enterCompetition0(unsortedIds[i], unsortedAmounts[i])
                // .then(_ => _.wait());
            process.stdout.write('.');
        }

        process.stdout.write('\n');
        const sortedNumbers = await xenKnights.leaderboard();
        console.log(sortedNumbers.map(_ => _.toNumber()));

    } catch (e) {
        console.log(e);
    } finally {
        callback();
    }
}
