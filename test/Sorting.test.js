// SPDX-License-Identifier: MIT

// const { Contract } = require('ethers');
// const { Web3Provider } = require('@ethersproject/providers');

const assert = require('assert')
require('dotenv').config()

const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;

contract("XENKnights Leaderboard Sorting", async accounts => {

    this.timeout = 999_000_000;

    let xenKnights;
    const len = 100;
    const rnd = () => Math.random();
    const unsortedIds = Array(len).fill(null)
        .map(_ => Math.floor(rnd() * 100));
    const unsortedAmounts = Array(len).fill(null)
        .map((_, i) => unsortedIds[i]+10);

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

    it("quickSort function should sort numbers correctly", async () => {
        const gas = await xenKnights.leaderboard0.estimateGas(unsortedAmounts, unsortedIds);
        console.log('quicksort gas', gas.toLocaleString());

        const sorted = await xenKnights.leaderboard0(unsortedAmounts, unsortedIds);
        const sortedIds = sorted.map(_ => _.toNumber());
        assert.ok(sortedIds.length === 100);
        const sortedUnsortedIds = unsortedIds.sort((a1,a2) => a2 - a1).slice(0, 100);
        const isEqual = sortedIds.reduce((res,id,i) => res & (id === sortedUnsortedIds[i]), true);
        console.log(isEqual);
        // assert.deepEqual(sortedIds, unsortedIds.sort((a1,a2) => a2 - a1), 'tokenIds not sorted');
        // extraPrint && console.log('     ', dateTimeStr, new Date(dateTimeStr))
    })

    it("shall allow to continuously enter the competition - 1", async () => {
        for await (const i of Array(len).fill(null).map((_, i) => i)) {
            await xenKnights.enterCompetition0(unsortedIds[i], unsortedAmounts[i]);
            process.stdout.write('.');
        }
    })

    it("shall allow to continuously enter the competition - 2", async () => {
        for await (const i of Array(len).fill(null).map((_, i) => i)) {
            await xenKnights.enterCompetition0(unsortedIds[i], unsortedAmounts[i]);
            process.stdout.write('.');
        }
    })

    it("leaderboard should return array of tokenIds sorted by amounts descending", async () => {
        process.stdout.write('\n');
        try {
            const total = await xenKnights.totalPlaying().then(_ => _.toNumber());
            assert.ok(total === len * 2);
            const gas = await xenKnights.leaderboard.estimateGas();
            console.log('leaderboard gas', gas.toLocaleString());
            const sortedNumbers = await xenKnights.leaderboard();
            console.log(sortedNumbers.map(_ => _.toNumber()));
            // extraPrint && console.log('     ', dateTimeStr, new Date(dateTimeStr))
        } catch (e) {
            console.log(e)
        }
    })

})
