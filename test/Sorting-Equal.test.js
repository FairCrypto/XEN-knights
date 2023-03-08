// SPDX-License-Identifier: MIT

const assert = require('assert')
const shuffle = require("../src/shuffle");
require('dotenv').config()

const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;
contract("XENKnights Leaderboard: Equal stakes", async accounts => {

    this.timeout = 999_000_000;

    const gasUsed = [];
    let xenKnights;
    const max = 100;
    const len = 102;
    // const max = 100;
    const sortedIds = Array(len).fill(null)
        .map((_,i) => i);
    const sortedIds2 = Array(len).fill(null)
        .map((_,i) => i + max * 2);
    const unsortedIds = shuffle([...sortedIds]);

    before(async () => {
        try {
            xenKnights = await XENKnights.deployed();
        } catch (e) {
            console.error(e)
        }
    })

    it("shall allow to enter the competition with same offer within max count", async () => {
        for await (const i of sortedIds.slice(0, max)) {
            await assert.doesNotReject(async () => {
                const res = await xenKnights.enterCompetition0(i, 100);
                gasUsed.push(res.receipt.gasUsed);
                if (i > 0 && i % 100 === 0) {
                    extraPrint && process.stdout.write('\n');
                    extraPrint && console.log('    gas to insert on max', res.receipt.gasUsed);
                } else {
                    extraPrint && process.stdout.write('.');
                }
                return res;
            });
        }
        extraPrint && process.stdout.write('\n');
    })

    it("leaderboard should return array of tokenIds sorted by amounts descending", async () => {
        const count = 100;
        const resultIds = await xenKnights.leaderboard(count);
        extraPrint === '2' && console.log('    results', resultIds);
        const expectedIds = [...sortedIds.slice(0, max)].reverse();
        extraPrint === '2' && console.log('    expected', expectedIds);
        assert.ok(resultIds.reduce((res,id,i) => res && (id === expectedIds[i].toString()), true));
    })

    it("shall disallow to enter the competition with same offer beyond max count", async () => {
        let total = await xenKnights.totalPlayers().then(_ => _.toNumber());
        assert.ok(total === max);
        let lastIndex = await xenKnights.lastIndex();
        assert.ok(lastIndex === (max - 1).toString());
        await assert.rejects(() =>  xenKnights.enterCompetition0(max + 1, 100), 'XenKnights: below the threshold');
        await assert.rejects(() =>  xenKnights.enterCompetition0(max + 2, 100), 'XenKnights: below the threshold');
        total = await xenKnights.totalPlayers().then(_ => _.toNumber());
        assert.ok(total === max);
        lastIndex = await xenKnights.lastIndex();
        assert.ok(lastIndex === (max - 1).toString());
    })

    it("shall allow to enter the competition with bigger offer beyond max count", async () => {
        const biggerAmount = 200;
        let nextIndex = await xenKnights.nextIndex(biggerAmount); // .then(_ => _.toNumber());
        assert.ok(nextIndex === (0).toString());
        await assert.doesNotReject(async () => {
            const res = await xenKnights.enterCompetition0(max + 1, biggerAmount);
            gasUsed.push(res.receipt.gasUsed);
            return res;
        });
        let lastIndex = await xenKnights.lastIndex(); // .then(_ => _.toNumber());
        assert.ok(lastIndex === (max - 2).toString());
        nextIndex = await xenKnights.nextIndex(biggerAmount); // .then(_ => _.toNumber());
        assert.ok(nextIndex === (0).toString());
        await assert.doesNotReject(() =>  xenKnights.enterCompetition0(max + 2, biggerAmount));
        let total = await xenKnights.totalPlayers().then(_ => _.toNumber());
        assert.ok(total === max);
        lastIndex = await xenKnights.lastIndex(); // .then(_ => _.toNumber());
        assert.ok(lastIndex === (max - 3).toString());
    })

    it("leaderboard should return array of tokenIds sorted by amounts descending (after additions)", async () => {
        const count = 100;
        const resultIds = await xenKnights.leaderboard(count);
        extraPrint === '2' && console.log('    results (+2)', resultIds);
        const expectedIds = [...[...sortedIds].reverse().slice(4), max + 2, max + 1];
        extraPrint === '2' && console.log('    expected (+2)', expectedIds);
        assert.ok(resultIds.reduce((res,id,i) => res && (id === expectedIds[i].toString()), true));
    })

    it("optional min/max gas numbers (requires EXTRA_PRINT)", async () => {
        extraPrint && console.log('    Min gas', Math.min(...gasUsed));
        extraPrint && console.log('    Max gas', Math.max(...gasUsed));
    })

    it("shall allow to enter the competition and replace current players with bigger offer", async () => {
        for await (const i of sortedIds2.slice(0, max)) {
            await assert.doesNotReject(async () => {
                const res = await xenKnights.enterCompetition0(i, 500);
                gasUsed.push(res.receipt.gasUsed);
                if (i > 0 && i % 100 === 0) {
                    extraPrint && process.stdout.write('\n');
                    extraPrint && console.log('    gas on', i+1, res.receipt.gasUsed);
                } else {
                    extraPrint && process.stdout.write('.');
                }
                return res;
            });
        }
        extraPrint && process.stdout.write('\n');
    })

    it("leaderboard should return array of tokenIds sorted by amounts descending (after total replacement)", async () => {
        const count = 100;
        const resultIds = await xenKnights.leaderboard(count);
        extraPrint === '2' && console.log('    results (new)', resultIds);
        const expectedIds = [...sortedIds2.slice(0, max)].reverse();
        extraPrint === '2' && console.log('    expected (new)', expectedIds);
        assert.ok(resultIds.reduce((res,id,i) => res && (id === expectedIds[i].toString()), true));
    })

    it("optional min/max gas numbers (requires EXTRA_PRINT)", async () => {
        extraPrint && console.log('    Min gas', Math.min(...gasUsed));
        extraPrint && console.log('    Max gas', Math.max(...gasUsed));
    })
})
