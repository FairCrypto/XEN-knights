// SPDX-License-Identifier: MIT

const assert = require('assert')
const shuffle = require("../src/shuffle");
require('dotenv').config()

const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;

contract("XENKnights Leaderboard: Random stakes", async accounts => {

    this.timeout = 999_000_000;

    const gasUsed = [];
    const gasEstimated = [];
    const tokenIds = [];
    let xenKnights;
    const len = 100;
    const sortedIds = Array(len).fill(null)
        .map((_,i) => i);
    const sortedAmounts = Array(len).fill(null)
        .map((_, i) => sortedIds[i] + 10).reverse();
    const unsortedIds = shuffle([...sortedIds]);
    const unsortedAmounts = Array(len).fill(null)
        .map((_, i) => unsortedIds[i] + 10);

    // let xenKnightsEthers;
    // const provider = new Web3Provider(web3.currentProvider);

    // console.log(unsortedIds);
    // console.log(unsortedAmounts);

    before(async () => {
        try {
            xenKnights = await XENKnights.deployed();
            // xenKnightsEthers = new Contract(xenKnights.address, xenKnights.abi, provider);
        } catch (e) {
            console.error(e)
        }
    })

    it("shall allow to continuously enter the competition - 1", async () => {
        for await (const i of Array(len).fill(null).map((_, i) => i)) {
            await assert.doesNotReject(async () => {
                const gas = await xenKnights.enterCompetition0.estimateGas(unsortedIds[i], unsortedAmounts[i]);
                const res = await xenKnights.enterCompetition0(unsortedIds[i], unsortedAmounts[i]);
                if (i > 0 && i % 100 === 0) {
                    extraPrint && process.stdout.write('\n');
                    extraPrint && console.log('    gas to insert on max', res.receipt.gasUsed);
                }
                gasEstimated.push(gas);
                gasUsed.push(res.receipt.gasUsed);
                tokenIds.push(unsortedIds[i]);
                extraPrint && process.stdout.write('.');
                return res;
            });
        }
        extraPrint && process.stdout.write('\n');
    })

    it("leaderboard should return array of tokenIds sorted by amounts ascending", async () => {
        const count = 100;
        const total = await xenKnights.totalPlayers().then(_ => _.toNumber());
        assert.ok(total === len);
        extraPrint === '2' && console.log('    gas used', gasUsed.reverse());
        const resultIds = await xenKnights.leaderboard(count);
        extraPrint === '2' && console.log('    result', resultIds.map(_ => _.toNumber()));
        extraPrint === '2' && console.log('    expected', sortedIds);
        assert.ok(resultIds.map(_ => _.toNumber()).reduce((res,id,i) => res && (id === sortedIds[i]), true));
    })

    it("optional min/max gas numbers (requires EXTRA_PRINT)", async () => {
        extraPrint && console.log('    Min gas estimated/actual', Math.min(...gasEstimated), Math.min(...gasUsed));
        extraPrint && console.log('    Max gas estimated/actual', Math.max(...gasEstimated), Math.max(...gasUsed));
    })
})
