const { Contract, Wallet } = require("ethers")
const { JsonRpcProvider } = require('@ethersproject/providers')
const { NonceManager } = require('@ethersproject/experimental/lib/nonce-manager');

const data = require("../build/contracts/XENKnights.json");
require("dotenv").config()

module.exports = async function(callback) {
    try {
        // const provider = new JsonRpcProvider('http://127.0.0.1:8545');
        const provider = new JsonRpcProvider('https://x1-devnet.xen.network');
        const currentNet = 202212
        //const adminSigner = new Wallet(privateKeys[1], provider); // new Wallet(privateKeys[0], provider);
        const adminSigner = new Wallet(process.env.LIVE_PK, provider); // new Wallet(privateKeys[0], provider);
        const managedSigner = new NonceManager(adminSigner);
        const address = data.networks[currentNet]?.address
        console.log('using address', address);

        const xenKnights = new Contract(address, data.abi, managedSigner);
        // console.log('authors', await xenKnights.AUTHORS());

        const batch = 100;
        const count = 10;

        const ids = Array(batch).fill(null).map((_, i) => i + 100);
        for await (const i of ids) {
            await xenKnights.enterCompetition(BigInt(i - 99) * 10n**18n, 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3' + i)
                // .then(_ => _.wait());
            process.stdout.write('.');
        }

        process.stdout.write('\n');

    } catch (e) {
        console.log(e);
    } finally {
        callback();
    }
}
