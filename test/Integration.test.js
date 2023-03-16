// SPDX-License-Identifier: MIT

const assert = require('assert')
const timeMachine = require('ganache-time-traveler');
const {toBigInt} = require("../src/utils");
const { keccak256: keccak } = require("@ethersproject/keccak256");
const { toUtf8Bytes } = require("@ethersproject/strings");
require('dotenv').config()

const keccak256 = (str) => keccak(toUtf8Bytes(str));

const XENCrypto = artifacts.require("XENCrypto")
const XENKnights = artifacts.require("XENKnights")

const extraPrint = process.env.EXTRA_PRINT;
const { XK_DELAY = 100, XK_DURATION = 1} = process.env;
contract("XENKnights", async accounts => {

    this.timeout = 999_000_000;
    const gasEstIndexes = [];
    const gasEstNextIndex = [];
    const gasUsed = [];

    const taproots = Array(110).fill(null)
        .map((_, i) => 'bc1p' + i.toString().padStart(58, '0'));

    const ether = 10n ** 18n;
    let xenCrypto;
    let b0, b1, b2, b3, b4, b5, b6, b7, b8, b9;
    const badTaproot1 = 'bc1p000000000000000000000000000000000000000000000000000000000';
    const badTaproot2 = 'bc1p00000000000000000000000000000000000000000000000000000000000';
    const badTaproot3 = 'b1cp0000000000000000000000000000000000000000000000000000000000';
    let xenKnights;

    before(async () => {
        assert.ok(Number(XK_DELAY) >= 100, 'wrong start delay for this test, please set XK_DELAY');
        try {
            xenCrypto = await XENCrypto.deployed();
            xenKnights = await XENKnights.deployed();
        } catch (e) {
            console.error(e)
        }
    })

    it("shall allow to read from XEN Crypto", async () => {
        assert.ok(await xenCrypto.genesisTs().then(_ => _.toNumber()) > 0);
    });

    it("shall allow to mint XEN via standard XEN Crypto mint interface", async () => {
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.claimRank(100, { from: accounts[9] }));
    })

    it("shall reject to enter XEN Knights competition before the start time", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproots[1]),
            'XenKnights: competition not yet started'
        );
    })

    it("shall allow to claim XEN via standard XEN Crypto claimMintRewards interface", async () => {
        await timeMachine.advanceTime(100 * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.claimMintReward({ from: accounts[9] }));
    })

    it("shall show minted XEN balance", async () => {
        b0 = await xenCrypto.balanceOf(accounts[0]).then(toBigInt);
        b1 = await xenCrypto.balanceOf(accounts[1]).then(toBigInt);
        b2 = await xenCrypto.balanceOf(accounts[2]).then(toBigInt);
        b3 = await xenCrypto.balanceOf(accounts[3]).then(toBigInt);
        b4 = await xenCrypto.balanceOf(accounts[4]).then(toBigInt);
        b5 = await xenCrypto.balanceOf(accounts[5]).then(toBigInt);
        b6 = await xenCrypto.balanceOf(accounts[6]).then(toBigInt);
        b7 = await xenCrypto.balanceOf(accounts[7]).then(toBigInt);
        b8 = await xenCrypto.balanceOf(accounts[8]).then(toBigInt);
        b9 = await xenCrypto.balanceOf(accounts[9]).then(toBigInt);
        extraPrint && console.log('    bal #0', b0 / ether);
        extraPrint && console.log('    bal #9', b9 / ether);
        assert.ok(b0 > 0n);
        assert.ok(b9 > 0n);
        assert.ok(b0 > b9);
    })

    it("shall reject to enter XEN Knights competition with illegal taproot address", async () => {
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot1),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot2),
            'XenKnights: illegal taprootAddress length'
        );
        await assert.rejects(
            () => xenKnights.enterCompetition(100n * ether, badTaproot3),
            'XenKnights: illegal taprootAddress signature'
        );
    })

    it("shall allow to approve spending from XEN Crypto", async () => {
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b0, { from: accounts[0] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b1, { from: accounts[1] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b2, { from: accounts[2] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b3, { from: accounts[3] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b4, { from: accounts[4] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b5, { from: accounts[5] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b6, { from: accounts[6] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b7, { from: accounts[7] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b8, { from: accounts[8] }));
        await assert.doesNotReject(() => xenCrypto.approve(xenKnights.address, b1, { from: accounts[9] }));
    });

    it("shall allow to enter XEN Knights competition with correct params", async () => {
        await assert.doesNotReject(
            async () => {
                const res = await xenKnights.enterCompetition(100n * ether, taproots[1]);
                extraPrint && console.log('    gas', res.receipt.gasUsed);
                return res;
            }
        );
    })

    it("shall show decreased amount of XEN owned after entering competition (due to XEN burn)", async () => {
        const nb0 =  await xenCrypto.balanceOf(accounts[0]).then(toBigInt);
        assert.ok(b0 - 100n * ether === nb0);
    })


    it("shall allow to enter XEN Knights competition with the different taproot address from the same account", async () => {
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(100n * ether, taproots[2])
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        extraPrint === '2' && console.log(board);
        assert.ok(board[0] === keccak256(taproots[2]));
        assert.ok(board[1] === keccak256(taproots[1]));
    })

    it("shall allow to enter XEN Knights competition from different address", async () => {
        let nextIndex = await xenKnights.nextIndex(200n * ether);
        assert.ok(nextIndex === keccak256(taproots[1]));
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(200n * ether, taproots[4], { from: accounts[1] })
        );
        nextIndex = await xenKnights.nextIndex(200n * ether);
        assert.ok(nextIndex === keccak256(taproots[1]));
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(200n * ether, taproots[5], { from: accounts[1] })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked)", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        assert.ok(board.length === 4);
        extraPrint === '2' && console.log(board);
        assert.ok(board[0] === keccak256(taproots[2]));
        assert.ok(board[1] === keccak256(taproots[1]));
        assert.ok(board[2] === keccak256(taproots[5]));
        assert.ok(board[3] === keccak256(taproots[4]));
    })

    it("shall allow to retrieve correct cumulative amount by taproot address (1)", async () => {
        const amount1 = await xenKnights.amounts(keccak256(taproots[1])).then(toBigInt);
        const amount2 = await xenKnights.amounts(keccak256(taproots[2])).then(toBigInt);
        const amount3 = await xenKnights.amounts(keccak256(taproots[3])).then(toBigInt);
        const amount4 = await xenKnights.amounts(keccak256(taproots[4])).then(toBigInt);
        const amount5 = await xenKnights.amounts(keccak256(taproots[5])).then(toBigInt);
        extraPrint === '2' && console.log(taproots[1], amount1);
        extraPrint === '2' && console.log(taproots[2], amount2);
        extraPrint === '2' && console.log(taproots[3], amount3);
        extraPrint === '2' && console.log(taproots[4], amount4);
        extraPrint === '2' &&  console.log(taproots[5], amount5);
    })

    it("shall allow to enter XEN Knights competition from different address (3) with others' taproot address", async () => {
        extraPrint === '2' && console.log(await xenKnights.nextIndex(500n * ether));
        extraPrint === '2' && console.log(await xenKnights.indexes(keccak256(taproots[3]), 500n * ether));
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(400n * ether, taproots[1], { from: accounts[2] })
        );
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount staked) - 2", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        assert.ok(board.length === 4);
        extraPrint === '2' && console.log(board);
        assert.ok(board[0] === keccak256(taproots[2]));
        assert.ok(board[1] === keccak256(taproots[5]));
        assert.ok(board[2] === keccak256(taproots[4]));
        assert.ok(board[3] === keccak256(taproots[1]));
    })

    it("shall allow to enter XEN Knights competition from different address (3) with others' taproot address", async () => {
        const g1 = await xenKnights.indexes.estimateGas(keccak256(taproots[3]), 900n * ether).then(toBigInt);
        const g2 = await xenKnights.nextIndex.estimateGas(900n * ether).then(toBigInt);
        // console.log(g1, g2);
        const i1 = await xenKnights.indexes(keccak256(taproots[3]), 900n * ether);
        const i2 = await xenKnights.nextIndex(900n * ether);
        extraPrint === '2' && console.log(i1);
        extraPrint === '2' && console.log(i2);
        await assert.doesNotReject(
            () => xenKnights.enterCompetition(400n * ether, taproots[1], { from: accounts[2] })
        );
    })

    it("shall allow to retrieve correct cumulative amount by taproot address (2)", async () => {
        const amount1 = await xenKnights.amounts(keccak256(taproots[1])).then(toBigInt);
        const amount2 = await xenKnights.amounts(keccak256(taproots[2])).then(toBigInt);
        const amount3 = await xenKnights.amounts(keccak256(taproots[3])).then(toBigInt);
        const amount4 = await xenKnights.amounts(keccak256(taproots[4])).then(toBigInt);
        const amount5 = await xenKnights.amounts(keccak256(taproots[5])).then(toBigInt);
        extraPrint === '2' && console.log(taproots[1], amount1);
        extraPrint === '2' && console.log(taproots[2], amount2);
        extraPrint === '2' && console.log(taproots[3], amount3);
        extraPrint === '2' && console.log(taproots[4], amount4);
        extraPrint === '2' && console.log(taproots[5], amount5);
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount burned) - 2", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        assert.ok(board.length === 4);
        extraPrint === '2' && console.log(board);
        assert.ok(board[0] === keccak256(taproots[2]));
        assert.ok(board[1] === keccak256(taproots[5]));
        assert.ok(board[2] === keccak256(taproots[4]));
        assert.ok(board[3] === keccak256(taproots[1]));
    })

    it("shall allow users with new taproot addresses enter the competition pushing out losers", async () => {
        for await (const addr of taproots.slice(6)) {
            const idx = Math.floor(Math.random() * 10);
            const minAmount = await xenKnights.minAmount().then(toBigInt);
            await assert.doesNotReject(
                async () => {
                    const res = await xenKnights.enterCompetition(minAmount + 1n, addr, { from: accounts[idx] })
                    gasUsed.push(res.receipt.gasUsed);
                    return res;
                }
            );
            process.stdout.write('.');
        }
        const g1 = await xenKnights.indexes.estimateGas(keccak256(taproots[109]), 100); //.then(_ => _.toNumber());
        const g2 = await xenKnights.nextIndex.estimateGas(100); //.then(_ => _.toNumber());
        console.log(g1);
        console.log(g2);
        // ................................................................................................
        process.stdout.write('\n');
    })

    it("shall allow to retrieve the leaderboard sorted in the right order (ascending by amount burned) - 2", async () => {
        const board = await xenKnights.leaderboard(100);
        assert.ok(Array.isArray(board));
        console.log(board);
        // assert.ok(board[0] === taproots[2]);
        // assert.ok(board[1] === taproots[5]);
        // assert.ok(board[2] === taproots[4]);
        // assert.ok(board[3] === taproots[1]);
    })

    it("shall reject to enter XEN Knights competition after the end time", async () => {
        await timeMachine.advanceTime(1 * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.rejects(
            () => xenKnights.enterCompetition(1, taproots[1]),
            'XenKnights: competition already finished'
        );
    })

    it("shall reject to withdraw winning amount after auction end time", async () => {
        await assert.rejects(
            () => xenKnights.withdraw(taproots[0]),
            'XenKnights: nothing to withdraw'
        );
        await assert.rejects(
            () => xenKnights.withdraw(taproots[1]),
            'XenKnights: winner cannot withdraw'
        );
        await assert.doesNotReject(
            () => xenKnights.withdraw(taproots[2]),
            // 'XenKnights: winner cannot withdraw'
        );
        await assert.rejects(
            () => xenKnights.withdraw(taproots[3]),
            'XenKnights: nothing to withdraw'
        );
        await assert.rejects(
            () => xenKnights.withdraw(taproots[4]),
            'XenKnights: winner cannot withdraw'
        );
        await assert.rejects(
            () => xenKnights.withdraw(taproots[5]),
            'XenKnights: winner cannot withdraw'
        );
    })

    it("shall allow anyone to burn winners' funds after auction end time", async () => {
        await assert.doesNotReject(
            () => xenKnights.burn()
        );
    })

    it("optional min/max gas numbers (requires EXTRA_PRINT)", async () => {
        //extraPrint && console.log('    Min est idx', Math.min(...gasEstIndexes));
        //extraPrint && console.log('    Max est idx', Math.max(...gasEstIndexes));
        //extraPrint && console.log('    Min est next idx', Math.min(...gasEstNextIndex));
        //extraPrint && console.log('    Max est next idx', Math.max(...gasEstNextIndex));
        extraPrint && console.log('    gas', gasUsed);
        extraPrint && console.log('    Min gas', Math.min(...gasUsed));
        extraPrint && console.log('    Max gas', Math.max(...gasUsed));
    })
})
